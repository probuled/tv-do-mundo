# Changelog

Todas as mudanças relevantes deste projeto ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Botão "Fora do ar?" também no card do player, ao lado de Próximo aleatório e Compartilhar.

## [0.5.0] - 2026-10-31

### Adicionado

- Botão "Fora do ar?" ao lado de Satélite e Sobre, com uma janela que explica cada mensagem de "Canal fora do ar"
  e mostra que, na maioria das vezes, a falha é temporária.

### Corrigido

- A lista da busca não some mais ao escolher um canal: dá para testar outros resultados até achar um que funcione.
  Ela só fecha ao apagar o texto, no X ou com Esc.

## [0.4.0] - 2026-10-31

### Adicionado

- Filtro "Estado", que aparece ao escolher um país: lista os estados com canais e a opção "Nacionais e sem estado".
- A busca também encontra canais pelo nome do estado (por exemplo "Bahia" ou "Pará").

### Alterado

- Canais brasileiros regionais que a lista do iptv-org marcava como "Brasil inteiro" agora ficam no estado (e na
  cidade) onde são transmitidos. As redes nacionais ficam na cidade da sede e aparecem no player como "Nacional ·
  sede em São Paulo". O ponto central do Brasil, em Brasília, cai de 207 para 91 canais.
- O player mostra a sigla do estado ao lado da cidade, por exemplo "Belém (PA)".

### Corrigido

- O player passa a mostrar a cidade dos canais locais (por exemplo "Natal" e "Fortaleza"). Os dados marcavam as
  cidades como país e o nome delas não aparecia.

## [0.3.0] - 2026-10-31

### Adicionado

- Botão do GitHub no topo do painel (e na barra do painel recolhido) que abre o repositório do projeto, com o
  mesmo link na janela "Sobre".

## [0.2.0] - 2026-10-31

### Alterado

- O globo não gira mais sozinho: ele fica parado e só se move quando a pessoa o gira, o que facilita clicar nos
  canais. Ao soltar, ele para quase na hora, sem continuar deslizando.
- Novo visual: tudo fica num painel lateral à esquerda (marca, busca, zapear, filtros, favoritos, histórico, Satélite
  e Sobre), com tipografia Geist, ícones de traço e cores discretas. O globo fica centralizado no espaço livre.
- O painel lateral pode ser recolhido; recolhido, a busca, o Satélite e o Sobre ficam numa barra compacta no topo. A
  escolha fica salva no navegador.
- Os pontos do globo e os chips de categoria usam a mesma paleta, então os chips servem de legenda do mapa.
- Fundo liso no lugar do céu estrelado.
- Nova logo (planeta com órbita), usada no painel, na barra recolhida, na tela de carregamento e no ícone da aba.

### Adicionado

- Atalho `/` para ir direto à busca.

## [0.1.0] - 2026-10-31

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

[Não lançado]: https://github.com/probuled/tv-do-mundo/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/probuled/tv-do-mundo/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/probuled/tv-do-mundo/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/probuled/tv-do-mundo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/probuled/tv-do-mundo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/probuled/tv-do-mundo/releases/tag/v0.1.0
