import { describe, expect, it, vi } from "vitest";
import { PagesRepository } from "./pages.js";

vi.mock("../../tool.js", () => ({
  GetDbType: () => "sqlite",
}));

describe("PagesRepository.replacePageLogo", () => {
  it("keeps the previous image when page settings still reference it", async () => {
    const deletedImageIds: string[] = [];
    let queryIndex = 0;

    const makeQuery = (table: string) => {
      const index = queryIndex++;
      const clauses: Array<{ method: string; args: unknown[] }> = [];
      const chain: any = {
        where(...args: unknown[]) {
          clauses.push({ method: "where", args });
          return chain;
        },
        whereIn(...args: unknown[]) {
          clauses.push({ method: "whereIn", args });
          return chain;
        },
        andWhere(...args: unknown[]) {
          clauses.push({ method: "andWhere", args });
          return chain;
        },
        andWhereNot(...args: unknown[]) {
          clauses.push({ method: "andWhereNot", args });
          return chain;
        },
        forUpdate() {
          return chain;
        },
        first: async () => {
          if (table === "pages" && index === 0) {
            return { page_logo: "/assets/images/old-image" };
          }
          if (table === "pages" && index === 2) {
            return undefined;
          }
          if (table === "site_data") {
            return undefined;
          }
          if (table === "pages" && index === 3) {
            return { id: 2 };
          }
          return undefined;
        },
        insert: async () => [1],
        update: async () => 1,
        del: async () => {
          if (table === "images") {
            const idClause = clauses.find((clause) => clause.method === "where" && clause.args[0] === "id");
            deletedImageIds.push(String(idClause?.args[1]));
          }
          return 1;
        },
      };
      return chain;
    };

    const trx = Object.assign((table: string) => makeQuery(table), {
      fn: { now: () => "now" },
    });

    const knex = {
      fn: { now: () => "now" },
      transaction: async (callback: (trx: any) => Promise<boolean>) => callback(trx),
    };

    const repository = new PagesRepository(knex as never);
    const result = await repository.replacePageLogo(1, { id: 2 } as never);

    expect(result).toBe(true);
    expect(deletedImageIds).toEqual([]);
  });
});
