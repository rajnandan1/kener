// @ts-nocheck
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import dotenv from "dotenv";
dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
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
