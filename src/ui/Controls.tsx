import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_COLORS, catColor, catName, countryOf, langName, localTime, type WorldData } from "../data";
import { Flag } from "./Flag";
import { getState, matchesFilters, randomChannel, setState, tune, useStore } from "../store";

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function SearchBox({ world }: { world: WorldData }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const index = useMemo(
    () =>
      world.channels.map((ch) =>
        strip(
          `${ch.n} ${countryOf(world, ch.c)[0]} ${world.countries[ch.c]?.[0] ?? ""} ${world.places[ch.p]?.n ?? ""} ${ch.id}`,
        ),
      ),
    [world],
  );
  const results = useMemo(() => {
    const terms = strip(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const out: number[] = [];
    for (let i = 0; i < index.length && out.length < 40; i++) {
      if (terms.every((t) => index[i].includes(t))) out.push(i);
    }
    // nome que começa com o termo vem antes
    const t0 = terms[0];
    return out
      .sort(
        (a, b) => Number(strip(world.channels[b].n).startsWith(t0)) - Number(strip(world.channels[a].n).startsWith(t0)),
      )
      .slice(0, 10);
  }, [q, index, world]);

  const pick = (i: number) => {
    setState({ zapping: false });
    tune(i);
    setOpen(false);
  };

  return (
    <div className="search">
      <input
        type="search"
        value={q}
        placeholder="Buscar canal, país ou cidade…"
        aria-label="Buscar canal"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && results[active] !== undefined) pick(results[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && q.trim() && (
        <div className="results" role="listbox">
          {!results.length && <p className="muted">Nenhum canal encontrado.</p>}
          {results.map((i, k) => (
            <ChannelRow key={i} world={world} i={i} active={k === active} onPick={pick} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelRow({
  world,
  i,
  active,
  onPick,
}: {
  world: WorldData;
  i: number;
  active?: boolean;
  onPick: (i: number) => void;
}) {
  const ch = world.channels[i];
  const [country] = countryOf(world, ch.c);
  return (
    <button
      role="option"
      aria-selected={active}
      className={`row ${active ? "on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(i)}
    >
      <span className="dot" style={{ background: catColor(ch.cat) }} />
      <span className="row-title">{ch.n}</span>
      <span className="row-sub">
        <Flag code={ch.c} /> {country}
        {ch.cat[0] ? ` · ${catName(ch.cat[0], world)}` : ""}
      </span>
    </button>
  );
}

export function Sidebar({ world }: { world: WorldData }) {
  const filters = useStore((s) => s.filters);
  const zapping = useStore((s) => s.zapping);
  const zapSeconds = useStore((s) => s.zapSeconds);
  const favorites = useStore((s) => s.favorites);
  const history = useStore((s) => s.history);
  const [tab, setTab] = useState<"filters" | "favorites" | "history">("filters");
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 700);

  const idOf = useMemo(() => new Map(world.channels.map((c, i) => [c.id, i])), [world]);
  const count = useMemo(() => {
    let n = 0;
    for (let i = 0; i < world.channels.length; i++) if (matchesFilters(i)) n++;
    return n;
  }, [world, filters]);

  // categorias e idiomas mais comuns primeiro
  const cats = useMemo(() => {
    const c = new Map<string, number>();
    for (const ch of world.channels) for (const k of ch.cat) c.set(k, (c.get(k) ?? 0) + 1);
    return [...c].sort((a, b) => b[1] - a[1]);
  }, [world]);
  const langs = useMemo(() => {
    const c = new Map<string, number>();
    for (const ch of world.channels) for (const k of ch.l ?? []) c.set(k, (c.get(k) ?? 0) + 1);
    return [...c].sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [world]);
  const countries = useMemo(() => {
    const c = new Map<string, number>();
    for (const ch of world.channels) c.set(ch.c, (c.get(ch.c) ?? 0) + 1);
    return [...c]
      .map(([code, n]) => ({ code, n, name: countryOf(world, code)[0] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [world]);

  const setF = (patch: Partial<typeof filters>) => setState({ filters: { ...getState().filters, ...patch } });
  const toggleCat = (c: string) =>
    setF({
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });

  return (
    <section className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        className={`zap ${zapping ? "on" : ""}`}
        onClick={() => {
          const on = !zapping;
          setState({ zapping: on });
          if (on) tune(randomChannel());
        }}
      >
        {zapping ? "■ Parar de zapear" : "🌍 Zapear pelo planeta"}
      </button>
      {zapping && (
        <label className="zap-speed">
          Trocar a cada
          <select value={zapSeconds} onChange={(e) => setState({ zapSeconds: Number(e.target.value) })}>
            {[10, 25, 45, 90].map((s) => (
              <option key={s} value={s}>
                {s} s
              </option>
            ))}
          </select>
        </label>
      )}
      <button className="side-toggle" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
        {collapsed ? "Filtros e favoritos ▸" : "Ocultar ▾"}
      </button>
      {!collapsed && (
        <>
          <nav className="tabs">
            {(["filters", "favorites", "history"] as const).map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
                {t === "filters" ? "Filtros" : t === "favorites" ? `Favoritos (${favorites.length})` : "Histórico"}
              </button>
            ))}
          </nav>

          {tab === "filters" && (
            <div className="filters">
              <p className="count">
                <strong>{count.toLocaleString("pt-BR")}</strong> canais no mapa
              </p>
              <div className="cats">
                {cats.map(([c, n]) => (
                  <button
                    key={c}
                    className={filters.categories.includes(c) ? "on" : ""}
                    style={{ ["--c" as string]: CATEGORY_COLORS[c] ?? CATEGORY_COLORS.outros }}
                    onClick={() => toggleCat(c)}
                    title={`${n} canais`}
                  >
                    {catName(c, world)}
                  </button>
                ))}
              </div>
              <label>
                Idioma
                <select value={filters.language ?? ""} onChange={(e) => setF({ language: e.target.value || null })}>
                  <option value="">Todos</option>
                  {langs.map(([l, n]) => (
                    <option key={l} value={l}>
                      {langName(world, l)} ({n})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                País
                <select value={filters.country ?? ""} onChange={(e) => setF({ country: e.target.value || null })}>
                  <option value="">Todos</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.n})
                    </option>
                  ))}
                </select>
              </label>
              {world.checkedAt && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => setF({ verifiedOnly: e.target.checked })}
                  />
                  Só canais testados em {new Date(world.checkedAt).toLocaleDateString("pt-BR")}
                </label>
              )}
              {(filters.categories.length > 0 || filters.language || filters.country || filters.verifiedOnly) && (
                <button
                  className="clear"
                  onClick={() => setF({ categories: [], language: null, country: null, verifiedOnly: false })}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {tab !== "filters" && (
            <div className="list">
              {(tab === "favorites" ? favorites : history).length === 0 && (
                <p className="muted">
                  {tab === "favorites"
                    ? "Toque na ☆ de um canal para guardá-lo aqui."
                    : "Os canais que você assistir aparecem aqui."}
                </p>
              )}
              {(tab === "favorites" ? favorites : history)
                .map((id) => idOf.get(id))
                .filter((i): i is number => i !== undefined)
                .map((i) => (
                  <ChannelRow
                    key={i}
                    world={world}
                    i={i}
                    onPick={(i) => {
                      setState({ zapping: false });
                      tune(i);
                    }}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// HUD estilo satélite espião: coordenadas, hora local e UTC.
export function Hud({ world }: { world: WorldData }) {
  const spy = useStore((s) => s.spy);
  const current = useStore((s) => s.current);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!spy) return null;
  const ch = current !== null ? world.channels[current] : null;
  const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  return (
    <div className="hud" aria-hidden>
      <div className="corner tl" />
      <div className="corner tr" />
      <div className="corner bl" />
      <div className="corner br" />
      <div className="hud-text">
        <span>UTC {now.toISOString().slice(11, 19)}</span>
        {ch ? (
          <>
            <span>ALVO {ch.id.toUpperCase()}</span>
            <span>
              {fmt(ch.la, "N", "S")} {fmt(ch.lo, "L", "O")}
            </span>
            <span>LOCAL {localTime(ch.tz, now) ?? "--:--"}</span>
          </>
        ) : (
          <span>VARREDURA ORBITAL · {world.channels.length.toLocaleString("pt-BR")} SINAIS</span>
        )}
        <span className="rec">● REC</span>
      </div>
    </div>
  );
}

export function Tooltip({ world }: { world: WorldData }) {
  const hover = useStore((s) => s.hover);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  const ch = hover !== null ? world.channels[hover] : null;
  const [country] = ch ? countryOf(world, ch.c) : [""];
  return (
    <div className="tooltip" ref={ref} style={{ opacity: ch ? 1 : 0 }}>
      {ch && (
        <>
          <strong>{ch.n}</strong>
          <span>
            {ch && <Flag code={ch.c} />} {country}
            {ch.cat[0] ? ` · ${catName(ch.cat[0], world)}` : ""}
          </span>
        </>
      )}
    </div>
  );
}
