import { rulesConfig } from './rules.js';

export const ROOM_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
  PASSWORD: 'password',
});

export const DISCONNECT_ACTION = Object.freeze({
  REDISTRIBUTE_CARDS: 'redistribute-cards',
  REMOVE_CARDS: 'remove-cards',
  REPLACE_WITH_BOT: 'replace-with-bot',
});

export const OBSERVER_VOICE_POLICY = Object.freeze({
  MUTED: 'muted',
  LISTEN_ONLY: 'listen-only',
  HOST_CAN_ALLOW: 'host-can-allow',
});

export function createRoomSettings(formValues = {}){
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

export function normalizeRoomName(name){
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toUpperCase()
    .slice(0, 18) || 'CASTELO';
}

export function validateRoomPassword(inputPassword, roomSettings){
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
