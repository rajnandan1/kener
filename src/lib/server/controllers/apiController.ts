import db from "../db/db.js";
import crypto from "crypto";
import { MaskString, CreateHash } from "./commonController.js";

interface ApiKeyInput {
  name: string;
}
interface ApiKeyStatusInput {
  id: number;
  status: string;
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

  await db.createNewApiKey({
    name: data.name,
    hashed_key: hashed_key,
    masked_key: MaskString(apiKey),
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

export const VerifyAPIKey = async (apiKey: string): Promise<boolean> => {
  const hashed_key = CreateHash(apiKey);
  // Check if the hash exists in the database
  const record = await db.getApiKeyByHashedKey(hashed_key);

  if (!!record) {
    return record.status == "ACTIVE";
  } // Adjust this for your DB query
  return false;
};
