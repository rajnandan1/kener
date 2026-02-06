import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async ({ cookies }) => {
  cookies.delete("kener-user", { path: "/" });
  throw redirect(302, serverResolve("/account/signin"));
};
