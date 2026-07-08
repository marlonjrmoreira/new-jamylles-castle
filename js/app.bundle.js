/* Jamylle's Castle v0.5.3 — bundle sem módulos ES
   Este arquivo permite abrir index.html diretamente no navegador via duplo clique. */

/* ===== js/rules.js ===== */
// Regras extraídas e organizadas a partir do arquivo original gemini-code-1778867922647.html
// Versão: v0.1.0

const CARD_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

const SUITS = [
  { id: 'filtro', label: 'Filtro', symbol: '⚱️' },
  { id: 'chinelo', label: 'Chinelo', symbol: '🩴' },
  { id: 'cadeira', label: 'Cadeira', symbol: '🪑' },
  { id: 'papagaio', label: 'Papagaio', symbol: '🦜' },
];

const JOKERS = [
  { valueStr: '★', suitId: 'coringa', power: 13, label: 'Caramelo', symbol: '🐕' },
  { valueStr: '★', suitId: 'coringa', power: 13, label: 'João-de-barro', symbol: '🐦' },
];

const rulesConfig = {
  gameName: "Jamylle's Castle",
  minPlayers: 3,
  maxPlayers: 20,
  minDecks: 1,
  maxDecks: 6,
  includeJokersDefault: false,
  cardOrder: [...CARD_VALUES, '★'],
  combinations: {
    single: true,
    pairs: true,
    triples: true,
    fourOrMoreSameValue: true,
    sequences: false,
    bombs: false,
  },
  playValidation: {
    sameValueOnly: true,
    mustMatchTableCount: true,
    mustBeatTablePower: true,
    suitStrength: false,
  },
  turnRules: {
    firstRoundStartsByRandomDraw: true,
    rematchStartsWithLastPlace: true,
    passUntilTableClears: true,
    resetPassesAfterValidPlay: true,
    tableClearsWhenOnlyOwnerRemainsActive: true,
    tableClearsImmediatelyOnTwoOrJoker: true,
    cannotPassOnFreeTable: true,
  },
  ranks: ['Majestade', 'Regente', 'Cortesão', 'Plebeu', 'Aldeão'],
  rematchTrade: {
    presidentReceivesBestFromLast: true,
    presidentGivesWorstToLast: true,
    viceReceivesBestFromPenultimateWhenFourOrMorePlayers: true,
    viceGivesWorstToPenultimateWhenFourOrMorePlayers: true,
    tradeIsAutomatic: true,
  },
  botStrategy: {
    freeTable: 'play-lowest-group',
    occupiedTable: 'play-lowest-valid-group-that-beats-table',
    ifNoMove: 'pass',
  },
};

function getCardPower(valueStr) {
  if (valueStr === '★') return 13;
  return CARD_VALUES.indexOf(valueStr);
}

function sortCards(cards){
  return cards.sort((a, b) => {
    if(a.power !== b.power) return a.power - b.power;
    return String(a.suitId || a.suit || '').localeCompare(String(b.suitId || b.suit || ''));
  });
}

function isSameValueCombo(cards) {
  if (!cards || cards.length === 0) return false;
  return cards.every(card => Number(card.power) === Number(cards[0].power));
}

function describeCombo(combo){
  if(!combo) return 'Mesa livre';
  const cardLabel = combo.cards?.[0]?.valueStr || combo.cards?.[0]?.rank || '?';
  const plural = combo.count > 1 ? 'cartas' : 'carta';
  return `${combo.count} ${plural} de ${cardLabel}`;
}

function canPlayCombo(selectedCards, tableCombo) {
  if (!isSameValueCombo(selectedCards)) return false;
  if (!tableCombo) return true;
  return selectedCards.length === tableCombo.count && Number(selectedCards[0].power) > Number(tableCombo.power);
}

function isTableBreakerCombo(combo){
  if(!combo) return false;
  return Number(combo.power) >= getCardPower('2');
}

function getInvalidPlayReason(selectedCards, tableCombo){
  if(!selectedCards || selectedCards.length === 0) return 'Selecione uma ou mais cartas.';
  if(!isSameValueCombo(selectedCards)) return 'A jogada precisa ter cartas do mesmo valor.';
  if(!tableCombo) return '';
  if(selectedCards.length !== tableCombo.count) return `Você precisa jogar exatamente ${tableCombo.count} carta(s).`;
  if(Number(selectedCards[0].power) <= Number(tableCombo.power)) return 'A carta precisa ser maior que a jogada da mesa.';
  return '';
}

function getRankName(finishIndex, totalPlayers) {
  if (finishIndex === 0) return 'Majestade';
  if (finishIndex === 1) return 'Regente';
  if (finishIndex === totalPlayers - 1) return 'Aldeão';
  if (finishIndex === totalPlayers - 2 && totalPlayers >= 4) return 'Plebeu';
  return 'Cortesão';
}

/* ===== js/deck.js ===== */

