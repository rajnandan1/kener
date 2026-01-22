import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const saltRounds = 10;
const DUMMY_SECRET = "DUMMY_SECRET";

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

export const VerifyToken = async (token: string): Promise<TokenPayload | undefined> => {
  try {
    const decoded = jwt.verify(token, process.env.KENER_SECRET_KEY || DUMMY_SECRET);
    if (typeof decoded === "string") {
      return undefined;
    }
    return decoded as TokenPayload;
  } catch (err) {
    return undefined;
  }
};

export const GetSMTPFromENV = () => {
  //if variables are not return null
  if (
    !!!process.env.SMTP_HOST ||
    !!!process.env.SMTP_PORT ||
    !!!process.env.SMTP_USER ||
    !!!process.env.SMTP_FROM_EMAIL ||
    !!!process.env.SMTP_PASS
  ) {
    return null;
  }

  return {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_user: process.env.SMTP_USER,
    smtp_from_email: process.env.SMTP_FROM_EMAIL,
    smtp_pass: process.env.SMTP_PASS,
    smtp_secure: !!Number(process.env.SMTP_SECURE),
  };
};

export const GenerateTokenWithExpiry = async (data: object, expiry: string): Promise<string> => {
  try {
    const token = jwt.sign(data, process.env.KENER_SECRET_KEY || DUMMY_SECRET, {
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
    const token = jwt.sign(data, process.env.KENER_SECRET_KEY || DUMMY_SECRET, {
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
    const token = jwt.sign(data, process.env.KENER_SECRET_KEY || DUMMY_SECRET, {
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
  return crypto
    .createHmac("sha256", process.env.KENER_SECRET_KEY || DUMMY_SECRET)
    .update(apiKey)
    .digest("hex");
};
