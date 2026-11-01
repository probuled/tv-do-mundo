// Monta public/data/channels.json a partir da API pública do iptv-org,
// geolocalizando cada canal com coordenadas do Wikidata.
//
//   npm run data            (usa cache em .cache/; apague-o para atualizar)
//
// Localização: correção em scripts/overrides.json > cidade do feed (ct/) >
// estado (s/) > capital do país (c/ ou o país do canal). Canais no mesmo lugar
// são espalhados numa espiral.

import fs from "node:fs";
import path from "node:path";

const API = "https://iptv-org.github.io/api/";
const CACHE = path.resolve(".cache");
const OUT = path.resolve("public/data/channels.json");
const UA = "tv-do-mundo/0.1 (https://github.com/iptv-org/iptv)";

fs.mkdirSync(CACHE, { recursive: true });

async function cached<T>(name: string, load: () => Promise<T>): Promise<T> {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const data = await load();
  fs.writeFileSync(file, JSON.stringify(data));
  return data;
}

const api = <T>(name: string) =>
  cached<T>(`${name}.json`, async () => {
    const res = await fetch(API + name + ".json");
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    console.log(`baixado ${name}.json`);
    return res.json() as Promise<T>;
  });

// ---------- tipos da API iptv-org ----------
interface Channel {
  id: string;
  name: string;
  country: string;
  categories: string[];
  is_nsfw: boolean;
  closed: string | null;
  website: string | null;
}
interface Feed {
  channel: string;
  id: string;
  is_main: boolean;
  broadcast_area: string[];
  timezones: string[];
  languages: string[];
}
interface Stream {
  channel: string | null;
  feed: string | null;
  title: string;
  url: string;
  quality: string | null;
  labels: string[];
  user_agent: string | null;
  referrer: string | null;
}
interface Logo {
  channel: string;
  feed: string | null;
  in_use: boolean;
  url: string;
  format: string | null;
}
interface Country {
  code: string;
  name: string;
  flag: string;
}
interface Subdivision {
  code: string;
  name: string;
  country: string;
}
interface City {
  code: string;
  name: string;
  country: string;
  subdivision: string | null;
  wikidata_id: string | null;
}
interface Named {
  code?: string;
  id?: string;
  name: string;
}

