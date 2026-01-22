import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
  cookies.delete("kener-user", { path: "/" });
  throw redirect(302, "/account/signin");
};
