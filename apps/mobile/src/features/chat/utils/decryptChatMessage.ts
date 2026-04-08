import {
  decryptMessage,
  decryptGroupMessage,
  isEncrypted,
} from '@/shared/services/crypto';
import type { ChatMessage } from '@/types';

interface DecryptOpts {
  isGroup: boolean;
  recipientPublicKey: string | null;
  groupKey: string | null;
}

/**
 * Decrypts a single message in-place.
 * Returns the original message unchanged if it is not encrypted or if the
 * required key is missing.
 */
export async function decryptChatMessage(
  msg: ChatMessage,
  opts: DecryptOpts,
): Promise<ChatMessage> {
  if (msg.type === 'system') return msg;

  let result: ChatMessage = msg;

  // Decrypt main content
  if (isEncrypted(msg.content)) {
    if (!opts.isGroup && opts.recipientPublicKey) {
      const plain = await decryptMessage(msg.content!, opts.recipientPublicKey);
      result = { ...result, content: plain ?? '🔒 Unable to decrypt message' };
    } else if (opts.isGroup && opts.groupKey) {
      const plain = decryptGroupMessage(msg.content!, opts.groupKey);
      result = { ...result, content: plain ?? '🔒 Unable to decrypt message' };
    }
  }

  // Decrypt replyTo.content
  if (result.replyTo && isEncrypted(result.replyTo.content)) {
    let plainReply: string | null = null;
    if (!opts.isGroup && opts.recipientPublicKey) {
      plainReply = await decryptMessage(result.replyTo.content!, opts.recipientPublicKey);
    } else if (opts.isGroup && opts.groupKey) {
      plainReply = decryptGroupMessage(result.replyTo.content!, opts.groupKey);
    }
    if (plainReply !== null) {
      result = { ...result, replyTo: { ...result.replyTo, content: plainReply } };
    }
  }

  return result;
}
