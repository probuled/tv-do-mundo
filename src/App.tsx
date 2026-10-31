import { useEffect, useState } from "react";
import { Globe, LoaderCircle, X } from "lucide-react";
import { loadWorld, type WorldData } from "./data";
import { getState, randomChannel, setState, tune, useStore } from "./store";
import { GlobeView } from "./globe/GlobeView";
import { Player } from "./ui/Player";
import { CollapsedBar, Sidebar } from "./ui/Sidebar";
import { Hud, Tooltip } from "./ui/Overlays";
import { SEARCH_INPUT_ID } from "./ui/Search";

export default function App() {
  const world = useStore((s) => s.world);
  const spy = useStore((s) => s.spy);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const [error, setError] = useState<string | null>(null);
  const [about, setAbout] = useState(false);

  useEffect(() => {
    loadWorld()
      .then((w) => {
        setState({ world: w });
        // link compartilhado: ?canal=ID
        const id = new URLSearchParams(location.search).get("canal");
        const i = id ? w.channels.findIndex((c) => c.id === id) : -1;
        if (i >= 0) tune(i);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea") || !getState().world) return;
      const k = e.key.toLowerCase();
      if (k === "/") {
        e.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      } else if (k === "z") {
        const on = !getState().zapping;
        setState({ zapping: on });
        if (on) tune(randomChannel());
      } else if (k === "r") tune(randomChannel());
      else if (k === "v") setState({ spy: !getState().spy });
      else if (k === "escape") setState({ current: null, zapping: false });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (error) return <div className="splash">Erro ao carregar os canais: {error}</div>;
  if (!world) return <Splash />;

  return (
    <div className={`app ${spy ? "spy" : ""} ${sidebarOpen ? "has-sidebar" : ""}`}>
      <GlobeView world={world} />
      <Hud world={world} />
      {sidebarOpen ? (
        <Sidebar world={world} onAbout={() => setAbout(true)} />
      ) : (
        <CollapsedBar world={world} onAbout={() => setAbout(true)} />
      )}
      <Player world={world} />
      <Tooltip world={world} />
      {about && <About world={world} onClose={() => setAbout(false)} />}
    </div>
  );
}

function Splash() {
  return (
    <div className="splash">
      <span className="brand-mark" aria-hidden>
        <Globe size={18} strokeWidth={1.75} />
      </span>
      <h1>TV do Mundo</h1>
      <p>
        <LoaderCircle className="spin" size={14} strokeWidth={1.75} aria-hidden />
        Carregando canais
      </p>
    </div>
  );
}

function About({ world, onClose }: { world: WorldData; onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={onClose} aria-label="Fechar">
          <X size={16} strokeWidth={1.75} />
        </button>
        <h2>TV do Mundo</h2>
        <p>
          Gire o planeta e clique em qualquer ponto para assistir à TV aberta daquele lugar, ao vivo. A cor do ponto
          indica a categoria; o lado noturno do globo segue a hora real.
        </p>
        <p>
          <b>Atalhos:</b> / buscar · Z zapear pelo planeta · R canal aleatório · V visual de satélite · Esc fechar o
          player.
        </p>
        <p>
          <b>Onde fica cada canal?</b> Quando a fonte informa a cidade ou o estado de transmissão, o ponto fica lá. A
          maioria só informa o país: esses canais aparecem em espiral em volta da capital.
        </p>
        <p className="muted">
          Canais da lista pública do{" "}
          <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer">
            iptv-org
          </a>{" "}
          (atualizada em {world.generatedAt}); coordenadas do Wikidata; imagens da Terra da NASA (Blue Marble / Black
          Marble). Este site não hospeda nem retransmite vídeo: o player toca a URL original de cada emissora, que pode
          estar fora do ar ou bloqueada na sua região. Canais adultos são excluídos.
        </p>
        <p className="muted">Versão {__APP_VERSION__}</p>
      </div>
    </div>
  );
}
