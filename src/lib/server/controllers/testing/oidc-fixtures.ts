import { expect, type Mock } from "vitest";

/**
 * Shared fixtures for the OIDC controller suites (oidcController.test.ts and
 * oidcController.groupRoleMap.test.ts). Test-only.
 */

/** An existing OIDC user as the db mock returns it. */
export const publicUser = (over: Record<string, unknown> = {}) => ({
  id: 7,
  email: "u@example.com",
  name: "U",
  is_active: 1,
  is_verified: 1,
  is_owner: "NO",
  auth_provider: "oidc",
  oidc_issuer: "https://gitlab.example.com",
  oidc_sub: "sub-7",
  role_ids: ["member"],
  created_at: new Date(),
  updated_at: new Date(),
  ...over,
});

/**
 * Asserts that the role sync made exactly one `applyOidcRoleSync` write for
 * user 7 (and never rewrote the whole role set via `updateUserRoles`), and
 * returns it with sorted arrays so tests can `toEqual` against it.
 */
export function expectSingleRoleSyncWrite(dbMock: { applyOidcRoleSync: Mock; updateUserRoles: Mock }): {
  add: string[];
  remove: string[];
  oidc_role_ids: string[];
} {
  expect(dbMock.applyOidcRoleSync).toHaveBeenCalledTimes(1);
  expect(dbMock.updateUserRoles).not.toHaveBeenCalled();
  const [userId, data] = dbMock.applyOidcRoleSync.mock.calls[0] as [
    number,
    { add: string[]; remove: string[]; oidc_role_ids: string[] },
  ];
  expect(userId).toBe(7);
  return {
    add: [...data.add].sort(),
    remove: [...data.remove].sort(),
    oidc_role_ids: [...data.oidc_role_ids].sort(),
  };
}
