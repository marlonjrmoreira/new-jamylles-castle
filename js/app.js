import { createLocalGame } from './game.js';
import { createRoomSettings } from './room-config.js';
import { createObserverState, assertObserverStateIsSafe } from './public-state.js';
import { describeCombo, getInvalidPlayReason } from './rules.js';

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
    endModal: document.querySelector('#endModal'),
    rankList: document.querySelector('#rankList'),
    drawOverlay: document.querySelector('#drawOverlay'),
    drawName: document.querySelector('#drawName'),
};

let currentGame = null;
let selectedCardIds = new Set();
let botTimer = null;

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

function startLocalGame(){
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
            renderGame();
            scheduleBotIfNeeded();
        }, 650);
    }, 1500);
}

function renderGame(){
    if(!currentGame) return;
    const settings = currentGame.settings;
    const currentPlayer = currentGame.currentPlayer();
    dom.roomInfo.textContent = `${settings.roomName} · ${settings.passwordProtected ? 'com senha' : 'sem senha'} · ${settings.includeJokers ? 'com coringas' : 'sem coringas'}`;
    dom.turnInfo.textContent = currentGame.phase === 'finished'
        ? 'Partida encerrada'
        : `${currentGame.lastMessage} Turno: ${currentPlayer?.name || '-'}`;

    dom.ruleHint.textContent = currentGame.tableCombo
        ? `Para cobrir: ${describeCombo(currentGame.tableCombo)} com valor maior.`
        : 'Mesa livre: jogue uma ou mais cartas do mesmo valor.';

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
    if(!currentGame.tableCombo){
        dom.tableCards.innerHTML = '<p class="emptyTable">Mesa livre</p>';
        return;
    }

    const owner = currentGame.players[currentGame.tableCombo.playerIndex];
    const label = document.createElement('div');
    label.className = 'tableOwner';
    label.textContent = `Líder: ${owner?.name || currentGame.tableCombo.playerName}`;
    dom.tableCards.appendChild(label);

    currentGame.tableCombo.cards.forEach((card, index) => {
        const el = createCardElement(card, { compact: false, disabled: true });
        el.style.setProperty('--card-offset', `${index * 12}px`);
        el.style.setProperty('--card-rotation', `${[-5, 4, -2, 6, -7][index % 5]}deg`);
        el.classList.add('playedCard');
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

    const isHumanTurn = currentGame.currentPlayerIndex === 0 && currentGame.phase === 'playing' && !currentGame.pendingClear;
    const playablePowers = isHumanTurn ? getPlayablePowerSetForHuman() : new Set();

    human.hand.forEach(card => {
        const el = createCardElement(card, { compact: false, disabled: !isHumanTurn });
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
    const isHumanTurn = currentGame.phase === 'playing' && currentGame.currentPlayerIndex === 0;
    const selectedCards = currentGame.getSelectedCards(0, [...selectedCardIds]);
    const reason = getInvalidPlayReason(selectedCards, currentGame.tableCombo);

    dom.playButton.disabled = !isHumanTurn || Boolean(reason);
    dom.passButton.disabled = !isHumanTurn || !currentGame.tableCombo;
    dom.rematchButton.hidden = currentGame.phase !== 'finished';

    if(!isHumanTurn && currentGame.phase === 'playing'){
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
    if(!currentGame || currentGame.currentPlayerIndex !== 0 || currentGame.phase !== 'playing') return;
    if(selectedCardIds.has(cardId)) selectedCardIds.delete(cardId);
    else selectedCardIds.add(cardId);
    renderHand();
    renderControls();
}

function playSelected(){
    if(!currentGame || currentGame.currentPlayerIndex !== 0) return;
    const result = currentGame.playCards(currentGame.players[0].id, [...selectedCardIds]);
    if(!result.ok){
        dom.selectionMessage.textContent = result.message;
        renderControls();
        return;
    }
    selectedCardIds.clear();
    renderGame();
    scheduleBotIfNeeded();
}

function passTurn(){
    if(!currentGame || currentGame.currentPlayerIndex !== 0) return;
    const result = currentGame.pass(currentGame.players[0].id);
    if(!result.ok){
        dom.selectionMessage.textContent = result.message;
        return;
    }
    selectedCardIds.clear();
    renderGame();
    scheduleBotIfNeeded();
}

function scheduleBotIfNeeded(){
    window.clearTimeout(botTimer);
    if(!currentGame || currentGame.phase !== 'playing') return;
    const player = currentGame.currentPlayer();
    if(!player || player.isHuman) return;
    botTimer = window.setTimeout(() => {
        currentGame.playBotTurn();
        selectedCardIds.clear();
        renderGame();
        scheduleBotIfNeeded();
    }, 780);
}

function showEndModal(){
    dom.rankList.innerHTML = '';
    currentGame.finishedOrder.forEach((playerIndex, index) => {
        const player = currentGame.players[playerIndex];
        const li = document.createElement('li');
        li.innerHTML = `<strong>${index + 1}º — ${escapeHtml(player.role || '')}</strong><span>${escapeHtml(player.name)}</span>`;
        dom.rankList.appendChild(li);
    });
    dom.endModal.hidden = false;
}

function hideEndModal(){
    dom.endModal.hidden = true;
}

function startRematch(){
    if(!currentGame) return;
    hideEndModal();
    selectedCardIds.clear();
    currentGame.startRematch();
    renderGame();
    scheduleBotIfNeeded();
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

function showPlannedOnlineInfo(){
    const settings = getMenuSettings();
    alert(`Sala planejada: ${settings.roomName}\nSenha: ${settings.passwordProtected ? 'ativada' : 'desativada'}\nObservadores: ${settings.allowObservers ? 'permitidos com mãos ocultas' : 'bloqueados'}\nDesconexão: redistribuir cartas após 60s`);
}

function showRules(){
    alert('Regras v0.4.0:\n\n1. O início da primeira partida acontece por sorteio.\n2. Mesa livre: jogue uma ou mais cartas do mesmo valor.\n3. Mesa ocupada: jogue a mesma quantidade de cartas com valor maior.\n4. Ao jogar 2, ou coringa se estiver ativado, a mesa limpa automaticamente e quem jogou inicia nova rodada.\n5. Coringas são opcionais e começam desativados por padrão.\n6. Na revanche, Majestade/Aldeão e Regente/Plebeu trocam cartas automaticamente.');
}

function backToMenu(){
    window.clearTimeout(botTimer);
    selectedCardIds.clear();
    hideEndModal();
    showScreen('menu');
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

document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if(!button) return;
    const action = button.dataset.action;
    if(action === 'start-local') startLocalGame();
    if(action === 'online-soon') showPlannedOnlineInfo();
    if(action === 'observer-preview') showObserverPreview();
    if(action === 'rules') showRules();
    if(action === 'rematch') startRematch();
    if(action === 'back-menu') backToMenu();
});


window.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(() => {
        document.querySelector('#menuScreen')?.classList.add('introComplete');
    }, 1500);
});
