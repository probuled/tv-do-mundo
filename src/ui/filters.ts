import { useMemo } from "react";
import { countryOf, langName, stateName, type WorldData } from "../data";
import { getState, NO_STATE, randomChannel, setState, tune } from "../store";

export const fmt = (n: number) => n.toLocaleString("pt-BR");

export function toggleZap() {
  const on = !getState().zapping;
  setState({ zapping: on });
  if (on) tune(randomChannel());
}

// Opções dos filtros (categorias, idiomas, países e estados), com a contagem de canais.
// O painel do globo e o modo TV usam as mesmas.
export function useFilterOptions(world: WorldData, country: string | null) {
  // categorias e idiomas mais comuns primeiro
  const cats = useMemo(() => {
    const c = new Map<string, number>();
    for (const ch of world.channels) for (const k of ch.cat) c.set(k, (c.get(k) ?? 0) + 1);
    return [...c].sort((a, b) => b[1] - a[1]);
  }, [world]);
  const langs = useMemo(() => {
    const c = new Map<string, number>();
    for (const ch of world.channels) for (const k of ch.l ?? []) c.set(k, (c.get(k) ?? 0) + 1);
    return [...c]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([l, n]) => ({ value: l, label: `${langName(world, l)} (${fmt(n)})` }));
  }, [world]);
  const countries = useMemo(() => {
    const c = new Map<string, number>();
    for (const ch of world.channels) c.set(ch.c, (c.get(ch.c) ?? 0) + 1);
    return [...c]
      .map(([code, n]) => ({ value: code, label: `${countryOf(world, code)[0]} (${fmt(n)})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [world]);

  // estados do país escolhido, com a contagem; quem não tem estado vai para "Nacionais e sem estado"
  const states = useMemo(() => {
    if (!country) return [];
    const c = new Map<string, number>();
    let none = 0;
    for (const ch of world.channels) {
      if (ch.c !== country) continue;
      if (ch.st) c.set(ch.st, (c.get(ch.st) ?? 0) + 1);
      else none++;
    }
    if (!c.size) return [];
    return [
      ...[...c]
        .map(([code, n]) => ({ value: code, label: `${stateName(world, code)} (${fmt(n)})` }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
      ...(none ? [{ value: NO_STATE, label: `Nacionais e sem estado (${fmt(none)})` }] : []),
    ];
  }, [world, country]);

  return { cats, langs, countries, states };
}
