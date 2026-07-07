export function createPublicPlayerView(player){
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

export function createPublicGameState(gameState){
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

export function createPrivatePlayerState(gameState, playerId){
  const player = (gameState.players || []).find(item => item.id === playerId);
  if(!player) return null;
  return {
    playerId,
    hand: [...(player.hand || [])],
    playableHints: gameState.playableHints?.[playerId] || [],
  };
}

export function createObserverState(gameState){
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

export function assertObserverStateIsSafe(observerState){
  const serialized = JSON.stringify(observerState).toLowerCase();
  const forbiddenKeys = ['\"hand\":', '\"deck\":', '\"hands\":'];
  return forbiddenKeys.every(key => !serialized.includes(key));
}
