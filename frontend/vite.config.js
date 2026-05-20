import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bei einem GitHub-Pages-Deployment unter https://USER.github.io/REPO/ muss
// `base` auf "/REPO/" gesetzt werden. Lokal ist der Default "/".
const base = process.env.VITE_BASE_PATH || "/";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base
});
