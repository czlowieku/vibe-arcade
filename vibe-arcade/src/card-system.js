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

    { id: 'golf', name: 'Mini Golf', icon: '⛳', category: 'genre', desc: 'Aim, shoot, hole in one' },
    { id: 'racing', name: 'Racing', icon: '🏎️', category: 'genre', desc: 'Top-down speed race' },
    { id: 'fishing', name: 'Fishing', icon: '🎣', category: 'genre', desc: 'Cast, wait, reel em in' },
  ],
  theme: [
    { id: 'neon', name: 'Neon', icon: '🌈', category: 'theme', desc: 'Glowing neon cyberpunk', moduleId: 'neon' },
    { id: 'space', name: 'Space', icon: '🚀', category: 'theme', desc: 'Deep space adventure', moduleId: 'space' },
    { id: 'retro', name: 'Retro', icon: '👾', category: 'theme', desc: '8-bit pixel style', moduleId: 'retro' },

    { id: 'forest', name: 'Forest', icon: '🌲', category: 'theme', desc: 'Enchanted woodland', moduleId: 'forest' },
    { id: 'horror', name: 'Horror', icon: '👻', category: 'theme', desc: 'Creepy dark spooky vibes' },
    { id: 'candy', name: 'Candy', icon: '🍬', category: 'theme', desc: 'Sweet colorful sugar world' },
    { id: 'samurai', name: 'Samurai', icon: '⛩️', category: 'theme', desc: 'Japanese ink & cherry blossom' },
    { id: 'steampunk', name: 'Steampunk', icon: '⚙️', category: 'theme', desc: 'Gears, brass & steam' },
    { id: 'desert', name: 'Desert', icon: '🏜️', category: 'theme', desc: 'Scorching sand & pyramids' },
    { id: 'arctic', name: 'Arctic', icon: '❄️', category: 'theme', desc: 'Ice, snow & aurora borealis' },
    { id: 'lava', name: 'Volcano', icon: '🌋', category: 'theme', desc: 'Molten lava & fire' },
    { id: 'matrix', name: 'Matrix', icon: '💊', category: 'theme', desc: 'Green code rain, glitch reality' },
  ],
  modifier: [
    { id: 'speed-up', name: 'Speed Up', icon: '⏩', category: 'modifier', desc: 'Gets faster over time', moduleId: 'speed-up' },

    { id: 'time-limit', name: 'Time Limit', icon: '⏱️', category: 'modifier', desc: 'Beat the clock', moduleId: 'time-limit' },
    { id: 'boss', name: 'Boss Fight', icon: '👹', category: 'modifier', desc: 'Epic boss encounter', moduleId: 'boss' },
    { id: 'powerups', name: 'Power-Ups', icon: '⭐', category: 'modifier', desc: 'Creative power-ups for this game', moduleId: 'powerups' },
    { id: 'combo', name: 'Combo Chain', icon: '🔥', category: 'modifier', desc: 'Chain hits for score multiplier' },
    { id: 'survival', name: 'Survival', icon: '💀', category: 'modifier', desc: 'Endless waves, how long can you last?' },

    { id: 'mirror', name: 'Mirror', icon: '🪞', category: 'modifier', desc: 'Controls are reversed!' },
    { id: 'fog-of-war', name: 'Fog of War', icon: '🌫️', category: 'modifier', desc: 'Can only see near player' },
    { id: 'one-hit', name: 'One Hit', icon: '💔', category: 'modifier', desc: 'One hit and youre dead' },
    { id: 'growing', name: 'Growing', icon: '📈', category: 'modifier', desc: 'Player grows bigger over time' },

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
  // All cards unlocked from the start
  return ALL_CARDS.map(c => createPlayerCard(c.id));
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

export const PACK_COST = 100; // legacy

export function getCardPrice(card, owned) {
  if (!owned) {
    // First unlock
    return card.category === 'engine' ? 200 : 50;
  }
  // Star upgrade
  return card.category === 'engine' ? 150 : 75;
}
