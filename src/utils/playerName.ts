/**
 * Sanitizes player character name to allow ONLY plain text letters, digits, and single spaces.
 * Strips all icons, emojis, and special symbols.
 */
export function sanitizePlayerNameInput(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 16);
}

export function finalizePlayerName(raw: string, fallback = 'Mây Nhỏ'): string {
  const cleaned = sanitizePlayerNameInput(raw).trim();
  return cleaned.length > 0 ? cleaned : fallback;
}
