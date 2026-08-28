import { BaseRepository } from "./base.js";
import type { DockerHostRecord, DockerHostInsert, DockerHostUpdate } from "../../types/db.js";
import { GetDbType } from "../../tool.js";

/**
 * Repository for docker_hosts. These are reusable Docker Engine connections referenced by
 * DOCKER monitors through `type_data.dockerHostId`.
 */
export class DockerHostsRepository extends BaseRepository {
  async createDockerHost(data: DockerHostInsert): Promise<number> {
    const insertData = {
      name: data.name,
      connection_type: data.connection_type,
      daemon: data.daemon,
      tls_ca: data.tls_ca ?? null,
      tls_cert: data.tls_cert ?? null,
      tls_key: data.tls_key ?? null,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

    if (GetDbType() === "postgresql") {
      const result = await this.knex("docker_hosts").insert(insertData).returning("id");
      const inserted = Array.isArray(result) ? result[0] : result;
      return typeof inserted === "object" && inserted !== null
        ? Number((inserted as { id: number }).id)
        : Number(inserted);
    }

    const result = await this.knex("docker_hosts").insert(insertData);
    const inserted = Array.isArray(result) ? result[0] : result;
    return typeof inserted === "object" && inserted !== null
      ? Number((inserted as { id: number }).id)
      : Number(inserted);
  }

  async updateDockerHost(data: DockerHostUpdate): Promise<number> {
    return await this.knex("docker_hosts")
      .where({ id: data.id })
      .update({
        name: data.name,
        connection_type: data.connection_type,
        daemon: data.daemon,
        tls_ca: data.tls_ca ?? null,
        tls_cert: data.tls_cert ?? null,
        tls_key: data.tls_key ?? null,
        updated_at: this.knex.fn.now(),
      });
  }

  async getDockerHosts(): Promise<DockerHostRecord[]> {
    return await this.knex("docker_hosts").orderBy("id", "desc");
  }

  async getDockerHostById(id: number): Promise<DockerHostRecord | undefined> {
    return await this.knex("docker_hosts").where("id", id).first();
  }

  async getDockerHostByName(name: string): Promise<DockerHostRecord | undefined> {
    return await this.knex("docker_hosts").where("name", name).first();
  }

  async deleteDockerHost(id: number): Promise<number> {
    return await this.knex("docker_hosts").where("id", id).del();
  }
}
