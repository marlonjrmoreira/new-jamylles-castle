import { DISCONNECT_ACTION } from './room-config.js';

export function handlePlayerDisconnect(gameState, disconnectedPlayerId){
  const playerIndex = gameState.players.findIndex(player => player.id === disconnectedPlayerId);
  if(playerIndex < 0) return gameState;

  const disconnectedPlayer = gameState.players[playerIndex];
  disconnectedPlayer.isConnected = false;
  disconnectedPlayer.disconnectedAt = Date.now();

  const action = gameState.settings?.disconnect?.action || DISCONNECT_ACTION.REDISTRIBUTE_CARDS;

  if(action === DISCONNECT_ACTION.REMOVE_CARDS){
    disconnectedPlayer.hand = [];
    disconnectedPlayer.removedFromMatch = true;
    return recalculateTurnAfterRemoval(gameState, playerIndex);
  }

  if(action === DISCONNECT_ACTION.REPLACE_WITH_BOT){
    disconnectedPlayer.isHuman = false;
    disconnectedPlayer.isBotReplacement = true;
    disconnectedPlayer.name = `${disconnectedPlayer.name} (BOT)`;
    disconnectedPlayer.isConnected = true;
    return gameState;
  }

  redistributeDisconnectedCards(gameState, playerIndex);
  disconnectedPlayer.removedFromMatch = true;
  return recalculateTurnAfterRemoval(gameState, playerIndex);
}

export function redistributeDisconnectedCards(gameState, disconnectedPlayerIndex){
  const disconnectedPlayer = gameState.players[disconnectedPlayerIndex];
  const cardsToRedistribute = shuffle([...(disconnectedPlayer.hand || [])]);
  disconnectedPlayer.hand = [];

  const activePlayers = gameState.players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => index !== disconnectedPlayerIndex && player.isConnected !== false && !player.removedFromMatch && !player.isObserver);

  if(activePlayers.length === 0) return;

  let targetPointer = findFirstActiveAfter(gameState, disconnectedPlayerIndex, activePlayers.map(item => item.index));

  for(const card of cardsToRedistribute){
    const targetIndex = activePlayers.findIndex(item => item.index === targetPointer);
    const safeTarget = targetIndex >= 0 ? activePlayers[targetIndex] : activePlayers[0];
    safeTarget.player.hand.push(card);
    targetPointer = nextActiveIndex(activePlayers.map(item => item.index), safeTarget.index);
  }
}

function recalculateTurnAfterRemoval(gameState, removedIndex){
  if(gameState.currentPlayerIndex === removedIndex){
    gameState.currentPlayerIndex = findNextEligiblePlayer(gameState, removedIndex);
  }
  return gameState;
}

function findNextEligiblePlayer(gameState, startIndex){
  const total = gameState.players.length;
  for(let offset = 1; offset <= total; offset++){
    const index = (startIndex + offset) % total;
    const player = gameState.players[index];
    if(player && player.isConnected !== false && !player.removedFromMatch && !player.isObserver && player.finishedPosition == null){
      return index;
    }
  }
  return -1;
}

function findFirstActiveAfter(gameState, startIndex, activeIndexes){
  const total = gameState.players.length;
  for(let offset = 1; offset <= total; offset++){
    const index = (startIndex + offset) % total;
    if(activeIndexes.includes(index)) return index;
  }
  return activeIndexes[0];
}

function nextActiveIndex(activeIndexes, currentIndex){
  const position = activeIndexes.indexOf(currentIndex);
  return activeIndexes[(position + 1) % activeIndexes.length];
}

function shuffle(cards){
  const shuffled = [...cards];
  for(let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
