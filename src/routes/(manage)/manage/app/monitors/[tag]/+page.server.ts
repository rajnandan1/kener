import { getDockerDefaults } from "$lib/server/docker.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => ({ dockerDefaults: getDockerDefaults() });
