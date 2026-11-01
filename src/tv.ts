// Lógica do modo TV: numeração fixa dos canais e a lista que aparece na grade.
import { countryOf, type WorldData } from "./data";
import { matchesTerms, searchTerms } from "./search";
import { EMPTY_FILTERS, matchesFilters, type Filters, type State } from "./store";

// O Brasil abre a numeração (canal 1 é brasileiro); depois os países em ordem alfabética.
const HOME_COUNTRY = "BR";

export interface ChannelGuide {
  order: number[]; // índices dos canais na ordem da numeração
  number: Int32Array; // number[i] = número do canal i (começa em 1)
}

// Como numa TV de verdade, o número de um canal não muda com o filtro.
// Ordem: país (Brasil primeiro), canais nacionais antes dos regionais e depois o nome.
export function numberChannels(world: WorldData): ChannelGuide {
  const name = new Map<string, string>();
  const countryName = (c: string) => {
    let n = name.get(c);
    if (n === undefined) name.set(c, (n = countryOf(world, c)[0]));
    return n;
  };
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
  const order = world.channels.map((_, i) => i);
  order.sort((a, b) => {
    const A = world.channels[a];
    const B = world.channels[b];
    if (A.c !== B.c) {
      if (A.c === HOME_COUNTRY) return -1;
      if (B.c === HOME_COUNTRY) return 1;
      return collator.compare(countryName(A.c), countryName(B.c)) || A.c.localeCompare(B.c);
    }
    return (B.nat ?? 0) - (A.nat ?? 0) || collator.compare(A.n, B.n) || A.id.localeCompare(B.id);
  });
  const number = new Int32Array(world.channels.length);
  order.forEach((i, pos) => (number[i] = pos + 1));
  return { order, number };
}

export type GuideSource = "all" | "favorites" | "history";

export interface GuideQuery {
  source: GuideSource;
  query: string;
}

// Canais da grade. Em "Todos", valem os filtros (país, idioma, categoria...) e a busca.
// Em Favoritos e Histórico, a lista é a da pessoa, só filtrada pela busca.
export function guideChannels(
  state: State,
  guide: ChannelGuide,
  index: string[],
  { source, query }: GuideQuery,
): number[] {
  const world = state.world!;
  const terms = searchTerms(query);
  const byQuery = (i: number) => !terms.length || matchesTerms(index[i], terms);
  if (source !== "all") {
    const idOf = new Map(world.channels.map((c, i) => [c.id, i]));
    const ids = source === "favorites" ? state.favorites : state.history;
    return ids.map((id) => idOf.get(id)).filter((i): i is number => i !== undefined && byQuery(i));
  }
  return guide.order.filter((i) => matchesFilters(i, state) && byQuery(i));
}

// Quantos canais cada categoria tem com os outros filtros aplicados (para a coluna da esquerda).
export function categoryCounts(state: State): { total: number; byCategory: Map<string, number> } {
  const world = state.world!;
  const filters: Filters = { ...state.filters, categories: EMPTY_FILTERS.categories };
  const s = { ...state, filters };
  const byCategory = new Map<string, number>();
  let total = 0;
  for (let i = 0; i < world.channels.length; i++) {
    if (!matchesFilters(i, s)) continue;
    total++;
    for (const c of world.channels[i].cat) byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }
  return { total, byCategory };
}

// Canal vizinho na grade (setas ↑ ↓). Se o canal atual não está na lista, começa do topo.
export function neighborChannel(list: number[], current: number | null, step: 1 | -1): number | null {
  if (!list.length) return null;
  const pos = current === null ? -1 : list.indexOf(current);
  if (pos === -1) return step === 1 ? list[0] : list[list.length - 1];
  return list[(pos + step + list.length) % list.length];
}
