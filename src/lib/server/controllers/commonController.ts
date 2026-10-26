import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const saltRounds = 10;

const PUBLISHED_EXAMPLE_SECRET_KEYS = new Set([
  "DUMMY_SECRET",
  "a-strong-secret-key",
  "dev-secret-key",
  "dev-secret-key-for-local-testing-only",
  "please_change_me",
  "production-key",
  "replace_me_with_a_random_string",
  "replace_with_a_long_random_secret",
  "replace_with_a_random_string",
  "secret123",
  "some_secret_key_for_kener",
  "somesecretkey",
  "your-secret-key",
  "your-super-secret-key-here",
  "your-super-secret-random-string-min-32-chars",
]);

export const SecretKeyWarning = (): string | null => {
  const key = process.env.KENER_SECRET_KEY;
  if (!key) {
    return "KENER_SECRET_KEY is not set. Sign-in, password reset, and API keys stay off until you set it, for example to the output of: openssl rand -base64 32";
  }
  if (PUBLISHED_EXAMPLE_SECRET_KEYS.has(key)) {
    return "KENER_SECRET_KEY is a published example value, so anyone can forge sign-in sessions for this instance. Set it to a long random value, for example the output of: openssl rand -base64 32. Changing it signs everyone out and stops every existing API key.";
  }
  return null;
};

const GetSecretKey = (): string => {
  const key = process.env.KENER_SECRET_KEY;
  if (!key) {
    throw new Error(
      "KENER_SECRET_KEY is not set. Kener will not sign or verify tokens with a hardcoded fallback secret; " +
        "set KENER_SECRET_KEY to a strong, unique value before using authentication, password reset, or API keys.",
    );
  }
  return key;
};

export const ValidatePassword = (password: string): boolean => {
  return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/.test(password);
};

const GenerateSalt = async () => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    console.log("Generated Salt:", salt);
    return salt;
  } catch (err) {
    console.error("Error generating salt:", err);
    throw err;
  }
};

export const HashPassword = async (plainTextPassword: string): Promise<string> => {
  try {
    const hash = await bcrypt.hash(plainTextPassword, saltRounds);
    return hash;
  } catch (err) {
    console.error("Error hashing password:", err);
    throw err;
  }
};
export const VerifyPassword = async (plainTextPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
    return isMatch;
  } catch (err) {
    console.error("Error verifying password:", err);
    throw err;
  }
};
import type { TokenPayload } from "$lib/server/types/auth.js";
import type { SMTPConfiguration } from "../notification/types";

export const VerifyToken = async (token: string): Promise<TokenPayload | undefined> => {
  try {
    const decoded = jwt.verify(token, GetSecretKey());
    if (typeof decoded === "string") {
      return undefined;
    }
    return decoded as TokenPayload;
  } catch (err) {
    return undefined;
  }
};

export const GetSMTPFromENV = (): SMTPConfiguration | null => {
  //if variables are not return null
  const smtpPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_SENDER;
  if (
    !!!process.env.SMTP_HOST ||
    !!!process.env.SMTP_PORT ||
    !!!process.env.SMTP_USER ||
    !!!fromEmail ||
    !!!smtpPassword
  ) {
    return null;
  }

  return {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: Number(process.env.SMTP_PORT),
    smtp_user: process.env.SMTP_USER,
    smtp_sender: fromEmail,
    smtp_pass: smtpPassword,
    smtp_secure: !!Number(process.env.SMTP_SECURE),
  };
};

export const GenerateTokenWithExpiry = async (data: object, expiry: string): Promise<string> => {
  try {
    const token = jwt.sign(data, GetSecretKey(), {
      expiresIn: expiry,
    } as jwt.SignOptions);
    return token;
  } catch (err) {
    console.error("Error generating token with expiry:", err);
    throw err;
  }
};

export const ForgotPasswordJWT = async (data: object): Promise<string> => {
  try {
    const token = jwt.sign(data, GetSecretKey(), {
      expiresIn: "1h",
    } as jwt.SignOptions);
    return token;
  } catch (err) {
    console.error("Error generating token:", err);
    throw err;
  }
};
export const GenerateToken = async (data: object): Promise<string> => {
  try {
    const token = jwt.sign(data, GetSecretKey(), {
      expiresIn: "1y",
    } as jwt.SignOptions);
    return token;
  } catch (err) {
    console.error("Error generating token:", err);
    throw err;
  }
};

export const CookieConfig = (): {
  name: string;
  secure: boolean;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
} => {
  //get base path from env
  let cookiePath = !!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "/";

  let isSecuredDomain = false;
  if (!!process.env.ORIGIN) {
    isSecuredDomain = process.env.ORIGIN.startsWith("https://");
  }
  return {
    name: "kener-user",
    secure: isSecuredDomain,
    maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
    httpOnly: true,
    sameSite: "lax",
    path: cookiePath,
  };
};
export const MaskString = (str: string): string => {
  const len = str.length;
  const mask = "*";
  const masked = mask.repeat(len - 4) + str.substring(len - 4);
  return masked;
};

export const CreateHash = (apiKey: string): string => {
  return crypto.createHmac("sha256", GetSecretKey()).update(apiKey).digest("hex");
};

//create md5 hash
export const CreateMD5Hash = (data: string): string => {
  return crypto.createHash("md5").update(data).digest("hex");
};
