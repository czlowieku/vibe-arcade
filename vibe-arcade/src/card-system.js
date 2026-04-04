// Card definitions
export const CARDS = {
  genre: [
    { id: 'platformer', name: 'Platformer', icon: '🏃', category: 'genre', desc: 'Jump between platforms' },
    { id: 'shooter', name: 'Shooter', icon: '🔫', category: 'genre', desc: 'Shoot enemies down' },
    { id: 'puzzle', name: 'Puzzle', icon: '🧩', category: 'genre', desc: 'Solve logic challenges' },
    { id: 'runner', name: 'Runner', icon: '💨', category: 'genre', desc: 'Endless running action' },
    { id: 'dodge', name: 'Dodge', icon: '⚡', category: 'genre', desc: 'Avoid all obstacles' },
  ],
  theme: [
    { id: 'neon', name: 'Neon', icon: '🌈', category: 'theme', desc: 'Glowing neon cyberpunk' },
    { id: 'space', name: 'Space', icon: '🚀', category: 'theme', desc: 'Deep space adventure' },
    { id: 'retro', name: 'Retro', icon: '👾', category: 'theme', desc: '8-bit pixel style' },
    { id: 'ocean', name: 'Ocean', icon: '🌊', category: 'theme', desc: 'Underwater world' },
    { id: 'forest', name: 'Forest', icon: '🌲', category: 'theme', desc: 'Enchanted woodland' },
  ],
  modifier: [
    { id: 'speed-up', name: 'Speed Up', icon: '⏩', category: 'modifier', desc: 'Gets faster over time' },
    { id: 'gravity-flip', name: 'Gravity Flip', icon: '🔄', category: 'modifier', desc: 'Reverse gravity mechanic' },
    { id: 'time-limit', name: 'Time Limit', icon: '⏱️', category: 'modifier', desc: 'Beat the clock' },
    { id: 'boss', name: 'Boss Fight', icon: '👹', category: 'modifier', desc: 'Epic boss encounter' },
    { id: 'powerups', name: 'Power-Ups', icon: '⭐', category: 'modifier', desc: 'Collect power boosts' },
  ],
};

export const ALL_CARDS = [...CARDS.genre, ...CARDS.theme, ...CARDS.modifier];

export function getCardById(id) {
  return ALL_CARDS.find(c => c.id === id);
}

// Player card instance (can have stars/upgrades)
export function createPlayerCard(cardId) {
  return { cardId, stars: 1 };
}

export function getStarterPack() {
  // 1 random genre, 1 random theme, 1 random modifier
  const genre = CARDS.genre[Math.floor(Math.random() * CARDS.genre.length)];
  const theme = CARDS.theme[Math.floor(Math.random() * CARDS.theme.length)];
  const modifier = CARDS.modifier[Math.floor(Math.random() * CARDS.modifier.length)];
  return [
    createPlayerCard(genre.id),
    createPlayerCard(theme.id),
    createPlayerCard(modifier.id),
  ];
}

export function generateCardPack() {
  // 3 random cards from all categories
  const pack = [];
  for (let i = 0; i < 3; i++) {
    const card = ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
    pack.push(createPlayerCard(card.id));
  }
  return pack;
}

export function addCardToInventory(cards, newCard) {
  const existing = cards.find(c => c.cardId === newCard.cardId);
  if (existing) {
    existing.stars = Math.min(existing.stars + 1, 5);
    return false; // upgraded
  } else {
    cards.push(newCard);
    return true; // new card
  }
}

export const PACK_COST = 100;
