import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Share,
  Shuffle,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
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
import { randomChannel, toggleFavorite, tune, useStore } from "../store";
import { initials } from "../tv";
import { SignalButton } from "./Sidebar";
import { useChannelStream, useNow } from "./useChannelStream";

const ICON = { size: 18, strokeWidth: 1.75 } as const;
const pad = (n: number) => String(n).padStart(3, "0");

// Logo do canal; sem logo (ou se ele não carregar), mostra as iniciais.
export function ChannelLogo({ name, src, className }: { name: string; src?: string; className: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={className} aria-hidden>
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

// Player do modo TV: tela grande com controles próprios e, embaixo, as informações do canal.
export function TvPlayer({
  world,
  number,
  typed,
  onStep,
  onSignal,
}: {
  world: WorldData;
  number: (i: number) => number;
  typed: string; // número sendo digitado no "controle remoto"
  onStep: (step: 1 | -1) => void;
  onSignal: () => void;
}) {
  const current = useStore((s) => s.current);
  const { video, status, muted, setMuted, needsTap, unmute } = useChannelStream(world);
  const screen = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [full, setFull] = useState(false);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void screen.current?.requestFullscreen?.();
  };
  const togglePip = () => {
    const v = video.current;
    if (!v) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void v.requestPictureInPicture?.().catch(() => {});
  };

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === screen.current);
    document.addEventListener("fullscreenchange", onChange);
    // F: tela cheia
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") toggleFull();
    };
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", key);
    };
  }, []);

  const ch = current === null ? null : world.channels[current];
  const playing = status.kind === "playing";

  return (
    <div className="tv-stage">
      <div className={`tv-screen ${full ? "is-full" : ""}`} ref={screen}>
        {ch ? (
          <video
            ref={video}
            playsInline
            muted={muted}
            onClick={() => (video.current?.paused ? video.current.play() : video.current?.pause())}
            onPlay={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          />
        ) : (
          <div className="tv-static" aria-hidden />
        )}

        <div className="tv-badges">
          {ch && playing && (
            <span className="tv-badge is-live">
              <span className="tv-badge-dot" aria-hidden />
              AO VIVO
            </span>
          )}
          {ch && status.kind === "loading" && <span className="tv-badge">SINTONIZANDO</span>}
          {ch && status.kind === "failed" && <span className="tv-badge is-off">FORA DO AR</span>}
          {current !== null && <span className="tv-badge num">CH{pad(number(current))}</span>}
        </div>

        {typed && (
          <div className="tv-osd num" aria-live="polite">
            {typed}
          </div>
        )}

        {!ch && (
          <div className="overlay">
            <strong>Sem sinal</strong>
            <span className="muted">Escolha um canal na lista ou digite o número dele.</span>
          </div>
        )}
        {ch && status.kind === "loading" && (
          <div className="overlay">
            <ChannelLogo name={ch.n} src={ch.lg} className="tv-screen-logo" />
            <span>
              <LoaderCircle className="spin" size={14} strokeWidth={1.75} aria-hidden /> Sintonizando
              {status.total > 1 ? ` (fonte ${status.attempt} de ${status.total})` : ""}
            </span>
          </div>
        )}
        {ch && status.kind === "failed" && (
          <div className="overlay failed">
            <strong>Canal fora do ar</strong>
            <span className="muted">{status.reason}</span>
            <div className="overlay-actions">
              <button className="btn btn-sm" onClick={() => onStep(1)}>
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
                Próximo canal
              </button>
              <SignalButton compact onClick={onSignal} />
            </div>
          </div>
        )}
        {ch && needsTap && playing && (
          <button className="btn btn-sm unmute" onClick={unmute}>
            <VolumeX size={16} strokeWidth={1.75} aria-hidden />
            Toque para ativar o som
          </button>
        )}

        <div className="tv-controls">
          <button
            className="tv-ctl"
            disabled={!playing}
            onClick={() => (paused ? video.current?.play() : video.current?.pause())}
            aria-label={paused ? "Continuar" : "Pausar"}
            title={paused ? "Continuar" : "Pausar"}
          >
            {paused ? <Play {...ICON} /> : <Pause {...ICON} />}
          </button>
          <button
            className="tv-ctl"
            disabled={!ch}
            onClick={() => {
              if (needsTap) return unmute();
              if (video.current) video.current.muted = !muted;
            }}
            aria-label={muted ? "Ativar o som" : "Tirar o som"}
            title={muted ? "Ativar o som" : "Tirar o som"}
          >
            {muted ? <VolumeX {...ICON} /> : <Volume2 {...ICON} />}
          </button>
          <span className="tv-ctl-sep" aria-hidden />
          <button className="tv-ctl" onClick={() => onStep(-1)} aria-label="Canal anterior" title="Canal anterior (↑)">
            <ChevronUp {...ICON} />
          </button>
          <button className="tv-ctl" onClick={() => onStep(1)} aria-label="Próximo canal" title="Próximo canal (↓)">
            <ChevronDown {...ICON} />
          </button>
          <span className="tv-ctl-name">{ch?.n ?? "Nenhum canal"}</span>
          <button
            className="tv-ctl"
            disabled={!playing || !document.pictureInPictureEnabled}
            onClick={togglePip}
            aria-label="Janela flutuante"
            title="Janela flutuante"
          >
            <PictureInPicture2 {...ICON} />
          </button>
          <button
            className="tv-ctl"
            onClick={toggleFull}
            aria-label={full ? "Sair da tela cheia" : "Tela cheia"}
            title="Tela cheia (F)"
          >
            {full ? <Minimize {...ICON} /> : <Maximize {...ICON} />}
          </button>
        </div>
      </div>

      <TvInfo world={world} onSignal={onSignal} />
    </div>
  );
}

