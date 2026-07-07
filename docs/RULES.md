# Regras do Presidente — v0.1.0

Este documento registra as regras implementadas a partir do arquivo original enviado.

## Jogadores

- Mínimo de 3 jogadores.
- A versão local v0.1 usa 1 jogador humano e bots.
- O multiplayer será implementado em fase posterior.

## Baralhos

- O anfitrião escolhe de 1 a 6 baralhos.
- Cada baralho possui os naipes personalizados:
  - Filtro
  - Chinelo
  - Cadeira
  - Papagaio

## Coringas

- Coringas são opcionais.
- O padrão regional do projeto é sem coringas.
- Se ativados, entram 2 coringas por baralho.
- O coringa fica acima do 2.

## Ordem de força

`3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < Coringa`

## Jogadas válidas

- Mesa livre: o jogador pode jogar uma ou mais cartas do mesmo valor.
- Mesa ocupada: o jogador precisa jogar:
  - a mesma quantidade de cartas da jogada atual;
  - cartas do mesmo valor entre si;
  - valor maior que o valor da mesa.

Exemplo:

- Mesa: 2 cartas de 8.
- Pode: 2 cartas de 9, 2 cartas de J, 2 cartas de A.
- Não pode: 1 carta de 9, 3 cartas de 9 ou 2 cartas de 7.

## Passar

- O jogador pode passar quando existe uma jogada na mesa.
- Quando todos os adversários passam, a mesa é limpa.
- O último jogador que venceu a mesa inicia a nova rodada.

## Fim da partida

A ordem de término define:

1. Presidente
2. Vice
3. Neutro
4. Vice-Men. quando houver 4 ou mais jogadores
5. Mendigo

## Revanche

Na revanche:

- Mendigo entrega sua melhor carta ao Presidente.
- Presidente entrega sua pior carta ao Mendigo.
- Com 4 ou mais jogadores:
  - Vice-Men. entrega sua melhor carta ao Vice.
  - Vice entrega sua pior carta ao Vice-Men.
- A troca é automática nesta versão.
- O Mendigo começa a revanche.

## Ainda não implementado

- Sequências.
- Bombas.
- Força por naipe.
- Escolha manual de cartas trocadas.

## Atualização v0.1.2 — Sorteio e limpeza por carta máxima

### Nome oficial
O jogo passa a se chamar **Jamylle's Castle**. O subtítulo pode indicar o modo ou estilo de jogo, mas a marca principal do game não será “Presidente”.

### Início da partida
A primeira partida deve iniciar por sorteio visual. O sistema escolhe aleatoriamente um jogador ativo para começar.

### Carta 2
Quando um jogador realiza uma jogada válida utilizando carta **2**, a mesa deve ser limpa imediatamente. Não é necessário aguardar que os outros jogadores passem.

Após a limpeza:
- se o jogador ainda possui cartas, ele inicia a próxima rodada;
- se o jogador acabou as cartas, o próximo jogador ativo inicia a rodada.

### Coringa
Quando os coringas estiverem ativados, eles seguem a mesma regra de limpeza automática da mesa. Uma jogada válida com coringa limpa a mesa imediatamente.

### Limpeza comum da mesa
Quando todos os demais jogadores passam, a mesa é limpa e o líder da última jogada inicia a próxima rodada. Se esse líder já tiver acabado as cartas, o próximo jogador ativo inicia.

## Atualização v0.2.0 — Hierarquia do reino e ritmo humanizado

A nomenclatura temática de **Jamylle's Castle** passa a ser:

1. **Majestade** — equivalente ao Presidente.
2. **Regente** — equivalente ao Vice.
3. **Cortesão** — posição intermediária.
4. **Plebeu** — equivalente ao Vice-Mendigo quando houver 4 ou mais jogadores.
5. **Aldeão** — equivalente ao Mendigo.

### Leitura da última jogada

Antes de qualquer limpeza automática da mesa, a última jogada deve permanecer visível por pelo menos 0,5 segundo.

Isso vale para:

- todos os demais jogadores passaram;
- jogada com **2**;
- jogada com **coringa**, se coringas estiverem ativados.

O objetivo é permitir que os jogadores acompanhem a partida, entendam o que foi jogado e tenham tempo para planejar as próximas estratégias.

### Ritmo sonoro

O jogo pode emitir sons sintéticos polifônicos com tema medieval. Quando algum jogador chega perto de acabar as cartas, o ritmo sonoro acelera para aumentar a tensão da partida.
