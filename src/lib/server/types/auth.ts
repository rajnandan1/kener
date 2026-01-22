// Server-only types (safe to import from +page.server.ts, +server.ts, hooks.server.ts).
// Never import these from client code.

import type { JwtPayload } from "jsonwebtoken";

export type UserId = string;

export interface SessionUser {
  id: UserId;
  email: string;
  roles: Array<"admin" | "editor" | "viewer">;
}

/**
 * Payload stored in JWT tokens for user authentication.
 * Extends JwtPayload to include standard JWT claims (iat, exp, etc.)
 */
export interface TokenPayload extends JwtPayload {
  id: number;
  email: string;
  name: string;
  role: string;
}
