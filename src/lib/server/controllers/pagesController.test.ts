import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

// TEST_DATABASE_URL=postgresql://… or mysql://… runs this file on that engine instead of in-memory SQLite.
// The database must be empty: the first test checks what the migration does to pages that already exist.
// Run it on its own there (npm run test:server -- <this file>): write-parity.test.ts empties the same
// tables, so two files running in parallel on one database would overwrite each other.
vi.hoisted(() => {
  if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
vi.mock("$lib/server/db/db", async () => {
  const { default: DbImpl } = await import("$lib/server/db/dbimpl");
  if (process.env.TEST_DATABASE_URL) {
    const { default: knexOb } = await import("../../../../knexfile");
    return { default: new DbImpl(knexOb) };
  }
  return {
    default: new DbImpl({ client: "better-sqlite3", connection: { filename: ":memory:" }, useNullAsDefault: true }),
  };
});

vi.mock("$lib/server/cache/cache", () => ({
  getCache: async (_key: string, fetcher?: () => unknown) => (fetcher ? await fetcher() : null),
  setCache: async () => {},
  deleteCache: async () => {},
}));

import db from "$lib/server/db/db";
import type { UserRecordPublic } from "$lib/server/types/db";
import { seed as seedPermissions } from "../../../../seeds/permissions";
import { seed as seedRoles } from "../../../../seeds/roles";
import { seed as seedAccessGroups } from "../../../../seeds/access_groups";
import { seed as seedPages } from "../../../../seeds/pages";
import {
  CreateAccessGroup,
  CreatePage,
  DeleteAccessGroup,
  GetAccessiblePages,
  GetVisiblePageByPath,
  SetPageAccessGroups,
  SetRoleAccessGroups,
} from "./pagesController";

const migrations = import.meta.glob<Knex.Migration>("/migrations/*.ts", { eager: true });
const ACCESS_GROUPS_MIGRATION = "/migrations/20261124120000_add_page_access_groups.ts";
const knex = (db as unknown as { knex: Knex }).knex;

const migrateUpTo = async (last: string | null) =>
  knex.migrate.latest({
    migrationSource: {
      getMigrations: async () =>
        Object.keys(migrations)
          .sort()
          .filter((name) => last === null || name <= last),
      getMigrationName: (name: string) => name.slice("/migrations/".length),
      getMigration: async (name: string) => migrations[name],
    },
  });

// Only role_ids matters for page access
const userWithRoles = (...role_ids: string[]) => ({ id: 1, role_ids }) as unknown as UserRecordPublic;

beforeAll(async () => {
  // Pages that exist before the access group migration must stay public
  const previous = Object.keys(migrations)
    .sort()
    .filter((name) => name < ACCESS_GROUPS_MIGRATION)
    .pop()!;
  await migrateUpTo(previous);
  await knex("pages").insert([
    { page_path: "", page_title: "Home", page_header: "Home" },
    { page_path: "legacy", page_title: "Legacy", page_header: "Legacy" },
  ]);
  await migrateUpTo(null);
  await seedPermissions(knex);
  await seedRoles(knex);
});

afterAll(async () => {
  await knex.destroy();
});

describe("the access group migration", () => {
  it("makes the pages that already exist public", async () => {
    const rows = await knex("page_access_groups").select("access_group_id");
    expect(rows.map((r) => r.access_group_id)).toEqual(["public", "public"]);
  });

  it("creates the built-in groups", async () => {
    const groups = await db.getAllAccessGroups();
    expect(groups.filter((g) => g.is_system).map((g) => g.id)).toEqual(["admin", "public"]);
  });

  it("does not reopen a page made private since, when it runs again", async () => {
    const legacy = (await db.getPageByPath("legacy"))!;
    await db.setPageAccessGroups(legacy.id, []);
    try {
      await migrations[ACCESS_GROUPS_MIGRATION].up(knex);
      expect(await db.getAccessGroupsForPage(legacy.id)).toEqual([]);
    } finally {
      await db.setPageAccessGroups(legacy.id, ["public"]);
    }
  });
});

describe("page access", () => {
  beforeEach(async () => {
    await knex("role_access_groups").del();
    await knex("page_access_groups").del();
    await knex("pages").whereNot("page_path", "").del();
    await knex("access_groups").where("is_system", 0).del();
    await knex("site_data").where("key", "autoPublicPages").del();
    await knex("roles").where("id", "support").del();
    await seedAccessGroups(knex);

    await CreateAccessGroup({ id: "team", group_name: "Team" });
    const home = (await db.getPageByPath(""))!;
    await SetPageAccessGroups(home.id, ["public"]);
    await CreatePage({ page_path: "internal", page_title: "Internal", page_header: "Internal" }, ["team"]);
    await CreatePage({ page_path: "secret", page_title: "Secret", page_header: "Secret" }, []);
    await SetRoleAccessGroups("member", ["team"]);
  });

  it("answers a restricted page like a missing one for visitors who are not signed in", async () => {
    expect(await GetVisiblePageByPath("", null)).toBeDefined();
    expect(await GetVisiblePageByPath("internal", null)).toBeUndefined();
    expect(await GetVisiblePageByPath("does-not-exist", null)).toBeUndefined();
  });

  it("shows a page to roles that share one of its groups", async () => {
    expect(await GetVisiblePageByPath("internal", userWithRoles("member"))).toBeDefined();
    expect(await GetVisiblePageByPath("internal", userWithRoles("editor"))).toBeUndefined();
  });

  it("shows every page to the Administrator role, and a page without groups to nobody else", async () => {
    expect(await GetVisiblePageByPath("secret", userWithRoles("admin"))).toBeDefined();
    expect(await GetVisiblePageByPath("secret", userWithRoles("member"))).toBeUndefined();
  });

  it("ignores the groups of an inactive role", async () => {
    await knex("roles").where("id", "member").update({ status: "INACTIVE" });
    try {
      expect(await GetVisiblePageByPath("internal", userWithRoles("member"))).toBeUndefined();
    } finally {
      await knex("roles").where("id", "member").update({ status: "ACTIVE" });
    }
  });

  it("lists only the pages the user may see", async () => {
    const paths = async (user: UserRecordPublic | null) =>
      (await GetAccessiblePages(user)).map((p) => p.page_path).sort();

    expect(await paths(null)).toEqual([""]);
    expect(await paths(userWithRoles("member"))).toEqual(["", "internal"]);
    expect(await paths(userWithRoles("admin"))).toEqual(["", "internal", "secret"]);
  });

  it("makes new pages public by default, and private when the site setting says NO", async () => {
    const pub = await CreatePage({ page_path: "pub", page_title: "Pub", page_header: "Pub" });
    expect(await db.getAccessGroupsForPage(pub.id)).toEqual(["public"]);

    await knex("site_data").insert({ key: "autoPublicPages", value: "NO", data_type: "string" });
    const priv = await CreatePage({ page_path: "priv", page_title: "Priv", page_header: "Priv" });
    expect(await db.getAccessGroupsForPage(priv.id)).toEqual([]);
  });

  it("creates no page when an access group is invalid", async () => {
    await expect(
      CreatePage({ page_path: "broken", page_title: "Broken", page_header: "Broken" }, ["missing"]),
    ).rejects.toThrow("does not exist");
    expect(await db.getPageByPath("broken")).toBeUndefined();
  });

  it("keeps admin off pages and public off roles", async () => {
    const internal = (await db.getPageByPath("internal"))!;
    await expect(SetPageAccessGroups(internal.id, ["admin"])).rejects.toThrow("only be given to roles");
    await expect(SetRoleAccessGroups("member", ["public"])).rejects.toThrow("only be given to pages");
  });

  it("does not let the Administrator role lose access", async () => {
    await expect(SetRoleAccessGroups("admin", [])).rejects.toThrow("always sees every page");
  });

  it("saves each group once", async () => {
    await SetRoleAccessGroups("member", ["team", "team"]);
    expect(await db.getAccessGroupsForRole("member")).toEqual(["team"]);
  });

  it("rejects reserved, empty and taken group ids", async () => {
    await expect(CreateAccessGroup({ id: "Admin", group_name: "x" })).rejects.toThrow("reserved");
    await expect(CreateAccessGroup({ id: "public", group_name: "x" })).rejects.toThrow("reserved");
    await expect(CreateAccessGroup({ id: "!!!", group_name: "x" })).rejects.toThrow("at least one");
    await expect(CreateAccessGroup({ id: "Team", group_name: "x" })).rejects.toThrow("already exists");
    await expect(CreateAccessGroup({ id: "new", group_name: "  " })).rejects.toThrow("must not be empty");
  });

  it("removes a deleted group from pages and roles, and keeps the built-in groups", async () => {
    await DeleteAccessGroup("team");
    const internal = (await db.getPageByPath("internal"))!;
    expect(await db.getAccessGroupsForPage(internal.id)).toEqual([]);
    expect(await db.getAccessGroupsForRole("member")).toEqual([]);

    await expect(DeleteAccessGroup("public")).rejects.toThrow("cannot be deleted");
    await expect(DeleteAccessGroup("admin")).rejects.toThrow("cannot be deleted");
  });

  it("removes the access groups of a deleted page", async () => {
    const internal = (await db.getPageByPath("internal"))!;
    await db.deletePage(internal.id);
    expect(await knex("page_access_groups").where("page_id", internal.id)).toEqual([]);
  });
});

describe("a fresh install", () => {
  it("seeds a home page that everyone can see", async () => {
    await knex("pages").del();
    await seedAccessGroups(knex);
    await seedPages(knex);

    expect(await GetVisiblePageByPath("", null)).toBeDefined();
  });
});
