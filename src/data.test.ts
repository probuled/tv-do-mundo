import { describe, expect, it } from "vitest";
import {
  catColor,
  CATEGORY_COLORS,
  flagCode,
  localTime,
  placeLabel,
  playableStreams,
  safeUrl,
  sanitizeChannel,
  subsolarPoint,
  type Channel,
  type WorldData,
} from "./data";

const channel = (s: Channel["s"]): Channel => ({ id: "x", n: "X", c: "BR", cat: [], la: 0, lo: 0, p: 0, s });

describe("subsolarPoint", () => {
  it("põe o Sol perto do trópico de Câncer no solstício de junho, ao meio-dia UTC em Greenwich", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
    expect(p.lat).toBeCloseTo(23.44, 0);
    expect(Math.abs(p.lng)).toBeLessThan(2);
  });

  it("põe o Sol no equador no equinócio e anda 15 graus para oeste por hora", () => {
    const noon = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 12, 0, 0)));
    const later = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 14, 0, 0)));
    expect(Math.abs(noon.lat)).toBeLessThan(1);
    expect(noon.lng - later.lng).toBeCloseTo(30, 0);
  });

  it("mantém a longitude entre -180 e 180", () => {
    const p = subsolarPoint(new Date(Date.UTC(2026, 0, 1, 23, 59, 0)));
    expect(p.lng).toBeGreaterThanOrEqual(-180);
    expect(p.lng).toBeLessThanOrEqual(180);
  });
});

describe("playableStreams", () => {
  const ch = channel([
    ["http://a.m3u8", "", "g"],
    ["https://b.m3u8", "", ""],
    ["https://c.m3u8", "", "v"],
  ]);

  it("ordena verificados primeiro e geo-bloqueados por último", () => {
    expect(playableStreams(ch, false).map(([u]) => u)).toEqual(["https://c.m3u8", "https://b.m3u8", "http://a.m3u8"]);
  });

  it("descarta streams HTTP quando a página é HTTPS", () => {
    expect(playableStreams(ch, true).map(([u]) => u)).toEqual(["https://c.m3u8", "https://b.m3u8"]);
  });
});

describe("safeUrl", () => {
  it("aceita só endereços http e https", () => {
    expect(safeUrl("https://a.com")).toBe("https://a.com");
    expect(safeUrl("HTTP://a.com")).toBe("HTTP://a.com");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl(" javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,x")).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
  });

  it("tira do canal o site e o logo com endereço perigoso", () => {
    const ch = { ...channel([]), w: "javascript:alert(1)", lg: "https://i.imgur.com/a.png" };
    expect(sanitizeChannel(ch)).toEqual({ ...channel([]), lg: "https://i.imgur.com/a.png" });
  });
});

describe("flagCode", () => {
  it("converte o UK do iptv-org para o código ISO gb", () => {
    expect(flagCode("UK")).toBe("gb");
    expect(flagCode("BR")).toBe("br");
  });
});

describe("catColor", () => {
  it("usa a primeira categoria com cor conhecida", () => {
    expect(catColor(["desconhecida", "news"])).toBe(CATEGORY_COLORS.news);
  });

  it("cai na cor de outros quando nenhuma categoria tem cor", () => {
    expect(catColor(["desconhecida"])).toBe(CATEGORY_COLORS.outros);
  });
});

describe("localTime", () => {
  it("formata a hora no fuso do canal", () => {
    expect(localTime("America/Sao_Paulo", new Date(Date.UTC(2026, 9, 31, 15, 30)))).toBe("12:30");
  });

  it("devolve null para fuso ausente ou inválido", () => {
    expect(localTime(undefined)).toBeNull();
    expect(localTime("Lugar/Inexistente")).toBeNull();
  });
});

describe("placeLabel", () => {
  const world = {
    places: [
      { n: "Belém", lv: "ct", la: 0, lo: 0, c: "BR" },
      { n: "Bahia", lv: "s", la: 0, lo: 0, c: "BR" },
      { n: "Brazil", lv: "c", la: 0, lo: 0, c: "BR" },
      { n: "São Paulo", lv: "ct", la: 0, lo: 0, c: "BR" },
    ],
    subdivisions: { "BR-BA": "Bahia" },
  } as unknown as WorldData;
  const at = (p: number, extra: Partial<Channel> = {}) => ({ ...channel([]), p, ...extra });

  it("mostra a cidade com a sigla do estado, ou o estado com acento", () => {
    expect(placeLabel(world, at(0, { st: "BR-PA" }))).toBe("Belém (PA)");
    expect(placeLabel(world, at(1, { st: "BR-BA" }))).toBe("Bahia");
  });

  it("marca os canais nacionais com a sede, quando conhecida", () => {
    expect(placeLabel(world, at(3, { nat: 1 }))).toBe("Nacional · sede em São Paulo");
    expect(placeLabel(world, at(2, { nat: 1 }))).toBe("Nacional");
  });

  it("não repete o país para canais sem lugar mais preciso", () => {
    expect(placeLabel(world, at(2))).toBe("");
  });
});
