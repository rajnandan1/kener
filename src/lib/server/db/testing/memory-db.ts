import knexFactory, { type Knex } from "knex";

// Vite resolves the glob at transform time, so the TypeScript migration files
// load under vitest without knex's filesystem loader (which cannot import .ts).
const migrationModules = import.meta.glob("/migrations/*.ts");

export const migrationSource: Knex.MigrationSource<string> = {
  getMigrations: async () => Object.keys(migrationModules).sort(),
  getMigrationName: (path) => path.split("/").pop() as string,
  getMigration: async (path) => (await migrationModules[path]()) as Knex.Migration,
};

/**
 * A fresh in-memory SQLite database with every migration applied.
 * Test-only. Call `knex.destroy()` in `afterEach`/`afterAll`.
 */
export async function createMemoryDb(): Promise<Knex> {
  const knex = knexFactory({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });
  await knex.migrate.latest({ migrationSource });
  return knex;
}
