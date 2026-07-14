import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ['pdfjs-dist'],
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.BACKEND_API_URL,
        changeOrigin: true,
      },
    },
  },
});
