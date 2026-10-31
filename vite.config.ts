import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    // as ~270 bandeiras SVG ficam como arquivos (baixadas só quando aparecem),
    // em vez de inchar o CSS
    assetsInlineLimit: (file) => (file.endsWith(".svg") ? false : undefined),
  },
});
