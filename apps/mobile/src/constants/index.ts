// ─── Brand ────────────────────────────────────────────────────────────────────

export const APP_NAME = 'z.chat';
export const APP_VERSION = '1.0.0';
export const APP_COMPANY = 'z.systems';

// ─── Avatar ───────────────────────────────────────────────────────────────────

export const AVATAR_COLORS = ['#E46C53', '#4D7E82', '#F1A167', '#ED2F3C', '#F3D292'] as const;

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  image: 'Photo',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  voice_note: 'Voice note',
};

export const MAX_UNREAD_DISPLAY = 99;

// ─── Navigation tabs ──────────────────────────────────────────────────────────

export const NAV_TABS = [
  { key: 'chats',    label: 'Chats',    icon: 'chatbubble-outline',  iconActive: 'chatbubble'  },
  { key: 'calls',    label: 'Calls',    icon: 'call-outline',        iconActive: 'call'        },
  { key: 'settings', label: 'Settings', icon: 'settings-outline',    iconActive: 'settings'    },
] as const;

export type TabName = (typeof NAV_TABS)[number]['key'];

// ─── Settings sections ────────────────────────────────────────────────────────

export const SETTINGS_SECTIONS: {
  title: string;
  rows: { label: string; subtitle?: string; icon: string; route: string }[];
}[] = [
  {
    title: '',
    rows: [
      { label: 'Account',       subtitle: 'Privacy, security, change number',  icon: '🔑', route: '/settings-account'       },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { label: 'Privacy',       subtitle: 'Last seen, read receipts, blocked', icon: '🔒', route: '/settings-privacy'        },
      { label: 'Notifications', subtitle: 'Message, group, call alerts',       icon: '🔔', route: '/settings-notifications'  },
      { label: 'Storage & Data',subtitle: 'Auto-download, data usage',         icon: '💾', route: '/settings-storage'        },
      { label: 'Appearance',    subtitle: 'Theme, accent color, font size',    icon: '🎨', route: '/settings-appearance'     },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Help',          subtitle: 'FAQ, contact us, terms & privacy',  icon: '❓', route: '/settings-help'           },
    ],
  },
];

// ─── Phone auth ───────────────────────────────────────────────────────────────

export const COUNTRY_CODES = [
  { code: '+212', country: 'MA', flag: '🇲🇦' },
  { code: '+1',   country: 'US', flag: '🇺🇸' },
  { code: '+44',  country: 'GB', flag: '🇬🇧' },
  { code: '+33',  country: 'FR', flag: '🇫🇷' },
  { code: '+49',  country: 'DE', flag: '🇩🇪' },
  { code: '+81',  country: 'JP', flag: '🇯🇵' },
  { code: '+86',  country: 'CN', flag: '🇨🇳' },
  { code: '+91',  country: 'IN', flag: '🇮🇳' },
  { code: '+55',  country: 'BR', flag: '🇧🇷' },
  { code: '+61',  country: 'AU', flag: '🇦🇺' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

// ─── Crypto storage keys ──────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  JWT_TOKEN:     'z_chat_jwt_token',
  REFRESH_TOKEN: 'z_chat_refresh_token',
  PRIVATE_KEY:   'z_chat_private_key_v1',
  PUBLIC_KEY:    'z_chat_public_key_v1',
} as const;
