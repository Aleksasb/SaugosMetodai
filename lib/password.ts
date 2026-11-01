import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128; // cap input so huge passwords can't be used to burn CPU

/** Returns "scrypt$<salt b64>$<hash b64>" */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, PARAMS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(
    password,
    Buffer.from(saltB64, 'base64'),
    expected.length,
    PARAMS
  );
  return timingSafeEqual(actual, expected);
}

// Used to burn the same CPU time when the email doesn't exist, so response
// timing doesn't reveal which emails have accounts.
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  return (dummyHash ??= hashPassword('dummy-password-for-timing'));
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}
