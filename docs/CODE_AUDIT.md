# CODE_AUDIT.md — Verificação do arquivo `gemini-code-1778867922647.html`

Status: **verificado em 2026-07-07**

## Resultado geral

Sim, o arquivo contém a lógica principal das regras do jogo Presidente.

Ele inclui:

- configuração de jogadores humanos, bots, baralhos e coringas;
- montagem, embaralhamento e distribuição do baralho;
- ordem de força das cartas;
- validação de jogadas;
- controle de turnos e passes;
- limpeza da mesa;
- ranking final;
- revanche com troca automática;
- IA básica dos bots;
- início de multiplayer via PeerJS.

## Pontos fortes

- As regras principais estão centralizadas em funções relativamente fáceis de extrair.
- A ordem das cartas está clara.
- A validação de jogada é objetiva.
- O sistema de revanche já tem uma regra interessante de troca entre Presidente/Mendigo e Vice/Vice-Men.
- A IA dos bots já joga uma partida completa localmente.

## Pontos que precisam de refatoração

- HTML, CSS, rede, animações, cartas e regra estão misturados no mesmo arquivo.
- O multiplayer ainda não sincroniza o estado completo do jogo.
- A função `getPlayerName()` não usa o nickname real digitado no lobby dentro da partida.
- A IA joga grupos inteiros na mesa livre, o que pode ser desejado ou pode precisar de ajuste.
- A troca de cartas da revanche é automática; o jogador não escolhe manualmente.
- Não há testes automatizados para validar as regras.

## Decisão recomendada

Preservar as regras existentes, mas extrair a engine para módulos separados antes de adicionar novas animações ou multiplayer completo.
