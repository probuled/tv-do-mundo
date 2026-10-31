// Testa todos os streams e grava .cache/health.json, usado por build-data.ts:
//   true    = playlist HLS válida e com CORS liberado (toca no navegador)
//   false   = morto (404/410, domínio inexistente, resposta que não é playlist)
//   "maybe" = falhou de um jeito que pode ser só daqui (403/451 geo-bloqueio,
//             timeout, sem CORS): fica no mapa, mas sem selo de verificado
//
//   npm run check   (leva alguns minutos; depois rode npm run data)

import fs from "node:fs";
import path from "node:path";

const CACHE = path.resolve(".cache");
const streams: { channel: string | null; url: string; user_agent: string | null; referrer: string | null }[] =
  JSON.parse(fs.readFileSync(path.join(CACHE, "streams.json"), "utf8"));

const todo = streams.filter((s) => s.channel && !s.user_agent && !s.referrer).map((s) => s.url);
const results: Record<string, boolean | "maybe"> = {};
const CONCURRENCY = 48;
const TIMEOUT = 10_000;

async function probe(url: string): Promise<boolean | "maybe"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { Origin: "http://localhost:5173", "User-Agent": "Mozilla/5.0 tv-do-mundo-check" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (res.status === 404 || res.status === 410) return false;
    if (!res.ok) return "maybe";
    const reader = res.body?.getReader();
    const first = reader ? new TextDecoder().decode((await reader.read()).value ?? new Uint8Array()) : "";
    reader?.cancel().catch(() => {});
    if (!first.includes("#EXTM3U")) return false;
    return res.headers.get("access-control-allow-origin") ? true : "maybe";
  } catch (e) {
    const code = (e as { cause?: { code?: string } }).cause?.code;
    return code === "ENOTFOUND" || code === "ECONNREFUSED" ? false : "maybe";
  } finally {
    clearTimeout(timer);
  }
}

let next = 0;
let done = 0;
// Limite rígido: DNS e alguns servidores ignoram o AbortController e travariam
// o worker para sempre.
const withDeadline = (url: string) =>
  Promise.race([probe(url), new Promise<"maybe">((r) => setTimeout(() => r("maybe"), TIMEOUT + 5_000))]);

async function worker() {
  while (next < todo.length) {
    const url = todo[next++];
    results[url] = await withDeadline(url);
    if (++done % 500 === 0) console.log(`${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const vals = Object.values(results);
console.log(
  `ok: ${vals.filter((v) => v === true).length} · mortos: ${vals.filter((v) => v === false).length} · incertos: ${vals.filter((v) => v === "maybe").length}`,
);
fs.writeFileSync(path.join(CACHE, "health.json"), JSON.stringify({ checkedAt: new Date().toISOString(), results }));
