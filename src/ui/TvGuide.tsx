import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Clock, Heart, LayoutGrid, Search, Shuffle, Square } from "lucide-react";
import {
  CATEGORY_COLORS,
  catName,
  countryOf,
  langName,
  localTime,
  placeLabel,
  stateName,
  type WorldData,
} from "../data";
import { buildSearchIndex } from "../search";
import { EMPTY_FILTERS, getState, NO_STATE, setState, tune, useStore } from "../store";
import { categoryCounts, guideChannels, neighborChannel, numberChannels, type GuideSource } from "../tv";
import { Flag } from "./Flag";
import { GithubButton } from "./GithubButton";
import { Logo } from "./Logo";
import { SEARCH_INPUT_ID } from "./Search";
import { AboutButton, Select, SignalButton } from "./Sidebar";
import { fmt, toggleZap, useFilterOptions } from "./filters";
import { ViewSwitch } from "./ViewSwitch";

const ICON = { size: 16, strokeWidth: 1.75 } as const;
const ROW_H = 68; // altura da linha (60) + espaço entre linhas (8); a lista só desenha as linhas visíveis
const OVERSCAN = 6;
const DIGIT_WAIT = 1500; // tempo para digitar o número do canal, como no controle remoto

const pad = (n: number) => String(n).padStart(3, "0");

