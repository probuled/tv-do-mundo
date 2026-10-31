# TV do Mundo

Um globo 3D no navegador em que cada canal de TV aberta ao vivo é um ponto de luz. Gire o
planeta, clique num ponto e assista à TV daquele lugar na hora. Ou aperte **Zapear pelo
planeta** e deixe o globo viajar sozinho de canal em canal.

- ~9.600 canais de ~180 países, da lista pública do [iptv-org](https://github.com/iptv-org/iptv)
- Lado noturno do globo com as luzes das cidades, seguindo a hora real do Sol
- Cor do ponto = categoria (notícias, esportes, música, infantil…)
- Filtros por categoria, idioma e país; favoritos, histórico e link para compartilhar (`?canal=ID`)
- Visual **Satélite** (tecla V): visão noturna, linhas de varredura e HUD com coordenadas, hora local e UTC

**Atalhos:** / buscar · Z zapear · R canal aleatório · V satélite · Esc fechar o player.

O painel lateral pode ser recolhido pelo botão no canto dele; recolhido, a busca, o Satélite e o Sobre ficam numa
barra compacta no topo.

## Como rodar

```sh
npm install
npm run dev        # http://localhost:5173
```

Os dados já vêm em `public/data/channels.json`. Para atualizar:

```sh
npm run check      # testa todos os streams (10-50 min), opcional
npm run data       # baixa a API do iptv-org, geolocaliza e gera o JSON
```

`npm run data` guarda tudo em `.cache/`. Apague essa pasta para buscar dados novos.

## Estrutura

```
scripts/build-data.ts     API iptv-org + coordenadas do Wikidata -> channels.json
scripts/check-streams.ts  health check de todos os streams -> .cache/health.json
src/globe/GlobeView.tsx   globe.gl + shader dia/noite + camada própria de pontos (THREE.Points)
src/ui/Player.tsx         hls.js, tentativa de cada fonte, tratamento de falha, zapear
src/ui/Sidebar.tsx        painel lateral (busca, zapear, filtros, favoritos, histórico) e a barra recolhida
src/ui/Search.tsx         busca de canais, com o atalho /
src/ui/Overlays.tsx       HUD do satélite e tooltip
```

## Relatório dos dados (Fase 0)

**Fonte dos canais.** Usei a API pública do iptv-org (`channels`, `feeds`, `streams`, `logos`, `countries`,
`subdivisions`, `cities`, `categories`, `languages`, `blocklist`). Ela lista 31.711 canais e 18.386 streams, e
10.402 canais têm pelo menos um stream.

**Filtros aplicados.** Saem os streams que exigem User-Agent ou Referer próprios (o navegador não deixa definir
esses cabeçalhos), os canais adultos (`is_nsfw`, categoria `xxx`, blocklist) e os canais encerrados. Sobram
**9.655 canais**.

**Geolocalização.** O iptv-org não tem coordenadas. Cada canal é posicionado pelo campo `broadcast_area` do
feed principal, na ordem cidade (`ct/`) → estado (`s/`) → país (`c/`), e as coordenadas vêm do **Wikidata**:

- cidades: pelo `wikidata_id` da cidade
- estados: pelo código ISO 3166-2 (propriedade P300)
- países: pela capital (P36) ou, na falta dela, pelo próprio país

Resultado: 631 canais ficam na cidade, 339 no estado e **8.685 só no país**. Esses aparecem numa espiral
dourada em volta da capital, para não ficarem empilhados num ponto. O iptv-org usa `UK` em vez do ISO `GB`,
e isso é tratado no código.

**Streams que tocam no navegador.** Testei uma amostra aleatória de 400:

| Resultado                                        |   % |
| ------------------------------------------------ | --: |
| Playlist HLS válida                              | 67% |
| Válida **e** com CORS liberado (toca com hls.js) | 65% |
| Válida, com CORS e HTTPS                         | 54% |

As falhas foram domínios inexistentes, 403 (muitas vezes bloqueio regional), 404 e timeouts. `npm run check`
testa todos os streams. Os mortos (404, domínio inexistente, resposta que não é playlist) saem do mapa. Os que
falham de um jeito que pode ser só daqui (403/451, timeout, sem CORS) ficam, mas sem o selo "verificado".

**HTTP × HTTPS.** Em `localhost` todos os streams tocam. Publicado em HTTPS, o navegador bloqueia os streams HTTP
(conteúdo misto). O app detecta isso, usa só as fontes HTTPS e esconde do mapa os canais que só têm HTTP.

**Globo.** Escolhi o **globe.gl** (three.js) em vez do CesiumJS. É bem mais leve, não precisa de chave e já traz
atmosfera e voo de câmera. O Cesium só fica fotorrealista com chave do Google ou do Cesium ion. Os pontos dos
canais são uma camada própria em `THREE.Points` com shader: um único draw call para os ~9.600 canais, os pontos
do outro lado do globo somem, o canal tocando pulsa, e a seleção busca o ponto mais próximo na tela.

## Cuidados

- O site **não hospeda nem retransmite vídeo**: o player toca a URL original de cada emissora, no navegador de
  quem assiste. Não há proxy.
- Os canais são de terceiros e podem sair do ar a qualquer momento. O player tenta cada fonte do canal e, se
  nenhuma responder em 12 s, avisa e oferece outro canal (no modo zapear, pula sozinho).
- Canais adultos ficam de fora.

## Créditos

- Canais: [iptv-org/iptv](https://github.com/iptv-org/iptv) (dados sob CC0 / Unlicense)
- Coordenadas: [Wikidata](https://www.wikidata.org) (CC0)
- Imagens da Terra: NASA Blue Marble e Black Marble (domínio público), via exemplos do
  [three-globe](https://github.com/vasturiano/three-globe)
- Globo: [globe.gl](https://github.com/vasturiano/globe.gl) (MIT) · player: [hls.js](https://github.com/video-dev/hls.js) (Apache-2.0)
- Bandeiras: [flag-icons](https://github.com/lipis/flag-icons) (MIT)
- Inspiração do visual "satélite": [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) (MIT).
  Os efeitos daqui são uma versão própria e simplificada em CSS, sem código copiado.

## Licença

Código sob a licença [MIT](LICENSE). Os canais, as coordenadas e as imagens seguem as licenças das fontes listadas
em Créditos.
