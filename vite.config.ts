import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react';
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    host: "127.0.0.1",
    allowedHosts: true
  },
  resolve: {
    alias: {
      "@app": path.resolve("src/app"),
      "@entities": path.resolve("src/entities"),
      "@features": path.resolve("src/features"),
      "@pages": path.resolve("src/pages"),
      "@shared": path.resolve("src/shared"),
      "@widgets": path.resolve("src/widgets"),
    },
  },
})