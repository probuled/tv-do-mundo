import { useEffect, useRef, useState } from "react";
import { catName, countryOf, localTime, type WorldData } from "../data";
import { useStore } from "../store";
import { Flag } from "./Flag";

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
