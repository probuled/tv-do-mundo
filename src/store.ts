import { useSyncExternalStore } from "react";
import { isSecurePage, type WorldData } from "./data";

export interface Filters {
  categories: string[]; // vazio = todas
  language: string | null;
  country: string | null;
  state: string | null; // código do estado, ou NO_STATE (nacionais e sem estado); só com país escolhido
  verifiedOnly: boolean;
}

export const NO_STATE = "-";
export const EMPTY_FILTERS: Filters = {
  categories: [],
  language: null,
  country: null,
  state: null,
  verifiedOnly: false,
};

export type View = "globe" | "tv"; // globo 3D ou grade de canais (modo TV)

export interface State {
  world: WorldData | null;
  view: View;
  current: number | null; // índice do canal tocando
  hover: number | null;
  zapping: boolean;
  zapSeconds: number;
  spy: boolean; // visual "satélite espião"
  sidebarOpen: boolean;
  filters: Filters;
  failed: Set<string>; // ids de canais que falharam nesta sessão
  favorites: string[];
  history: string[];
}

const load = <T>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* modo privado: segue sem salvar */
  }
};

let state: State = {
  world: null,
  view: load<View>("tvm:view", "globe") === "tv" ? "tv" : "globe",
  current: null,
  hover: null,
  zapping: false,
  zapSeconds: 25,
  spy: false,
  // aberta por padrão em telas largas; depois vale a última escolha da pessoa
  sidebarOpen: load("tvm:sidebar", (globalThis.innerWidth ?? 1280) >= 900),
  filters: EMPTY_FILTERS,
  failed: new Set(),
  favorites: load("tvm:favorites", []),
  history: load("tvm:history", []),
};

const listeners = new Set<() => void>();
export const getState = () => state;
export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  if (patch.favorites) save("tvm:favorites", patch.favorites);
  if (patch.history) save("tvm:history", patch.history);
  if (patch.sidebarOpen !== undefined) save("tvm:sidebar", patch.sidebarOpen);
  if (patch.view) save("tvm:view", patch.view);
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useStore = <T>(sel: (s: State) => T): T => useSyncExternalStore(subscribe, () => sel(state));

export function matchesFilters(i: number, s: State = state): boolean {
  const w = s.world!;
  const ch = w.channels[i];
  const f = s.filters;
  if (f.categories.length && !ch.cat.some((c) => f.categories.includes(c))) return false;
  if (f.language && !ch.l?.includes(f.language)) return false;
  if (f.country && ch.c !== f.country) return false;
  if (f.state && (f.state === NO_STATE ? ch.st !== undefined : ch.st !== f.state)) return false;
  if (f.verifiedOnly && !ch.s.some(([, , fl]) => fl.includes("v"))) return false;
  if (isSecurePage() && !ch.s.some(([u]) => u.startsWith("https:"))) return false;
  return true;
}

export function tune(i: number | null) {
  if (i === null) return setState({ current: null });
  const id = state.world!.channels[i].id;
  setState({ current: i, history: [id, ...state.history.filter((h) => h !== id)].slice(0, 30) });
  const url = new URL(location.href);
  url.searchParams.set("canal", id);
  history.replaceState(null, "", url);
}

export function randomChannel(): number | null {
  const w = state.world!;
  const pool: number[] = [];
  for (let i = 0; i < w.channels.length; i++) {
    if (i !== state.current && !state.failed.has(w.channels[i].id) && matchesFilters(i)) pool.push(i);
  }
  if (!pool.length) return null;
  // prefere canais com stream verificado, se houver
  const verified = pool.filter((i) => w.channels[i].s.some(([, , f]) => f.includes("v")));
  const from = verified.length > 20 ? verified : pool;
  return from[Math.floor(Math.random() * from.length)];
}

export function markFailed(i: number) {
  const failed = new Set(state.failed);
  failed.add(state.world!.channels[i].id);
  setState({ failed });
}

export function toggleFavorite(id: string) {
  const fav = state.favorites.includes(id) ? state.favorites.filter((f) => f !== id) : [id, ...state.favorites];
  setState({ favorites: fav });
}
