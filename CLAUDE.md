# TV do Mundo

Globo 3D (globe.gl + three.js) para assistir TV aberta ao vivo. React + TypeScript + Vite, player com hls.js,
dados gerados por `scripts/build-data.ts` a partir do iptv-org e do Wikidata. Detalhes no `README.md`.

## Quando pedirem para "subir", "commitar", "mandar pro GitHub" ou "abrir PR"

Seguir sempre o fluxo da seção 6 abaixo, do começo ao fim, sem pular etapas:

1. Criar a branch certa a partir da `develop` atualizada (seção 1).
2. Commits pequenos em Conventional Commits (seção 2), em português e sem emoji.
3. Rodar `npm run lint && npm run typecheck && npm test && npm run build`. Se algo falhar, corrigir a causa.
4. Atualizar o `CHANGELOG.md` quando a mudança for visível para quem usa.
5. Mostrar o resultado localmente e esperar o "pode subir" antes do push e do PR.
6. Esperar o "pode mergear" antes do merge.

Um pedido explícito como "pode subir" ou "sobe e abre o PR" vale como autorização para o push e o PR daquela
tarefa. O merge sempre precisa de um "pode mergear" separado.

## Regras inegociáveis (parte de Git)

1. Nunca commitar direto em `main` ou `develop`. Todo trabalho passa por branch e PR (Git Flow).
2. Commits seguem **Conventional Commits**, validados pelo commitlint. **Nunca usar `--no-verify`.**
3. Antes de dizer que terminou, rodar: `npm run lint && npm run typecheck && npm test && npm run build`.
4. Código e identificadores em **inglês**. Textos de interface, comentários, commits, PRs e documentação em
   **português**.
5. **Nunca usar emoji** em commits, títulos e descrições de PR, releases, tags, `CHANGELOG.md`, documentação e
   comentários de review. Só texto. Isso vale também para a linha de assinatura do PR: escrever
   `Gerado com Claude Code`, sem o ícone.

## 1. Git Flow

| Branch                                           | Sai de    | Merge em               | Uso                     |
| ------------------------------------------------ | --------- | ---------------------- | ----------------------- |
| `main`                                           | —         | —                      | Produção (tag `vX.Y.Z`) |
| `develop`                                        | `main`    | `main` via release     | Integração              |
| `feature/*`                                      | `develop` | `develop`              | Funcionalidade nova     |
| `fix/*`                                          | `develop` | `develop`              | Bug antes da produção   |
| `release/*`                                      | `develop` | `main` **e** `develop` | Estabilizar versão      |
| `hotfix/*`                                       | `main`    | `main` **e** `develop` | Bug em produção         |
| `refactor/*` `chore/*` `docs/*` `ci/*` `build/*` | `develop` | `develop`              | Demais mudanças         |

Formato do nome da branch: `<tipo>/<ID>-<descricao-kebab>`.

- Exemplos: `feature/APP-14-filtro-por-continente`, `fix/APP-57-player-trava`, `release/1.2.0`.
- Tudo em minúsculas (exceto o prefixo `APP`), sem acento.
- Sem gerenciador de tarefas, o número é sequencial: pegar o maior `APP-n` em `git branch -a` / `git log --all` e
  somar 1.

## 2. Conventional Commits

```
<tipo>(<escopo>)<!>: <descrição>

<corpo: o quê e por quê>

<rodapé: BREAKING CHANGE: ..., Closes #12>
```

| Tipo                              | Uso                                    | Versão  |
| --------------------------------- | -------------------------------------- | ------- |
| `feat`                            | Nova funcionalidade                    | MINOR   |
| `fix`                             | Correção de bug                        | PATCH   |
| `perf`                            | Performance                            | PATCH   |
| `ui`                              | Mudança visual (CSS, layout, tema)     | PATCH   |
| `config`                          | Configuração                           | PATCH   |
| `refactor`                        | Reestruturação sem mudar comportamento | —       |
| `style`                           | Formatação de código (**não é CSS**)   | —       |
| `test`                            | Testes                                 | —       |
| `docs` · `build` · `ci` · `chore` | Docs, deps/Docker, Actions, manutenção | —       |
| `revert`                          | Reverter commit                        | depende |

- Descrição em **minúscula**, no **imperativo** (como se completasse "este commit vai..."), com cabeçalho de até
  **72 caracteres**.
- Escopo em kebab-case, com o nome da área. Escopos deste projeto: `globo`, `player`, `zapear`, `busca`, `filtros`,
  `satelite`, `dados`, `layout`, `tema`, `docker`, `deps`, `ci`, `git`.
- Um commit trata de um assunto só.
- Quebra de compatibilidade: `!` no cabeçalho + rodapé `BREAKING CHANGE:`.

```
feat(zapear): permite escolher o intervalo entre canais
ui(player): mostra a bandeira do país ao lado do nome do canal
fix(globo): corrige o ponto que some do outro lado do planeta
```

Mensagens como `ajustes`, `WIP`, `fix: bug` ou `Feat: Adicionado Login.` são bloqueadas pelo commitlint ou
rejeitadas no review.

## 3. Travas automáticas

| Momento  | Hook / Workflow                         | Checa                                                        |
| -------- | --------------------------------------- | ------------------------------------------------------------ |
| commit   | `pre-commit` → `npx lint-staged`        | oxlint `--fix` + Prettier nos arquivos alterados             |
| commit   | `commit-msg` → `npx --no -- commitlint` | Formato da mensagem                                          |
| push     | `pre-push` → `npx validate-branch-name` | Nome da branch e typecheck                                   |
| PR       | `ci.yml`                                | lint · format · typecheck · test · build · `docker build`    |
| PR       | `pr-title.yml`                          | Título do PR em Conventional Commits, até 66 caracteres      |
| PR       | `commitlint.yml`                        | Todos os commits do PR                                       |
| tag `v*` | `release.yml`                           | Imagem em `ghcr.io/luanmvcosta0/tv-do-mundo:X.Y.Z` + Release |

