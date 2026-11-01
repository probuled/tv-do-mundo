import { beforeEach, describe, expect, it } from "vitest";
import type { Channel, WorldData } from "./data";
import { buildSearchIndex } from "./search";
import { EMPTY_FILTERS, getState, setState } from "./store";
import { categoryCounts, guideChannels, neighborChannel, numberChannels } from "./tv";

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
    ch("zeta.ar", { n: "Zeta", c: "AR", cat: ["sports"] }), // 0
    ch("tv-local.br", { n: "TV Local", st: "BR-BA", cat: ["news"] }), // 1
    ch("alfa.us", { n: "Alfa", c: "US", cat: ["news"] }), // 2
    ch("rede.br", { n: "Rede Nacional", nat: 1 }), // 3
    ch("bahia.br", { n: "Bahia Esportes", st: "BR-BA", cat: ["sports"] }), // 4
  ],
};

beforeEach(() => {
  setState({ world, current: null, failed: new Set(), filters: EMPTY_FILTERS, favorites: [], history: [] });
});

describe("numberChannels", () => {
  it("numera o Brasil primeiro, com os nacionais antes, e depois os países em ordem alfabética", () => {
    const { order, number } = numberChannels(world);
    // Brasil: Rede Nacional (nacional), Bahia Esportes, TV Local; depois Argentina e Estados Unidos
    expect(order).toEqual([3, 4, 1, 0, 2]);
    expect(number[3]).toBe(1);
    expect(number[2]).toBe(5);
  });

  it("não muda a numeração quando os filtros mudam", () => {
    const before = numberChannels(world).number;
    setState({ filters: { ...EMPTY_FILTERS, country: "AR" } });
    expect(numberChannels(world).number).toEqual(before);
  });
});

describe("guideChannels", () => {
  const guide = numberChannels(world);
  const index = buildSearchIndex(world);

  it("lista todos os canais na ordem da numeração", () => {
    expect(guideChannels(getState(), guide, index, { source: "all", query: "" })).toEqual([3, 4, 1, 0, 2]);
  });

  it("aplica os filtros e a busca", () => {
    setState({ filters: { ...EMPTY_FILTERS, categories: ["news"] } });
    expect(guideChannels(getState(), guide, index, { source: "all", query: "" })).toEqual([1, 2]);
    expect(guideChannels(getState(), guide, index, { source: "all", query: "alfa" })).toEqual([2]);
  });

  it("mostra os favoritos na ordem da pessoa, sem os filtros", () => {
    setState({ favorites: ["alfa.us", "sumiu.xx", "zeta.ar"], filters: { ...EMPTY_FILTERS, country: "BR" } });
    expect(guideChannels(getState(), guide, index, { source: "favorites", query: "" })).toEqual([2, 0]);
    expect(guideChannels(getState(), guide, index, { source: "favorites", query: "zeta" })).toEqual([0]);
  });
});

describe("categoryCounts", () => {
  it("conta as categorias com os outros filtros, ignorando a categoria escolhida", () => {
    setState({ filters: { ...EMPTY_FILTERS, country: "BR", categories: ["news"] } });
    const { total, byCategory } = categoryCounts(getState());
    expect(total).toBe(3);
    expect(byCategory.get("news")).toBe(1);
    expect(byCategory.get("sports")).toBe(1);
    expect(byCategory.get("general")).toBe(1);
  });
});

describe("neighborChannel", () => {
  it("anda para o próximo e o anterior, dando a volta nas pontas", () => {
    expect(neighborChannel([5, 7, 9], 7, 1)).toBe(9);
    expect(neighborChannel([5, 7, 9], 9, 1)).toBe(5);
    expect(neighborChannel([5, 7, 9], 5, -1)).toBe(9);
  });

  it("começa do topo (ou do fim) quando o canal atual não está na lista", () => {
    expect(neighborChannel([5, 7, 9], null, 1)).toBe(5);
    expect(neighborChannel([5, 7, 9], 2, -1)).toBe(9);
    expect(neighborChannel([], 2, 1)).toBeNull();
  });
});
