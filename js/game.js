import { createDeck, shuffleDeck } from './deck.js';
import { Player } from './player.js';
import { canPlayCombo, describeCombo, getInvalidPlayReason, getRankName, sortCards, isTableBreakerCombo, getCardPower } from './rules.js';
import { createRoomSettings } from './room-config.js';

const DEFAULT_BOT_NAMES = ['Bot Ametista', 'Bot Esmeralda', 'Bot Rubi', 'Bot Safira', 'Bot Topázio', 'Bot Ônix', 'Bot Jade'];

export class PresidenteGame{
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
            const breakerName = player.name;
            const comboDescription = describeCombo(combo);
            this.clearTable(playerIndex);
            this.lastMessage = `${breakerName} jogou ${comboDescription} e limpou a mesa. ${this.currentPlayer().name} inicia a nova rodada.`;
            return { ok: true, message: this.lastMessage, clearedByBreaker: true };
        }

        this.currentPlayerIndex = this.findNextPlayableIndex(playerIndex, { includePassed: false });
        this.checkTableClearAfterAction();
        return { ok: true, message: this.lastMessage };
    }

    pass(playerId){
        const playerIndex = this.getPlayerIndexById(playerId);
        if(playerIndex !== this.currentPlayerIndex) return { ok: false, message: 'Não é a vez deste jogador.' };
        if(!this.tableCombo) return { ok: false, message: 'A mesa está livre. Você precisa iniciar a rodada.' };

        const player = this.players[playerIndex];
        player.hasPassed = true;
        this.matchHistory.push({ type: 'pass', playerIndex, playerName: player.name, turn: ++this.turnCounter });
        this.lastMessage = `${player.name} passou.`;

        this.checkTableClearAfterAction();
        if(this.phase !== 'playing') return { ok: true, message: this.lastMessage };
        if(this.lastMessage.includes('Mesa limpa')) return { ok: true, message: this.lastMessage };

        this.currentPlayerIndex = this.findNextPlayableIndex(playerIndex, { includePassed: false });
        return { ok: true, message: this.lastMessage };
    }

    checkTableClearAfterAction(){
        if(!this.tableCombo || this.phase !== 'playing') return false;
        const unfinished = this.unfinishedPlayerIndices();
        const challengers = unfinished.filter(index => index !== this.tableOwnerIndex);
        const everyoneElsePassedOrFinished = challengers.length === 0 || challengers.every(index => this.players[index].hasPassed);

        if(everyoneElsePassedOrFinished){
            const previousOwnerIndex = this.tableOwnerIndex;
            this.clearTable(previousOwnerIndex);
            return true;
        }
        return false;
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
        this.lastTradeLog.push(`${label}: ${this.players[receiverBest].name} recebeu ${best.valueStr}; ${this.players[receiverWorst].name} recebeu ${worst.valueStr}.`);
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

export function createLocalGame(settingsInput = {}, options = {}){
    const game = new PresidenteGame(settingsInput);
    game.setupLocalPlayers(options);
    game.startInitialMatch();
    return game;
}

// Mantido para compatibilidade com versões anteriores da interface.
export function createDemoGame(settingsInput = {}){
    return createLocalGame(settingsInput, { humanName: 'Você', botCount: 3 });
}