// Modo TV: os canais em lista, com número fixo, como a grade de uma TV.
export function TvGuide({ world, onAbout, onSignal }: { world: WorldData; onAbout: () => void; onSignal: () => void }) {
  const filters = useStore((s) => s.filters);
  const favorites = useStore((s) => s.favorites);
  const history = useStore((s) => s.history);
  const current = useStore((s) => s.current);
  const failed = useStore((s) => s.failed);
  const zapping = useStore((s) => s.zapping);
  const [source, setSource] = useState<GuideSource>("all");
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState(""); // número sendo digitado no "controle remoto"

  const guide = useMemo(() => numberChannels(world), [world]);
  const index = useMemo(() => buildSearchIndex(world), [world]);
  const { cats, langs, countries, states } = useFilterOptions(world, filters.country);

  // as funções leem o store inteiro; as dependências refazem a lista quando o que importa muda
  const list = useMemo(
    () => guideChannels(getState(), guide, index, { source, query }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guide, index, source, query, filters, favorites, history],
  );
  const counts = useMemo(
    () => categoryCounts(getState()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, filters.language, filters.country, filters.state, filters.verifiedOnly],
  );

  const setF = (patch: Partial<typeof filters>) => setState({ filters: { ...getState().filters, ...patch } });
  const showAll = () => {
    setSource("all");
    setF({ categories: [] });
  };
  const pickCategory = (c: string) => {
    setSource("all");
    setF({ categories: filters.categories.length === 1 && filters.categories[0] === c ? [] : [c] });
  };
  const pick = (i: number) => {
    setState({ zapping: false });
    tune(i);
  };
  const hasFilters =
    filters.categories.length > 0 || filters.language || filters.country || filters.state || filters.verifiedOnly;

  // ↑ ↓ trocam de canal dentro da lista; números levam direto ao canal, como no controle remoto
  const listRef = useRef(list);
  listRef.current = list;
  useEffect(() => {
    let buffer = "";
    let timer = 0;
    const commit = () => {
      clearTimeout(timer);
      const n = Number(buffer);
      buffer = "";
      setTyped("");
      if (n >= 1 && n <= guide.order.length) pick(guide.order[n - 1]);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea") || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = neighborChannel(listRef.current, getState().current, e.key === "ArrowDown" ? 1 : -1);
        if (next !== null) pick(next);
      } else if (/^[0-9]$/.test(e.key)) {
        buffer = (buffer + e.key).slice(-5);
        setTyped(buffer);
        clearTimeout(timer);
        timer = window.setTimeout(commit, DIGIT_WAIT);
      } else if (e.key === "Enter" && buffer) {
        e.preventDefault();
        commit();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      clearTimeout(timer);
    };
  }, [guide]);

  const sourceLabel =
    source === "favorites"
      ? "Favoritos"
      : source === "history"
        ? "Histórico"
        : filters.categories.length === 1
          ? catName(filters.categories[0], world)
          : filters.categories.length > 1
            ? `${filters.categories.length} categorias`
            : "Todos os canais";

  return (
    <div className="tv">
      <header className="tv-header">
        <div className="tv-header-top">
          <div className="brand">
            <Logo />
            <div className="brand-text">
              <h1>TV do Mundo</h1>
              <p>
                <span className="live-dot" aria-hidden />
                <span className="num">{fmt(world.channels.length)}</span> canais
              </p>
            </div>
          </div>
          <ViewSwitch />
          <div className="tv-header-actions">
            <button
              className={`btn btn-sm ${zapping ? "is-on" : ""}`}
              onClick={toggleZap}
              aria-pressed={zapping}
              title="Zapear (Z)"
            >
              {zapping ? <Square size={14} strokeWidth={2} aria-hidden /> : <Shuffle {...ICON} aria-hidden />}
              {zapping ? "Parar" : "Zapear"}
            </button>
            <GithubButton />
          </div>
        </div>
        <div className="tv-header-filters">
          <label className="field tv-search-field">
            <span className="field-label">Buscar</span>
            <span className="search">
              <Search className="search-icon" size={16} strokeWidth={1.75} aria-hidden />
              <input
                id={SEARCH_INPUT_ID}
                type="search"
                value={query}
                placeholder="Canal, país ou cidade"
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    e.currentTarget.blur();
                  }
                }}
              />
            </span>
          </label>
          <Select
            label="País"
            value={filters.country ?? ""}
            onChange={(v) => {
              setSource("all");
              setF({ country: v || null, state: null });
            }}
            options={countries}
          />
          {states.length > 0 && (
            <Select
              label="Estado"
              value={filters.state ?? ""}
              onChange={(v) => setF({ state: v || null })}
              options={states}
            />
          )}
          <Select
            label="Idioma"
            value={filters.language ?? ""}
            onChange={(v) => {
              setSource("all");
              setF({ language: v || null });
            }}
            options={langs}
          />
        </div>
      </header>

      <nav className="tv-cats" aria-label="Categorias">
        <span className="field-label">Canais</span>
        <CatItem on={source === "all" && !filters.categories.length} onClick={showAll} count={counts.total}>
          <LayoutGrid {...ICON} aria-hidden />
          Todos
        </CatItem>
        <CatItem on={source === "favorites"} onClick={() => setSource("favorites")} count={favorites.length}>
          <Heart {...ICON} aria-hidden />
          Favoritos
        </CatItem>
        <CatItem on={source === "history"} onClick={() => setSource("history")} count={history.length}>
          <Clock {...ICON} aria-hidden />
          Histórico
        </CatItem>
        <span className="field-label">Categorias</span>
        {cats.map(([c]) => (
          <CatItem
            key={c}
            on={source === "all" && filters.categories.includes(c)}
            onClick={() => pickCategory(c)}
            count={counts.byCategory.get(c) ?? 0}
          >
            <span className="dot" style={{ background: CATEGORY_COLORS[c] ?? CATEGORY_COLORS.outros }} aria-hidden />
            {catName(c, world)}
          </CatItem>
        ))}
        <div className="tv-cats-footer">
          <SignalButton compact onClick={onSignal} />
          <AboutButton compact onClick={onAbout} />
        </div>
      </nav>

      <section className="tv-list" aria-label="Lista de canais">
        <div className="tv-list-head">
          <h2>{sourceLabel}</h2>
          <span className="muted">
            <span className="num">{fmt(list.length)}</span> {list.length === 1 ? "canal" : "canais"}
            {source === "all" && filters.country ? ` · ${countryOf(world, filters.country)[0]}` : ""}
            {source === "all" && filters.state
              ? ` · ${filters.state === NO_STATE ? "Nacionais e sem estado" : stateName(world, filters.state)}`
              : ""}
            {source === "all" && filters.language ? ` · ${langName(world, filters.language)}` : ""}
          </span>
          {source === "all" && hasFilters && (
            <button className="btn btn-sm btn-ghost" onClick={() => setF(EMPTY_FILTERS)}>
              Limpar filtros
            </button>
          )}
        </div>
        <ChannelList
          world={world}
          list={list}
          numbers={guide.number}
          current={current}
          failed={failed}
          onPick={pick}
          empty={
            source === "favorites"
              ? "Toque na estrela de um canal para guardá-lo aqui."
              : source === "history"
                ? "Os canais que você assistir aparecem aqui."
                : "Nenhum canal com esses filtros."
          }
        />
      </section>

      {current === null && (
        <aside className="tv-screen" aria-label="Tela">
          <div className="tv-static" aria-hidden />
          <div className="tv-screen-text">
            <strong>Sem sinal</strong>
            <span>Escolha um canal na lista.</span>
            <span className="muted">↑ ↓ trocam de canal · digite o número para ir direto</span>
          </div>
        </aside>
      )}

      {typed && (
        <div className="tv-osd num" aria-live="polite">
          {typed}
        </div>
      )}
    </div>
  );
}