function TvInfo({ world, onSignal }: { world: WorldData; onSignal: () => void }) {
  const current = useStore((s) => s.current);
  const favorites = useStore((s) => s.favorites);
  const now = useNow();
  const [copied, setCopied] = useState(false);

  if (current === null) {
    return (
      <section className="tv-info tv-info-empty">
        <p>
          <strong>Como numa TV:</strong> escolha um canal na lista, use ↑ ↓ para trocar e digite o número do canal para
          ir direto.
        </p>
        <button className="btn btn-sm" onClick={() => tune(randomChannel())}>
          <Shuffle size={16} strokeWidth={1.75} aria-hidden />
          Canal aleatório
        </button>
      </section>
    );
  }

  const ch = world.channels[current];
  const [country] = countryOf(world, ch.c);
  const where = placeLabel(world, ch);
  const time = localTime(ch.tz, now);
  const fav = favorites.includes(ch.id);
  const flags = playableStreams(ch)[0]?.[2] ?? "";

  return (
    <section className="tv-info" aria-label="Sobre o canal">
      <div className="tv-info-head">
        <ChannelLogo name={ch.n} src={ch.lg} className="tv-info-logo" />
        <div className="tv-info-titles">
          <h2>{ch.n}</h2>
          <p>
            {where ? `${where}, ` : ""}
            {country}
            {time && (
              <>
                {" · "}
                <span className="num">{time}</span> hora local
              </>
            )}
          </p>
        </div>
        <div className="tv-info-actions">
          <button
            className={`btn btn-sm btn-square ${fav ? "is-fav" : ""}`}
            onClick={() => toggleFavorite(ch.id)}
            aria-pressed={fav}
            aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
            title={fav ? "Remover dos favoritos" : "Favoritar"}
          >
            <Star size={16} strokeWidth={1.75} fill={fav ? "currentColor" : "none"} />
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
            <Share size={16} strokeWidth={1.75} aria-hidden />
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
        <span className="chip chip-static chip-muted">{country}</span>
        {flags.includes("v") && <span className="chip chip-static chip-ok">Verificado</span>}
        {flags.includes("g") && <span className="chip chip-static chip-warn">Pode ter bloqueio regional</span>}
        {flags.includes("n") && <span className="chip chip-static chip-warn">Não é 24h</span>}
      </div>
      <p className="disclaimer">
        Transmissão de terceiros, listada publicamente pelo iptv-org. Não hospedamos nem retransmitimos vídeo; o canal
        pode sair do ar a qualquer momento.
      </p>
    </section>
  );
}
