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
  st?: string; // estado de cobertura (código ISO 3166-2, ex.: "BR-PA"), só em canais regionais
  nat?: 1; // canal nacional: cobre o país inteiro e fica na cidade da sede
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
  subdivisions?: Record<string, string>; // nome dos estados usados em "st"
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

// Estados do Brasil com acento; os nomes do iptv-org vêm sem ("Sao Paulo").
const BR_STATES: Record<string, string> = {
  "BR-AC": "Acre",
  "BR-AL": "Alagoas",
  "BR-AM": "Amazonas",
  "BR-AP": "Amapá",
  "BR-BA": "Bahia",
  "BR-CE": "Ceará",
  "BR-DF": "Distrito Federal",
  "BR-ES": "Espírito Santo",
  "BR-GO": "Goiás",
  "BR-MA": "Maranhão",
  "BR-MG": "Minas Gerais",
  "BR-MS": "Mato Grosso do Sul",
  "BR-MT": "Mato Grosso",
  "BR-PA": "Pará",
  "BR-PB": "Paraíba",
  "BR-PE": "Pernambuco",
  "BR-PI": "Piauí",
  "BR-PR": "Paraná",
  "BR-RJ": "Rio de Janeiro",
  "BR-RN": "Rio Grande do Norte",
  "BR-RO": "Rondônia",
  "BR-RR": "Roraima",
  "BR-RS": "Rio Grande do Sul",
  "BR-SC": "Santa Catarina",
  "BR-SE": "Sergipe",
  "BR-SP": "São Paulo",
  "BR-TO": "Tocantins",
};

export const stateName = (w: WorldData, code: string) => BR_STATES[code] ?? w.subdivisions?.[code] ?? code;

// Onde o canal está, para a linha abaixo do nome no player (sem o país).
// Ex.: "Belém (PA)", "Bahia", "Nacional · sede em São Paulo", "Nacional" ou "".
export function placeLabel(w: WorldData, ch: Channel): string {
  const place = w.places[ch.p];
  let where = "";
  if (place?.lv === "ct") {
    const uf = ch.st?.startsWith("BR-") ? ch.st.slice(3) : "";
    where = uf ? `${place.n} (${uf})` : place.n;
  } else if (place?.lv === "s") {
    where = ch.st ? stateName(w, ch.st) : place.n;
  }
  if (ch.nat) return where ? `Nacional · sede em ${where}` : "Nacional";
  return where;
}
