import { beforeEach, describe, expect, it } from "vitest";
import type { Channel, WorldData } from "./data";
import { EMPTY_FILTERS, getState, markFailed, matchesFilters, NO_STATE, randomChannel, setState } from "./store";

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
    ch("music.br", { cat: ["music"], l: ["por"], st: "BR-BA" }),
  ],
};

beforeEach(() => {
  setState({
    world,
    current: null,
    failed: new Set(),
    filters: EMPTY_FILTERS,
  });
});

describe("matchesFilters", () => {
  it("aceita tudo sem filtros", () => {
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, true, true]);
  });

  it("filtra por categoria, idioma, país e verificados", () => {
    setState({ filters: { ...EMPTY_FILTERS, categories: ["news", "music"] } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, false, true]);

    setState({ filters: { ...EMPTY_FILTERS, language: "spa" } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([false, true, false]);

    setState({ filters: { ...EMPTY_FILTERS, country: "BR" } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, false, true]);

    setState({ filters: { ...EMPTY_FILTERS, verifiedOnly: true } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([false, true, false]);
  });
});

describe("filtro de estado", () => {
  it("mostra só o estado escolhido, ou só os canais sem estado", () => {
    setState({ filters: { ...EMPTY_FILTERS, country: "BR", state: "BR-BA" } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([false, false, true]);

    setState({ filters: { ...EMPTY_FILTERS, country: "BR", state: NO_STATE } });
    expect([0, 1, 2].map((i) => matchesFilters(i))).toEqual([true, false, false]);
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
