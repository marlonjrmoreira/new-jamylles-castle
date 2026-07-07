# ARCHITECTURE.md — Arquitetura do Projeto

## Objetivo técnico

Criar um jogo leve, modular e compatível com GitHub Pages usando HTML, CSS e JavaScript puro.

## Estrutura

```text
index.html
css/
  style.css
  menu.css
  game.css
  cards.css
  animations.css
js/
  app.js
  game.js
  deck.js
  player.js
  rules.js
assets/
  splash/
  cards/
  audio/
  icons/
docs/
  RULES.md
  ARCHITECTURE.md
  STYLEGUIDE.md
CHANGELOG.md
README.md
```

## Módulos

- `app.js`: troca de telas e inicialização.
- `game.js`: estado geral da partida.
- `deck.js`: criação e embaralhamento do baralho.
- `player.js`: estrutura dos jogadores.
- `rules.js`: configuração central das regras.

## Próximos módulos previstos

- `turn.js`: controle de turno.
- `combinations.js`: validação de jogadas.
- `bot.js`: inteligência artificial.
- `ui.js`: renderização da mesa.
- `animation.js`: animações de cartas.
- `network.js`: multiplayer futuramente.

---

## Atualização v0.0.3 — Separação público/privado

A arquitetura passa a considerar três camadas de estado:

```text
GameState completo
  Usado internamente pelo host/servidor.

PublicState
  Estado público enviado a todos.

PrivatePlayerState
  Estado privado enviado somente ao jogador dono da mão.

ObserverState
  Estado público sanitizado enviado aos observadores.
```

Princípio de segurança:

```text
Se o observador não deve ver, o navegador dele não deve receber.
```

Novos módulos:

```text
js/room-config.js        Configurações de sala, senha, coringas e política de observador.
js/public-state.js       Geração de estados públicos e privados.
js/disconnect-policy.js  Política de remoção e redistribuição de cartas.
js/spectator.js          Entrada e payload seguro do observador.
js/multiplayer-policy.js Roadmap técnico do multiplayer.
```
