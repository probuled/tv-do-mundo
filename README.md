<p align="center">
  <img src="public/logo.svg" width="96" height="96" alt="Logo do TV do Mundo" />
</p>

<h1 align="center">TV do Mundo</h1>

<p align="center">
  Gire o planeta, clique num ponto e assista à TV aberta daquele lugar, ao vivo.
</p>

<p align="center">
  <a href="https://tv-do-mundo.probuled.workers.dev/"><strong>Acessar o TV do Mundo</strong></a>
  ·
  <a href="https://github.com/probuled/tv-do-mundo/releases">Versões</a>
  ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <a href="https://github.com/probuled/tv-do-mundo/actions/workflows/ci.yml"><img src="https://github.com/probuled/tv-do-mundo/actions/workflows/ci.yml/badge.svg?branch=develop" alt="CI" /></a>
  <a href="https://github.com/probuled/tv-do-mundo/releases"><img src="https://img.shields.io/github/v/release/probuled/tv-do-mundo?label=vers%C3%A3o" alt="Versão" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/probuled/tv-do-mundo?label=licen%C3%A7a" alt="Licença MIT" /></a>
</p>

![Canal da Guatemala tocando no TV do Mundo, com o globo e o painel lateral](docs/images/assistindo.jpg)

O TV do Mundo é um globo 3D no navegador em que cada canal de TV aberta ao vivo é um ponto de luz. São cerca de
9.600 canais de 179 países. Clique num ponto para assistir na hora, ou aperte **Zapear pelo planeta** e deixe o
globo viajar sozinho de canal em canal.

