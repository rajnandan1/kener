import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import serverResolve from "$lib/server/resolver.js";

export const load: PageServerLoad = async () => {
  throw redirect(302, serverResolve("/account/signin"));
};

export const actions: Actions = {
  default: async ({ cookies }) => {
    cookies.delete("kener-user", { path: serverResolve("/") });
    throw redirect(302, serverResolve("/account/signin"));
  },
};
