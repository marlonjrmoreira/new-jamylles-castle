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


## v0.5.4
- Refinamento visual da tela inicial.
- Subtítulo “A corte das cartas” com fundo e contraste muito mais legíveis.
- Botões reorganizados em grade 2x2 mais equilibrada para mobile.
- Rótulo “Prévia Observador Seguro” simplificado para “Observar”.
- Botões menores, mais alinhados e com melhor contraste.
- Mantida a lógica existente do multiplayer e do menu online.


## v0.5.5
- A tela inicial passa a concentrar nome, sala, senha e configurações, sem repetição no lobby.
- O painel de lobby foi simplificado para apenas acompanhar jogadores, copiar código e iniciar a partida.
- Salas antigas encerradas podem ser reutilizadas automaticamente.
- Ao sair do lobby ou ao encerrar uma partida como anfitrião, a sala é apagada do Firebase.
- A carta 2 ganhou visual especial com saltinho rosa de princesa.
- Texto da voz dos observadores refinado: podem falar se o anfitrião permitir.


## v0.5.6
- A música/trilha fica restrita ao menu e à tela inicial.
- Ao entrar na mesa de jogo, a trilha é pausada automaticamente.
- Durante a jogatina ficam apenas efeitos sonoros curtos: cartas, passar, limpar mesa, sorteio/embaralhar e fim.
- Removidos bipes/ambiência de tensão contínua durante a partida para não atrapalhar conversa por voz.
- O modo online também para a música ao entrar na mesa e reaproveita os efeitos curtos do jogo.


## v0.6.0
- Adicionado chat de voz WebRTC.
- Firebase agora também faz a sinalização da chamada por `voiceSignals`.
- Participantes de voz aparecem em `voiceParticipants`.
- Botões: Entrar na voz, Mutar/Desmutar e Sair.
- A voz aparece no lobby e em um dock durante a mesa.
- Jogadores podem falar.
- Observadores podem falar apenas quando a sala estiver configurada como `Podem falar se o anfitrião permitir`.
- Música continua fora da mesa; durante a partida permanecem apenas efeitos sonoros curtos.
- Novas regras Firestore em `docs/FIREBASE_SETUP.md`.


## v0.6.1
- Corrigido problema de nomes de salas antigos ficarem presos no Firestore.
- Salas finalizadas ou abandonadas por mais de 30 minutos podem ser recicladas.
- Ao reciclar, o jogo tenta limpar `players`, `hands`, `actions`, `voiceParticipants` e `voiceSignals`.
- Novas Rules do Firestore em `docs/FIREBASE_SETUP.md`.


## v0.6.2
- Corrigida confusão no lobby do segundo jogador.
- O aviso de configuração some depois que o jogador entra na sala.
- O botão `Estou pronto` fica no topo do lobby, antes da lista de jogadores e da voz.
- Para não anfitriões, o botão `Iniciar partida` fica oculto.
- Mensagem do lobby agora orienta claramente: jogador clica em `Estou pronto`; anfitrião clica em `Iniciar partida`.


## v0.6.3
- Removido o lobby em modal/janela separada.
- Lobby agora aparece diretamente na tela inicial, dentro de `Sala atual`.
- Criar sala e entrar em sala passam a abrir o lobby no mesmo lugar.
- Convidado vê o botão grande `Estou pronto` sem precisar procurar em outra tela.
- Anfitrião vê apenas `Iniciar partida`, sem botão de pronto.
- Adicionado reforço automático para levar convidados à mesa se a sala mudar para `playing`.
- Interface de lobby simplificada para reduzir confusão entre configurar, entrar e dar pronto.


## v0.6.4
- Anfitrião agora vê claramente quais convidados ainda não deram pronto.
- O botão `Iniciar partida` fica bloqueado enquanto houver convidado sem pronto.
- Lista de jogadores mostra estados: Host, Convidado/Bot, Pronto/Falta pronto.
- Convidado recebe orientação direta para tocar em `Estou pronto`.
- A voz tenta ativar automaticamente ao criar ou entrar em uma sala.
- Se o navegador bloquear o microfone, o botão `Entrar na voz` continua disponível.


## v0.6.5
- Otimizado o fluxo de microfone para iOS/Chrome/Safari.
- Ao clicar em `Criar sala` ou `Entrar em sala`, o jogo já tenta preparar o microfone.
- A solicitação de permissão acontece associada ao gesto do usuário, reduzindo bloqueios em navegadores móveis.
- Se a permissão for bloqueada, o botão `Entrar na voz` continua disponível.
- Textos do lobby orientam o jogador a autorizar o microfone antes de dar pronto.


