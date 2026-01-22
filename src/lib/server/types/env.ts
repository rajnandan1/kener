// Prefer SvelteKit's $env modules over process.env in app/server code.
// This file shows a pattern for centralizing env typings.

import { DATABASE_URL, KENER_SECRET_KEY, ORIGIN } from "$env/static/private";

export type PrivateEnv = {
  DATABASE_URL: string;
  KENER_SECRET_KEY: string;
  ORIGIN: string;
};

export const env: PrivateEnv = {
  DATABASE_URL,
  KENER_SECRET_KEY,
  ORIGIN,
};
