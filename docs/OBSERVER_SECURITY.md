# OBSERVER_SECURITY.md — Segurança do modo observador

## Decisão central

Observadores **nunca** podem ver as cartas das mãos dos jogadores.

Essa regra existe para evitar trapaças, especialmente porque o projeto terá chat de voz futuramente.

## O observador pode ver

- cartas jogadas na mesa;
- histórico público da rodada;
- quantidade de cartas de cada jogador;
- nome e avatar dos jogadores;
- ranking parcial ou final;
- mensagens públicas do sistema.

## O observador não pode ver

- cartas nas mãos dos jogadores;
- cartas restantes no baralho;
- cartas privadas trocadas entre Presidente/Mendigo e Vice/Vice-Men;
- decisões internas dos bots antes da jogada;
- qualquer estado privado da partida.

## Regra técnica

Não basta esconder cartas com CSS.

A informação privada **não pode ser enviada** para o navegador do observador.

Estrutura correta:

```text
publicState
  Enviado para jogadores e observadores.

privateStateForPlayer
  Enviado apenas para o dono da mão.

observerState
  Estado público sanitizado. Nunca contém hand, deck ou dados privados.
```

## Política de voz sugerida

Padrão recomendado:

```text
Observadores podem ouvir, mas não falar.
```

Opções futuras:

- sem voz para observadores;
- ouvir apenas;
- host pode liberar fala manualmente.
