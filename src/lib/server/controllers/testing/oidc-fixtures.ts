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
 * Asserts that the role sync made exactly one `updateUserOidcRoles` write for
 * user 7 (and never used the plain `updateUserRoles`), and returns it with
 * sorted arrays so tests can `toEqual` against it.
 */
export function expectSingleRoleSyncWrite(dbMock: { updateUserOidcRoles: Mock; updateUserRoles: Mock }): {
  role_ids: string[] | undefined;
  oidc_role_ids: string[];
} {
  expect(dbMock.updateUserOidcRoles).toHaveBeenCalledTimes(1);
  expect(dbMock.updateUserRoles).not.toHaveBeenCalled();
  const [userId, data] = dbMock.updateUserOidcRoles.mock.calls[0] as [
    number,
    { role_ids?: string[]; oidc_role_ids: string[] },
  ];
  expect(userId).toBe(7);
  return {
    role_ids: data.role_ids ? [...data.role_ids].sort() : undefined,
    oidc_role_ids: [...data.oidc_role_ids].sort(),
  };
}
