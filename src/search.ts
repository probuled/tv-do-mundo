import { countryOf, placeLabel, stateName, type WorldData } from "./data";

// Minúsculas e sem acento, para "sao paulo" achar "São Paulo".
export const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const searchTerms = (q: string) => strip(q).split(/\s+/).filter(Boolean);

// Um texto por canal com nome, país, cidade, estado e id, já sem acento.
export function buildSearchIndex(world: WorldData): string[] {
  return world.channels.map((ch) =>
    strip(
      `${ch.n} ${countryOf(world, ch.c)[0]} ${world.countries[ch.c]?.[0] ?? ""} ${placeLabel(world, ch)} ${ch.st ? stateName(world, ch.st) : ""} ${ch.id}`,
    ),
  );
}

export const matchesTerms = (text: string, terms: string[]) => terms.every((t) => text.includes(t));
