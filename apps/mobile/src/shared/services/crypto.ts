import nacl from 'tweetnacl';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PRIVATE_KEY_KEY = 'z_chat_private_key_v1';
const PUBLIC_KEY_KEY = 'z_chat_public_key_v1';

// ---------------------------------------------------------------------------
// Base64 helpers — avoids tweetnacl-util Uint8Array generic compat issues
// ---------------------------------------------------------------------------

// Convert Uint8Array to Base64 (Hermes-safe — avoids spread on TypedArray)
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array (browser-safe)
function fromBase64(s: string): Uint8Array {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert string to Uint8Array (UTF-8)
function toUtf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

// Convert Uint8Array to string (UTF-8)
function fromUtf8Bytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
// ---------------------------------------------------------------------------
// Key storage — SecureStore on native, IndexedDB on web
// ---------------------------------------------------------------------------

const IDB_NAME = 'z_chat_secure';
const IDB_VERSION = 1;
const IDB_STORE = 'keys';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = () => { db.close(); resolve((req.result as string | undefined) ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function storeItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await idbSet(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function loadItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return idbGet(key);
  }
  return SecureStore.getItemAsync(key);
}

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

/**
 * Returns the stored public key (base64) or generates + stores a new key pair.
 * The private key NEVER leaves SecureStore.
 */
export async function getOrCreateKeyPair(): Promise<string> {
  const existingPriv = await loadItem(PRIVATE_KEY_KEY);
  if (existingPriv) {
    const pub = await loadItem(PUBLIC_KEY_KEY);
    if (pub) return pub;

    // Public key was lost but private key survived (e.g. crash between writes).
    // Derive the public key from the existing private key instead of generating
    // a new pair — generating a new pair would overwrite the private key and
    // make all existing messages undecryptable.
    const derived = nacl.box.keyPair.fromSecretKey(fromBase64(existingPriv));
    const recoveredPub = toBase64(derived.publicKey);
    await storeItem(PUBLIC_KEY_KEY, recoveredPub);
    return recoveredPub;
  }

  const keyPair = nacl.box.keyPair();
  const publicKeyB64 = toBase64(keyPair.publicKey);
  const privateKeyB64 = toBase64(keyPair.secretKey);

  await storeItem(PRIVATE_KEY_KEY, privateKeyB64);
  await storeItem(PUBLIC_KEY_KEY, publicKeyB64);

  return publicKeyB64;
}

async function getPrivateKeyBytes(): Promise<Uint8Array | null> {
  const stored = await loadItem(PRIVATE_KEY_KEY);
  return stored ? fromBase64(stored) : null;
}

// ---------------------------------------------------------------------------
// Encrypted message format stored in message.content:
// { "v": 1, "ct": "<base64 ciphertext>", "n": "<base64 nonce>" }
// ---------------------------------------------------------------------------

interface EncryptedPayload {
  v: 1;
  ct: string;
  n: string;
}

/** Returns true when content looks like an E2E encrypted payload (v:1 = 1-on-1, v:2 = group). */
export function isEncrypted(content: string | null | undefined): boolean {
  if (!content) return false;
  try {
    const p = JSON.parse(content) as Partial<EncryptedPayload>;
    return (p.v === 1 || p.v === 2) && typeof p.ct === 'string' && typeof p.n === 'string';
  } catch {
    return false;
  }
}

/**
 * Encrypt plaintext using NaCl box (X25519 ECDH + XSalsa20-Poly1305).
 * Returns a compact JSON string that is stored as message.content on the server.
 *
 * The shared secret is DH(myPrivate, recipientPublic) — symmetric, so either
 * party can decrypt using their own private key + the other party's public key.
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
): Promise<string> {
  const privateKey = await getPrivateKeyBytes();
  if (!privateKey) throw new Error('No local key pair — run getOrCreateKeyPair first');

  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 random bytes
  const messageBytes = toUtf8Bytes(plaintext);
  const recipientPublicKey = fromBase64(recipientPublicKeyB64);

  const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, privateKey);

  const payload: EncryptedPayload = { v: 1, ct: toBase64(ciphertext), n: toBase64(nonce) };
  return JSON.stringify(payload);
}

/**
 * Decrypt a message.
 * otherPublicKeyB64 is always the OTHER user's public key (in a 1-on-1 chat
 * the shared secret is the same for both directions, so this decrypts both
 * sent and received messages).
 *
 * Returns the plaintext, or null if decryption fails (wrong key, tampered, etc.).
 */
export async function decryptMessage(
  encryptedContent: string,
  otherPublicKeyB64: string,
): Promise<string | null> {
  try {
    const privateKey = await getPrivateKeyBytes();
    if (!privateKey) return null;

    const payload = JSON.parse(encryptedContent) as EncryptedPayload;
    if (payload.v !== 1) return null;

    const ciphertext = fromBase64(payload.ct);
    const nonce = fromBase64(payload.n);
    const otherPublicKey = fromBase64(otherPublicKeyB64);

    const plaintext = nacl.box.open(ciphertext, nonce, otherPublicKey, privateKey);
    return plaintext ? fromUtf8Bytes(plaintext) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Group E2E encryption (nacl.secretbox — XSalsa20-Poly1305)
// v:2 payload distinguishes group messages from 1-on-1 (v:1)
// ---------------------------------------------------------------------------

/** Generate a fresh random 32-byte group key. Returns base64. */
export function generateGroupKey(): string {
  return toBase64(nacl.randomBytes(nacl.secretbox.keyLength));
}

/**
 * Encrypt the group key for a list of recipients using an ephemeral key pair.
 * The bundle is self-contained: each recipient's JSON includes the ephemeral
 * public key, so no context about the distributor is needed for decryption.
 *
 * Synchronous — no stored keys are required (the ephemeral pair is generated fresh).
 */
export function generateGroupKeyBundle(
  groupKeyB64: string,
  recipients: { userId: string; publicKeyB64: string }[],
): { userId: string; encryptedKey: string }[] {
  const ephemeral = nacl.box.keyPair(); // disposable key pair, used once
  const ephPublicKeyB64 = toBase64(ephemeral.publicKey);
  const groupKeyBytes = fromBase64(groupKeyB64);

  return recipients.map(({ userId, publicKeyB64 }) => {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const recipientPublicKey = fromBase64(publicKeyB64);
    const ciphertext = nacl.box(groupKeyBytes, nonce, recipientPublicKey, ephemeral.secretKey);
    return {
      userId,
      encryptedKey: JSON.stringify({
        ct: toBase64(ciphertext),
        n: toBase64(nonce),
        eph: ephPublicKeyB64, // ephemeral public key — recipient uses this to decrypt
      }),
    };
  });
}

/**
 * Decrypt the group key received from the server.
 * Self-contained: the ephemeral public key is embedded in the JSON bundle.
 */
export async function decryptGroupKey(encryptedKeyJson: string): Promise<string | null> {
  const privateKey = await getPrivateKeyBytes();
  if (!privateKey) return null;

  try {
    const { ct, n, eph } = JSON.parse(encryptedKeyJson);
    const groupKeyBytes = nacl.box.open(
      fromBase64(ct),
      fromBase64(n),
      fromBase64(eph),
      privateKey,
    );
    return groupKeyBytes ? toBase64(groupKeyBytes) : null;
  } catch {
    return null;
  }
}

/** Encrypt a group message using nacl.secretbox with the group key. */
export function encryptGroupMessage(plaintext: string, groupKeyB64: string): string {
  const key = fromBase64(groupKeyB64);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(toUtf8Bytes(plaintext), nonce, key);
  return JSON.stringify({ v: 2, ct: toBase64(ciphertext), n: toBase64(nonce) });
}

/** Decrypt a group message. Returns plaintext or null on failure. */
export function decryptGroupMessage(encryptedContent: string, groupKeyB64: string): string | null {
  try {
    const { v, ct, n } = JSON.parse(encryptedContent);
    if (v !== 2) return null;
    const key = fromBase64(groupKeyB64);
    const plaintext = nacl.secretbox.open(fromBase64(ct), fromBase64(n), key);
    return plaintext ? fromUtf8Bytes(plaintext) : null;
  } catch {
    return null;
  }
}
