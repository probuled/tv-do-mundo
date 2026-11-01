import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Clock, Info, LayoutGrid, Search, Shuffle, Square, Star } from "lucide-react";
import { CATEGORY_COLORS, catName, localTime, type WorldData } from "../data";
import { buildSearchIndex } from "../search";
import { EMPTY_FILTERS, getState, setState, tune, useStore } from "../store";
import { categoryCounts, guideChannels, neighborChannel, numberChannels, shortPlace, type GuideSource } from "../tv";
import { fmt, toggleZap, useFilterOptions } from "./filters";
import { Logo } from "./Logo";
import { SEARCH_INPUT_ID } from "./Search";
import { Select } from "./Sidebar";
import { ChannelLogo, TvPlayer } from "./TvPlayer";
import { useNow } from "./useChannelStream";
import { ViewSwitch } from "./ViewSwitch";

const ICON = { size: 18, strokeWidth: 1.75 } as const;
const ROW_H = 60; // altura de cada linha; a lista só desenha as linhas visíveis
const OVERSCAN = 6;
const DIGIT_WAIT = 1500; // tempo para digitar o número do canal, como no controle remoto
const TOP_CATEGORIES = 9; // as demais ficam atrás de "Ver todas"

const pad = (n: number) => String(n).padStart(3, "0");

// Modo TV: navegação à esquerda, a tela no meio e a lista de canais numerados à direita.
export function TvGuide({ world, onAbout, onSignal }: { world: WorldData; onAbout: () => void; onSignal: () => void }) {
  const filters = useStore((s) => s.filters);
  const favorites = useStore((s) => s.favorites);
  const history = useStore((s) => s.history);
  const zapping = useStore((s) => s.zapping);
  const [source, setSource] = useState<GuideSource>("all");
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState(""); // número sendo digitado no "controle remoto"
  const [allCats, setAllCats] = useState(false);

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
  const pickCategory = (c: string | null) => {
    setSource("all");
    setF({ categories: c === null || (filters.categories.length === 1 && filters.categories[0] === c) ? [] : [c] });
  };
  const pick = (i: number) => {
    setState({ zapping: false });
    tune(i);
  };
  const listRef = useRef(list);
  listRef.current = list;
  const step = (dir: 1 | -1) => {
    const next = neighborChannel(listRef.current, getState().current, dir);
    if (next !== null) pick(next);
  };

  // ↑ ↓ trocam de canal dentro da lista; números levam direto ao canal, como no controle remoto
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
        step(e.key === "ArrowDown" ? 1 : -1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide]);

  const title =
    source === "favorites"
      ? "Favoritos"
      : source === "history"
        ? "Histórico"
        : filters.categories.length === 1
          ? catName(filters.categories[0], world)
          : filters.categories.length > 1
            ? `${filters.categories.length} categorias`
            : "Todos os canais";
  const hasFilters =
    filters.categories.length > 0 || filters.language || filters.country || filters.state || filters.verifiedOnly;
  // a categoria escolhida continua à vista mesmo com a lista recolhida
  const shownCats = allCats ? cats : cats.filter(([c], k) => k < TOP_CATEGORIES || filters.categories.includes(c));

  return (
    <div className="tv">
      <nav className="tv-nav" aria-label="Navegação">
        <div className="tv-nav-top">
          <header className="brand">
            <Logo />
            <div className="brand-text">
              <h1>TV do Mundo</h1>
              <p>
                <span className="live-dot" aria-hidden />
                <span className="num">{fmt(world.channels.length)}</span> canais ao vivo
              </p>
            </div>
            <button className="icon-btn" onClick={onAbout} aria-label="Sobre" title="Sobre">
              <Info size={16} strokeWidth={1.75} />
            </button>
          </header>
          <ViewSwitch />
          <div className="search">
            <Search className="search-icon" size={16} strokeWidth={1.75} aria-hidden />
            <input
              id={SEARCH_INPUT_ID}
              type="search"
              value={query}
              placeholder="Canal, país ou cidade"
              aria-label="Filtrar canais"
              autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  e.currentTarget.blur();
                }
              }}
            />
            {!query && (
              <kbd className="kbd" aria-hidden>
                /
              </kbd>
            )}
          </div>
        </div>

        <div className="tv-nav-body">
          <NavItem
            on={source === "all" && !filters.categories.length}
            onClick={() => pickCategory(null)}
            count={counts.total}
          >
            <LayoutGrid {...ICON} aria-hidden />
            Todos
          </NavItem>
          <NavItem on={source === "favorites"} onClick={() => setSource("favorites")} count={favorites.length}>
            <Star {...ICON} aria-hidden />
            Favoritos
          </NavItem>
          <NavItem on={source === "history"} onClick={() => setSource("history")} count={history.length}>
            <Clock {...ICON} aria-hidden />
            Histórico
          </NavItem>

          <span className="tv-nav-label">Categorias</span>
          {shownCats.map(([c]) => (
            <NavItem
              key={c}
              on={source === "all" && filters.categories.includes(c)}
              onClick={() => pickCategory(c)}
              count={counts.byCategory.get(c) ?? 0}
            >
              <span className="dot" style={{ background: CATEGORY_COLORS[c] ?? CATEGORY_COLORS.outros }} aria-hidden />
              {catName(c, world)}
            </NavItem>
          ))}
          {cats.length > TOP_CATEGORIES && (
            <button className="tv-nav-more" onClick={() => setAllCats(!allCats)}>
              {allCats ? "Ver menos" : `Ver todas (${cats.length})`}
            </button>
          )}
        </div>

        <div className="tv-nav-footer">
          <button className={`zap ${zapping ? "is-on" : ""}`} onClick={toggleZap} title="Zapear (Z)">
            {zapping ? <Square size={15} strokeWidth={2} aria-hidden /> : <Shuffle {...ICON} aria-hidden />}
            {zapping ? "Parar de zapear" : "Zapear"}
          </button>
        </div>
      </nav>

      <TvPlayer world={world} number={(i) => guide.number[i]} typed={typed} onStep={step} onSignal={onSignal} />

      <section className="tv-list" aria-label="Lista de canais">
        <div className="tv-list-head">
          <div className="tv-list-title">
            <h2>{title}</h2>
            <span className="num muted">
              {fmt(list.length)} {list.length === 1 ? "canal" : "canais"}
            </span>
          </div>
          {source === "all" && (
            <div className="tv-list-filters">
              <Select
                label="País"
                hideLabel
                allLabel="Todos os países"
                value={filters.country ?? ""}
                onChange={(v) => setF({ country: v || null, state: null })}
                options={countries}
              />
              <Select
                label="Idioma"
                hideLabel
                allLabel="Todos os idiomas"
                value={filters.language ?? ""}
                onChange={(v) => setF({ language: v || null })}
                options={langs}
              />
              {states.length > 0 && (
                <Select
                  label="Estado"
                  hideLabel
                  allLabel="Todos os estados"
                  value={filters.state ?? ""}
                  onChange={(v) => setF({ state: v || null })}
                  options={states}
                />
              )}
            </div>
          )}
          {source === "all" && hasFilters && (
            <button className="tv-clear" onClick={() => setF(EMPTY_FILTERS)}>
              Limpar filtros
            </button>
          )}
        </div>
        <ChannelList
          world={world}
          list={list}
          numbers={guide.number}
          onPick={pick}
          empty={
            source === "favorites"
              ? "Toque na estrela de um canal para guardá-lo aqui."
              : source === "history"
                ? "Os canais que você assistir aparecem aqui."
                : "Nenhum canal com esses filtros."
          }
        />
        <footer className="tv-list-footer">
          <span>
            <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> trocar de canal
          </span>
          <span>
            <kbd className="kbd">F</kbd> tela cheia
          </span>
        </footer>
      </section>
    </div>
  );
}

