import { StyleSheet } from 'react-native';
import { typography } from '@/theme';
import type { AppColors } from '@/shared/context/AppSettingsContext';

// CSS vars from prototype
const SENT_BG    = '#FFF0EC'; // --sb
const RECV_BG    = '#FFFFFF'; // --rb
const TEXT_COLOR = '#333333'; // --dg
const TIME_COLOR = '#888888'; // --ts

export const createStyles = (_colors: AppColors) => StyleSheet.create({
  row: { marginBottom: 2, paddingHorizontal: 12, flexDirection: 'row' },
  rowMine:   { justifyContent: 'flex-end' },   // mine  → RIGHT
  rowTheirs: { justifyContent: 'flex-start' }, // theirs → LEFT

  bubble: {
    paddingTop: 7,
    paddingHorizontal: 10,
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1,
    elevation: 1,
  },
  // Sent (mine) — tail at bottom-right
  bubbleMine: {
    backgroundColor: SENT_BG,
    borderRadius: 10,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(228,108,83,0.08)',
  },
  // Received (theirs) — tail at bottom-left
  bubbleTheirs: {
    backgroundColor: RECV_BG,
    borderRadius: 10,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  bubblePending: { opacity: 0.65 },

  senderName: {
    fontSize: 12,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.semibold,
    color: '#E46C53',
    marginBottom: 2,
  },

  replyBar: {
    borderLeftWidth: 3,
    borderLeftColor: '#4D7E82',
    paddingLeft: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(77,126,130,0.10)',
    borderRadius: 4,
    padding: 6,
  },
  replyBarMine: {
    borderLeftColor: '#E46C53',
    backgroundColor: 'rgba(228,108,83,0.10)',
  },
  replyText: { fontSize: 12, fontFamily: typography.fontFamily, color: TIME_COLOR },

  // ── Text ─────────────────────────────────────────────────────────────────
  msgText: {
    fontSize: 14.5,
    fontFamily: typography.fontFamily,
    lineHeight: 20,
    color: TEXT_COLOR,
    wordWrap: 'break-word' as const,
  },
  msgTextMine:    { color: TEXT_COLOR },
  msgTextTheirs:  { color: TEXT_COLOR },
  msgTextDeleted: { color: '#9E9E9E', fontStyle: 'italic' as const },

  // ── Meta (time + ticks) ──────────────────────────────────────────────────
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 3,
  },
  msgTime: {
    fontSize: 11,
    fontFamily: typography.fontFamily,
    color: TIME_COLOR,
  },
  msgTimeMine:   { color: TIME_COLOR },
  msgTimeTheirs: { color: TIME_COLOR },

  // Ghost spacer — invisible time copy to reserve last-line space
  ghostTime: { fontSize: 11, opacity: 0 },

  mediaBubble: {
    width: 200,
    height: 160,
    borderRadius: 10,
    marginBottom: 2,
  },

  avatarColumn: {
    width: 28,
    marginRight: 6,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
  },
  avatarSpacer: {
    width: 28,
  },

  forwardedLabel: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, marginBottom: 4 },
  forwardedText:  { fontSize: 11, fontFamily: typography.fontFamily, color: TIME_COLOR, fontStyle: 'italic' as const },
});
