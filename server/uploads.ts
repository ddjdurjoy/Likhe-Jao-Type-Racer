import path from "path";
import fs from "fs";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}
