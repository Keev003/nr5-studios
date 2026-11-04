const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** Readable random temporary password (no look-alike characters). */
export function generatePassword(length = 14): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
