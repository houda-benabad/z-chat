import { COUNTRY_CODES } from '../../constants';

/**
 * Normalize a raw phone book number to E.164 format.
 * Returns null for numbers that can't be normalized.
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode: string): string | null {
  // Strip spaces, dashes, parentheses, dots
  let cleaned = raw.replace(/[\s\-().]/g, '');

  // Already E.164
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned;

  // Has + but doesn't match E.164 — skip
  if (cleaned.startsWith('+')) return null;

  // Strip trunk prefix (leading zeros) and prepend country code
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  if (/^\d{6,14}$/.test(cleaned)) {
    const withCC = `${defaultCountryCode}${cleaned}`;
    if (/^\+[1-9]\d{6,14}$/.test(withCC)) return withCC;
  }

  return null;
}

/**
 * Extract the country code prefix from an E.164 phone number.
 * Uses the app's known country codes list, trying longest match first.
 */
export function extractCountryCode(e164Phone: string): string {
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (e164Phone.startsWith(code)) return code;
  }
  return '+1';
}
