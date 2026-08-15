import { customAlphabet } from 'nanoid';

// Excludes 0/O and 1/I so reference numbers stay unambiguous when read aloud
// over a phone call or typed from a WhatsApp message.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const generate = customAlphabet(ALPHABET, 8);

export function generateReferenceNumber(prefix: string): string {
  return `${prefix}-${generate()}`;
}
