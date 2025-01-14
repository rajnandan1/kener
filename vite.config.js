// @ts-nocheck
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import dotenv from "dotenv";
dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const base = process.env.KENER_BASE_PATH || "";
export default defineConfig({
	logLevel: "silent",
	plugins: [
		sveltekit(),
		{
			name: "kener-startup-message",
			configureServer(server) {
				server.httpServer?.once("listening", () => {
					const address = server.httpServer?.address();
					const host = "localhost";
					const port = address?.port;
					console.log("\n🚀 Kener is running");
					console.log(`⚙️ Manage Kener: http://${host}:${port}${base}/manage/app/site\n`);
				});
			}
		}
	],
	server: {
		port: PORT,
		watch: {
			ignored: ["**/src/lib/server/data/**"] // Adjust the path to the file you want to ignore
		}
	},
	assetsInclude: ["**/*.yaml"]
});
