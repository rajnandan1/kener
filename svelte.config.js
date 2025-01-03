import { vitePreprocess } from "@sveltejs/kit/vite";
import adapter from "@sveltejs/adapter-node";

const basePath = !!process.env.KENER_BASE_PATH ? process.env.KENER_BASE_PATH : "";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		paths: {
			base: basePath
		}
	},

	preprocess: [vitePreprocess({})]
};

export default config;
