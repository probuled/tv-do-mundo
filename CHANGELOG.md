# Changelog

Todas as mudanças relevantes deste projeto ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Globo 3D com terminador dia/noite na posição real do Sol e luzes das cidades no lado noturno.
- Cerca de 9.600 canais de TV aberta ao vivo da lista do iptv-org, posicionados por cidade, estado ou país com
  coordenadas do Wikidata.
- Player com hls.js que tenta cada fonte do canal e avisa quando o canal está fora do ar.
- Modo "Zapear pelo planeta", que troca de canal sozinho a cada intervalo escolhido.
- Busca por canal, país ou cidade; filtros por categoria, idioma, país e canais testados.
- Favoritos, histórico e link para compartilhar um canal.
- Visual "Satélite" com visão noturna, linhas de varredura e HUD com coordenadas e hora local.
- Scripts para gerar os dados (`npm run data`) e testar todos os streams (`npm run check`).
- Imagem Docker com nginx e fluxo de versionamento com Git Flow, Conventional Commits e CI.
