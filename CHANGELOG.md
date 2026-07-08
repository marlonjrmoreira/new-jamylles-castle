# CHANGELOG

## v0.2.1 — Pátio do castelo e correções de feedback

- Corrigido o brilho das cartas possíveis quando a jogada da mesa é um combo com 2 ou mais cartas.
- Agora o destaque considera grupos completos: se a mesa pede par, só valores com pelo menos duas cartas aparecem como jogáveis.
- Mesa recebeu leitura de pátio de castelo visto de cima, com muros laterais, ameias e piso de pedra.
- Sons do castelo ficaram mais audíveis.
- Adicionado botão "Testar som" no menu para desbloquear/verificar áudio no navegador.
- Mantida a regra da pausa antes da mesa reiniciar.

## v0.2.0 — Direção de arte da mesa e ritmo humanizado

### Visual
- A mesa da partida foi redesenhada para seguir a estética de **Jamylle's Castle**.
- Adicionada paleta medieval com roxo, vinho, dourado e sombras de salão do castelo.
- Jogadores agora aparecem como placas/brasões da corte.
- A área central da mesa ganhou estilo de salão real/tapeçaria.
- Botões, painéis e histórico foram ajustados para uma linguagem mais medieval.

### Classificações
- `Presidente` virou **Majestade**.
- `Vice` virou **Regente**.
- `Neutro` virou **Cortesão**.
- `Vice-Men.` virou **Plebeu**.
- `Mendigo` virou **Aldeão**.

### Ritmo de jogo
- A última jogada antes da mesa limpar agora permanece visível por pelo menos 0,5 segundo.
- Jogadas com 2/coringa não somem instantaneamente: a carta aparece, há uma pausa dramática e só depois a mesa reinicia.
- Bots jogam em ritmo mais lento e variável, para parecer menos automático.

### Áudio
- Adicionado sistema de áudio sintético via Web Audio API, sem depender de arquivos externos.
- Sons polifônicos para início, jogadas, passes, limpeza da mesa e fim de partida.
- A trilha/ambiente acelera quando algum jogador está perto de acabar as cartas.
- Adicionada opção **Sons do castelo** no menu inicial.

### Mantido
- Nome oficial **Jamylle's Castle**.
- Splash inicial com pixel art por aproximadamente 1,5 segundo.
- Coringas continuam desativados por padrão.
- Coringas continuam opcionais antes da partida.
- Observador seguro continua sem receber cartas privadas.

## v0.1.2 — Identidade, splash e regra do 2
- Nome oficial atualizado para **Jamylle's Castle**.
- Splash inicial com pixel art.
- Sorteio inicial visual.
- Regra do 2/coringa limpando a mesa.


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
