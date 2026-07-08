# Jamylle's Castle

Jogo de cartas inspirado no Presidente, com identidade visual medieval/pixel art e regras regionais configuráveis.

## Versão atual

**v0.2.1**

Esta versão é um protótipo local jogável com foco em direção de arte e ritmo de partida:

- nome oficial **Jamylle's Castle**;
- splash inicial com pixel art por aproximadamente 1,5 segundo;
- menu sobreposto após o splash;
- mesa redesenhada com estética medieval, dourada e roxa;
- cargos temáticos do reino: **Majestade**, **Regente**, **Cortesão**, **Plebeu** e **Aldeão**;
- partida local contra bots;
- sorteio visual para definir quem começa;
- coringas opcionais e desativados por padrão;
- regra de limpeza automática ao jogar 2/coringa;
- última jogada visível antes da limpeza da mesa, para leitura estratégica;
- bots com ritmo mais humanizado;
- sons sintéticos polifônicos com tema medieval;
- aceleração sonora quando algum jogador está perto de acabar as cartas;
- ranking final;
- revanche com troca automática;
- base de modo observador seguro.

## Como testar

1. Extraia o ZIP.
2. Abra o arquivo `index.html` no navegador.
3. Aguarde a animação inicial.
4. Clique em **Jogar com IA**.

Observação: por segurança dos navegadores, o som só inicia após a primeira interação do usuário, como clicar em **Jogar com IA**.

## Regras principais

- Mesa livre: jogue uma ou mais cartas do mesmo valor.
- Mesa ocupada: jogue a mesma quantidade de cartas com valor maior.
- 2 é a carta mais forte quando não há coringas.
- Se coringas estiverem ativados, eles ficam acima do 2.
- Jogar 2 ou coringa limpa a mesa automaticamente.
- A última jogada permanece visível por pelo menos 0,5 segundo antes da mesa limpar.
- Quem limpa a mesa inicia a próxima rodada, exceto se tiver acabado as cartas.
- Na revanche, Majestade/Aldeão e Regente/Plebeu trocam cartas automaticamente.

## Próximas etapas sugeridas

- Melhorar animação de distribuição de cartas.
- Criar animações mais fortes para 2/coringa.
- Refinar cartas com visual próprio do reino.
- Criar tela de lobby online real.
- Implementar salas com senha em backend/serviço realtime.
- Implementar observador seguro real no multiplayer.


## v0.2.1

- Corrigido o destaque das cartas jogáveis quando a mesa exige combos de 2 ou mais cartas.
- Mesa redesenhada para sugerir um pátio de castelo visto de cima, com muros laterais e ameias.
- Sistema de som reforçado, com volume maior, desbloqueio de áudio e botão "Testar som" no menu.


## v0.2.2
- trilha sonora procedural mais imersiva
- combos na mesa mais visíveis, com leque centralizado
- mesa pensada em proporção 9:16 para smartphones


## v0.2.3
- Mão do jogador alterada para grade vertical.
- Removida a dependência de rolagem lateral para visualizar cartas.
- Ajustes de responsividade para smartphone em proporção 9:16.


## v0.2.4
- Trilha da tela inicial integrada em `assets/audio/menu-theme.mp3`.
- MP3 original otimizado de 3,84 MB para aproximadamente 247 KB.
- Áudio do menu com `preload="none"` para evitar carregamento prolongado.
- Música inicia somente após interação do jogador, respeitando as regras dos navegadores.


## v0.2.5
- Trilha de menu reexportada com volume mais alto.
- Arquivo continua leve: aproximadamente 329 KB.
- `preload="auto"` usado porque o arquivo está pequeno, melhorando a chance de tocar sem atraso.
- Botão de teste agora tenta carregar e iniciar a trilha explicitamente no clique.


## v0.3.0
- Animação de distribuição das cartas no início da partida e na revanche.
- Jogada do usuário ganhou microanimação antes de ir para a mesa.
- Bots jogam em ritmo mais humano, com impacto visual na mesa.
- Carta 2 e coringa ganharam impacto cinematográfico de mesa.
- Tela final transformada em Cerimônia da Corte.
- Regras centrais da v0.2.5 preservadas.


## v0.3.1
- Adicionada cerimônia pública de Troca da Corte antes da revanche.
- A cerimônia mostra apenas quem trocou com quem e quem inicia a revanche.
- Valores e naipes das cartas trocadas não são exibidos publicamente.
- Mantida a troca automática: Aldeão/Majestade e, com 4+ jogadores, Plebeu/Regente.


## v0.4.0 — Bots estratégicos
- Bots agora avaliam pressão da mesa e quantidade de cartas dos adversários.
- Bots evitam gastar `2` ou coringa cedo quando a jogada não é decisiva.
- Bots tentam fechar a própria mão quando estão com poucas cartas.
- Bots respondem com mais força quando o líder da mesa está perto de acabar as cartas.
- A lógica visual, sonora e as regras da v0.3.1 foram preservadas.


## v0.5.0
- Primeira fundação multiplayer online via Firebase.
- Adicionado botão Multiplayer Online no menu.
- Criar sala online por código.
- Entrar em sala por código e senha.
- Login anônimo via Firebase Auth.
- Lobby sincronizado via Firestore.
- Lista de jogadores em tempo real.
- Host da sala.
- Botão pronto/não pronto.
- Botão iniciar online para o host.
- Documentação inicial em `docs/FIREBASE_SETUP.md`.


## v0.5.1
- Fluxo do menu unificado para sala.
- Removidos os botões separados “Jogar com IA” e “Multiplayer Online” do menu principal.
- Adicionados botões principais “Criar sala” e “Buscar / entrar na sala”.
- Bots, baralhos, senha, coringas e observadores passam a fazer parte da configuração da sala.
- Lobby online agora exibe configurações da sala, incluindo quantidade de bots.
- Busca de sala funciona por código/nome exato da sala.


## v0.5.2
- Nome do jogador agora aparece explicitamente dentro da janela de sala online.
- Anfitrião agora tem botão `Iniciar partida`.
- O início é forçado pelo anfitrião: não depende de todos clicarem em pronto.
- A sala pode iniciar quando houver pelo menos 3 participantes somando humanos e bots.
- Quando o anfitrião inicia, todos os jogadores são levados para a mesa online.
- A mesa online ainda é uma tela de transição; a próxima etapa conectará distribuição, mãos privadas e turnos sincronizados.

## v0.5.3
- Partida online jogável inicial.
- Host inicia, embaralha, distribui e valida a partida.
- Mãos privadas em `rooms/{sala}/hands/{uid}`.
- Jogadores enviam ações para `actions`; host processa e valida.
- Mesa pública sincronizada via documento da sala.
- Botões Jogar e Passar conectados no modo online.
- Bots da sala são adicionados e controlados pelo host.
- Ranking online básico ao final.
- Novas regras Firestore em `docs/FIREBASE_SETUP.md`.
