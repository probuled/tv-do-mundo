import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
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
import { getState, markFailed, randomChannel, setState, toggleFavorite, tune, useStore } from "../store";

const START_TIMEOUT = 12_000;
const ICON = { size: 16, strokeWidth: 1.75 } as const;

// Erros do hls.js -> explicação para gente
function friendly(reason: string) {
  if (/manifest|level|LoadError|ParsingError/i.test(reason))
    return "O servidor da emissora recusou a conexão: pode ser bloqueio regional ou o sinal saiu do ar.";
  if (/frag|buffer/i.test(reason)) return "O sinal começou mas caiu no meio do caminho.";
  if (/tempo/i.test(reason)) return "A emissora não respondeu a tempo.";
  return reason;
}

type Status =
  { kind: "loading"; attempt: number; total: number } | { kind: "playing" } | { kind: "failed"; reason: string };

export function Player({ world }: { world: WorldData }) {
  const current = useStore((s) => s.current);
  const zapping = useStore((s) => s.zapping);
  const favorites = useStore((s) => s.favorites);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading", attempt: 0, total: 0 });
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // tenta cada stream do canal até um tocar
  useEffect(() => {
    if (current === null) return;
    const v = video.current!;
    const ch = world.channels[current];
    const streams = playableStreams(ch);
    let hls: Hls | null = null;
    let timer = 0;
    let cancelled = false;
    let attempt = -1;

    const cleanup = () => {
      clearTimeout(timer);
      hls?.destroy();
      hls = null;
      v.removeAttribute("src");
      v.load();
    };

    const next = (reason?: string) => {
      if (cancelled) return;
      cleanup();
      attempt++;
      if (attempt >= streams.length) {
        setStatus({ kind: "failed", reason: friendly(reason ?? "Nenhum stream respondeu.") });
        markFailed(current);
        // no modo zapear, segue para outro canal sozinho
        if (getState().zapping) setTimeout(() => !cancelled && tune(randomChannel()), 1200);
        return;
      }
      setStatus({ kind: "loading", attempt: attempt + 1, total: streams.length });
      const [url] = streams[attempt];
      timer = window.setTimeout(() => next("Tempo esgotado."), START_TIMEOUT);
      if (url.includes(".m3u8") && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 2,
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) next(data.details);
        });
        hls.loadSource(url);
        hls.attachMedia(v);
      } else {
        v.src = url; // Safari toca HLS nativo; ou é um arquivo direto
      }
      play();
    };

    const play = () => {
      v.play().catch((e: DOMException) => {
        // autoplay com som bloqueado: tenta mudo e pede um toque
        if (e.name === "NotAllowedError" && !v.muted) {
          v.muted = true;
          setMuted(true);
          setNeedsTap(true);
          v.play().catch(() => {});
        }
      });
    };

    const onPlaying = () => {
      clearTimeout(timer);
      setStatus({ kind: "playing" });
    };
    // Com hls.js os erros chegam pelo próprio hls; e trocar de fonte esvazia o
    // src, o que dispara um "error" falso que pularia a próxima fonte.
    const onError = () => {
      if (hls || !v.getAttribute("src")) return;
      next("Erro no vídeo.");
    };
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);

    if (!streams.length) {
      setStatus({ kind: "failed", reason: "Este canal só tem streams HTTP, que o navegador bloqueia em sites HTTPS." });
    } else next();

    return () => {
      cancelled = true;
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
      cleanup();
    };
  }, [current, world]);

  // zapear: troca de canal a cada N segundos
  const zapSeconds = useStore((s) => s.zapSeconds);
  useEffect(() => {
    if (!zapping) return;
    if (getState().current === null) tune(randomChannel());
    const t = setInterval(() => tune(randomChannel()), zapSeconds * 1000);
    return () => clearInterval(t);
  }, [zapping, zapSeconds, current]);

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
          <button
            className="btn btn-sm unmute"
            onClick={() => {
              video.current!.muted = false;
              setMuted(false);
              setNeedsTap(false);
            }}
          >
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
