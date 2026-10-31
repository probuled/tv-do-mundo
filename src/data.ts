// Tipos e utilitários para o channels.json gerado por scripts/build-data.ts.

export type StreamTuple = [url: string, quality: string, flags: string]; // flags: g=geo-bloqueado, n=não 24/7, v=verificado

export interface Channel {
  id: string;
  n: string; // nome
  c: string; // país (código iptv-org)
  cat: string[];
  la: number;
  lo: number;
  p: number; // índice em places
  s: StreamTuple[];
  lg?: string; // logo
  l?: string[]; // idiomas
  tz?: string; // fuso horário
  w?: string; // site
}

export interface Place {
  n: string;
  lv: "ct" | "s" | "c"; // cidade, estado, país
  la: number;
  lo: number;
  c: string;
}

export interface WorldData {
  generatedAt: string;
  checkedAt: string | null;
  countries: Record<string, [name: string, flag: string]>;
  categories: Record<string, string>;
  languages: Record<string, string>;
  places: Place[];
  channels: Channel[];
}

export async function loadWorld(): Promise<WorldData> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/channels.json`);
  if (!res.ok) throw new Error(`Falha ao carregar canais (${res.status})`);
  return res.json();
}

// Paleta discreta de seis tons, repetida na ordem das categorias mais comuns.
// Os pontos do globo e os chips da barra lateral usam as mesmas cores.
const PALETTE = {
  blue: "#6ea8f5",
  salmon: "#ef8a6f",
  purple: "#b38cf0",
  green: "#5ccf96",
  amber: "#efbf5e",
  pink: "#ef7fa3",
};

export const CATEGORY_COLORS: Record<string, string> = {
  general: PALETTE.blue,
  news: PALETTE.salmon,
  religious: PALETTE.purple,
  entertainment: PALETTE.green,
  music: PALETTE.amber,
  movies: PALETTE.pink,
  series: PALETTE.blue,
  sports: PALETTE.salmon,
  kids: PALETTE.purple,
  education: PALETTE.green,
  culture: PALETTE.amber,
  documentary: PALETTE.pink,
  legislative: PALETTE.blue,
  comedy: PALETTE.salmon,
  lifestyle: PALETTE.purple,
  animation: PALETTE.green,
  classic: PALETTE.amber,
  shop: PALETTE.pink,
  outdoor: PALETTE.blue,
  business: PALETTE.salmon,
  travel: PALETTE.purple,
  cooking: PALETTE.green,
  family: PALETTE.amber,
  public: PALETTE.pink,
  auto: PALETTE.blue,
  weather: PALETTE.salmon,
  science: PALETTE.purple,
  relax: PALETTE.green,
  interactive: PALETTE.amber,
  outros: "#8fa3bd",
};

// Nomes em português das categorias do iptv-org
export const CATEGORY_PT: Record<string, string> = {
  animation: "Animação",
  auto: "Automóveis",
  business: "Negócios",
  classic: "Clássicos",
  comedy: "Comédia",
  cooking: "Culinária",
  culture: "Cultura",
  documentary: "Documentários",
  education: "Educação",
  entertainment: "Entretenimento",
  family: "Família",
  general: "Variedades",
  interactive: "Interativo",
  kids: "Infantil",
  legislative: "Legislativo",
  lifestyle: "Estilo de vida",
  movies: "Filmes",
  music: "Música",
  news: "Notícias",
  outdoor: "Ar livre",
  public: "Pública",
  relax: "Relaxar",
  religious: "Religioso",
  science: "Ciência",
  series: "Séries",
  shop: "Compras",
  sports: "Esportes",
  travel: "Viagem",
  weather: "Clima",
};

export const catName = (id: string, world: WorldData) => CATEGORY_PT[id] ?? world.categories[id] ?? id;
export const catColor = (cats: string[]) => CATEGORY_COLORS[cats.find((c) => CATEGORY_COLORS[c]) ?? "outros"];

// Nomes em português pelo próprio navegador; a API do iptv-org só tem inglês.
const regionPt = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const languagePt = new Intl.DisplayNames(["pt-BR"], { type: "language" });

export const countryOf = (w: WorldData, code: string): [name: string, flag: string] => {
  const api = w.countries[code] ?? [code, ""];
  try {
    const pt = regionPt.of(code === "UK" ? "GB" : code);
    return [pt && pt !== code ? pt : api[0], api[1]];
  } catch {
    return api;
  }
};

export const langName = (w: WorldData, code: string) => {
  try {
    const pt = languagePt.of(code);
    if (pt && pt !== code) return pt[0].toUpperCase() + pt.slice(1);
  } catch {
    /* código desconhecido */
  }
  return w.languages[code] ?? code;
};

export function localTime(tz: string | undefined, now = new Date()) {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(now);
  } catch {
    return null;
  }
}

// Posição do Sol (ponto subsolar) para o terminador dia/noite.
export function subsolarPoint(date = new Date()): { lat: number; lng: number } {
  const rad = Math.PI / 180;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda)) / rad;
  // equação do tempo (minutos), aproximação
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad;
  const eot = 4 * (((L - ra + 540) % 360) - 180);
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const lng = -((utcMin + eot) / 4 - 180);
  return { lat: decl, lng: ((lng + 540) % 360) - 180 };
}

// Num site em HTTPS o navegador bloqueia streams HTTP (conteúdo misto).
export const isSecurePage = () => globalThis.location?.protocol === "https:";

export function playableStreams(ch: Channel, secure = isSecurePage()): StreamTuple[] {
  const list = secure ? ch.s.filter(([u]) => u.startsWith("https:")) : ch.s;
  // verificados primeiro, depois os sem geo-bloqueio
  return [...list].sort((a, b) => score(b) - score(a));
}
const score = ([, , f]: StreamTuple) => (f.includes("v") ? 2 : 0) + (f.includes("g") ? -1 : 0);

// Código para o flag-icons (o iptv-org usa UK em vez de GB).
export const flagCode = (code: string) => (code === "UK" ? "gb" : code.toLowerCase());
