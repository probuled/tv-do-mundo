import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import { loadWorld, type WorldData } from "./data";
import { getState, randomChannel, setState, tune, useStore } from "./store";
import { GlobeView } from "./globe/GlobeView";
import { Player } from "./ui/Player";
import { CollapsedBar, Sidebar } from "./ui/Sidebar";
import { Hud, Tooltip } from "./ui/Overlays";
import { Logo } from "./ui/Logo";
import { REPO_URL } from "./ui/GithubButton";
import { SEARCH_INPUT_ID } from "./ui/Search";
import { TvGuide } from "./ui/TvGuide";

export default function App() {
  const world = useStore((s) => s.world);
  const spy = useStore((s) => s.spy);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const view = useStore((s) => s.view);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"about" | "signal" | null>(null);

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
      else if (k === "v" && getState().view === "globe") setState({ spy: !getState().spy });
      else if (k === "escape") setState({ current: null, zapping: false });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (error) return <div className="splash">Erro ao carregar os canais: {error}</div>;
  if (!world) return <Splash />;

  return (
    <div className={view === "tv" ? "app tv-mode" : `app ${spy ? "spy" : ""} ${sidebarOpen ? "has-sidebar" : ""}`}>
      {view === "tv" ? (
        <TvGuide world={world} onAbout={() => setDialog("about")} onSignal={() => setDialog("signal")} />
      ) : (
        <>
          <GlobeView world={world} />
          <Hud world={world} />
          {sidebarOpen ? (
            <Sidebar world={world} onAbout={() => setDialog("about")} onSignal={() => setDialog("signal")} />
          ) : (
            <CollapsedBar world={world} onAbout={() => setDialog("about")} onSignal={() => setDialog("signal")} />
          )}
          <Tooltip world={world} />
          <Player world={world} onSignal={() => setDialog("signal")} />
        </>
      )}
      {dialog === "about" && <About world={world} onClose={() => setDialog(null)} />}
      {dialog === "signal" && <SignalHelp onClose={() => setDialog(null)} />}
    </div>
  );
}

function Splash() {
  return (
    <div className="splash">
      <Logo size={48} />
      <h1>TV do Mundo</h1>
      <p>
        <LoaderCircle className="spin" size={14} strokeWidth={1.75} aria-hidden />
        Carregando canais
      </p>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn close" onClick={onClose} aria-label="Fechar">
          <X size={16} strokeWidth={1.75} />
        </button>
        {children}
      </div>
    </div>
  );
}

// Explica as mensagens de "Canal fora do ar" do player (veja friendly() em ui/Player.tsx)
const SIGNAL_ERRORS = [
  {
    message: "O servidor da emissora recusou a conexão",
    meaning:
      "O servidor respondeu, mas não liberou o vídeo. O mais comum é bloqueio regional (o canal só abre para quem está no país dele) ou um link com prazo de validade que já venceu.",
  },
  {
    message: "A emissora não respondeu a tempo",
    meaning:
      "O servidor ficou 12 segundos sem mandar nada. Costuma ser lentidão ou sobrecarga do lado da emissora e muitas vezes passa sozinho.",
  },
  {
    message: "O sinal começou mas caiu no meio do caminho",
    meaning: "A transmissão chegou a abrir, mas a conexão caiu. Em geral é instabilidade momentânea.",
  },
  {
    message: "Erro no vídeo",
    meaning:
      "O navegador recebeu o link mas não conseguiu tocar: pode ser um formato que ele não suporta, uma proteção contra cópia ou um link quebrado.",
  },
  {
    message: "Este canal só tem streams HTTP",
    meaning:
      "O link da emissora não é seguro (HTTP) e o navegador bloqueia esse tipo de vídeo em sites HTTPS. Esse não muda sozinho.",
  },
];

function SignalHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2>Canal fora do ar?</h2>
      <p>
        Quase sempre é temporário. Este site não guarda vídeo: o player abre direto o link de cada emissora, do seu
        navegador. Quando nenhum link do canal responde naquele momento, aparece "Canal fora do ar". Isso não quer dizer
        que o canal acabou.
      </p>
      <h3>O que cada mensagem quer dizer</h3>
      <ul className="signal-list">
        {SIGNAL_ERRORS.map((e) => (
          <li key={e.message}>
            <q>{e.message}</q>
            <p>{e.meaning}</p>
          </li>
        ))}
      </ul>
      <h3>O que dá para fazer</h3>
      <p>
        Tente de novo daqui a alguns minutos ou em outro horário: basta clicar no canal outra vez. Em caso de bloqueio
        regional, o canal só abre de uma conexão do país dele.
      </p>
      <p className="muted">
        Os canais que falham são pulados pelo aleatório e pelo zapear até você recarregar a página. A lista de links é
        atualizada a partir do iptv-org, então um link vencido pode voltar a funcionar numa próxima versão.
      </p>
    </Modal>
  );
}

function About({ world, onClose }: { world: WorldData; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
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
      <p className="muted">
        Versão {__APP_VERSION__} · Código aberto no{" "}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </Modal>
  );
}