**Em produção:** [tv-do-mundo.probuled.workers.dev](https://tv-do-mundo.probuled.workers.dev/), hospedado no
Cloudflare. A versão publicada é sempre a da branch `main`.

## O que dá para fazer

- **Assistir a qualquer canal do mapa.** O globo voa até o canal, que começa a tocar no player ao lado, com a
  bandeira, a cidade e a hora local de onde ele transmite.
- **Zapear pelo planeta.** O app sorteia um canal a cada intervalo (10, 25, 45 ou 90 segundos) e voa até ele. Se um
  canal estiver fora do ar, ele pula sozinho para o próximo.
- **Ver o dia e a noite de verdade.** O lado escuro do globo segue a posição real do Sol, com as luzes das cidades.
- **Filtrar.** Por categoria (notícias, esportes, música, infantil e outras), idioma e país. A cor de cada ponto é a
  da categoria, então os chips do painel funcionam como legenda do mapa.
- **Buscar.** Por nome do canal, país ou cidade, com o atalho `/`.
- **Guardar.** Favoritos e histórico ficam salvos no navegador, e cada canal tem um link para compartilhar.
- **Ligar o visual Satélite.** Visão noturna verde, linhas de varredura e uma faixa de telemetria com o horário UTC,
  as coordenadas e a hora local do canal.

| Visual Satélite                                                             | Painel recolhido                                                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ![Visual Satélite com visão noturna e telemetria](docs/images/satelite.jpg) | ![Painel lateral recolhido, com a busca no topo](docs/images/painel-recolhido.jpg) |

<p align="center">
  <img src="docs/images/celular.jpg" width="260" alt="TV do Mundo no celular" />
  <br />
  <sub>No celular, o painel vira uma gaveta e o player abre embaixo.</sub>
</p>

### Atalhos

| Tecla | Ação                |
| ----- | ------------------- |
| `/`   | Buscar              |
| `Z`   | Zapear pelo planeta |
| `R`   | Canal aleatório     |
| `V`   | Visual Satélite     |
| `Esc` | Fechar o player     |

## Como funciona

**De onde vêm os canais.** Da lista pública do [iptv-org](https://github.com/iptv-org/iptv), mantida pela
comunidade. O script `scripts/build-data.ts` baixa a API deles e filtra o que o navegador consegue tocar: saem os
streams que exigem cabeçalhos especiais, os canais adultos e os encerrados.

**Onde fica cada ponto.** O iptv-org não tem coordenadas. Cada canal é posicionado pela área de transmissão
informada na lista, na ordem cidade, estado e país, com coordenadas do [Wikidata](https://www.wikidata.org). Hoje
631 canais ficam na cidade, 339 no estado e o restante na capital do país, espalhados numa espiral para não ficarem
empilhados.

**Como o vídeo toca.** O site **não hospeda nem retransmite vídeo**: o player ([hls.js](https://github.com/video-dev/hls.js))
toca a URL original de cada emissora, direto no navegador de quem assiste. Ele tenta cada fonte do canal, começando
pelas que passaram no teste de funcionamento, e avisa quando nenhuma responde em 12 segundos.

**HTTPS.** Em produção o site roda em HTTPS, e o navegador bloqueia streams HTTP nessas páginas. O app detecta isso
e usa só fontes HTTPS: cerca de 85% dos canais têm pelo menos uma. Os outros não aparecem no mapa publicado, mas
tocam quando o projeto roda localmente.

**O globo.** [globe.gl](https://github.com/vasturiano/globe.gl) sobre three.js, com um shader próprio para o dia e
a noite e uma camada própria de pontos: os cerca de 9.600 canais são desenhados de uma vez, e os do outro lado do
planeta somem.

## Rodando localmente

Requer Node.js 24.

```sh
npm install
npm run dev        # http://localhost:5173
```

Ou com Docker (nginx servindo o build):

```sh
docker compose up -d --build   # http://localhost:8080
```

A imagem de cada versão também fica publicada em `ghcr.io/probuled/tv-do-mundo`.

### Atualizando os canais

Os dados já vêm em `public/data/channels.json`. Para gerar de novo a partir do iptv-org:

```sh
npm run check      # opcional: testa todos os streams (10 a 50 minutos)
npm run data       # baixa a lista, geolocaliza e gera o JSON
```

Os downloads ficam em cache na pasta `.cache/`. Apague-a para buscar dados novos.

### Scripts

| Comando             | O que faz                       |
| ------------------- | ------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento     |
| `npm run build`     | Build de produção em `dist/`    |
| `npm run lint`      | oxlint                          |
| `npm run typecheck` | Checagem de tipos do TypeScript |
| `npm test`          | Testes com Vitest               |
| `npm run format`    | Formata o código com Prettier   |

## Estrutura

```
scripts/build-data.ts     API do iptv-org + coordenadas do Wikidata -> public/data/channels.json
scripts/check-streams.ts  teste de todos os streams -> .cache/health.json
src/globe/GlobeView.tsx   globo, shader de dia e noite e a camada de pontos dos canais
src/ui/Sidebar.tsx        painel lateral e a barra do painel recolhido
src/ui/Player.tsx         player, tentativa de cada fonte e o modo zapear
src/ui/Search.tsx         busca de canais
src/ui/Overlays.tsx       telemetria do visual Satélite e tooltip
```

## Contribuindo

O projeto usa Git Flow e Conventional Commits, com as regras em [`CLAUDE.md`](CLAUDE.md). Em resumo: todo trabalho
sai da `develop` numa branch `<tipo>/APP-<n>-<descricao>`, os commits seguem Conventional Commits em português, e
tudo entra por pull request com os checks `ci`, `pr-title` e `commitlint` passando. Cada release vai para a `main`
com uma tag `vX.Y.Z`, e é a `main` que está em produção.

## Créditos

- Canais: [iptv-org/iptv](https://github.com/iptv-org/iptv) (CC0 / Unlicense)
- Coordenadas: [Wikidata](https://www.wikidata.org) (CC0)
- Imagens da Terra: NASA Blue Marble e Black Marble (domínio público), via exemplos do
  [three-globe](https://github.com/vasturiano/three-globe)
- Globo: [globe.gl](https://github.com/vasturiano/globe.gl) (MIT) · player: [hls.js](https://github.com/video-dev/hls.js)
  (Apache-2.0)
- Ícones: [Lucide](https://lucide.dev) (ISC) · fontes: [Geist](https://vercel.com/font) (SIL OFL) · bandeiras:
  [flag-icons](https://github.com/lipis/flag-icons) (MIT)
- Inspiração do visual Satélite: [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) (MIT).
  Os efeitos daqui são uma versão própria e simplificada em CSS, sem código copiado.

Os canais são de terceiros e podem sair do ar a qualquer momento. Canais adultos ficam de fora.

## Licença

Código sob a licença [MIT](LICENSE). Os canais, as coordenadas e as imagens seguem as licenças das fontes listadas
em Créditos.