## v0.6.6
- Convidados agora ficam prontos automaticamente ao entrar na sala.
- O botão do convidado vira confirmação visual: `Pronto automático ✓`.
- O botão não alterna mais para “não pronto”, evitando travar o início da partida.
- Se um documento antigo entrar como `ready:false`, o jogo corrige automaticamente para `ready:true` no lobby.
- O anfitrião continua vendo claramente se há alguém pendente, mas o fluxo normal não depende mais do convidado encontrar o botão.


## v0.6.7
- Corrigido caso crítico em que o anfitrião entrava na mesa, mas o convidado permanecia na tela inicial.
- Adicionado verificador direto no Firestore para detectar `phase: playing` mesmo se o listener em tempo real atrasar.
- Ao iniciar, cada jogador recebe `gameStarted` e `startSignal` no próprio documento de jogador.
- O convidado é forçado para a mesa quando a sala, a mão ou o sinal do jogador indicam partida iniciada.
- A tela inicial é ocultada com reforço de CSS quando a mesa online é ativada.


## v0.6.8
- Nova mesa medieval responsiva inspirada no mockup aprovado.
- Fundo do pátio/castelo aplicado como cenário funcional da jogatina.
- HUD com placa superior, botões circulares de som/voz e barra inferior temática.
- Jogadores exibidos em slots compactos para suportar até 20 participantes.
- Jogador da vez recebe destaque dourado; jogador local recebe tratamento diferenciado.
- Área central das cartas reposicionada sobre o pátio, com leitura mais limpa da jogada.
- Mão do jogador em trilho horizontal/fan, melhor para celular e para muitas cartas.
- Botões Jogar/Passar em estilo medieval maior e mais tátil.
- Sem mudança nas Rules do Firebase.


## v0.6.9
- Corrigido erro do Firestore: `The query requires an index`.
- A consulta de ações da partida não usa mais `orderBy('createdAt')` no servidor.
- As ações pendentes agora são ordenadas localmente no navegador do anfitrião.
- Não é necessário criar índice manual no Firebase para esta correção.


## v0.7.0
- Corrigido botão de som da mesa: agora ele liga/desliga de verdade, sem reiniciar a trilha.
- A trilha continua restrita ao menu; na mesa ficam apenas efeitos sonoros curtos.
- Removido o botão pequeno `Menu` da mesa para evitar tela preta durante partidas online.
- O dock de voz da mesa agora só aparece quando o jogador já está conectado à voz.
- Erros de entrada/saída/mute da voz são tratados sem travar o fluxo da partida.
- A voz continua sendo preparada no lobby ao criar/entrar na sala.
- Sem mudança nas Rules do Firebase.


## v0.7.1
- Corrigido motor dos bots no modo online.
- O anfitrião agora roda uma checagem periódica do turno dos bots.
- Bots jogam automaticamente quando a vez é deles, mesmo sem convidados humanos.
- Após jogadas, passes e limpeza da mesa, o próximo bot é agendado novamente.
- Adicionada proteção para bot sem cartas não travar a partida.
- Sem mudanças nas Rules do Firebase.


## v0.7.2
- Segunda correção do motor de bots online.
- A entrada na mesa não interrompe mais o acionamento dos bots.
- O anfitrião agenda bots também em snapshots da sala, jogadores, mão e renderização da mesa.
- O motor dos bots agora lê o estado mais recente diretamente do Firestore antes de jogar.
- Jogada/passe do bot usam o estado fresco da sala para evitar travamento por estado local antigo.
- Sem mudanças nas Rules do Firebase.


## v0.7.3
- Reestruturada a lógica dos bots para separar decisão da IA e aplicação da jogada.
- Bots não usam mais a função de jogada humana/anfitrião como se fossem o anfitrião.
- Nova arquitetura:
  - `runBotAutonomy()` verifica se a vez é de bot.
  - `botDecideMove()` decide autonomamente a jogada.
  - `applyBotMove()` aplica a decisão no estado da sala.
- O navegador do anfitrião atua apenas como processador temporário da sala em GitHub Pages, não como controlador do bot.
- Mantida compatibilidade com Firebase atual, sem necessidade de mudar Rules.


## v0.7.5
- Correção focada na entrada do convidado na mesa quando o anfitrião inicia a partida.
- Adicionado cache-busting em CSS/JS locais (`?v=074`) para impedir celular/navegador de carregar `online.js` antigo.
- Entrada na mesa agora força diretamente as classes, estilos e estado visual da tela de jogo.
- Convidado passa a fazer leitura direta periódica do documento da sala, além dos snapshots do Firestore.
- Se `onlineMode` já estiver ativo mas a tela ainda estiver presa no menu, a interface é forçada novamente para a mesa.
- Sem mudanças nas Rules do Firebase.
