import { describe, expect, it } from "vitest";
import { BuildPageViewer, CanViewerSeePage, NormalizeAccessGroupId } from "./pageAccess";

describe("CanViewerSeePage", () => {
  const member = BuildPageViewer(["member"], ["team"]);

  it("shows public pages to everyone, signed in or not", () => {
    expect(CanViewerSeePage(["public"], null)).toBe(true);
    expect(CanViewerSeePage(["public", "team"], null)).toBe(true);
    expect(CanViewerSeePage(["public"], BuildPageViewer(["member"], []))).toBe(true);
  });

  it("hides every other page from visitors who are not signed in", () => {
    expect(CanViewerSeePage(["team"], null)).toBe(false);
    expect(CanViewerSeePage([], null)).toBe(false);
  });

  it("shows a page when it shares a group with the user's roles", () => {
    expect(CanViewerSeePage(["team"], member)).toBe(true);
    expect(CanViewerSeePage(["other", "team"], member)).toBe(true);
    expect(CanViewerSeePage(["other"], member)).toBe(false);
  });

  it("shows a page without groups only to roles that see every page", () => {
    expect(CanViewerSeePage([], member)).toBe(false);
    expect(CanViewerSeePage([], BuildPageViewer(["admin"], []))).toBe(true);
    expect(CanViewerSeePage([], BuildPageViewer(["support"], ["admin"]))).toBe(true);
  });

  it("does not let a role without groups see restricted pages", () => {
    expect(CanViewerSeePage(["team"], BuildPageViewer(["member"], []))).toBe(false);
  });
});

describe("BuildPageViewer", () => {
  it("lets the Administrator role and roles in the admin group see every page", () => {
    expect(BuildPageViewer(["admin"], []).seesAllPages).toBe(true);
    expect(BuildPageViewer(["support"], ["admin"]).seesAllPages).toBe(true);
    expect(BuildPageViewer(["member"], ["team"]).seesAllPages).toBe(false);
  });
});

describe("NormalizeAccessGroupId", () => {
  it("lowercases, turns spaces into hyphens and drops other characters", () => {
    expect(NormalizeAccessGroupId(" Customer A ")).toBe("customer-a");
    expect(NormalizeAccessGroupId("Team_2/EU")).toBe("team_2eu");
  });

  it("can return an empty id, which callers must reject", () => {
    expect(NormalizeAccessGroupId("!!!")).toBe("");
  });
});
