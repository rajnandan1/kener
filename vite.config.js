// @ts-nocheck
import dotenv from "dotenv";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const base = process.env.KENER_BASE_PATH || "";
export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: PORT,
		watch: {
			ignored: ["**/src/lib/server/data/**"] // Adjust the path to the file you want to ignore
		}
	},
	assetsInclude: ["**/*.yaml"]
});
