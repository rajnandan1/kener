import { describe, expect, it } from "vitest";
import { SplitGroupMembers } from "./groupMembers";

describe("SplitGroupMembers", () => {
  it("removes hidden tags and counts them per group", () => {
    const result = SplitGroupMembers(
      { web: ["api", "secret-a", "db", "secret-b"], other: ["secret-a"] },
      new Set(["secret-a", "secret-b"]),
    );
    expect(result.membersByTag).toEqual({ web: ["api", "db"], other: [] });
    expect(result.hiddenCountByTag).toEqual({ web: 2, other: 1 });
  });

  it("keeps every member and reports no counts when nothing is hidden", () => {
    const result = SplitGroupMembers({ web: ["api", "db"] }, new Set());
    expect(result.membersByTag).toEqual({ web: ["api", "db"] });
    expect(result.hiddenCountByTag).toEqual({});
  });

  it("never returns a hidden tag", () => {
    const result = SplitGroupMembers({ web: ["secret"] }, new Set(["secret"]));
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
