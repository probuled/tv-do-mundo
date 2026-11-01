import { useMemo, useState } from "react";
import { ChevronDown, Info, Layers, PanelLeftClose, PanelLeftOpen, RadioTower, Shuffle, Square } from "lucide-react";
import { CATEGORY_COLORS, catName, type WorldData } from "../data";
import { EMPTY_FILTERS, getState, matchesFilters, setState, tune, useStore } from "../store";
import { ChannelRow } from "./ChannelRow";
import { GithubButton } from "./GithubButton";
import { Logo } from "./Logo";
import { SearchBox } from "./Search";
import { fmt, toggleZap, useFilterOptions } from "./filters";

const ICON = { size: 16, strokeWidth: 1.75 } as const;

function useCountries(world: WorldData) {
  return useMemo(() => new Set(world.channels.map((c) => c.c)).size, [world]);
}

export function SpyButton({ compact }: { compact?: boolean }) {
  const spy = useStore((s) => s.spy);
  return (
    <button
      className={`btn ${compact ? "btn-sm" : ""} ${spy ? "is-on" : ""}`}
      aria-pressed={spy}
      title="Visual de satélite (V)"
      onClick={() => setState({ spy: !spy })}
    >
      <Layers {...ICON} aria-hidden />
      Satélite
    </button>
  );
}

export function AboutButton({ compact, onClick }: { compact?: boolean; onClick: () => void }) {
  return (
    <button className={`btn ${compact ? "btn-sm" : ""}`} onClick={onClick}>
      <Info {...ICON} aria-hidden />
      Sobre
    </button>
  );
}

export function SignalButton({ compact, onClick }: { compact?: boolean; onClick: () => void }) {
  return (
    <button className={`btn ${compact ? "btn-sm" : ""}`} title="Por que um canal fica fora do ar" onClick={onClick}>
      <RadioTower {...ICON} aria-hidden />
      Fora do ar?
    </button>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="select">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Todos</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
      </span>
    </label>
  );
}

