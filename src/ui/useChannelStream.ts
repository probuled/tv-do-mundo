import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { playableStreams, type WorldData } from "../data";
import { getState, markFailed, randomChannel, tune, useStore } from "../store";

const START_TIMEOUT = 12_000;

// Erros do hls.js -> explicação para gente
function friendly(reason: string) {
  if (/manifest|level|LoadError|ParsingError/i.test(reason))
    return "O servidor da emissora recusou a conexão: pode ser bloqueio regional ou o sinal saiu do ar.";
  if (/frag|buffer/i.test(reason)) return "O sinal começou mas caiu no meio do caminho.";
  if (/tempo/i.test(reason)) return "A emissora não respondeu a tempo.";
  return reason;
}

export type Status =
  { kind: "loading"; attempt: number; total: number } | { kind: "playing" } | { kind: "failed"; reason: string };

// Toca o canal atual no <video>: tenta cada stream até um funcionar e cuida do zapear.
// O player do globo e o do modo TV usam o mesmo hook.
export function useChannelStream(world: WorldData) {
  const current = useStore((s) => s.current);
  const zapping = useStore((s) => s.zapping);
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading", attempt: 0, total: 0 });
  const [muted, setMuted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

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

  const unmute = () => {
    video.current!.muted = false;
    setMuted(false);
    setNeedsTap(false);
  };

  return { video, status, muted, setMuted, needsTap, unmute };
}

// Hora local que se atualiza sozinha.
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