function CatItem({
  on,
  onClick,
  count,
  children,
}: {
  on: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button className={`tv-cat ${on ? "is-on" : ""} ${count ? "" : "is-empty"}`} aria-pressed={on} onClick={onClick}>
      {children}
      <span className="tv-cat-count num">{fmt(count)}</span>
    </button>
  );
}

// Lista virtual: com milhares de canais, só as linhas visíveis vão para a tela.
function ChannelList({
  world,
  list,
  numbers,
  current,
  failed,
  onPick,
  empty,
}: {
  world: WorldData;
  list: number[];
  numbers: Int32Array;
  current: number | null;
  failed: Set<string>;
  onPick: (i: number) => void;
  empty: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(600);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // volta ao topo quando a lista muda
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [list]);

  // mantém o canal tocando à vista (setas e números do controle remoto)
  useEffect(() => {
    const el = ref.current;
    const pos = current === null ? -1 : list.indexOf(current);
    if (!el || pos === -1) return;
    const top = pos * ROW_H;
    if (top < el.scrollTop) el.scrollTo({ top });
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTo({ top: top + ROW_H - el.clientHeight });
  }, [current, list]);

  if (!list.length) return <p className="empty tv-empty">{empty}</p>;

  const start = Math.max(0, Math.floor(scroll / ROW_H) - OVERSCAN);
  const end = Math.min(list.length, Math.ceil((scroll + height) / ROW_H) + OVERSCAN);

  return (
    <div className="tv-scroll" ref={ref} onScroll={(e) => setScroll(e.currentTarget.scrollTop)} role="listbox">
      <div style={{ height: list.length * ROW_H, position: "relative" }}>
        {list.slice(start, end).map((i, k) => (
          <TvRow
            key={i}
            world={world}
            i={i}
            number={numbers[i]}
            top={(start + k) * ROW_H}
            on={i === current}
            failed={failed.has(world.channels[i].id)}
            now={now}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}

function TvRow({
  world,
  i,
  number,
  top,
  on,
  failed,
  now,
  onPick,
}: {
  world: WorldData;
  i: number;
  number: number;
  top: number;
  on: boolean;
  failed: boolean;
  now: Date;
  onPick: (i: number) => void;
}) {
  const ch = world.channels[i];
  const [country] = countryOf(world, ch.c);
  const where = placeLabel(world, ch);
  const time = localTime(ch.tz, now);
  const verified = ch.s.some(([, , f]) => f.includes("v"));
  return (
    <button
      role="option"
      aria-selected={on}
      className={`tv-row ${on ? "on" : ""}`}
      style={{ top }}
      onClick={() => onPick(i)}
    >
      <span className="tv-num num">{pad(number)}</span>
      <span className="tv-logo" aria-hidden>
        <span>{ch.n.trim()[0]?.toUpperCase()}</span>
        {ch.lg && (
          <img
            src={ch.lg}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
      </span>
      <span className="tv-main">
        <span className="tv-name">{ch.n}</span>
        <span className="tv-sub">
          <Flag code={ch.c} /> {where ? `${where}, ` : ""}
          {country}
          {ch.cat[0] ? ` · ${catName(ch.cat[0], world)}` : ""}
        </span>
      </span>
      <span className="tv-meta">
        {on && !failed ? (
          <span className="tv-tag tv-tag-live">Tocando</span>
        ) : on ? (
          <span className="tv-tag tv-tag-warn">Fora do ar</span>
        ) : failed ? (
          <span className="tv-tag tv-tag-warn">Falhou</span>
        ) : verified ? (
          <span className="tv-tag tv-tag-ok">Verificado</span>
        ) : null}
        {time && <span className="num muted">{time}</span>}
      </span>
    </button>
  );
}
