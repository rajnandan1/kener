import { BaseRepository } from "./base.js";
import type { ImageRecord, ImageRecordInsert } from "../../types/db.js";

/**
 * Repository for images operations
 */
export class ImagesRepository extends BaseRepository {
  async insertImage(data: ImageRecordInsert): Promise<string> {
    await this.knex("images").insert(data);
    return data.id;
  }

  async getImageById(id: string): Promise<ImageRecord | undefined> {
    return await this.knex("images").where("id", id).first();
  }

  async deleteImage(id: string): Promise<number> {
    return await this.knex("images").where("id", id).del();
  }

  async getAllImages(): Promise<ImageRecord[]> {
    return await this.knex("images")
      .select("id", "mime_type", "original_name", "width", "height", "size", "created_at")
      .orderBy("created_at", "desc");
  }
}