export function Sidebar({ world, onAbout, onSignal }: { world: WorldData; onAbout: () => void; onSignal: () => void }) {
  const filters = useStore((s) => s.filters);
  const zapping = useStore((s) => s.zapping);
  const zapSeconds = useStore((s) => s.zapSeconds);
  const favorites = useStore((s) => s.favorites);
  const history = useStore((s) => s.history);
  const [tab, setTab] = useState<"filters" | "favorites" | "history">("filters");
  const countryCount = useCountries(world);

  const idOf = useMemo(() => new Map(world.channels.map((c, i) => [c.id, i])), [world]);
  // matchesFilters lê os filtros do store; "filters" na lista refaz a contagem quando mudam
  const count = useMemo(() => {
    let n = 0;
    for (let i = 0; i < world.channels.length; i++) if (matchesFilters(i)) n++;
    return n;
  }, [world, filters]);

  const { cats, langs, countries, states } = useFilterOptions(world, filters.country);

  const setF = (patch: Partial<typeof filters>) => setState({ filters: { ...getState().filters, ...patch } });
  const toggleCat = (c: string) =>
    setF({
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });
  const hasFilters =
    filters.categories.length > 0 || filters.language || filters.country || filters.state || filters.verifiedOnly;
  const list = tab === "favorites" ? favorites : history;

  return (
    <aside className="sidebar" aria-label="Painel">
      <div className="sidebar-top">
        <header className="brand">
          <Logo />
          <div className="brand-text">
            <h1>TV do Mundo</h1>
            <p>
              <span className="live-dot" aria-hidden />
              <span className="num">{fmt(world.channels.length)}</span> canais ·{" "}
              <span className="num">{countryCount}</span> países
            </p>
          </div>
          <GithubButton />
          <button
            className="icon-btn"
            onClick={() => setState({ sidebarOpen: false })}
            aria-label="Recolher painel"
            title="Recolher painel"
          >
            <PanelLeftClose {...ICON} />
          </button>
        </header>

        <SearchBox world={world} />

        <button className={`zap ${zapping ? "is-on" : ""}`} onClick={toggleZap} title="Zapear (Z)">
          {zapping ? <Square size={15} strokeWidth={2} aria-hidden /> : <Shuffle {...ICON} aria-hidden />}
          {zapping ? "Parar de zapear" : "Zapear pelo planeta"}
        </button>
        {zapping && (
          <label className="zap-speed">
            Trocar a cada
            <span className="select select-sm">
              <select value={zapSeconds} onChange={(e) => setState({ zapSeconds: Number(e.target.value) })}>
                {[10, 25, 45, 90].map((s) => (
                  <option key={s} value={s}>
                    {s} s
                  </option>
                ))}
              </select>
              <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
            </span>
          </label>
        )}
      </div>

      <div className="sidebar-body">
        <div className="segmented" role="tablist">
          {(["filters", "favorites", "history"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? "is-on" : ""}
              onClick={() => setTab(t)}
            >
              {t === "filters" ? "Filtros" : t === "favorites" ? "Favoritos" : "Histórico"}
              {t === "favorites" && <span className="badge">{favorites.length}</span>}
            </button>
          ))}
        </div>

        {tab === "filters" ? (
          <div className="filters">
            <p className="count">
              <span className="num">{fmt(count)}</span> canais no mapa
            </p>
            <div className="field-row">
              <Select
                label="Idioma"
                value={filters.language ?? ""}
                onChange={(v) => setF({ language: v || null })}
                options={langs}
              />
              <Select
                label="País"
                value={filters.country ?? ""}
                onChange={(v) => setF({ country: v || null, state: null })}
                options={countries}
              />
            </div>
            {states.length > 0 && (
              <Select
                label="Estado"
                value={filters.state ?? ""}
                onChange={(v) => setF({ state: v || null })}
                options={states}
              />
            )}
            {world.checkedAt && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => setF({ verifiedOnly: e.target.checked })}
                />
                <span className="switch-track" aria-hidden />
                Só canais testados em {new Date(world.checkedAt).toLocaleDateString("pt-BR")}
              </label>
            )}
            <div>
              <span className="field-label">Categorias</span>
              <div className="chips">
                {cats.map(([c, n]) => (
                  <button
                    key={c}
                    className={`chip ${filters.categories.includes(c) ? "is-on" : ""}`}
                    style={{ ["--c" as string]: CATEGORY_COLORS[c] ?? CATEGORY_COLORS.outros }}
                    aria-pressed={filters.categories.includes(c)}
                    onClick={() => toggleCat(c)}
                    title={`${fmt(n)} canais`}
                  >
                    <span className="chip-dot" aria-hidden />
                    {catName(c, world)}
                  </button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button className="btn btn-ghost" onClick={() => setF(EMPTY_FILTERS)}>
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="list">
            {list.length === 0 && (
              <p className="empty">
                {tab === "favorites"
                  ? "Toque na estrela de um canal para guardá-lo aqui."
                  : "Os canais que você assistir aparecem aqui."}
              </p>
            )}
            {list
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
      </div>

      <footer className="sidebar-footer">
        <SpyButton />
        <SignalButton onClick={onSignal} />
        <AboutButton onClick={onAbout} />
      </footer>
    </aside>
  );
}

// Com o painel recolhido: marca, zapear e GitHub à esquerda; busca, Satélite, Fora do ar? e Sobre à direita.
export function CollapsedBar({
  world,
  onAbout,
  onSignal,
}: {
  world: WorldData;
  onAbout: () => void;
  onSignal: () => void;
}) {
  const zapping = useStore((s) => s.zapping);
  return (
    <>
      <div className="mini-bar mini-left">
        <button
          className="icon-btn"
          onClick={() => setState({ sidebarOpen: true })}
          aria-label="Abrir painel"
          title="Abrir painel"
        >
          <PanelLeftOpen {...ICON} />
        </button>
        <span className="mini-brand">
          <Logo size={22} />
          TV do Mundo
        </span>
        <button
          className={`icon-btn ${zapping ? "is-on" : ""}`}
          onClick={toggleZap}
          aria-pressed={zapping}
          aria-label={zapping ? "Parar de zapear" : "Zapear pelo planeta"}
          title="Zapear (Z)"
        >
          {zapping ? <Square size={14} strokeWidth={2} /> : <Shuffle {...ICON} />}
        </button>
        <GithubButton />
      </div>
      <div className="mini-bar mini-right">
        <SearchBox world={world} />
        <SpyButton compact />
        <SignalButton compact onClick={onSignal} />
        <AboutButton compact onClick={onAbout} />
      </div>
    </>
  );
}
