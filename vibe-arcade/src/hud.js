import { generateCardPack, addCardToInventory, getCardById, PACK_COST, CARDS, ALL_CARDS } from './card-system.js';

export class HUD {
  constructor(gameState, saveCallback) {
    this.gameState = gameState;
    this.saveCallback = saveCallback;

    this.coinsEl = document.getElementById('coins-value');
    this.levelEl = document.getElementById('level-value');
    this.gameOverPanel = document.getElementById('game-over');
    this.finalScoreEl = document.getElementById('final-score');
    this.coinsEarnedEl = document.getElementById('coins-earned');
    this.cardPackPanel = document.getElementById('card-pack');
    this.packCardsEl = document.getElementById('pack-cards');
    this.buyPackEl = document.getElementById('buy-pack');
    this.backButtonEl = document.getElementById('back-button');
    this.reputationEl = document.getElementById('reputation-value');
    this.visitorsEl = document.getElementById('visitors-value');

    this.onPlayAgain = null;
    this.onBackToArcade = null;
    this.onBack = null;
    this.onNewGame = null;
    this.onModifyGame = null;

    this._bindEvents();
    this.updateDisplay();
  }

  _bindEvents() {
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.hideGameOver();
      if (this.onPlayAgain) this.onPlayAgain();
    });

    document.getElementById('btn-back-arcade').addEventListener('click', () => {
      this.hideGameOver();
      if (this.onBackToArcade) this.onBackToArcade();
    });

    document.getElementById('btn-buy-pack').addEventListener('click', () => {
      this.buyPack();
    });

    document.getElementById('btn-close-pack').addEventListener('click', () => {
      this.cardPackPanel.classList.add('hidden');
    });

    document.getElementById('btn-back').addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    document.getElementById('btn-new-game').addEventListener('click', () => {
      if (this.onNewGame) this.onNewGame();
    });

    document.getElementById('btn-modify-game').addEventListener('click', () => {
      if (this.onModifyGame) this.onModifyGame();
    });

    document.getElementById('btn-collection').addEventListener('click', () => {
      this.showCollection();
    });

    document.getElementById('btn-close-collection').addEventListener('click', () => {
      document.getElementById('collection-panel').classList.add('hidden');
    });
  }

  showCollection() {
    const ownedIds = new Set(this.gameState.cards.map(c => c.cardId));
    const ownedMap = {};
    for (const c of this.gameState.cards) ownedMap[c.cardId] = c;

    const totalOwned = ownedIds.size;
    const totalCards = ALL_CARDS.length;
    document.getElementById('collection-progress').textContent =
      `${totalOwned} / ${totalCards} cards unlocked (${Math.round(totalOwned / totalCards * 100)}%)`;

    const sections = { genre: 'collection-section-genre', theme: 'collection-section-theme', modifier: 'collection-section-modifier' };

    for (const [category, sectionId] of Object.entries(sections)) {
      const grid = document.getElementById(sectionId).querySelector('.collection-grid');
      grid.replaceChildren();

      for (const card of CARDS[category]) {
        const owned = ownedIds.has(card.id);
        const pc = ownedMap[card.id];

        const el = document.createElement('div');
        el.className = `collection-card ${card.category} ${owned ? 'owned' : 'locked'}`;

        if (owned && pc) {
          const stars = document.createElement('div');
          stars.className = 'card-stars';
          stars.textContent = '★'.repeat(pc.stars);
          el.appendChild(stars);
        }

        const icon = document.createElement('div');
        icon.className = 'card-icon';
        icon.textContent = card.icon;
        el.appendChild(icon);

        const name = document.createElement('div');
        name.className = 'card-name';
        name.textContent = card.name;
        el.appendChild(name);

        const desc = document.createElement('div');
        desc.className = 'card-desc';
        desc.textContent = owned ? card.desc : '';
        el.appendChild(desc);

        if (!owned) {
          const lock = document.createElement('div');
          lock.className = 'locked-label';
          lock.textContent = '🔒 Locked';
          el.appendChild(lock);
        }

        grid.appendChild(el);
      }
    }

    document.getElementById('collection-panel').classList.remove('hidden');
  }

  updateDisplay() {
    this.coinsEl.textContent = this.gameState.coins;
    this.levelEl.textContent = Math.floor(this.gameState.totalGamesPlayed / 5) + 1;

    // Show/hide buy pack button
    if (this.gameState.coins >= PACK_COST) {
      this.buyPackEl.classList.remove('hidden');
    } else {
      this.buyPackEl.classList.add('hidden');
    }
  }

  showGameOver(score, coinsEarned) {
    this.finalScoreEl.textContent = score;
    this.coinsEarnedEl.textContent = `+${coinsEarned} 💰`;
    this.gameOverPanel.classList.remove('hidden');
    this.updateDisplay();
  }

  hideGameOver() {
    this.gameOverPanel.classList.add('hidden');
  }

  showBackButton() {
    this.backButtonEl.classList.remove('hidden');
  }

  hideBackButton() {
    this.backButtonEl.classList.add('hidden');
  }

  updateNpcDisplay(reputation, visitorCount) {
    if (this.reputationEl) {
      this.reputationEl.textContent = reputation > 0 ? reputation.toFixed(1) : '-';
    }
    if (this.visitorsEl) {
      this.visitorsEl.textContent = visitorCount;
    }
  }

  buyPack() {
    if (this.gameState.coins < PACK_COST) return;

    this.gameState.coins -= PACK_COST;
    const pack = generateCardPack();

    // Add cards to inventory
    for (const card of pack) {
      addCardToInventory(this.gameState.cards, card);
    }
    this.saveCallback();

    // Show pack reveal
    this._showPackReveal(pack);
    this.updateDisplay();
  }

  _showPackReveal(pack) {
    this.packCardsEl.replaceChildren();

    for (const pc of pack) {
      const card = getCardById(pc.cardId);
      if (!card) continue;

      const el = document.createElement('div');
      el.className = `card ${card.category}`;

      const stars = document.createElement('div');
      stars.className = 'card-stars';
      stars.textContent = '★'.repeat(pc.stars);

      const icon = document.createElement('div');
      icon.className = 'card-icon';
      icon.textContent = card.icon;

      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = card.name;

      el.appendChild(stars);
      el.appendChild(icon);
      el.appendChild(name);
      this.packCardsEl.appendChild(el);
    }

    this.cardPackPanel.classList.remove('hidden');
  }
}
