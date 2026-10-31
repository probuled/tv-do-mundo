import { beforeEach, describe, expect, it } from "vitest";
import type { Channel, WorldData } from "./data";
import { getState, markFailed, matchesFilters, randomChannel, setState } from "./store";

const ch = (id: string, extra: Partial<Channel>): Channel => ({
  id,
  n: id,
  c: "BR",
  cat: ["general"],
  la: 0,
  lo: 0,
  p: 0,
  s: [["https://x.m3u8", "", ""]],
  ...extra,
});

const world: WorldData = {
  generatedAt: "2026-10-31",
  checkedAt: null,
  countries: {},
  categories: {},
  languages: {},
  places: [],
  channels: [
    ch("news.br", { cat: ["news"], l: ["por"] }),
    ch("sports.ar", { c: "AR", cat: ["sports"], l: ["spa"], s: [["https://y.m3u8", "", "v"]] }),
    ch("music.br", { cat: ["music"], l: ["por"] }),
  ],
};

beforeEach(() => {
  setState({
    world,
    current: null,
    failed: new Set(),
    filters: { categories: [], language: null, country: null, verifiedOnly: false },
  });
});

describe("matchesFilters", () => {
  it("aceita tudo sem filtros", () => {
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, true, true]);
  });

  it("filtra por categoria, idioma, país e verificados", () => {
    setState({ filters: { categories: ["news", "music"], language: null, country: null, verifiedOnly: false } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, false, true]);

    setState({ filters: { categories: [], language: "spa", country: null, verifiedOnly: false } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([false, true, false]);

    setState({ filters: { categories: [], language: null, country: "BR", verifiedOnly: false } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, false, true]);

    setState({ filters: { categories: [], language: null, country: null, verifiedOnly: true } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([false, true, false]);
  });
});

describe("randomChannel", () => {
  it("nunca sorteia o canal atual nem os que falharam", () => {
    setState({ current: 0 });
    markFailed(2);
    for (let k = 0; k < 20; k++) expect(randomChannel()).toBe(1);
  });

  it("devolve null quando nada sobra", () => {
    setState({ filters: { ...getState().filters, country: "JP" } });
    expect(randomChannel()).toBeNull();
  });
});
