import { CARD_VALUES, JOKERS, SUITS, getCardPower } from './rules.js';

export function createDeck({ deckCount = 1, includeJokers = false } = {}){
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

export function shuffleDeck(deck){
    const shuffled = [...deck];
    for(let i = shuffled.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
