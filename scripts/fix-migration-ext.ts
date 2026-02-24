/**
 * Renames .js migration entries to .ts in the knex_migrations table.
 * This is needed because migration files were renamed from .js to .ts,
 * but existing databases still reference the old .js filenames.
 *
 * Idempotent — safe to run multiple times.
 */
import knex from "knex";
import knexOb from "../knexfile.js";

const db = knex(knexOb);

async function fixMigrationExtensions() {
  try {
    const hasTable = await db.schema.hasTable("knex_migrations");
    if (!hasTable) {
      console.log("No knex_migrations table found, skipping.");
      return;
    }

    const oldJsMigrations = await db("knex_migrations").where("name", "like", "%.js");
    if (oldJsMigrations.length === 0) {
      console.log("No .js migration entries found, nothing to rename.");
      return;
    }

    for (const row of oldJsMigrations) {
      const newName = row.name.replace(/\.js$/, ".ts");
      await db("knex_migrations").where("id", row.id).update({ name: newName });
      console.log(`Renamed: ${row.name} -> ${newName}`);
    }

    console.log(`Fixed ${oldJsMigrations.length} migration record(s).`);
  } catch (err) {
    console.error("Error fixing migration extensions:", err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

fixMigrationExtensions();
