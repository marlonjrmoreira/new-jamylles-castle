import { createObserverState, assertObserverStateIsSafe } from './public-state.js';

export function canJoinAsObserver(gameState, roomSettings){
  return Boolean(roomSettings.allowObservers && gameState.phase !== 'lobby-closed');
}

export function addObserver(gameState, observerProfile){
  const observer = {
    id: observerProfile.id,
    name: observerProfile.name || 'Observador',
    avatar: observerProfile.avatar || null,
    isObserver: true,
    isConnected: true,
    joinedAt: Date.now(),
    hand: [],
  };
  gameState.observers = [...(gameState.observers || []), observer];
  return observer;
}

export function getSafeObserverPayload(gameState){
  const payload = createObserverState(gameState);
  if(!assertObserverStateIsSafe(payload)){
    throw new Error('Payload de observador bloqueado: contém dados privados.');
  }
  return payload;
}
