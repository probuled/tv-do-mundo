import { describe, expect, it } from "vitest";
import type { WorldData } from "./data";
import raw from "../public/data/channels.json?raw";

// Confere o channels.json gerado por scripts/build-data.ts.
const world: WorldData = JSON.parse(raw);

describe("channels.json", () => {
  it("marca as cidades como cidade, para o player mostrar o nome delas", () => {
    expect(world.places.some((p) => p.lv === "ct")).toBe(true);
  });

  it("só usa o nível país para lugares com o nome de um país", () => {
    const wrong = world.places.filter((p) => p.lv === "c" && p.n !== world.countries[p.c]?.[0]);
    expect(wrong.map((p) => `${p.n} (${p.c})`)).toEqual([]);
  });
});