function NavItem({
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
    <button
      className={`tv-nav-item ${on ? "is-on" : ""} ${count ? "" : "is-empty"}`}
      aria-pressed={on}
      onClick={onClick}
    >
      {children}
      <span className="tv-nav-count num">{fmt(count)}</span>
    </button>
  );
}

// Lista virtual: com milhares de canais, só as linhas visíveis vão para a tela.
function ChannelList({
  world,
  list,
  numbers,
  onPick,
  empty,
}: {
  world: WorldData;
  list: number[];
  numbers: Int32Array;
  onPick: (i: number) => void;
  empty: string;
}) {
  const current = useStore((s) => s.current);
  const failed = useStore((s) => s.failed);
  const ref = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(600);
  const now = useNow(30_000);
  const hasRows = list.length > 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasRows]);

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

  if (!hasRows) return <p className="empty tv-empty">{empty}</p>;

  const start = Math.max(0, Math.floor(scroll / ROW_H) - OVERSCAN);
  const end = Math.min(list.length, Math.ceil((scroll + height) / ROW_H) + OVERSCAN);

  return (
    <div className="tv-scroll" ref={ref} onScroll={(e) => setScroll(e.currentTarget.scrollTop)} role="listbox">
      <div style={{ height: list.length * ROW_H, position: "relative" }}>
        {list.slice(start, end).map((i, k) => {
          const ch = world.channels[i];
          const on = i === current;
          const off = failed.has(ch.id);
          const time = localTime(ch.tz, now);
          return (
            <button
              key={i}
              role="option"
              aria-selected={on}
              className={`tv-row ${on ? "on" : ""}`}
              style={{ top: (start + k) * ROW_H }}
              onClick={() => onPick(i)}
            >
              <span className="tv-num num">{pad(numbers[i])}</span>
              <ChannelLogo name={ch.n} src={ch.lg} className="tv-logo" />
              <span className="tv-main">
                <span className="tv-name">{ch.n}</span>
                <span className="tv-sub">
                  {shortPlace(world, ch)}
                  {ch.cat[0] ? ` · ${catName(ch.cat[0], world)}` : ""}
                </span>
              </span>
              {on && !off ? (
                <span className="tv-eq" role="img" aria-label="Tocando">
                  <i />
                  <i />
                  <i />
                </span>
              ) : off ? (
                <span className="tv-off">fora do ar</span>
              ) : (
                time && <span className="tv-time num">{time}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