A configuração está em `commitlint.config.mjs`, `.husky/`, `.github/workflows/` e nas chaves `lint-staged` e
`validate-branch-name` do `package.json`.

Se uma trava bloquear, corrija a causa:

- `subject must be lower-case` → `git commit --amend -m "feat(busca): descricao em minuscula"`
- Nome de branch inválido → `git branch -m feature/APP-12-nome-certo`
- Erro de tipo ou lint → corrigir o código.

## 4. Dia a dia

```bash
git checkout develop && git pull --rebase
git checkout -b feature/APP-14-filtro-por-continente
git add -p
git commit -m "feat(filtros): adiciona filtro por continente"
git fetch origin && git rebase origin/develop
git push -u origin feature/APP-14-filtro-por-continente   # pre-push roda typecheck
```

Depois de rebase numa branch já publicada, usar `git push --force-with-lease`. Nunca usar `--force` e nunca forçar
push em `main` ou `develop`.

## 5. Pull Requests

- O título segue Conventional Commits, porque vira a mensagem do commit no squash.
- Título, descrição e notas de release só com texto, sem emoji.
- Template preenchido (`.github/pull_request_template.md`), terminando com a linha `Gerado com Claude Code`.
- PRs pequenos: até ~400 linhas alteradas.
- `feature/*` e `fix/*` entram em `develop` por **Squash and merge**. `release/*` e `hotfix/*` entram em `main` por
  **Merge commit**. Depois disso, a `main` volta para a `develop` por um PR `main → develop`, também por
  **Merge commit** (seção 7).
- No squash, o GitHub soma ` (#N)` ao título: mantenha o título do PR com até **66 caracteres** para o commit final
  não passar dos 72 do commitlint.
- Apagar a branch depois do merge.

**Proteção de branch** (configurar uma vez no GitHub), para `main` e `develop`:

- Em **Settings → Rules → Rulesets**:
  - PR obrigatório (0 aprovações em projeto solo).
  - Checks obrigatórios: `ci`, `pr-title` e `commitlint`.
  - Branch atualizada antes do merge.
  - Formas de merge: só merge commit na `main`; squash e merge commit na `develop` (o merge commit é para a volta da
    `main`). Sem histórico linear obrigatório, porque ele bloquearia essa volta.
  - Force push e exclusão bloqueados, sem lista de bypass.
- Em **Settings → General → Pull Requests**:
  - Permitir squash merge, com a mensagem padrão sendo o título do PR.
  - Permitir merge commit.
  - Desativar rebase merge.
  - Apagar a branch automaticamente depois do merge.

## 6. Fluxo de entrega da IA

1. Ler a seção do assunto e o requisito da tarefa.
2. Criar a branch `<tipo>/APP-<n>-<descricao>` a partir da `develop` atualizada.
3. Implementar em commits pequenos, seguindo Conventional Commits.
4. Rodar `lint`, `typecheck`, `test` e `build`, e corrigir o que falhar.
5. Atualizar o `CHANGELOG.md` (seção "Não lançado") quando a mudança for visível para quem usa.
6. **Commitar localmente e mostrar o resultado**: subir com `docker compose up -d --build` (porta 8080), passar o
   link local e prints da tela. O app só tem tema escuro, então os prints são desse tema. Se o Docker não estiver
   disponível, usar `npm run build && npm run preview` e dizer isso.
7. Fazer push e abrir o PR **só depois de "pode subir"**.
8. Fazer o merge **só depois de "pode mergear"** (squash em `develop`, título do PR com até 66 caracteres).

## 7. Versão (SemVer `vMAJOR.MINOR.PATCH`)

- **MAJOR** sobe quando quebra compatibilidade, por exemplo favoritos salvos que deixam de ser lidos sem migração.
  **MINOR** sobe com funcionalidade nova. **PATCH** sobe com correção ou ajuste visual.
- Na fase `0.x.x`, quebra de compatibilidade sobe o MINOR. A `1.0.0` marca o projeto pronto para produção.
- A versão é a mesma no `package.json`, na tag `vX.Y.Z` e na imagem Docker. No app, ela é exposta por
  `__APP_VERSION__`, definido no `vite.config.ts` (aparece na janela "Sobre").
- `CHANGELOG.md` no formato Keep a Changelog, com as seções Adicionado, Alterado, Depreciado, Removido, Corrigido e
  Segurança.

```bash
git checkout -b release/1.2.0 develop
npm version 1.2.0 --no-git-tag-version
# mover "Não lançado" para "## [1.2.0] - AAAA-MM-DD" no CHANGELOG.md
git commit -am "chore(release): 1.2.0"
# PR → main (merge commit); depois:
git checkout main && git pull && git tag -a v1.2.0 -m "release: v1.2.0" && git push origin v1.2.0
# volta da main para a develop (push direto na develop é bloqueado):
gh pr create --base develop --head main --title "chore(release): incorpora a 1.2.0 na develop"
# CI verde → merge com **Merge commit** (não squash, para a develop continuar descendo da main)
```

## Dados

- `public/data/channels.json` é gerado: não editar à mão. Rodar `npm run check` (opcional, 10 a 50 min) e depois
  `npm run data`. O cache fica em `.cache/`, fora do git.
- As texturas da Terra em `public/textures/` são imagens da NASA (domínio público).
