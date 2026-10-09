import db from "../db/db.js";
import crypto from "crypto";
import { MaskString, CreateHash } from "./commonController.js";

interface ApiKeyInput {
  name: string;
  expires_at?: Date | string | null;
}
interface ApiKeyStatusInput {
  id: number;
  status: string;
}

interface ApiKeyDeleteInput {
  id: number;
}

function generateApiKey() {
  const prefix = "kener_";
  const randomKey = crypto.randomBytes(32).toString("hex"); // 64-character hexadecimal string
  return prefix + randomKey;
}

export const CreateNewAPIKey = async (data: ApiKeyInput): Promise<{ apiKey: string; name: string }> => {
  //generate a new key
  const apiKey = generateApiKey();
  const hashed_key = await CreateHash(apiKey);
  //insert into db

  //data.name cant be empty
  if (!data.name) {
    throw new Error("Name is required");
  }

  let expiresAt: Date | null = null;
  if (data.expires_at !== undefined && data.expires_at !== null && data.expires_at !== "") {
    const parsed = new Date(data.expires_at);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("expires_at must be a valid date");
    }
    if (parsed.getTime() <= Date.now()) {
      throw new Error("expires_at must be in the future");
    }
    expiresAt = parsed;
  }

  await db.createNewApiKey({
    name: data.name,
    hashed_key: hashed_key,
    masked_key: MaskString(apiKey),
    expires_at: expiresAt,
  });

  return {
    apiKey: apiKey,
    name: data.name,
  };
};

export const GetAllAPIKeys = async () => {
  return await db.getAllApiKeys();
};

//update status of api key
export const UpdateApiKeyStatus = async (data: ApiKeyStatusInput): Promise<number> => {
  return await db.updateApiKeyStatus(data);
};

export const DeleteApiKey = async (data: ApiKeyDeleteInput): Promise<number> => {
  if (!data.id || Number.isNaN(Number(data.id))) {
    throw new Error("Valid API key id is required");
  }
  return await db.deleteApiKey(Number(data.id));
};

export const VerifyAPIKey = async (apiKey: string): Promise<boolean> => {
  const hashed_key = CreateHash(apiKey);
  // Check if the hash exists in the database
  const record = await db.getApiKeyByHashedKey(hashed_key);

  if (!record) {
    return false;
  }
  if (record.status !== "ACTIVE") {
    return false;
  }
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) {
    return false;
  }
  return true;
};
