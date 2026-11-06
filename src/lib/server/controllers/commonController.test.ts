import { afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { CreateHash, GenerateToken, SecretKeyWarning, VerifyToken } from "./commonController.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("KENER_SECRET_KEY", () => {
  it("rejects a token signed with the old hardcoded fallback when the key is unset", async () => {
    vi.stubEnv("KENER_SECRET_KEY", undefined);
    const forged = jwt.sign({ id: 1, email: "admin@example.com" }, "DUMMY_SECRET");

    expect(await VerifyToken(forged)).toBeUndefined();
  });

  it("rejects a token signed with the old hardcoded fallback when the key is empty", async () => {
    vi.stubEnv("KENER_SECRET_KEY", "");
    const forged = jwt.sign({ id: 1 }, "DUMMY_SECRET");

    expect(await VerifyToken(forged)).toBeUndefined();
  });

  it("verifies a token signed with the configured key", async () => {
    vi.stubEnv("KENER_SECRET_KEY", "a-real-secret");
    const token = await GenerateToken({ id: 7 });

    expect(await VerifyToken(token)).toMatchObject({ id: 7 });
    expect(await VerifyToken(jwt.sign({ id: 7 }, "DUMMY_SECRET"))).toBeUndefined();
  });

  it("refuses to sign tokens or hash API keys when the key is unset", async () => {
    vi.stubEnv("KENER_SECRET_KEY", undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(GenerateToken({ id: 1 })).rejects.toThrow(/KENER_SECRET_KEY is not set/);
    expect(() => CreateHash("kener_key")).toThrow(/KENER_SECRET_KEY is not set/);
  });
});

describe("SecretKeyWarning", () => {
  it("warns when the key is unset", () => {
    vi.stubEnv("KENER_SECRET_KEY", undefined);

    expect(SecretKeyWarning()).toMatch(/KENER_SECRET_KEY is not set/);
  });

  it.each(["replace_me_with_a_random_string", "some_secret_key_for_kener", "DUMMY_SECRET"])(
    "warns when the key is the published example value %s",
    (key) => {
      vi.stubEnv("KENER_SECRET_KEY", key);

      expect(SecretKeyWarning()).toMatch(/published example value/);
    },
  );

  it("stays quiet for a real key", () => {
    vi.stubEnv("KENER_SECRET_KEY", "k3n3r-6f1c2a9e0b7d4f58a1c3e9d7b2f4a6c8");

    expect(SecretKeyWarning()).toBeNull();
  });
});
