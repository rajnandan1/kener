import { BASE_PATH } from "$lib/server/constants";

export async function load() {
  return {
    basePath: BASE_PATH
  };
}