function createDeck({ deckCount = 1, includeJokers = false } = {}){
    const cards = [];
    for(let deckIndex = 0; deckIndex < deckCount; deckIndex++){
        for(const suit of SUITS){
            for(const valueStr of CARD_VALUES){
                cards.push({
                    id: `${deckIndex}-${valueStr}-${suit.id}`,
                    deckIndex,
                    valueStr,
                    rank: valueStr,
                    suitId: suit.id,
                    suit: suit.id,
                    suitName: suit.label,
                    suitSymbol: suit.symbol,
                    power: getCardPower(valueStr),
                    isJoker: false,
                });
            }
        }
        if(includeJokers){
            for(const joker of JOKERS){
                cards.push({
                    id: `${deckIndex}-joker-${joker.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    deckIndex,
                    valueStr: joker.valueStr,
                    rank: joker.valueStr,
                    suitId: joker.suitId,
                    suit: joker.suitId,
                    suitName: joker.label,
                    suitSymbol: joker.symbol,
                    power: joker.power,
                    isJoker: true,
                });
            }
        }
    }
    return cards;
}

function shuffleDeck(deck){
    const shuffled = [...deck];
    for(let i = shuffled.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/* ===== js/player.js ===== */
class Player{
    constructor(name, isHuman = false, extra = {}){
        this.id = extra.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        this.name = name;
        this.avatar = extra.avatar || null;
        this.isHuman = Boolean(isHuman);
        this.isObserver = Boolean(extra.isObserver);
        this.isConnected = true;
        this.hand = [];
        this.finishedPosition = null;
        this.role = null;
        this.hasPassed = false;
        this.isBot = !this.isHuman && !this.isObserver;
    }
}

/* ===== js/room-config.js ===== */

const ROOM_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
  PASSWORD: 'password',
});

const DISCONNECT_ACTION = Object.freeze({
  REDISTRIBUTE_CARDS: 'redistribute-cards',
  REMOVE_CARDS: 'remove-cards',
  REPLACE_WITH_BOT: 'replace-with-bot',
});

const OBSERVER_VOICE_POLICY = Object.freeze({
  MUTED: 'muted',
  LISTEN_ONLY: 'listen-only',
  HOST_CAN_ALLOW: 'host-can-allow',
});

function createRoomSettings(formValues = {}){
  const roomName = normalizeRoomName(formValues.roomName || 'CASTELO');
  const password = String(formValues.password || '').trim();
  const visibility = password ? ROOM_VISIBILITY.PASSWORD : ROOM_VISIBILITY.PRIVATE;

  return Object.freeze({
    roomName,
    passwordProtected: Boolean(password),
    passwordHash: password ? simpleHash(password) : null,
    visibility,
    minPlayers: rulesConfig.minPlayers,
    maxPlayers: Number(formValues.maxPlayers || rulesConfig.maxPlayers),
    deckCount: clamp(Number(formValues.deckCount || 1), rulesConfig.minDecks, rulesConfig.maxDecks),
    includeJokers: Boolean(formValues.includeJokers ?? rulesConfig.includeJokersDefault),
    allowObservers: Boolean(formValues.allowObservers ?? true),
    observerCanSeeHands: false,
    observerVoicePolicy: formValues.observerVoicePolicy || OBSERVER_VOICE_POLICY.LISTEN_ONLY,
    disconnect: Object.freeze({
      graceSeconds: Number(formValues.graceSeconds || 60),
      action: formValues.disconnectAction || DISCONNECT_ACTION.REDISTRIBUTE_CARDS,
      redistributeStart: 'next-active-player',
    }),
  });
}

function normalizeRoomName(name){
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toUpperCase()
    .slice(0, 18) || 'CASTELO';
}

function validateRoomPassword(inputPassword, roomSettings){
  if(!roomSettings.passwordProtected) return true;
  return simpleHash(String(inputPassword || '').trim()) === roomSettings.passwordHash;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

// Hash simples apenas para protótipo local. Em produção, isso deve ficar no backend.
function simpleHash(text){
  let hash = 0;
  for(let i = 0; i < text.length; i++){
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/* ===== js/public-state.js ===== */
function createPublicPlayerView(player){
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar || null,
    isHuman: Boolean(player.isHuman),
    isConnected: player.isConnected !== false,
    isObserver: Boolean(player.isObserver),
    hasPassed: Boolean(player.hasPassed),
    finishedPosition: player.finishedPosition ?? null,
    role: player.role ?? null,
    cardCount: Array.isArray(player.hand) ? player.hand.length : 0,
  };
}

function createPublicGameState(gameState){
  return {
    phase: gameState.phase,
    currentPlayerIndex: gameState.currentPlayerIndex,
    tableCombo: gameState.tableCombo ?? null,
    tableHistory: gameState.tableHistory ?? [],
    players: (gameState.players || []).map(createPublicPlayerView),
    settings: gameState.settings ? {
      roomName: gameState.settings.roomName,
      passwordProtected: Boolean(gameState.settings.passwordProtected),
      deckCount: gameState.settings.deckCount,
      includeJokers: gameState.settings.includeJokers,
      allowObservers: gameState.settings.allowObservers,
      observerCanSeeHands: false,
      observerVoicePolicy: gameState.settings.observerVoicePolicy,
    } : null,
  };
}

function createPrivatePlayerState(gameState, playerId){
  const player = (gameState.players || []).find(item => item.id === playerId);
  if(!player) return null;
  return {
    playerId,
    hand: [...(player.hand || [])],
    playableHints: gameState.playableHints?.[playerId] || [],
  };
}

function createObserverState(gameState){
  const publicState = createPublicGameState(gameState);
  return {
    ...publicState,
    observerMode: true,
    antiCheat: {
      handsAreNeverSent: true,
      deckIsNeverSent: true,
      privateBotDecisionsAreHidden: true,
    },
  };
}

function assertObserverStateIsSafe(observerState){
  const serialized = JSON.stringify(observerState).toLowerCase();
  const forbiddenKeys = ['\"hand\":', '\"deck\":', '\"hands\":'];
  return forbiddenKeys.every(key => !serialized.includes(key));
}

/* ===== js/game.js ===== */

const DEFAULT_BOT_NAMES = ['Bot Ametista', 'Bot Esmeralda', 'Bot Rubi', 'Bot Safira', 'Bot Topázio', 'Bot Ônix', 'Bot Jade'];

class PresidenteGame{
    constructor(settingsInput = {}){
        this.settings = createRoomSettings(settingsInput);
        this.players = [];
        this.deck = [];
        this.tableCombo = null;
        this.tableOwnerIndex = -1;
        this.tableHistory = [];
        this.matchHistory = [];
        this.currentPlayerIndex = 0;
        this.finishedOrder = [];
        this.previousFinishedOrder = [];
        this.phase = 'created';
        this.lastMessage = 'Partida criada.';
        this.lastTradeLog = [];
        this.turnCounter = 0;
        this.pendingClear = null;
    }

    setupLocalPlayers({ humanName = 'Você', botCount = 3 } = {}){
        const safeBotCount = Math.max(2, Math.min(19, Number(botCount) || 3));
        this.players = [new Player(humanName || 'Você', true, { id: 'player-you' })];
        for(let i = 0; i < safeBotCount; i++){
            this.players.push(new Player(DEFAULT_BOT_NAMES[i] || `Bot ${i + 1}`, false, { id: `bot-${i + 1}` }));
        }
        return this;
    }

    startInitialMatch(){
        this.previousFinishedOrder = [];
        this.startMatch({ rematch: false });
        return this;
    }

    startRematch(){
        if(this.finishedOrder.length < this.activePlayerIndices().length){
            throw new Error('A revanche só pode começar depois do fim da partida.');
        }
        this.previousFinishedOrder = [...this.finishedOrder];
        this.startMatch({ rematch: true });
        return this;
    }

    startMatch({ rematch = false } = {}){
        if(this.players.length < this.settings.minPlayers){
            throw new Error(`Mínimo de ${this.settings.minPlayers} jogadores.`);
        }

        this.deck = shuffleDeck(createDeck({
            deckCount: this.settings.deckCount,
            includeJokers: this.settings.includeJokers,
        }));

        this.players.forEach(player => {
            if(player.isObserver) return;
            player.hand = [];
            player.finishedPosition = null;
            player.role = null;
            player.hasPassed = false;
            player.isConnected = true;
        });

        this.tableCombo = null;
        this.tableOwnerIndex = -1;
        this.tableHistory = [];
        this.matchHistory = [];
        this.finishedOrder = [];
        this.lastTradeLog = [];
        this.turnCounter = 0;
        this.pendingClear = null;
        this.phase = 'playing';

        this.dealCards();
        this.sortAllHands();

        if(rematch && this.previousFinishedOrder.length){
            this.applyAutomaticRematchTrade();
            this.sortAllHands();
            const lastPlayerIndex = this.previousFinishedOrder[this.previousFinishedOrder.length - 1];
            this.currentPlayerIndex = this.findNextPlayableIndex(lastPlayerIndex - 1, { includePassed: true });
            this.lastMessage = 'Troca da corte concluída. O Aldeão começa a revanche.';
        } else {
            const playable = this.activePlayerIndices();
            this.currentPlayerIndex = playable[Math.floor(Math.random() * playable.length)];
            this.lastMessage = `${this.currentPlayer().name} começa a partida.`;
        }

        return this;
    }

    dealCards(){
        const playable = this.activePlayerIndices();
        let p = 0;
        while(this.deck.length){
            const playerIndex = playable[p % playable.length];
            this.players[playerIndex].hand.push(this.deck.pop());
            p++;
        }
    }

    sortAllHands(){
        this.players.forEach(player => sortCards(player.hand));
    }

    currentPlayer(){
        return this.players[this.currentPlayerIndex] || null;
    }

    activePlayerIndices(){
        return this.players
            .map((player, index) => ({ player, index }))
            .filter(({ player }) => !player.isObserver)
            .map(({ index }) => index);
    }

    unfinishedPlayerIndices(){
        return this.activePlayerIndices().filter(index => !this.finishedOrder.includes(index));
    }

    getPlayerIndexById(playerId){
        return this.players.findIndex(player => player.id === playerId);
    }

    getSelectedCards(playerIndex, cardIds){
        const idSet = new Set(cardIds);
        return this.players[playerIndex].hand.filter(card => idSet.has(card.id));
    }

    canCurrentPlayerPlay(cardIds){
        if(this.phase !== 'playing') return { ok: false, reason: 'A partida não está ativa.' };
        const cards = this.getSelectedCards(this.currentPlayerIndex, cardIds);
        const reason = getInvalidPlayReason(cards, this.tableCombo);
        return { ok: !reason, reason, cards };
    }

    playCards(playerId, cardIds){
        const playerIndex = this.getPlayerIndexById(playerId);
        if(playerIndex !== this.currentPlayerIndex) return { ok: false, message: 'Não é a vez deste jogador.' };
        const cards = this.getSelectedCards(playerIndex, cardIds);
        if(!canPlayCombo(cards, this.tableCombo)){
            return { ok: false, message: getInvalidPlayReason(cards, this.tableCombo) };
        }

        const player = this.players[playerIndex];
        const cardIdSet = new Set(cardIds);
        player.hand = player.hand.filter(card => !cardIdSet.has(card.id));

        const combo = {
            power: Number(cards[0].power),
            count: cards.length,
            cards: cards.map(card => ({ ...card })),
            playerIndex,
            playerName: player.name,
            turn: ++this.turnCounter,
        };

        this.tableCombo = combo;
        this.tableOwnerIndex = playerIndex;
        this.tableHistory.push(combo);
        this.matchHistory.push({ type: 'play', ...combo });
        this.players.forEach(item => { item.hasPassed = false; });

        let finishMessage = '';
        if(player.hand.length === 0 && !this.finishedOrder.includes(playerIndex)){
            this.markFinished(playerIndex);
            finishMessage = ` ${player.name} acabou as cartas!`;
        }

        this.lastMessage = `${player.name} jogou ${describeCombo(combo)}.${finishMessage}`.trim();
        this.checkGameEnd();
        if(this.phase === 'finished') return { ok: true, message: this.lastMessage };

        if(isTableBreakerCombo(combo)){
            const comboDescription = describeCombo(combo);
            this.queueTableClear(playerIndex, 'breaker', `${player.name} impôs ${comboDescription}. A corte observa a jogada antes da mesa reiniciar.`);
            return { ok: true, message: this.lastMessage, pendingClear: true, clearedByBreaker: true };
        }

        this.currentPlayerIndex = this.findNextPlayableIndex(playerIndex, { includePassed: false });
        const queuedClear = this.checkTableClearAfterAction();
        return { ok: true, message: this.lastMessage, pendingClear: queuedClear };
    }

    pass(playerId){
        const playerIndex = this.getPlayerIndexById(playerId);
        if(playerIndex !== this.currentPlayerIndex) return { ok: false, message: 'Não é a vez deste jogador.' };
        if(!this.tableCombo) return { ok: false, message: 'A mesa está livre. Você precisa iniciar a rodada.' };

        const player = this.players[playerIndex];
        player.hasPassed = true;
        this.matchHistory.push({ type: 'pass', playerIndex, playerName: player.name, turn: ++this.turnCounter });
        this.lastMessage = `${player.name} passou.`;

        const queuedClear = this.checkTableClearAfterAction();
        if(this.phase !== 'playing') return { ok: true, message: this.lastMessage };
        if(queuedClear) return { ok: true, message: this.lastMessage, pendingClear: true };

        this.currentPlayerIndex = this.findNextPlayableIndex(playerIndex, { includePassed: false });
        return { ok: true, message: this.lastMessage };
    }

    checkTableClearAfterAction(){
        if(!this.tableCombo || this.phase !== 'playing' || this.pendingClear) return false;
        const unfinished = this.unfinishedPlayerIndices();
        const challengers = unfinished.filter(index => index !== this.tableOwnerIndex);
        const everyoneElsePassedOrFinished = challengers.length === 0 || challengers.every(index => this.players[index].hasPassed);

        if(everyoneElsePassedOrFinished){
            const previousOwnerIndex = this.tableOwnerIndex;
            this.queueTableClear(previousOwnerIndex, 'normal', `A última jogada fica na mesa por um instante. A corte se prepara para nova rodada.`);
            return true;
        }
        return false;
    }

    queueTableClear(previousOwnerIndex, type = 'normal', message = ''){
        if(!this.tableCombo || this.pendingClear) return false;
        this.pendingClear = {
            previousOwnerIndex,
            type,
            delayMs: type === 'breaker' ? 1350 : 950,
            combo: { ...this.tableCombo, cards: this.tableCombo.cards.map(card => ({ ...card })) },
            queuedAt: Date.now(),
        };
        this.lastMessage = message || 'A corte observa a última jogada antes da mesa reiniciar.';
        return true;
    }

    applyPendingClear(){
        if(!this.pendingClear) return false;
        const pending = this.pendingClear;
        const previousOwnerIndex = pending.previousOwnerIndex;
        const actorName = this.players[previousOwnerIndex]?.name || 'Jogador';
        this.pendingClear = null;
        this.clearTable(previousOwnerIndex);
        if(this.phase !== 'finished' && pending.type === 'breaker'){
            this.lastMessage = `${actorName} dominou a mesa por ordem real. ${this.currentPlayer().name} inicia a nova rodada.`;
        }
        return true;
    }

    clearTable(previousOwnerIndex){
        this.tableCombo = null;
        this.tableOwnerIndex = -1;
        this.tableHistory = [];
        this.players.forEach(player => { player.hasPassed = false; });
        this.checkGameEnd();
        if(this.phase === 'finished') return;

        const owner = this.players[previousOwnerIndex];
        const ownerCanStart = owner && !owner.isObserver && !this.finishedOrder.includes(previousOwnerIndex);
        this.currentPlayerIndex = ownerCanStart
            ? previousOwnerIndex
            : this.findNextPlayableIndex(previousOwnerIndex, { includePassed: true });
        this.lastMessage = `Mesa limpa. ${this.currentPlayer().name} inicia a nova rodada.`;
    }

    markFinished(playerIndex){
        if(this.finishedOrder.includes(playerIndex)) return;
        this.finishedOrder.push(playerIndex);
        const position = this.finishedOrder.length - 1;
        const player = this.players[playerIndex];
        player.finishedPosition = position;
        player.role = getRankName(position, this.activePlayerIndices().length);
    }

    checkGameEnd(){
        const unfinished = this.unfinishedPlayerIndices();
        if(unfinished.length === 1){
            this.markFinished(unfinished[0]);
        }
        if(this.finishedOrder.length >= this.activePlayerIndices().length){
            this.phase = 'finished';
            this.assignFinalRoles();
            this.lastMessage = 'Fim da partida!';
        }
    }

    assignFinalRoles(){
        const total = this.activePlayerIndices().length;
        this.finishedOrder.forEach((playerIndex, position) => {
            this.players[playerIndex].finishedPosition = position;
            this.players[playerIndex].role = getRankName(position, total);
        });
    }

    findNextPlayableIndex(fromIndex, { includePassed = false } = {}){
        const total = this.players.length;
        for(let offset = 1; offset <= total; offset++){
            const index = (fromIndex + offset + total) % total;
            const player = this.players[index];
            if(!player || player.isObserver || this.finishedOrder.includes(index)) continue;
            if(!includePassed && player.hasPassed) continue;
            return index;
        }
        return this.currentPlayerIndex;
    }

    getBotPressureState(playerIndex){
        const player = this.players[playerIndex];
        const ownCards = player?.hand?.length || 0;
        const opponents = this.unfinishedPlayerIndices().filter(index => index !== playerIndex);
        const opponentCounts = opponents.map(index => this.players[index]?.hand?.length || Infinity);
        const minOpponentCards = opponentCounts.length ? Math.min(...opponentCounts) : Infinity;
        const tableOwnerCards = this.tableOwnerIndex >= 0 && this.tableOwnerIndex !== playerIndex
            ? (this.players[this.tableOwnerIndex]?.hand?.length || Infinity)
            : Infinity;

        return {
            ownCards,
            minOpponentCards,
            tableOwnerCards,
            pressure: minOpponentCards <= 3 || tableOwnerCards <= 3,
            critical: minOpponentCards <= 1 || tableOwnerCards <= 1,
            tableThreat: tableOwnerCards <= 2,
        };
    }

    getPowerGroups(hand){
        const groups = new Map();
        hand.forEach(card => {
            const power = Number(card.power);
            if(!groups.has(power)) groups.set(power, []);
            groups.get(power).push(card);
        });
        groups.forEach(cards => sortCards(cards));
        return groups;
    }

    findBestBotMove(playerIndex){
        const player = this.players[playerIndex];
        if(!player?.hand?.length) return [];

        const groups = this.getPowerGroups(player.hand);
        const powers = [...groups.keys()].map(Number).sort((a, b) => a - b);
        const breakerPower = getCardPower('2');
        const pressure = this.getBotPressureState(playerIndex);

        if(!this.tableCombo){
            const candidates = [];
            for(const power of powers){
                const group = groups.get(power);
                const count = group.length;
                const remaining = pressure.ownCards - count;
                const isBreaker = power >= breakerPower;
                let score = power * 20 - count * 7;

                if(remaining === 0) score -= 1000;
                if(remaining <= 2) score -= 70;
                if(pressure.pressure) score -= count * 4;
                if(isBreaker && remaining > 0 && !pressure.critical) score += 150;

                candidates.push({ power, count, score, cards: group.slice(0, count) });
            }
            candidates.sort((a, b) => a.score - b.score || a.power - b.power || b.count - a.count);
            return (candidates[0]?.cards || []).map(card => card.id);
        }

        const requiredCount = Number(this.tableCombo.count);
        const requiredPower = Number(this.tableCombo.power);
        const candidates = [];

        for(const power of powers){
            const group = groups.get(power);
            if(power <= requiredPower || group.length < requiredCount) continue;

            const remaining = pressure.ownCards - requiredCount;
            const isBreaker = power >= breakerPower;
            let score = power * 20;

            if(remaining === 0) score -= 1000;
            if(remaining <= 2) score -= 70;
            if(pressure.tableThreat) score -= 55;
            if(pressure.critical) score -= 35;
            if(isBreaker && remaining > 0 && !pressure.tableThreat && !pressure.critical) score += 130;

            candidates.push({
                power,
                count: requiredCount,
                score,
                isBreaker,
                finishing: remaining === 0,
                cards: group.slice(0, requiredCount),
            });
        }

        if(!candidates.length) return [];
        candidates.sort((a, b) => a.score - b.score || a.power - b.power);
        const best = candidates[0];

        // Um bot mais humano prefere passar quando a única resposta boa seria gastar 2/coringa sem necessidade.
        if(best.isBreaker && !best.finishing && !pressure.tableThreat && !pressure.critical){
            return [];
        }

        return best.cards.map(card => card.id);
    }

    playBotTurn(){
        const player = this.currentPlayer();
        if(!player || player.isHuman || this.phase !== 'playing') return { ok: false, message: 'Não há bot para jogar.' };
        const move = this.findBestBotMove(this.currentPlayerIndex);
        if(move.length){
            return this.playCards(player.id, move);
        }
        return this.pass(player.id);
    }

    applyAutomaticRematchTrade(){
        const order = this.previousFinishedOrder;
        if(order.length < 2) return;
        const president = order[0];
        const mendigo = order[order.length - 1];
        this.swapBestWorst({ giverBest: mendigo, receiverBest: president, giverWorst: president, receiverWorst: mendigo, label: 'Majestade/Aldeão' });

        if(order.length >= 4){
            const vice = order[1];
            const viceMendigo = order[order.length - 2];
            this.swapBestWorst({ giverBest: viceMendigo, receiverBest: vice, giverWorst: vice, receiverWorst: viceMendigo, label: 'Regente/Plebeu' });
        }
    }

    swapBestWorst({ giverBest, receiverBest, giverWorst, receiverWorst, label }){
        sortCards(this.players[giverBest].hand);
        sortCards(this.players[giverWorst].hand);
        const best = this.players[giverBest].hand.pop();
        const worst = this.players[giverWorst].hand.shift();
        if(!best || !worst) return;
        this.players[receiverBest].hand.push(best);
        this.players[receiverWorst].hand.push(worst);
        this.lastTradeLog.push({
            label,
            giverBestName: this.players[giverBest].name,
            receiverBestName: this.players[receiverBest].name,
            giverWorstName: this.players[giverWorst].name,
            receiverWorstName: this.players[receiverWorst].name,
        });
    }

    removeDisconnectedPlayer(playerIndex){
        const player = this.players[playerIndex];
        if(!player || player.isObserver || this.finishedOrder.includes(playerIndex)) return [];
        player.isConnected = false;
        const cardsToRedistribute = shuffleDeck(player.hand.splice(0));
        const receivers = this.unfinishedPlayerIndices().filter(index => index !== playerIndex);
        let cursor = receivers.indexOf(this.findNextPlayableIndex(playerIndex, { includePassed: true }));
        if(cursor < 0) cursor = 0;
        cardsToRedistribute.forEach(card => {
            const receiverIndex = receivers[cursor % receivers.length];
            this.players[receiverIndex].hand.push(card);
            cursor++;
        });
        receivers.forEach(index => sortCards(this.players[index].hand));
        this.markFinished(playerIndex);
        this.lastMessage = `${player.name} foi removido e suas cartas foram redistribuídas.`;
        return cardsToRedistribute;
    }
}

function createLocalGame(settingsInput = {}, options = {}){
    const game = new PresidenteGame(settingsInput);
    game.setupLocalPlayers(options);
    game.startInitialMatch();
    return game;
}

// Mantido para compatibilidade com versões anteriores da interface.
function createDemoGame(settingsInput = {}){
    return createLocalGame(settingsInput, { humanName: 'Você', botCount: 3 });
}


/* ===== js/audio.js — síntese polifônica local ===== */
class CastleAudio{
    constructor(){
        this.enabled = true;
        this.ctx = null;
        this.master = null;
        this.musicTimer = null;
        this.tensionTimer = null;
        this.droneTimer = null;
        this.melodyTimer = null;
        this.tensionLevel = 0;
        this.motifIndex = 0;
        this.arpIndex = 0;
        this.melodyIndex = 0;
    }

    configure(enabled){
        this.enabled = Boolean(enabled);
        if(!this.enabled) this.stopAll();
    }

    ensure(){
        if(!this.enabled) return false;
        if(!this.ctx){
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if(!AudioContext) return false;
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.18;
            this.master.connect(this.ctx.destination);
        }
        if(this.ctx.state === 'suspended') {
            const resumePromise = this.ctx.resume();
            if(resumePromise?.catch) resumePromise.catch(() => {});
        }
        return true;
    }

    tone(freq, duration = .16, type = 'triangle', gain = .18, delay = 0){
        if(!this.ensure()) return;
        const now = this.ctx.currentTime + Math.max(delay, .01);
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(gain, now + .015);
        env.gain.exponentialRampToValueAtTime(.0001, now + duration);
        osc.connect(env).connect(this.master);
        osc.start(now);
        osc.stop(now + duration + .02);
    }

    chord(freqs, duration = .5, type = 'triangle', gain = .08){
        freqs.forEach((freq, index) => this.tone(freq, duration, type, gain, index * .012));
    }

    unlock(){
        this.configure(document.querySelector('#soundEnabled')?.checked !== false);
        const ok = this.ensure();
        if(ok) this.ui();
        return ok;
    }
    ui(){ this.chord([392, 523, 659], .26, 'triangle', .11); }
    draw(){ this.chord([196, 247, 330], .48, 'sine', .09); }
    card(count = 1){
        this.tone(520 + count * 20, .13, 'triangle', .2);
        this.tone(780 + count * 24, .22, 'sine', .11, .035);
    }
    pass(){ this.chord([220, 185], .22, 'sawtooth', .07); }
    breaker(){
        this.chord([196, 392, 587, 784], .72, 'triangle', .16);
        this.tone(98, .65, 'sine', .22);
    }
    tableClear(type = 'normal'){
        if(type === 'breaker') this.breaker();
        else this.chord([330, 392, 523], .42, 'triangle', .13);
    }
    finish(){ this.chord([262, 330, 392, 523, 659], .9, 'triangle', .14); }

    startAmbience(){
        if(!this.ensure()) return;
        if(this.musicTimer || this.droneTimer || this.melodyTimer) return;

        const chords = [
            [196, 247, 294],   // Gm-like mood
            [174, 220, 262],   // F-like mood
            [196, 247, 330],   // rise
            [220, 262, 330],   // resolve
        ];
        const melody = [392, 440, 392, 349, 330, 392, 440, 523, 440, 392, 349, 330];

        const playDrone = () => {
            if(!this.enabled) return;
            const chord = chords[this.motifIndex % chords.length];
            this.chord(chord, 2.8, 'sine', .04);
            this.tone(chord[0] / 2, 2.6, 'triangle', .03);
            this.motifIndex++;
        };

        const playArp = () => {
            if(!this.enabled) return;
            const chord = chords[(this.motifIndex - 1 + chords.length) % chords.length];
            const note = chord[this.arpIndex % chord.length];
            this.tone(note * 2, .26, 'triangle', .045);
            this.tone(note * 3, .18, 'sine', .018, .04);
            this.arpIndex++;
        };

        const playMelody = () => {
            if(!this.enabled) return;
            const note = melody[this.melodyIndex % melody.length];
            this.tone(note, .32, 'triangle', .055);
            this.tone(note * 2, .2, 'sine', .02, .06);
            this.melodyIndex++;
        };

        playDrone();
        playArp();
        playMelody();
        this.droneTimer = window.setInterval(playDrone, 5200);
        this.musicTimer = window.setInterval(playArp, 780);
        this.melodyTimer = window.setInterval(playMelody, 1560);
    }

    updateTension(minCards){
        let level = 0;
        if(Number.isFinite(minCards) && minCards <= 3) level = 1;
        if(Number.isFinite(minCards) && minCards <= 2) level = 2;
        if(Number.isFinite(minCards) && minCards <= 1) level = 3;
        if(level === this.tensionLevel) return;
        this.tensionLevel = level;
        window.clearInterval(this.tensionTimer);
        this.tensionTimer = null;
        if(level === 0 || !this.enabled) return;
        const interval = level === 1 ? 1600 : level === 2 ? 1050 : 680;
        this.tensionTimer = window.setInterval(() => {
            const base = level === 3 ? 392 : level === 2 ? 330 : 262;
            this.tone(base, .1, 'triangle', .085);
            this.tone(base * 1.5, .12, 'sine', .052, .04);
        }, interval);
    }

    stopAll(){
        window.clearInterval(this.musicTimer);
        window.clearInterval(this.tensionTimer);
        window.clearInterval(this.droneTimer);
        window.clearInterval(this.melodyTimer);
        this.musicTimer = null;
        this.tensionTimer = null;
        this.droneTimer = null;
        this.melodyTimer = null;
        this.tensionLevel = 0;
    }
}

const castleAudio = new CastleAudio();

/* ===== js/app.js ===== */

const screens = {
    menu: document.querySelector('#menuScreen'),
    game: document.querySelector('#gameScreen'),
};

const dom = {
    roomInfo: document.querySelector('#roomInfo'),
    turnInfo: document.querySelector('#turnInfo'),
    ruleHint: document.querySelector('#ruleHint'),
    playersSummary: document.querySelector('#playersSummary'),
    tableCards: document.querySelector('#tableCards'),
    roundHistory: document.querySelector('#roundHistory'),
    playerHand: document.querySelector('#playerHand'),
    playButton: document.querySelector('#playButton'),
    passButton: document.querySelector('#passButton'),
    rematchButton: document.querySelector('#rematchButton'),
    selectionMessage: document.querySelector('#selectionMessage'),
    menuThemeAudio: document.querySelector('#menuThemeAudio'),
    endModal: document.querySelector('#endModal'),
    rankList: document.querySelector('#rankList'),
    tradeModal: document.querySelector('#tradeModal'),
    tradeList: document.querySelector('#tradeList'),
    tradeStarter: document.querySelector('#tradeStarter'),
    tradeContinueButton: document.querySelector('#tradeContinueButton'),
    drawOverlay: document.querySelector('#drawOverlay'),
    drawName: document.querySelector('#drawName'),
};

let currentGame = null;
let selectedCardIds = new Set();
let botTimer = null;
let pendingClearTimer = null;
let dealAnimationTimer = null;
let isDealingCards = false;
let isAnimatingTurn = false;

function showScreen(name){
    Object.values(screens).forEach(screen => screen.classList.remove('active', 'fadeOut'));
    screens[name].classList.add('active');
}

function getMenuSettings(){
    return createRoomSettings({
        roomName: document.querySelector('#roomName')?.value,
        password: document.querySelector('#roomPassword')?.value,
        deckCount: document.querySelector('#deckCount')?.value,
        includeJokers: document.querySelector('#includeJokers')?.checked,
        allowObservers: document.querySelector('#allowObservers')?.checked,
        observerVoicePolicy: document.querySelector('#observerVoicePolicy')?.value,
        disconnectAction: 'redistribute-cards',
        graceSeconds: 60,
    });
}

function getLocalOptions(){
    return {
        humanName: document.querySelector('#playerName')?.value?.trim() || 'Você',
        botCount: Number(document.querySelector('#botCount')?.value || 3),
    };
}


function startMenuTheme(){
    const audio = dom.menuThemeAudio;
    if(!audio || document.querySelector('#soundEnabled')?.checked === false) return Promise.resolve(false);
    audio.volume = 1.0;
    audio.muted = false;
    audio.loop = true;
    try{
        audio.load();
        if(audio.paused && audio.currentTime > 0) audio.currentTime = 0;
    }catch(error){}
    const promise = audio.play();
    if(promise?.then){
        return promise.then(() => true).catch(() => false);
    }
    return Promise.resolve(true);
}

function stopMenuTheme(){
    const audio = dom.menuThemeAudio;
    if(!audio) return;
    audio.pause();
}

function startLocalGame(){
    castleAudio.configure(document.querySelector('#soundEnabled')?.checked !== false);
    stopMenuTheme();
    castleAudio.ui();
    castleAudio.startAmbience();
    const settings = getMenuSettings();
    const options = getLocalOptions();
    screens.menu.classList.add('fadeOut');
    window.setTimeout(() => {
        showScreen('game');
        hideEndModal();
        selectedCardIds.clear();
        currentGame = createLocalGame(settings, options);
        renderDrawBeforeMatch();
    }, 450);
}

function renderDrawBeforeMatch(){
    castleAudio.draw();
    const playablePlayers = currentGame.players.filter(player => !player.isObserver);
    const starter = currentGame.currentPlayer();
    if(!dom.drawOverlay || !dom.drawName){
        renderGame();
        scheduleBotIfNeeded();
        return;
    }

    dom.drawOverlay.hidden = false;
    dom.drawName.textContent = 'Sorteando...';
    let index = 0;
    const spinTimer = window.setInterval(() => {
        dom.drawName.textContent = playablePlayers[index % playablePlayers.length]?.name || 'Sorteando...';
        index++;
    }, 95);

    window.setTimeout(() => {
        window.clearInterval(spinTimer);
        dom.drawName.textContent = `${starter.name} começa!`;
        window.setTimeout(() => {
            dom.drawOverlay.hidden = true;
            runOpeningDealAnimation();
        }, 650);
    }, 1500);
}


function runOpeningDealAnimation(){
    window.clearTimeout(dealAnimationTimer);
    isDealingCards = true;
    isAnimatingTurn = false;
    screens.game.classList.add('dealing-cards');
    renderGame();

    let ticks = 0;
    const tickTimer = window.setInterval(() => {
        ticks++;
        castleAudio.card(1);
        if(ticks >= 9) window.clearInterval(tickTimer);
    }, 105);

    dealAnimationTimer = window.setTimeout(() => {
        isDealingCards = false;
        screens.game.classList.remove('dealing-cards');
        renderGame();
        scheduleBotIfNeeded();
    }, 1350);
}

function getCurrentBreakerImpactKind(){
    const card = currentGame?.tableCombo?.cards?.[0];
    if(card?.isJoker || card?.valueStr === '★') return 'chaos';
    return 'royal';
}

function triggerTurnImpact(kind = 'play'){
    const screen = screens.game;
    if(!screen) return;
    const className = kind === 'royal' ? 'royal-impact' : kind === 'chaos' ? 'chaos-impact' : 'play-impact';
    screen.classList.remove('play-impact', 'royal-impact', 'chaos-impact');
    void screen.offsetWidth;
    screen.classList.add(className);
    window.setTimeout(() => screen.classList.remove(className), kind === 'play' ? 680 : 1350);
}

function applyCastingAnimation(cardIds){
    cardIds.forEach(cardId => {
        const cards = [...(dom.playerHand?.querySelectorAll('[data-card-id]') || [])];
        const cardEl = cards.find(item => item.dataset.cardId === cardId);
        if(cardEl) cardEl.classList.add('playCasting');
    });
}

function renderGame(){
    if(!currentGame) return;
    const settings = currentGame.settings;
    const currentPlayer = currentGame.currentPlayer();
    dom.roomInfo.textContent = `${settings.roomName} · ${settings.passwordProtected ? 'com senha' : 'sem senha'} · ${settings.includeJokers ? 'com coringas' : 'sem coringas'}`;
    dom.turnInfo.textContent = currentGame.phase === 'finished'
        ? 'Partida encerrada'
        : `${currentGame.lastMessage} Turno: ${currentPlayer?.name || '-'}`;

    dom.ruleHint.textContent = currentGame.pendingClear
        ? 'A última jogada permanece visível antes da mesa reiniciar.'
        : currentGame.tableCombo
            ? `Para cobrir: ${describeCombo(currentGame.tableCombo)} com valor maior.`
            : 'Mesa livre: jogue uma ou mais cartas do mesmo valor.';

    updateTensionFeedback();

    renderPlayerSummary();
    renderTable();
    renderHistory();
    renderHand();
    renderControls();

    if(currentGame.phase === 'finished') showEndModal();
}

function renderPlayerSummary(){
    dom.playersSummary.innerHTML = '';
    currentGame.players.forEach((player, index) => {
        if(player.isObserver) return;
        const item = document.createElement('article');
        item.className = 'playerBadge';
        if(index === currentGame.currentPlayerIndex && currentGame.phase === 'playing') item.classList.add('active');
        if(player.hasPassed) item.classList.add('passed');
        if(player.finishedPosition !== null) item.classList.add('finished');
        item.innerHTML = `
            <strong>${escapeHtml(player.name)}</strong>
            <span>${player.hand.length} cartas</span>
            ${player.role ? `<em>${escapeHtml(player.role)}</em>` : ''}
        `;
        dom.playersSummary.appendChild(item);
    });
}

function renderTable(){
    dom.tableCards.innerHTML = '';
    dom.tableCards.classList.toggle('pendingClear', Boolean(currentGame.pendingClear));
    if(!currentGame.tableCombo){
        dom.tableCards.innerHTML = '<p class="emptyTable">Mesa livre</p>';
        return;
    }

    const owner = currentGame.players[currentGame.tableCombo.playerIndex];
    const comboCards = currentGame.tableCombo.cards || [];
    const count = comboCards.length;
    const label = document.createElement('div');
    label.className = 'tableOwner';
    label.textContent = `Líder: ${owner?.name || currentGame.tableCombo.playerName}`;
    dom.tableCards.appendChild(label);

    const caption = document.createElement('div');
    caption.className = 'tableComboCaption';
    caption.textContent = describeCombo(currentGame.tableCombo);
    dom.tableCards.appendChild(caption);

    const spread = count <= 1 ? 0 : count === 2 ? 44 : count === 3 ? 36 : count === 4 ? 28 : 22;
    const middle = (count - 1) / 2;

    comboCards.forEach((card, index) => {
        const el = createCardElement(card, { compact: false, disabled: true });
        const centeredIndex = index - middle;
        const offset = centeredIndex * spread;
        const rotation = centeredIndex * 5;
        const lift = Math.abs(centeredIndex) * 2.5;
        el.style.setProperty('--card-offset', `${offset}px`);
        el.style.setProperty('--card-rotation', `${rotation}deg`);
        el.style.setProperty('--card-lift', `${lift}px`);
        el.style.setProperty('--card-z', `${20 + index}`);
        el.classList.add('playedCard');
        if(currentGame.pendingClear?.type === 'breaker') el.classList.add('breakerCard');
        dom.tableCards.appendChild(el);
    });
}

function renderHistory(){
    dom.roundHistory.innerHTML = '';
    if(!currentGame.tableHistory.length){
        dom.roundHistory.innerHTML = '<span>Nenhuma jogada nesta rodada.</span>';
        return;
    }
    currentGame.tableHistory.slice().reverse().forEach(combo => {
        const row = document.createElement('div');
        row.className = 'historyItem';
        row.innerHTML = `<strong>${escapeHtml(combo.playerName)}</strong> <span>${describeCombo(combo)}</span>`;
        dom.roundHistory.appendChild(row);
    });
}

function getPlayablePowerSetForHuman(){
    if(!currentGame) return new Set();
    const human = currentGame.players[0];
    const groups = new Map();
    human.hand.forEach(card => {
        const power = Number(card.power);
        if(!groups.has(power)) groups.set(power, []);
        groups.get(power).push(card);
    });

    if(!currentGame.tableCombo){
        return new Set([...groups.keys()]);
    }

    const requiredCount = Number(currentGame.tableCombo.count);
    const requiredPower = Number(currentGame.tableCombo.power);
    const playablePowers = new Set();
    groups.forEach((cards, power) => {
        if(Number(power) > requiredPower && cards.length >= requiredCount){
            playablePowers.add(Number(power));
        }
    });
    return playablePowers;
}

function renderHand(){
    const human = currentGame.players[0];
    dom.playerHand.innerHTML = '';

    if(currentGame.phase === 'finished'){
        dom.playerHand.innerHTML = '<p class="observerNotice">Partida encerrada. Confira o ranking ou inicie a revanche.</p>';
        return;
    }

    const isHumanTurn = currentGame.currentPlayerIndex === 0 && currentGame.phase === 'playing' && !currentGame.pendingClear && !isDealingCards && !isAnimatingTurn;
    const playablePowers = isHumanTurn ? getPlayablePowerSetForHuman() : new Set();

    human.hand.forEach((card, handIndex) => {
        const el = createCardElement(card, { compact: false, disabled: !isHumanTurn });
        el.style.setProperty('--deal-index', String(handIndex % 22));
        if(isHumanTurn){
            el.classList.add(playablePowers.has(Number(card.power)) ? 'playableHint' : 'notPlayable');
        }
        if(selectedCardIds.has(card.id)) el.classList.add('selected');
        el.addEventListener('click', () => toggleCard(card.id));
        dom.playerHand.appendChild(el);
    });

    if(!human.hand.length){
        dom.playerHand.innerHTML = '<p class="observerNotice">Você já acabou suas cartas.</p>';
    }
}

function renderControls(){
    const isHumanTurn = currentGame.phase === 'playing' && currentGame.currentPlayerIndex === 0 && !currentGame.pendingClear && !isDealingCards && !isAnimatingTurn;
    const selectedCards = currentGame.getSelectedCards(0, [...selectedCardIds]);
    const reason = getInvalidPlayReason(selectedCards, currentGame.tableCombo);

    dom.playButton.disabled = !isHumanTurn || Boolean(reason);
    dom.passButton.disabled = !isHumanTurn || !currentGame.tableCombo;
    dom.rematchButton.hidden = currentGame.phase !== 'finished';

    if(isDealingCards){
        dom.selectionMessage.textContent = 'Distribuindo as cartas da corte...';
    } else if(isAnimatingTurn){
        dom.selectionMessage.textContent = 'A corte observa sua jogada...';
    } else if(currentGame.pendingClear){
        dom.selectionMessage.textContent = 'Aguarde a corte observar a última jogada...';
    } else if(!isHumanTurn && currentGame.phase === 'playing'){
        dom.selectionMessage.textContent = 'Aguarde a jogada dos bots.';
    } else if(!selectedCards.length && currentGame.phase === 'playing'){
        dom.selectionMessage.textContent = 'Selecione cartas do mesmo valor para jogar.';
    } else if(reason){
        dom.selectionMessage.textContent = reason;
    } else if(currentGame.phase === 'playing'){
        dom.selectionMessage.textContent = `Jogada válida: ${selectedCards.length} carta(s) de ${selectedCards[0].valueStr}.`;
    }
}

function createCardElement(card, { disabled = false } = {}){
    const el = document.createElement('button');
    el.className = `card suit-${card.suitId || card.suit}`;
    el.type = 'button';
    el.disabled = disabled;
    el.dataset.cardId = card.id;
    el.title = `${card.valueStr} · ${card.suitName}`;
    el.innerHTML = `
        <span class="cardCorner top">${escapeHtml(card.valueStr)}<small>${card.suitSymbol}</small></span>
        <span class="cardSymbol">${card.suitSymbol}</span>
        <span class="cardCorner bottom">${escapeHtml(card.valueStr)}<small>${card.suitSymbol}</small></span>
    `;
    return el;
}

function toggleCard(cardId){
    if(!currentGame || currentGame.currentPlayerIndex !== 0 || currentGame.phase !== 'playing' || currentGame.pendingClear || isDealingCards || isAnimatingTurn) return;
    if(selectedCardIds.has(cardId)) selectedCardIds.delete(cardId);
    else selectedCardIds.add(cardId);
    renderHand();
    renderControls();
}

function playSelected(){
    if(!currentGame || currentGame.currentPlayerIndex !== 0 || isDealingCards || isAnimatingTurn) return;
    const cardIds = [...selectedCardIds];
    const selectedCards = currentGame.getSelectedCards(0, cardIds);
    const reason = getInvalidPlayReason(selectedCards, currentGame.tableCombo);
    if(reason){
        dom.selectionMessage.textContent = reason;
        renderControls();
        return;
    }

    isAnimatingTurn = true;
    renderControls();
    applyCastingAnimation(cardIds);
    castleAudio.card(cardIds.length || 1);

    window.setTimeout(() => {
        const result = currentGame.playCards(currentGame.players[0].id, cardIds);
        if(!result.ok){
            isAnimatingTurn = false;
            dom.selectionMessage.textContent = result.message;
            renderGame();
            return;
        }
        const wasBreaker = Boolean(result.clearedByBreaker || currentGame.pendingClear?.type === 'breaker');
        if(wasBreaker) castleAudio.breaker();
        selectedCardIds.clear();
        isAnimatingTurn = false;
        renderGame();
        triggerTurnImpact(wasBreaker ? getCurrentBreakerImpactKind() : 'play');
        if(currentGame.pendingClear) schedulePendingClearIfNeeded();
        else scheduleBotIfNeeded();
    }, 380);
}

function passTurn(){
    if(!currentGame || currentGame.currentPlayerIndex !== 0 || isDealingCards || isAnimatingTurn) return;
    const result = currentGame.pass(currentGame.players[0].id);
    if(!result.ok){
        dom.selectionMessage.textContent = result.message;
        return;
    }
    castleAudio.pass();
    selectedCardIds.clear();
    renderGame();
    if(currentGame.pendingClear) schedulePendingClearIfNeeded();
    else scheduleBotIfNeeded();
}

function scheduleBotIfNeeded(){
    window.clearTimeout(botTimer);
    if(!currentGame || currentGame.phase !== 'playing' || isDealingCards || isAnimatingTurn) return;
    if(currentGame.pendingClear){
        schedulePendingClearIfNeeded();
        return;
    }
    const player = currentGame.currentPlayer();
    if(!player || player.isHuman) return;
    const delay = 1350 + Math.floor(Math.random() * 850);
    botTimer = window.setTimeout(() => {
        if(!currentGame || currentGame.pendingClear || isDealingCards || isAnimatingTurn) return;
        const result = currentGame.playBotTurn();
        const lastAction = currentGame.matchHistory[currentGame.matchHistory.length - 1];
        const wasPass = lastAction?.type === 'pass';
        const wasBreaker = Boolean(currentGame.pendingClear?.type === 'breaker');
        selectedCardIds.clear();
        renderGame();
        if(result?.ok){
            if(wasPass) castleAudio.pass();
            else {
                castleAudio.card(currentGame.tableCombo?.count || 1);
                if(wasBreaker) castleAudio.breaker();
                triggerTurnImpact(wasBreaker ? getCurrentBreakerImpactKind() : 'play');
            }
        }
        if(currentGame.pendingClear) schedulePendingClearIfNeeded();
        else scheduleBotIfNeeded();
    }, delay);
}

function schedulePendingClearIfNeeded(){
    window.clearTimeout(pendingClearTimer);
    if(!currentGame?.pendingClear) return;
    const pendingType = currentGame.pendingClear.type;
    const delay = Math.max(500, Number(currentGame.pendingClear.delayMs) || 850);
    pendingClearTimer = window.setTimeout(() => {
        if(!currentGame?.pendingClear) return;
        currentGame.applyPendingClear();
        castleAudio.tableClear(pendingType);
        selectedCardIds.clear();
        renderGame();
        scheduleBotIfNeeded();
    }, delay);
}

function updateTensionFeedback(){
    if(!currentGame) return;
    const counts = currentGame.players
        .filter((player, index) => !player.isObserver && !currentGame.finishedOrder.includes(index))
        .map(player => player.hand.length)
        .filter(count => count > 0);
    const minCards = counts.length ? Math.min(...counts) : Infinity;
    screens.game.classList.toggle('tension-high', minCards <= 3 && minCards > 1);
    screens.game.classList.toggle('tension-critical', minCards <= 1);
    castleAudio.updateTension(minCards);
}

function showEndModal(){
    if(dom.endModal.hidden) castleAudio.finish();
    dom.rankList.innerHTML = '';
    const roleIcons = {
        'Majestade': '👑',
        'Regente': '🛡️',
        'Cortesão': '⚜️',
        'Plebeu': '🪵',
        'Aldeão': '🌾',
    };
    currentGame.finishedOrder.forEach((playerIndex, index) => {
        const player = currentGame.players[playerIndex];
        const role = player.role || '';
        const li = document.createElement('li');
        li.className = `rankCeremony rank-${role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;
        li.innerHTML = `<strong><span class="rankEmblem">${roleIcons[role] || '⚜️'}</span> ${index + 1}º — ${escapeHtml(role)}</strong><span>${escapeHtml(player.name)}</span>`;
        dom.rankList.appendChild(li);
    });
    dom.endModal.hidden = false;
}

function hideEndModal(){
    dom.endModal.hidden = true;
}

function hideTradeModal(){
    if(dom.tradeModal) dom.tradeModal.hidden = true;
}

function showRematchTradeCeremony(){
    if(!dom.tradeModal || !dom.tradeList){
        runOpeningDealAnimation();
        return;
    }

    const log = currentGame?.lastTradeLog || [];
    dom.tradeList.innerHTML = '';

    if(!log.length){
        dom.tradeList.innerHTML = '<li><strong>A corte foi reorganizada.</strong><small>Nenhuma carta específica é exibida publicamente.</small></li>';
    } else {
        log.forEach(item => {
            const li = document.createElement('li');
            const label = escapeHtml(item.label || 'Troca da Corte');
            const giverBest = escapeHtml(item.giverBestName || 'Aldeão');
            const receiverBest = escapeHtml(item.receiverBestName || 'Majestade');
            const giverWorst = escapeHtml(item.giverWorstName || 'Majestade');
            const receiverWorst = escapeHtml(item.receiverWorstName || 'Aldeão');
            li.innerHTML = `<strong>${label}</strong><small>${giverBest} entregou sua melhor carta para ${receiverBest}. ${giverWorst} entregou sua pior carta para ${receiverWorst}.</small>`;
            dom.tradeList.appendChild(li);
        });
    }

    const starterName = escapeHtml(currentGame?.currentPlayer()?.name || 'Aldeão');
    if(dom.tradeStarter) dom.tradeStarter.textContent = `${starterName} inicia a revanche.`;
    dom.tradeModal.hidden = false;
}

function startRematch(){
    if(!currentGame) return;
    castleAudio.ui();
    window.clearTimeout(pendingClearTimer);
    hideEndModal();
    selectedCardIds.clear();
    currentGame.startRematch();
    showRematchTradeCeremony();
}

function showObserverPreview(){
    const settings = getMenuSettings();
    const demoGame = currentGame || createLocalGame(settings, getLocalOptions());
    const observerState = createObserverState(demoGame);
    const isSafe = assertObserverStateIsSafe(observerState);
    const lines = observerState.players.map(player => `${escapeHtml(player.name)}: ${player.cardCount} cartas`).join('<br>');

    showScreen('game');
    hideEndModal();
    dom.turnInfo.textContent = 'Modo Observador Seguro';
    dom.ruleHint.textContent = isSafe
        ? 'Estado validado: o observador não recebe mãos nem baralho.'
        : 'Atenção: estado do observador precisa ser revisado.';
    dom.roomInfo.textContent = `${settings.roomName} · observador não recebe cartas privadas`;
    dom.playersSummary.innerHTML = observerState.players.map(player => `<article class="playerBadge"><strong>${escapeHtml(player.name)}</strong><span>${player.cardCount} cartas</span></article>`).join('');
    dom.tableCards.innerHTML = '<p class="emptyTable">Visão pública da mesa</p>';
    dom.roundHistory.innerHTML = '<span>Histórico público de jogadas ficará visível aqui.</span>';
    dom.playerHand.innerHTML = `<p class="observerNotice"><strong>Seguro contra trapaça:</strong><br>${lines}<br><br>As cartas das mãos não existem no navegador do observador.</p>`;
    dom.playButton.disabled = true;
    dom.passButton.disabled = true;
    dom.rematchButton.hidden = true;
}

function testCastleSound(){
    const ok = castleAudio.unlock();
    const button = document.querySelector('[data-action="sound-test"]');
    if(ok){
        const oldText = button ? button.textContent : '';
        if(button) button.textContent = '🔊 Carregando trilha...';
        startMenuTheme().then(started => {
            castleAudio.card(1);
            window.setTimeout(() => castleAudio.breaker(), 240);
            if(button){
                button.textContent = started ? '🔊 Trilha ativada' : '🔊 Efeito ativado — toque de novo';
                window.setTimeout(() => { button.textContent = oldText; }, 2200);
            }
        });
    } else if(button){
        const oldText = button.textContent;
        button.textContent = 'Áudio indisponível';
        window.setTimeout(() => { button.textContent = oldText; }, 1800);
    }
}

function showPlannedOnlineInfo(){
    const settings = getMenuSettings();
    alert(`Sala planejada: ${settings.roomName}\nSenha: ${settings.passwordProtected ? 'ativada' : 'desativada'}\nObservadores: ${settings.allowObservers ? 'permitidos com mãos ocultas' : 'bloqueados'}\nDesconexão: redistribuir cartas após 60s`);
}

function showRules(){
    alert('Regras v0.5.3:\n\n1. O início da primeira partida acontece por sorteio.\n2. Mesa livre: jogue uma ou mais cartas do mesmo valor.\n3. Mesa ocupada: jogue a mesma quantidade de cartas com valor maior.\n4. Ao jogar 2, ou coringa se estiver ativado, a mesa limpa automaticamente e quem jogou inicia nova rodada.\n5. Coringas são opcionais e começam desativados por padrão.\n6. Na revanche, Majestade/Aldeão e Regente/Plebeu trocam cartas automaticamente.\n7. A última jogada antes de limpar a mesa fica visível por pelo menos 0,5s para leitura estratégica.\n8. A v0.5.3 adiciona distribuição animada, jogadas cinematográficas e cerimônia da corte.');
}

function backToMenu(){
    window.clearTimeout(botTimer);
    window.clearTimeout(pendingClearTimer);
    window.clearTimeout(dealAnimationTimer);
    isDealingCards = false;
    isAnimatingTurn = false;
    screens.game.classList.remove('dealing-cards', 'play-impact', 'royal-impact', 'chaos-impact');
    castleAudio.updateTension(Infinity);
    castleAudio.stopAll();
    selectedCardIds.clear();
    hideEndModal();
    hideTradeModal();
    showScreen('menu');
    startMenuTheme();
}

function escapeHtml(value){
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

dom.playButton.addEventListener('click', playSelected);
dom.passButton.addEventListener('click', passTurn);
dom.rematchButton.addEventListener('click', startRematch);
dom.tradeContinueButton?.addEventListener('click', () => {
    hideTradeModal();
    runOpeningDealAnimation();
});

document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if(!button) return;
    const action = button.dataset.action;
    if(action === 'start-local') startLocalGame();
    if(action === 'online-soon') showPlannedOnlineInfo();
    if(action === 'observer-preview') showObserverPreview();
    if(action === 'rules') showRules();
    if(action === 'sound-test') testCastleSound();
    if(action === 'rematch') startRematch();
    if(action === 'back-menu') backToMenu();
});


document.querySelector('#soundEnabled')?.addEventListener('change', event => {
    castleAudio.configure(event.target.checked);
    if(event.target.checked) startMenuTheme();
    else stopMenuTheme();
});

window.addEventListener('DOMContentLoaded', () => {
    if(dom.menuThemeAudio){ dom.menuThemeAudio.volume = 1.0; dom.menuThemeAudio.loop = true; dom.menuThemeAudio.load(); }
    window.setTimeout(() => {
        document.querySelector('#menuScreen')?.classList.add('introComplete');
    }, 1500);
});
