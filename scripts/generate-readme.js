import fs from "fs";
import Mustache from "mustache";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Resolve paths correctly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the template
const templatePath = path.resolve(__dirname, "../README.template.md");
const template = fs.readFileSync(templatePath, "utf-8");

// Load environment variables and provide default values
const data = {
  kener_full_version: process.env.BUILD_FULL_VERSION || "N/A",
  kener_major_version: process.env.BUILD_MAJOR_VERSION || "N/A",
  kener_major_minor_version: process.env.BUILD_MAJOR_MINOR_VERSION || "N/A",
};

// Render README.md
const output = Mustache.render(template, data);

// Write to README.md
fs.writeFileSync(path.resolve(__dirname, "../README.md"), output);

console.log("✅ README.md generated successfully!");
