// Card definitions
export const CARDS = {
  genre: [
    { id: 'platformer', name: 'Platformer', icon: '🏃', category: 'genre', desc: 'Jump between platforms', moduleId: 'platformer' },
    { id: 'shooter', name: 'Shooter', icon: '🔫', category: 'genre', desc: 'Shoot enemies down', moduleId: 'shooter' },
    { id: 'puzzle', name: 'Puzzle', icon: '🧩', category: 'genre', desc: 'Solve logic challenges', moduleId: 'puzzle' },
    { id: 'runner', name: 'Runner', icon: '💨', category: 'genre', desc: 'Endless running action', moduleId: 'runner' },
    { id: 'dodge', name: 'Dodge', icon: '⚡', category: 'genre', desc: 'Avoid all obstacles', moduleId: 'dodge' },
    { id: 'breakout', name: 'Breakout', icon: '🧱', category: 'genre', desc: 'Smash bricks with a ball' },
    { id: 'snake', name: 'Snake', icon: '🐍', category: 'genre', desc: 'Grow longer, dont crash' },
    { id: 'tower-defense', name: 'Tower Defense', icon: '🏰', category: 'genre', desc: 'Place towers, stop waves' },
    { id: 'fighting', name: 'Fighting', icon: '🥊', category: 'genre', desc: '1v1 beat-em-up combat' },
  ],
  theme: [
    { id: 'neon', name: 'Neon', icon: '🌈', category: 'theme', desc: 'Glowing neon cyberpunk', moduleId: 'neon' },
    { id: 'space', name: 'Space', icon: '🚀', category: 'theme', desc: 'Deep space adventure', moduleId: 'space' },
    { id: 'retro', name: 'Retro', icon: '👾', category: 'theme', desc: '8-bit pixel style', moduleId: 'retro' },
    { id: 'ocean', name: 'Ocean', icon: '🌊', category: 'theme', desc: 'Underwater world', moduleId: 'ocean' },
    { id: 'forest', name: 'Forest', icon: '🌲', category: 'theme', desc: 'Enchanted woodland', moduleId: 'forest' },
    { id: 'horror', name: 'Horror', icon: '👻', category: 'theme', desc: 'Creepy dark spooky vibes' },
    { id: 'candy', name: 'Candy', icon: '🍬', category: 'theme', desc: 'Sweet colorful sugar world' },
    { id: 'samurai', name: 'Samurai', icon: '⛩️', category: 'theme', desc: 'Japanese ink & cherry blossom' },
    { id: 'steampunk', name: 'Steampunk', icon: '⚙️', category: 'theme', desc: 'Gears, brass & steam' },
  ],
  modifier: [
    { id: 'speed-up', name: 'Speed Up', icon: '⏩', category: 'modifier', desc: 'Gets faster over time', moduleId: 'speed-up' },
    { id: 'gravity-flip', name: 'Gravity Flip', icon: '🔄', category: 'modifier', desc: 'Reverse gravity mechanic', moduleId: 'gravity-flip' },
    { id: 'time-limit', name: 'Time Limit', icon: '⏱️', category: 'modifier', desc: 'Beat the clock', moduleId: 'time-limit' },
    { id: 'boss', name: 'Boss Fight', icon: '👹', category: 'modifier', desc: 'Epic boss encounter', moduleId: 'boss' },
    { id: 'powerups', name: 'Power-Ups', icon: '⭐', category: 'modifier', desc: 'Creative power-ups for this game', moduleId: 'powerups' },
    { id: 'combo', name: 'Combo Chain', icon: '🔥', category: 'modifier', desc: 'Chain hits for score multiplier' },
    { id: 'survival', name: 'Survival', icon: '💀', category: 'modifier', desc: 'Endless waves, how long can you last?' },
    { id: 'tiny', name: 'Tiny Mode', icon: '🔬', category: 'modifier', desc: 'Everything is tiny and fast' },
    { id: 'mirror', name: 'Mirror', icon: '🪞', category: 'modifier', desc: 'Controls are reversed!' },
  ],
  engine: [
    { id: 'phaser', name: 'Phaser', icon: '🎮', category: 'engine', desc: 'Full game engine', moduleId: 'phaser' },
    { id: 'pixijs', name: 'PixiJS', icon: '✨', category: 'engine', desc: 'GPU-powered graphics', moduleId: 'pixijs' },
    { id: 'p5js', name: 'p5.js', icon: '🎨', category: 'engine', desc: 'Creative coding', moduleId: 'p5js' },
    { id: 'matterjs', name: 'Matter.js', icon: '⚙️', category: 'engine', desc: 'Physics engine', moduleId: 'matterjs' },
  ],
};

export const ALL_CARDS = [...CARDS.genre, ...CARDS.theme, ...CARDS.modifier, ...CARDS.engine];

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
  // 3 random cards — engine cards have 10% chance each
  const nonEngineCards = ALL_CARDS.filter(c => c.category !== 'engine');
  const pack = [];
  for (let i = 0; i < 3; i++) {
    if (Math.random() < 0.1 && CARDS.engine.length > 0) {
      const card = CARDS.engine[Math.floor(Math.random() * CARDS.engine.length)];
      pack.push(createPlayerCard(card.id));
    } else {
      const card = nonEngineCards[Math.floor(Math.random() * nonEngineCards.length)];
      pack.push(createPlayerCard(card.id));
    }
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
