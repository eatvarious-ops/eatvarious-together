import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
const bundle = await build({
  entryPoints: ["src/App.jsx"],
  bundle: true,
  minify: true,
  write: false,
  outdir: "dist",
  format: "iife",
  loader: { ".jpg": "dataurl", ".svg": "dataurl", ".png": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "inline",
});
const css = bundle.outputFiles.find((f) => f.path.endsWith(".css")).text;
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
// Only browser-public settings belong in the generated HTML.
// Team NAVER Maps public Client ID (Dynamic Map). Browser-exposed by design;
// allowed web URLs are restricted in the NAVER Cloud console. Set
// ITDA_NAVER_CLIENT_ID to override. `--no-naver` builds without it (offline
// tests exercise the OpenStreetMap fallback, which needs no network).
const NAVER_PUBLIC_CLIENT_ID = "vhkb2gac8j";
const config = {
  naverKey: process.argv.includes("--no-naver")
    ? ""
    : process.env.ITDA_NAVER_CLIENT_ID || NAVER_PUBLIC_CLIENT_ID,
  supabaseUrl: process.env.ITDA_SUPABASE_URL || "",
  supabaseAnonKey: process.env.ITDA_SUPABASE_PUBLIC_KEY || "",
};
if (Boolean(config.supabaseUrl) !== Boolean(config.supabaseAnonKey)) {
  throw new Error("Set both ITDA_SUPABASE_URL and ITDA_SUPABASE_PUBLIC_KEY.");
}
const html =
  '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#235c49"><title>잇다 · 캠퍼스 식당 지도</title><style>' +
  css +
  '</style></head><body><div id="itda-campus-app"></div><script>window.ITDA_CONFIG=' +
  JSON.stringify(config).replaceAll("<", "\\u003c") +
  "</script><script>" +
  js.replace(/<\/script/gi, "<\\/script") +
  "</script></body></html>";
await writeFile("dist/index.html", html);
