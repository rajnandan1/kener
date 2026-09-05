import type { Knex } from "knex";

/**
 * Docker hosts are reusable Docker Engine connections. A DOCKER monitor stores only
 * the host id plus the container it watches, so one daemon can be described once and
 * shared by every container monitor pointing at it.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("docker_hosts"))) {
    await knex.schema.createTable("docker_hosts", (table) => {
      table.increments("id").primary();
      table.string("name", 255).notNullable().unique();
      // socket | tcp | tls
      table.string("connection_type", 32).notNullable().defaultTo("socket");
      // Unix socket path / Windows named pipe for "socket", host:port (or a full URL) otherwise
      table.text("daemon").notNullable();
      // PEM material, only used by the "tls" connection type
      table.text("tls_ca");
      table.text("tls_cert");
      table.text("tls_key");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("docker_hosts");
}
