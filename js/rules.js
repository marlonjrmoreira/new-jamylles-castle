// Regras extraídas e organizadas a partir do arquivo original gemini-code-1778867922647.html
// Versão: v0.1.0

export const CARD_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

export const SUITS = [
  { id: 'filtro', label: 'Filtro', symbol: '⚱️' },
  { id: 'chinelo', label: 'Chinelo', symbol: '🩴' },
  { id: 'cadeira', label: 'Cadeira', symbol: '🪑' },
  { id: 'papagaio', label: 'Papagaio', symbol: '🦜' },
];

export const JOKERS = [
  { valueStr: '★', suitId: 'coringa', power: 13, label: 'Caramelo', symbol: '🐕' },
  { valueStr: '★', suitId: 'coringa', power: 13, label: 'João-de-barro', symbol: '🐦' },
];

export const rulesConfig = {
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

export function getCardPower(valueStr) {
  if (valueStr === '★') return 13;
  return CARD_VALUES.indexOf(valueStr);
}

export function sortCards(cards){
  return cards.sort((a, b) => {
    if(a.power !== b.power) return a.power - b.power;
    return String(a.suitId || a.suit || '').localeCompare(String(b.suitId || b.suit || ''));
  });
}

export function isSameValueCombo(cards) {
  if (!cards || cards.length === 0) return false;
  return cards.every(card => Number(card.power) === Number(cards[0].power));
}

export function describeCombo(combo){
  if(!combo) return 'Mesa livre';
  const cardLabel = combo.cards?.[0]?.valueStr || combo.cards?.[0]?.rank || '?';
  const plural = combo.count > 1 ? 'cartas' : 'carta';
  return `${combo.count} ${plural} de ${cardLabel}`;
}

export function canPlayCombo(selectedCards, tableCombo) {
  if (!isSameValueCombo(selectedCards)) return false;
  if (!tableCombo) return true;
  return selectedCards.length === tableCombo.count && Number(selectedCards[0].power) > Number(tableCombo.power);
}

export function isTableBreakerCombo(combo){
  if(!combo) return false;
  return Number(combo.power) >= getCardPower('2');
}

export function getInvalidPlayReason(selectedCards, tableCombo){
  if(!selectedCards || selectedCards.length === 0) return 'Selecione uma ou mais cartas.';
  if(!isSameValueCombo(selectedCards)) return 'A jogada precisa ter cartas do mesmo valor.';
  if(!tableCombo) return '';
  if(selectedCards.length !== tableCombo.count) return `Você precisa jogar exatamente ${tableCombo.count} carta(s).`;
  if(Number(selectedCards[0].power) <= Number(tableCombo.power)) return 'A carta precisa ser maior que a jogada da mesa.';
  return '';
}

export function getRankName(finishIndex, totalPlayers) {
  if (finishIndex === 0) return 'Majestade';
  if (finishIndex === 1) return 'Regente';
  if (finishIndex === totalPlayers - 1) return 'Aldeão';
  if (finishIndex === totalPlayers - 2 && totalPlayers >= 4) return 'Plebeu';
  return 'Cortesão';
}