// ---------- Wikidata ----------
type LatLng = [number, number];

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: new URLSearchParams({ query }),
    });
    if (res.ok)
      return ((await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
    if (attempt >= 3) throw new Error(`Wikidata HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

const point = (wkt: string): LatLng | null => {
  const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(wkt);
  return m ? [Number(m[2]), Number(m[1])] : null;
};

async function batched(keys: string[], size: number, run: (chunk: string[]) => Promise<Record<string, LatLng>>) {
  const out: Record<string, LatLng> = {};
  for (let i = 0; i < keys.length; i += size) {
    Object.assign(out, await run(keys.slice(i, i + size)));
    await new Promise((r) => setTimeout(r, 300)); // gentil com o Wikidata
  }
  return out;
}

// ---------- principal ----------
const [channels, feeds, streams, logos, countries, subdivisions, cities, categories, languages, blocklist] =
  await Promise.all([
    api<Channel[]>("channels"),
    api<Feed[]>("feeds"),
    api<Stream[]>("streams"),
    api<Logo[]>("logos"),
    api<Country[]>("countries"),
    api<Subdivision[]>("subdivisions"),
    api<City[]>("cities"),
    api<Named[]>("categories"),
    api<Named[]>("languages"),
    api<{ channel: string }[]>("blocklist"),
  ]);

const blocked = new Set(blocklist.map((b) => b.channel));
const chById = new Map(channels.map((c) => [c.id, c]));
const feedsBy = new Map<string, Feed[]>();
for (const f of feeds) (feedsBy.get(f.channel) ?? feedsBy.set(f.channel, []).get(f.channel)!).push(f);
const cityBy = new Map(cities.map((c) => [c.code, c]));
const subBy = new Map(subdivisions.map((s) => [s.code, s]));
const countryBy = new Map(countries.map((c) => [c.code, c]));

// saúde dos streams, se scripts/check-streams.ts já rodou
const healthFile = path.join(CACHE, "health.json");
const health: { checkedAt: string; results: Record<string, boolean | "maybe"> } | null = fs.existsSync(healthFile)
  ? JSON.parse(fs.readFileSync(healthFile, "utf8"))
  : null;

// streams tocáveis no navegador: sem User-Agent/Referer próprios (o navegador
// não deixa definir) e de canais não adultos, não encerrados, não bloqueados
const streamsBy = new Map<string, Stream[]>();
for (const s of streams) {
  if (!s.channel || s.user_agent || s.referrer) continue;
  const ch = chById.get(s.channel);
  if (!ch || ch.is_nsfw || ch.closed || blocked.has(ch.id) || ch.categories.includes("xxx")) continue;
  if (health && health.results[s.url] === false) continue;
  (streamsBy.get(s.channel) ?? streamsBy.set(s.channel, []).get(s.channel)!).push(s);
}
console.log(`canais com stream utilizável: ${streamsBy.size}`);

// lugar de cada canal
type Level = "city" | "subdivision" | "country";
interface Place {
  level: Level;
  key: string; // código iptv-org
  country: string;
  state?: string; // código do estado (subdivision), quando conhecido
  national?: boolean; // cobre o país inteiro; o lugar é a sede
  coord?: LatLng; // coordenada fixa (cidade fora da lista do iptv-org)
  name?: string;
}

// Correções feitas à mão em scripts/overrides.json: o iptv-org marca muitos
// canais regionais como "país inteiro". Cada entrada diz o estado (e a cidade)
// de cobertura, ou marca o canal como nacional com a cidade da sede.
interface Override {
  state?: string;
  city?: string;
  coords?: LatLng;
  national?: boolean;
}
const overrides: Record<string, Override> = JSON.parse(fs.readFileSync(path.resolve("scripts/overrides.json"), "utf8"));
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function placeFromOverride(ch: Channel, o: Override): Place {
  const fail = (why: string): never => {
    throw new Error(`overrides.json, ${ch.id}: ${why}`);
  };
  const national = o.national === true;
  if (o.state && subBy.get(o.state)?.country !== ch.country) fail(`estado desconhecido "${o.state}"`);
  if (o.city) {
    const state = o.state ?? fail("cidade sem estado");
    if (o.coords) {
      const key = `${state}:${fold(o.city)}`;
      return { level: "city", key, country: ch.country, state, national, coord: o.coords, name: o.city };
    }
    const found = cities.filter((c) => c.subdivision === state && fold(c.name) === fold(o.city!));
    if (found.length !== 1) fail(`cidade "${o.city}" não encontrada em ${state} (use "coords")`);
    return { level: "city", key: found[0].code, country: ch.country, state, national, name: o.city };
  }
  if (o.state) return { level: "subdivision", key: o.state, country: ch.country, state: o.state, national };
  if (!national) fail("sem estado, cidade nem national");
  return { level: "country", key: ch.country, country: ch.country, national };
}

function placeOf(ch: Channel): Place {
  const override = overrides[ch.id];
  if (override) return placeFromOverride(ch, override);
  const fs_ = (feedsBy.get(ch.id) ?? []).sort((a, b) => Number(b.is_main) - Number(a.is_main));
  const areas = fs_.flatMap((f) => f.broadcast_area);
  const city = areas.find((a) => a.startsWith("ct/") && cityBy.has(a.slice(3)));
  if (city) {
    const c = cityBy.get(city.slice(3))!;
    return { level: "city", key: c.code, country: c.country, state: c.subdivision ?? undefined };
  }
  const sub = areas.find((a) => a.startsWith("s/") && subBy.has(a.slice(2)));
  if (sub)
    return { level: "subdivision", key: sub.slice(2), country: subBy.get(sub.slice(2))!.country, state: sub.slice(2) };
  const c = areas.find((a) => a.startsWith("c/") && countryBy.has(a.slice(2)) && a.slice(2) === ch.country);
  return { level: "country", key: c ? c.slice(2) : ch.country, country: c ? c.slice(2) : ch.country };
}

const placed = [...streamsBy.keys()].map((id) => ({ ch: chById.get(id)!, place: placeOf(chById.get(id)!) }));

// coordenadas
const countryCoords = await cached("geo-countries.json", async () => {
  const rows = await sparql(`
    SELECT ?code (SAMPLE(?capCoord) AS ?cap) (SAMPLE(?ownCoord) AS ?own) WHERE {
      ?c wdt:P297 ?code .
      OPTIONAL { ?c wdt:P36 ?capital . ?capital wdt:P625 ?capCoord . }
      OPTIONAL { ?c wdt:P625 ?ownCoord . }
    } GROUP BY ?code`);
  const out: Record<string, LatLng> = {};
  for (const r of rows) {
    const p = point((r.cap ?? r.own)?.value ?? "");
    if (p) out[r.code.value] = p;
  }
  console.log(`Wikidata: ${Object.keys(out).length} países`);
  return out;
});

// Coordenadas ficam em .cache/; só as chaves que ainda não estão lá vão ao
// Wikidata (as correções do overrides.json trazem cidades novas). Sem rede,
// segue com o que já está no cache.
async function cachedCoords(
  name: string,
  keys: string[],
  fetchMissing: (keys: string[]) => Promise<Record<string, LatLng>>,
): Promise<Record<string, LatLng>> {
  const file = path.join(CACHE, name);
  const have: Record<string, LatLng> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const missing = keys.filter((k) => !(k in have));
  if (!missing.length) return have;
  try {
    Object.assign(have, await fetchMissing(missing));
    fs.writeFileSync(file, JSON.stringify(have));
  } catch (e) {
    console.warn(`${name}: ${missing.length} sem coordenada (${(e as Error).message})`);
  }
  return have;
}

const subKeys = [...new Set(placed.flatMap((p) => (p.place.state ? [p.place.state] : [])))];
const subCoords = await cachedCoords("geo-subdivisions.json", subKeys, (keys) =>
  batched(keys, 200, async (chunk) => {
    const rows = await sparql(`
      SELECT ?code (SAMPLE(?coord) AS ?p) WHERE {
        VALUES ?code { ${chunk.map((c) => `"${c}"`).join(" ")} }
        ?s wdt:P300 ?code ; wdt:P625 ?coord .
      } GROUP BY ?code`);
    return Object.fromEntries(rows.map((r) => [r.code.value, point(r.p.value)]).filter(([, p]) => p));
  }),
);

const cityKeys = [...new Set(placed.filter((p) => p.place.level === "city" && !p.place.coord).map((p) => p.place.key))];
const qidToCity = new Map(
  cityKeys.map((k) => [cityBy.get(k)!.wikidata_id, k] as const).filter(([q]) => q && /^Q\d+$/.test(q)),
);
const cityCoords = await cachedCoords("geo-cities.json", cityKeys, (keys) => {
  const qids = keys.map((k) => cityBy.get(k)!.wikidata_id).filter((q): q is string => !!q && /^Q\d+$/.test(q));
  return batched(qids, 250, async (chunk) => {
    const rows = await sparql(`
      SELECT ?c (SAMPLE(?coord) AS ?p) WHERE {
        VALUES ?c { ${chunk.map((q) => `wd:${q}`).join(" ")} }
        ?c wdt:P625 ?coord .
      } GROUP BY ?c`);
    const out: Record<string, LatLng> = {};
    for (const r of rows) {
      const q = r.c.value.split("/").pop()!;
      const p = point(r.p.value);
      if (p && qidToCity.has(q)) out[qidToCity.get(q)!] = p;
    }
    return out;
  });
});

// o iptv-org usa alguns códigos fora do ISO 3166-1
const ISO_ALIAS: Record<string, string> = { UK: "GB" };

// resolve com fallback cidade -> estado -> país
const levelStats: Record<string, number> = {};
const groups = new Map<string, { coord: LatLng; level: Level; name: string; items: Channel[] }>();
const stateOf = new Map<string, string>(); // canal -> estado, só para canais regionais
const nationalIds = new Set<string>();
for (const { ch, place } of placed) {
  let level = place.level;
  let coord: LatLng | undefined;
  let key = place.key;
  let name = "";
  if (level === "city") {
    coord = place.coord ?? cityCoords[key];
    name = place.name ?? cityBy.get(key)!.name;
    if (!coord) {
      const sub = place.state;
      if (sub && subCoords[sub]) {
        level = "subdivision";
        key = sub;
        coord = subCoords[sub];
      } else level = "country";
    }
  }
  if (level === "subdivision" && !coord) {
    coord = subCoords[key];
    name = subBy.get(key)?.name ?? "";
    if (!coord) level = "country";
  }
  if (level === "country") {
    key = place.country;
    coord = countryCoords[key] ?? countryCoords[ISO_ALIAS[key]];
    name = countryBy.get(key)?.name ?? key;
  }
  if (!coord) continue;
  if (place.national) nationalIds.add(ch.id);
  else if (place.state) stateOf.set(ch.id, place.state);
  levelStats[level] = (levelStats[level] ?? 0) + 1;
  const gk = `${level}:${key}`;
  const g = groups.get(gk) ?? groups.set(gk, { coord, level, name, items: [] }).get(gk)!;
  // o nome escrito no overrides.json tem acento; o do iptv-org às vezes não
  if (place.name && level === place.level) g.name = place.name;
  g.items.push(ch);
}
console.log("canais por nível:", levelStats);

// espiral dourada em volta do lugar: mais espaçada quanto menos preciso
// Site e logo vão para href/src no app: só aceitar http(s), nunca "javascript:".
const safeUrl = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : undefined);

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const STEP: Record<Level, number> = { city: 0.06, subdivision: 0.1, country: 0.16 };

const logoBy = new Map<string, string>();
for (const l of logos) {
  if (!l.in_use || !safeUrl(l.url)) continue;
  if (!logoBy.has(l.channel) || l.feed === null) logoBy.set(l.channel, l.url);
}

const usedLangs = new Set<string>();
const out: unknown[] = [];
let placeId = 0;
const LV: Record<Level, string> = { city: "ct", subdivision: "s", country: "c" };
const places: { n: string; lv: string; la: number; lo: number; c: string }[] = [];
for (const g of [...groups.values()].sort((a, b) => b.items.length - a.items.length)) {
  const pid = placeId++;
  places.push({ n: g.name, lv: LV[g.level], la: g.coord[0], lo: g.coord[1], c: g.items[0].country });
  // canais com mais streams no miolo
  g.items.sort((a, b) => streamsBy.get(b.id)!.length - streamsBy.get(a.id)!.length || a.name.localeCompare(b.name));
  g.items.forEach((ch, k) => {
    const r = k === 0 ? 0 : STEP[g.level] * Math.sqrt(k + 0.5);
    const a = k * GOLDEN;
    const lat = Math.max(-85, Math.min(85, g.coord[0] + r * Math.sin(a)));
    const lng = g.coord[1] + (r * Math.cos(a)) / Math.max(0.2, Math.cos((g.coord[0] * Math.PI) / 180));
    const main = (feedsBy.get(ch.id) ?? []).find((f) => f.is_main) ?? feedsBy.get(ch.id)?.[0];
    const langs = main?.languages ?? [];
    langs.forEach((l) => usedLangs.add(l));
    const ss = streamsBy
      .get(ch.id)!
      .sort((x, y) => Number(y.url.startsWith("https")) - Number(x.url.startsWith("https")))
      .map((s) => {
        const flags =
          (s.labels.includes("Geo-blocked") ? "g" : "") +
          (s.labels.includes("Not 24/7") ? "n" : "") +
          (health?.results[s.url] === true ? "v" : "");
        return [s.url, s.quality ?? "", flags];
      });
    out.push({
      id: ch.id,
      n: ch.name,
      c: ch.country,
      cat: ch.categories,
      la: Math.round(lat * 1e4) / 1e4,
      lo: Math.round((((lng + 540) % 360) - 180) * 1e4) / 1e4,
      p: pid,
      s: ss,
      ...(logoBy.has(ch.id) ? { lg: logoBy.get(ch.id) } : {}),
      ...(langs.length ? { l: langs } : {}),
      ...(main?.timezones?.[0] ? { tz: main.timezones[0] } : {}),
      ...(safeUrl(ch.website) ? { w: ch.website } : {}),
      ...(stateOf.has(ch.id) ? { st: stateOf.get(ch.id) } : {}),
      ...(nationalIds.has(ch.id) ? { nat: 1 } : {}),
    });
  });
}

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  checkedAt: health?.checkedAt ?? null,
  countries: Object.fromEntries(countries.map((c) => [c.code, [c.name, c.flag]])),
  categories: Object.fromEntries(categories.filter((c) => c.id !== "xxx").map((c) => [c.id, c.name])),
  languages: Object.fromEntries(languages.filter((l) => usedLangs.has(l.code!)).map((l) => [l.code, l.name])),
  places,
  // nomes dos estados que aparecem no filtro (os do Brasil o app mostra com acento)
  subdivisions: Object.fromEntries([...new Set(stateOf.values())].sort().map((code) => [code, subBy.get(code)!.name])),
  channels: out,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data));
console.log(
  `ok: ${out.length} canais em ${places.length} lugares -> ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`,
);
