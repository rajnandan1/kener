import crypto from "crypto";
import db from "$lib/server/db/db";
import type { VaultRecord } from "$lib/server/db/repositories/vault";

const DUMMY_SECRET = "DUMMY_SECRET_KEY_32_BYTES_LONG!";
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Get the encryption key from environment variable
 * Pads or truncates to 32 bytes for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.KENER_SECRET_KEY || DUMMY_SECRET;
  // AES-256 requires a 32-byte key
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  return keyBuffer;
}

/**
 * Encrypt a value using AES-256-CBC
 */
export function encryptValue(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Prepend IV to encrypted data (IV:encrypted)
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a value using AES-256-CBC
 */
export function decryptValue(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted value format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Interface for decrypted vault secret
 */
export interface VaultSecretDecrypted {
  id: number;
  secret_name: string;
  secret_value: string; // Decrypted value
  created_at: Date;
  updated_at: Date;
}

/**
 * Get all secrets with decrypted values
 */
export async function GetAllSecrets(): Promise<VaultSecretDecrypted[]> {
  const secrets = await db.getAllSecrets();
  return secrets.map((secret) => ({
    ...secret,
    secret_value: decryptValue(secret.secret_value),
  }));
}

/**
 * Get a secret by ID with decrypted value
 */
export async function GetSecretById(id: number): Promise<VaultSecretDecrypted | undefined> {
  const secret = await db.getSecretById(id);
  if (!secret) return undefined;
  return {
    ...secret,
    secret_value: decryptValue(secret.secret_value),
  };
}

/**
 * Get a secret by name with decrypted value
 */
export async function GetSecretByName(secretName: string): Promise<VaultSecretDecrypted | undefined> {
  const secret = await db.getSecretByName(secretName);
  if (!secret) return undefined;
  return {
    ...secret,
    secret_value: decryptValue(secret.secret_value),
  };
}

/**
 * Create a new secret (encrypts the value before storing)
 */
export async function CreateSecret(
  secretName: string,
  secretValue: string,
): Promise<{ success: boolean; error?: string; id?: number }> {
  // Validate input
  if (!secretName || !secretName.trim()) {
    return { success: false, error: "Secret name is required" };
  }
  if (!secretValue) {
    return { success: false, error: "Secret value is required" };
  }

  // Check if name already exists
  const exists = await db.secretNameExists(secretName.trim());
  if (exists) {
    return { success: false, error: `Secret with name "${secretName}" already exists` };
  }

  // Encrypt and store
  const encryptedValue = encryptValue(secretValue);
  const ids = await db.insertSecret({
    secret_name: secretName.trim(),
    secret_value: encryptedValue,
  });

  return { success: true, id: ids[0] };
}

/**
 * Update a secret by ID (encrypts the new value before storing)
 */
export async function UpdateSecret(
  id: number,
  data: { secret_name?: string; secret_value?: string },
): Promise<{ success: boolean; error?: string }> {
  // Check if secret exists
  const existing = await db.getSecretById(id);
  if (!existing) {
    return { success: false, error: `Secret with ID ${id} not found` };
  }

  // If updating name, check for duplicates
  if (data.secret_name && data.secret_name !== existing.secret_name) {
    const nameExists = await db.secretNameExists(data.secret_name.trim(), id);
    if (nameExists) {
      return { success: false, error: `Secret with name "${data.secret_name}" already exists` };
    }
  }

  // Build update data
  const updateData: { secret_name?: string; secret_value?: string } = {};
  if (data.secret_name !== undefined) {
    updateData.secret_name = data.secret_name.trim();
  }
  if (data.secret_value !== undefined) {
    updateData.secret_value = encryptValue(data.secret_value);
  }

  await db.updateSecretById(id, updateData);
  return { success: true };
}

/**
 * Delete a secret by ID
 */
export async function DeleteSecret(id: number): Promise<{ success: boolean; error?: string }> {
  const existing = await db.getSecretById(id);
  if (!existing) {
    return { success: false, error: `Secret with ID ${id} not found` };
  }

  await db.deleteSecretById(id);
  return { success: true };
}

/**
 * Get secrets count
 */
export async function GetSecretsCount(): Promise<number> {
  return await db.getSecretsCount();
}
