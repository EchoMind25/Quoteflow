// lib/crypto/encrypt.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Get the 32-byte encryption key from environment.
 * The key must be a 64-character hex string (32 bytes).
 *
 * @throws {Error} If ENCRYPTION_KEY is not set or is invalid
 */
function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. Must be a 64-character hex string (32 bytes).",
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Got ${keyHex.length} characters.`,
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a colon-separated string: `iv:authTag:ciphertext` (all hex-encoded).
 *
 * @param text - The plaintext string to encrypt
 * @returns The encrypted string in the format `iv:authTag:encrypted`
 *
 * @example
 * ```ts
 * const encrypted = encrypt("sensitive data");
 * // "a1b2c3...:d4e5f6...:789abc..."
 * ```
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string that was encrypted with {@link encrypt}.
 *
 * @param encryptedText - The encrypted string in the format `iv:authTag:encrypted`
 * @returns The decrypted plaintext string
 * @throws {Error} If the format is invalid or decryption fails (e.g. tampered data)
 *
 * @example
 * ```ts
 * const plaintext = decrypt(encrypted);
 * // "sensitive data"
 * ```
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted text format. Expected 'iv:authTag:encrypted'.",
    );
  }

  const [ivHex, authTagHex, encrypted] = parts as [string, string, string];

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
