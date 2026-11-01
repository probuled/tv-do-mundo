import { useState } from "react";
import { ExternalLink, Link, LoaderCircle, Shuffle, Star, VolumeX, X } from "lucide-react";
import {
  catColor,
  catName,
  countryOf,
  langName,
  localTime,
  placeLabel,
  playableStreams,
  type WorldData,
} from "../data";
import { Flag } from "./Flag";
import { SignalButton } from "./Sidebar";
import { randomChannel, setState, toggleFavorite, tune, useStore } from "../store";
import { useChannelStream, useNow } from "./useChannelStream";

const ICON = { size: 16, strokeWidth: 1.75 } as const;

export function Player({ world, onSignal }: { world: WorldData; onSignal: () => void }) {
  const current = useStore((s) => s.current);
  const favorites = useStore((s) => s.favorites);
  const { video, status, muted, setMuted, needsTap, unmute } = useChannelStream(world);
  const now = useNow();
  const [copied, setCopied] = useState(false);

  if (current === null) return null;
  const ch = world.channels[current];
  const [country] = countryOf(world, ch.c);
  const where = placeLabel(world, ch);
  const time = localTime(ch.tz, now);
  const fav = favorites.includes(ch.id);
  const streamFlags = playableStreams(ch)[0]?.[2] ?? "";

  return (
    <aside className="player" aria-label="Player">
      <div className="video-wrap">
        <video
          ref={video}
          playsInline
          controls={status.kind === "playing"}
          muted={muted}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        />
        {status.kind === "loading" && (
          <div className="overlay">
            <LoaderCircle className="spin" size={22} strokeWidth={1.75} aria-hidden />
            <span>Sintonizando{status.total > 1 ? ` (fonte ${status.attempt} de ${status.total})` : ""}</span>
          </div>
        )}
        {status.kind === "failed" && (
          <div className="overlay failed">
            <strong>Canal fora do ar</strong>
            <span className="muted">{status.reason}</span>
            <button className="btn btn-sm" onClick={() => tune(randomChannel())}>
              <Shuffle {...ICON} aria-hidden />
              Outro canal aleatório
            </button>
          </div>
        )}
        {needsTap && status.kind === "playing" && (
          <button className="btn btn-sm unmute" onClick={unmute}>
            <VolumeX {...ICON} aria-hidden />
            Toque para ativar o som
          </button>
        )}
      </div>

      <div className="info">
        <div className="info-head">
          {ch.lg && (
            <img
              className="logo"
              src={ch.lg}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <div className="titles">
            <h2>{ch.n}</h2>
            <p>
              <Flag code={ch.c} /> {where ? `${where}, ` : ""}
              {country}
              {time && (
                <span className="muted">
                  {" "}
                  · <span className="num">{time}</span> hora local
                </span>
              )}
            </p>
          </div>
          <button
            className={`icon-btn ${fav ? "is-fav" : ""}`}
            onClick={() => toggleFavorite(ch.id)}
            aria-pressed={fav}
            aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
            title={fav ? "Remover dos favoritos" : "Favoritar"}
          >
            <Star {...ICON} fill={fav ? "currentColor" : "none"} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setState({ current: null, zapping: false })}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            <X {...ICON} />
          </button>
        </div>
        <div className="chips">
          {ch.cat.map((c) => (
            <span key={c} className="chip chip-static" style={{ ["--c" as string]: catColor([c]) }}>
              <span className="chip-dot" aria-hidden />
              {catName(c, world)}
            </span>
          ))}
          {ch.l?.slice(0, 3).map((l) => (
            <span key={l} className="chip chip-static chip-muted">
              {langName(world, l)}
            </span>
          ))}
          {streamFlags.includes("v") && <span className="chip chip-static chip-ok">Verificado</span>}
          {streamFlags.includes("g") && <span className="chip chip-static chip-warn">Pode ter bloqueio regional</span>}
          {streamFlags.includes("n") && <span className="chip chip-static chip-warn">Não é 24h</span>}
        </div>
        <div className="info-actions">
          <button className="btn btn-sm" onClick={() => tune(randomChannel())}>
            <Shuffle {...ICON} aria-hidden />
            Próximo aleatório
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              navigator.clipboard?.writeText(location.href).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            <Link {...ICON} aria-hidden />
            {copied ? "Link copiado" : "Compartilhar"}
          </button>
          <SignalButton compact onClick={onSignal} />
          {ch.w && (
            <a className="btn btn-sm btn-ghost" href={ch.w} target="_blank" rel="noreferrer">
              Site
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
            </a>
          )}
        </div>
        <p className="disclaimer">
          Transmissão de terceiros, listada publicamente pelo iptv-org. Não hospedamos nem retransmitimos vídeo; pode
          sair do ar a qualquer momento.
        </p>
      </div>
    </aside>
  );
}
