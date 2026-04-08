import { AVATAR_COLORS, MESSAGE_TYPE_LABELS } from '../../constants';
import type { ContactItem, ChatListItem, ChatMessage } from '../../types';

// ─── Date / time ──────────────────────────────────────────────────────────────

/**
 * Smart timestamp for message bubbles:
 * - today       → "14:30"
 * - yesterday   → "Yesterday 14:30"
 * - this week   → "Mon 14:30"
 * - older       → "Jan 1, 14:30"
 */
export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7)  return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

/**
 * Relative label used in the chat list:
 * today → "HH:MM", yesterday → "Yesterday", <7 days → "Mon", else "Jan 1"
 */
export function formatChatPreviewTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Long label used as a date separator in the message list */
export function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Returns true when two ISO date strings fall on the same calendar day */
export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/** Deterministic background color for a contact's initials avatar */
export function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 65;
  return AVATAR_COLORS[code % AVATAR_COLORS.length]!;
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

/** Display name for a contact — nickname > real name > phone */
export function getContactDisplayName(contact: ContactItem): string {
  return contact.nickname ?? contact.contactUser.name ?? contact.contactUser.phone;
}

/** Group a flat contact list into alphabetical sections for SectionList */
export function groupContactsByLetter(
  contacts: ContactItem[],
): { title: string; data: ContactItem[] }[] {
  const map = new Map<string, ContactItem[]>();

  for (const c of contacts) {
    const letter = getContactDisplayName(c)[0]?.toUpperCase() ?? '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(c);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, data]) => ({ title, data }));
}

// ─── Chat list ────────────────────────────────────────────────────────────────

/**
 * Builds the one-line preview shown under a chat name.
 * For group chats the sender name is prepended.
 */
export function getChatPreview(
  lastMessage: ChatMessage | null,
  isGroup: boolean,
  myUserId: string,
): string {
  if (!lastMessage) return '';

  const rawContent =
    lastMessage.type === 'text'
      ? (lastMessage.content ?? '')
      : (MESSAGE_TYPE_LABELS[lastMessage.type] ?? lastMessage.type);

  if (isGroup && lastMessage.sender) {
    const who = lastMessage.senderId === myUserId ? 'You' : (lastMessage.sender.name ?? 'Unknown');
    return `${who}: ${rawContent}`;
  }

  if (!isGroup && lastMessage.senderId === myUserId) {
    return `You: ${rawContent}`;
  }

  return rawContent;
}

/** Returns the other participant's user object in a 1-on-1 chat, or null for groups */
export function getOtherParticipantUser(
  participants: ChatListItem['participants'],
  myUserId: string,
) {
  return participants.find((p) => p.userId !== myUserId)?.user ?? null;
}

// ─── Presence ─────────────────────────────────────────────────────────────────

/** Human-readable "last seen …" label from an ISO date string */
export function formatLastSeen(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'last seen just now';
  if (mins < 60)  return `last seen ${mins}m ago`;
  if (hours < 24) return `last seen ${hours}h ago`;
  if (days === 1) return 'last seen yesterday';
  return `last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

// ─── Typing ───────────────────────────────────────────────────────────────────

/**
 * Resolves a human-readable typing label for group chats.
 * Priority per user: contact nickname → contact name → participant phone.
 */
export function resolveTypingLabel(
  typingUserIds: Set<string>,
  participants: { userId: string; user: { phone: string; name: string | null } }[],
  contacts: ContactItem[],
): string {
  const names = Array.from(typingUserIds).map((userId) => {
    const contact = contacts.find((c) => c.contactUserId === userId);
    if (contact) return getContactDisplayName(contact);
    const participant = participants.find((p) => p.userId === userId);
    return participant?.user.phone ?? userId;
  });

  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing...`;
  return `${names.join(', ')} are typing...`;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Decode a base64url-encoded JWT segment to a UTF-8 string */
function decodeBase64Url(str: string): string {
  // Convert base64url → base64, then pad to a multiple of 4
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

/** Extract the `sub` claim (userId) from a JWT without verifying the signature */
export function parseJwtUserId(token: string): string | null {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1]!)) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
