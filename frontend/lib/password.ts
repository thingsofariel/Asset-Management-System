const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+';
const ALL = LOWER + UPPER + NUMBERS + SYMBOLS;

function secureRandomIndex(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function pick(charset: string): string {
  return charset[secureRandomIndex(charset.length)];
}

export function generateSecurePassword(length = 12): string {
  // Guarantee at least one of each required character class, then fill the rest.
  const required = [pick(LOWER), pick(UPPER), pick(NUMBERS), pick(SYMBOLS)];
  const remaining = Array.from({ length: Math.max(0, length - required.length) }, () => pick(ALL));
  const chars = [...required, ...remaining];

  // Fisher-Yates shuffle so the guaranteed chars aren't always in the same position.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
