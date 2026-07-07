# MULTIPLAYER_PLAN.md — Plano do modo online

Status: planejamento técnico e base modular da **v0.0.3**.

## Objetivo

Manter o jogo hospedado no GitHub Pages, com frontend em HTML, CSS e JavaScript puro, e preparar a arquitetura para um serviço de tempo real no futuro.

## Recursos planejados

1. Criação de salas com nome personalizado.
2. Senha personalizada para convidados.
3. Opção de sala pública, privada ou protegida por senha.
4. Presença online dos jogadores.
5. Reconexão com tolerância de tempo.
6. Remoção automática de jogadores desconectados.
7. Redistribuição das cartas do jogador removido.
8. Opção futura de substituir desconectado por bot.
9. Entrada como observador após o início da partida.
10. Chat de voz em etapa posterior.

## Política de desconexão

Regra padrão proposta:

```text
Se um jogador desconectar:
1. o jogo aguarda 60 segundos;
2. se ele não voltar, é removido da partida;
3. suas cartas são embaralhadas;
4. as cartas são distribuídas uma a uma entre os jogadores ativos;
5. a distribuição começa pelo próximo jogador ativo após o desconectado;
6. o turno é recalculado se necessário.
```

## Arquivos criados na v0.0.3

- `js/room-config.js`
- `js/public-state.js`
- `js/disconnect-policy.js`
- `js/spectator.js`
- `js/multiplayer-policy.js`

Esses arquivos ainda não são o multiplayer completo. Eles são a fundação para impedir que a lógica de sala, segurança e desconexão fique misturada com a interface.
