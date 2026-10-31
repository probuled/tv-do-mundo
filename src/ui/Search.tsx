import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { countryOf, type WorldData } from "../data";
import { setState, tune } from "../store";
import { ChannelRow } from "./ChannelRow";

export const SEARCH_INPUT_ID = "search-input";

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
    const starts = (i: number) => Number(strip(world.channels[i].n).startsWith(t0));
    return out.sort((a, b) => starts(b) - starts(a)).slice(0, 10);
  }, [q, index, world]);

  const pick = (i: number) => {
    setState({ zapping: false });
    tune(i);
    setOpen(false);
  };

  return (
    <div className="search">
      <Search className="search-icon" size={16} strokeWidth={1.75} aria-hidden />
      <input
        id={SEARCH_INPUT_ID}
        type="search"
        value={q}
        placeholder="Buscar canal, país ou cidade"
        aria-label="Buscar canal"
        autoComplete="off"
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
          else if (e.key === "Escape") {
            setOpen(false);
            e.currentTarget.blur();
          }
        }}
      />
      {!q && (
        <kbd className="kbd" aria-hidden>
          /
        </kbd>
      )}
      {open && q.trim() && (
        <div className="results" role="listbox">
          {!results.length && <p className="empty">Nenhum canal encontrado.</p>}
          {results.map((i, k) => (
            <ChannelRow key={i} world={world} i={i} active={k === active} onPick={pick} />
          ))}
        </div>
      )}
    </div>
  );
}
