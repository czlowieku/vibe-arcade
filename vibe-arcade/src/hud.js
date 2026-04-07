import { generateCardPack, addCardToInventory, getCardById, PACK_COST, CARDS, ALL_CARDS, getCardPrice, createPlayerCard } from './card-system.js';
import { getApiKey, setApiKey, getGeminiKey, setGeminiKey, getProvider, setProvider, getActiveKey } from './storage.js';

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
    this.zoomedViewEl = document.getElementById('zoomed-view');
    this.reputationEl = document.getElementById('reputation-value');
    this.visitorsEl = document.getElementById('visitors-value');

    this.historyPanel = document.getElementById('history-panel');
    this.reviewsPanel = document.getElementById('reviews-panel');
    this.onKickNpc = null;

    this.onPlayAgain = null;
    this.onBackToArcade = null;
    this.onBack = null;
    this.onNewGame = null;
    this.onModifyGame = null;
    this.onShowReviews = null;

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

    document.getElementById('btn-history').addEventListener('click', () => {
      this.showHistory();
    });
    document.getElementById('btn-close-history').addEventListener('click', () => {
      this.historyPanel.classList.add('hidden');
    });
    document.getElementById('btn-kick-npc').addEventListener('click', () => {
      if (this.onKickNpc) this.onKickNpc();
    });

    document.getElementById('btn-api-key').addEventListener('click', () => {
      document.getElementById('api-key-input').value = getApiKey();
      document.getElementById('gemini-key-input').value = getGeminiKey();
      this._updateProviderToggle(getProvider());
      document.getElementById('api-key-panel').classList.remove('hidden');
    });

    document.getElementById('btn-save-key').addEventListener('click', () => {
      setApiKey(document.getElementById('api-key-input').value.trim());
      setGeminiKey(document.getElementById('gemini-key-input').value.trim());
      document.getElementById('api-key-panel').classList.add('hidden');
      this._updateApiKeyButton();
    });

    document.getElementById('btn-cancel-key').addEventListener('click', () => {
      document.getElementById('api-key-panel').classList.add('hidden');
    });

    // Provider toggle buttons
    document.querySelectorAll('.provider-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        setProvider(provider);
        this._updateProviderToggle(provider);
        this._updateApiKeyButton();
      });
    });

    document.getElementById('btn-reviews').addEventListener('click', () => {
      if (this.onShowReviews) this.onShowReviews();
    });
    document.getElementById('btn-close-reviews').addEventListener('click', () => {
      this.reviewsPanel.classList.add('hidden');
    });

    // Zoomed-view duplicate buttons (right sidebar)
    document.getElementById('btn-collection-z').addEventListener('click', () => {
      this.showCollection();
    });
    document.getElementById('btn-history-z').addEventListener('click', () => {
      this.showHistory();
    });
    document.getElementById('btn-api-key-z').addEventListener('click', () => {
      document.getElementById('api-key-input').value = getApiKey();
      document.getElementById('gemini-key-input').value = getGeminiKey();
      this._updateProviderToggle(getProvider());
      document.getElementById('api-key-panel').classList.remove('hidden');
    });

    this._updateApiKeyButton();
  }

  _updateProviderToggle(provider) {
    document.querySelectorAll('.provider-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.provider === provider);
    });
  }

  _updateApiKeyButton() {
    const provider = getProvider();
    const hasKey = !!getActiveKey();
    const label = provider === 'gemini' ? 'GEMINI' : 'ANTHROPIC';
    const text = hasKey ? `🔑 ${label} ✓` : `🔑 ${label}`;
    document.getElementById('btn-api-key').textContent = text;
    const zBtn = document.getElementById('btn-api-key-z');
    if (zBtn) zBtn.textContent = text;
  }

  showCollection() {
    const ownedIds = new Set(this.gameState.cards.map(c => c.cardId));
    const ownedMap = {};
    for (const c of this.gameState.cards) ownedMap[c.cardId] = c;

    const totalOwned = ownedIds.size;
    const totalCards = ALL_CARDS.length;
    document.getElementById('collection-progress').textContent =
      `${totalOwned} / ${totalCards} cards unlocked — 💰 ${this.gameState.coins}`;

    const sections = { genre: 'collection-section-genre', theme: 'collection-section-theme', modifier: 'collection-section-modifier', engine: 'collection-section-engine' };

    for (const [category, sectionId] of Object.entries(sections)) {
      const grid = document.getElementById(sectionId).querySelector('.collection-grid');
      grid.replaceChildren();

      for (const card of CARDS[category]) {
        const owned = ownedIds.has(card.id);
        const pc = ownedMap[card.id];
        const maxed = owned && pc && pc.stars >= 5;
        const price = getCardPrice(card, owned);
        const canAfford = this.gameState.coins >= price;

        const el = document.createElement('div');
        el.className = `collection-card ${card.category} ${owned ? 'owned' : 'locked'}`;

        if (owned && pc) {
          const stars = document.createElement('div');
          stars.className = 'card-stars';
          stars.textContent = '★'.repeat(pc.stars) + '☆'.repeat(5 - pc.stars);
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
        desc.textContent = card.desc;
        el.appendChild(desc);

        if (!maxed) {
          const btn = document.createElement('button');
          btn.className = 'card-buy-btn';
          btn.textContent = owned ? `⬆ UPGRADE ${price} 💰` : `🔓 UNLOCK ${price} 💰`;
          btn.disabled = !canAfford;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._buyCard(card, owned);
          });
          el.appendChild(btn);
        } else {
          const maxLabel = document.createElement('div');
          maxLabel.className = 'card-maxed';
          maxLabel.textContent = '✓ MAX';
          el.appendChild(maxLabel);
        }

        grid.appendChild(el);
      }
    }

    document.getElementById('collection-panel').classList.remove('hidden');
  }

  _buyCard(card, alreadyOwned) {
    const price = getCardPrice(card, alreadyOwned);
    if (this.gameState.coins < price) return;

    this.gameState.coins -= price;

    if (alreadyOwned) {
      const pc = this.gameState.cards.find(c => c.cardId === card.id);
      if (pc) pc.stars = Math.min(pc.stars + 1, 5);
    } else {
      this.gameState.cards.push(createPlayerCard(card.id));
    }

    this.saveCallback();
    this.updateDisplay();
    this.showCollection(); // refresh
  }

  updateDisplay() {
    this.coinsEl.textContent = this.gameState.coins;
    this.levelEl.textContent = Math.floor(this.gameState.totalGamesPlayed / 5) + 1;

    // Show buy-pack bar only when not in zoomed view
    if (this.zoomedViewEl.classList.contains('hidden')) {
      this.buyPackEl.classList.remove('hidden');
    }
    // Disable/enable buy pack button based on coins
    const buyBtn = document.getElementById('btn-buy-pack');
    buyBtn.disabled = this.gameState.coins < PACK_COST;
  }

  showGameOver(score, coinsEarned) {
    this.finalScoreEl.textContent = score;
    this.coinsEarnedEl.textContent = coinsEarned > 0 ? `+${coinsEarned} 💰` : '';
    this.gameOverPanel.classList.remove('hidden');
    this.updateDisplay();
  }

  hideGameOver() {
    this.gameOverPanel.classList.add('hidden');
  }

  showBackButton() {
    this.zoomedViewEl.classList.remove('hidden');
    this.buyPackEl.classList.add('hidden');
    // Restore action button visibility by default
    document.getElementById('btn-modify-game').classList.remove('hidden');
    document.getElementById('btn-new-game').classList.remove('hidden');
  }

  hideBackButton() {
    this.zoomedViewEl.classList.add('hidden');
    this.buyPackEl.classList.remove('hidden');
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

  showHistory() {
    const container = document.getElementById('history-table-container');
    container.replaceChildren();

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const h of ['Gracz', 'Gra', 'Typ', 'Wynik', 'Ocena', 'Skill', 'Kiedy']) {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const history = (this.gameState.npcHistory || []).slice().reverse();

    for (const entry of history) {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const strong = document.createElement('strong');
      strong.textContent = entry.npcName;
      tdName.appendChild(strong);
      tr.appendChild(tdName);

      const tdGame = document.createElement('td');
      tdGame.textContent = entry.gameTitle;
      tr.appendChild(tdGame);

      const tdType = document.createElement('td');
      tdType.textContent = entry.machineType === 'pinball' ? '🎯' : '🕹️';
      tr.appendChild(tdType);

      const tdScore = document.createElement('td');
      tdScore.textContent = (entry.score || 0).toLocaleString();
      tr.appendChild(tdScore);

      const tdRating = document.createElement('td');
      tdRating.textContent = '⭐'.repeat(Math.min(entry.rating || 0, 5));
      tr.appendChild(tdRating);

      const tdSkill = document.createElement('td');
      tdSkill.textContent = (entry.skill || 5) + '/10';
      tr.appendChild(tdSkill);

      const tdTime = document.createElement('td');
      tdTime.textContent = this._timeAgo(entry.timestamp);
      tr.appendChild(tdTime);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);

    this.historyPanel.classList.remove('hidden');
  }

  _timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'min';
    const hours = Math.floor(minutes / 60);
    return hours + 'h';
  }

  showKickButton() {
    document.getElementById('btn-kick-npc').classList.remove('hidden');
  }

  hideKickButton() {
    document.getElementById('btn-kick-npc').classList.add('hidden');
  }

  showReviewsButton() {
    document.getElementById('btn-reviews').classList.remove('hidden');
  }

  hideReviewsButton() {
    document.getElementById('btn-reviews').classList.add('hidden');
  }

  showMachineReviews(machineIndex, machineTitle) {
    document.getElementById('reviews-machine-title').textContent = machineTitle || 'Machine #' + machineIndex;

    const list = document.getElementById('reviews-list');
    list.replaceChildren();

    const reviews = (this.gameState.npcHistory || [])
      .filter(e => e.machineIndex === machineIndex)
      .reverse();

    if (reviews.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'review-empty';
      empty.textContent = 'Brak recenzji \u2014 poczekaj az NPC zagra!';
      list.appendChild(empty);
    } else {
      for (const r of reviews) {
        const item = document.createElement('div');
        item.className = 'review-item';

        const header = document.createElement('div');
        header.className = 'review-header';

        const name = document.createElement('span');
        name.className = 'review-name';
        name.textContent = r.npcName || 'NPC';
        header.appendChild(name);

        const stars = document.createElement('span');
        stars.className = 'review-stars';
        stars.textContent = '\u2B50'.repeat(Math.min(r.rating || 0, 5));
        header.appendChild(stars);

        item.appendChild(header);

        const details = document.createElement('div');
        details.className = 'review-details';

        const score = document.createElement('span');
        score.className = 'review-score';
        score.textContent = 'Wynik: ' + (r.score || 0).toLocaleString();
        details.appendChild(score);

        const skill = document.createElement('span');
        skill.className = 'review-skill';
        skill.textContent = 'Skill: ' + (r.skill || 5) + '/10';
        details.appendChild(skill);

        const time = document.createElement('span');
        time.textContent = this._timeAgo(r.timestamp);
        details.appendChild(time);

        item.appendChild(details);

        // AI feedback
        if (r.aiFeedback) {
          const feedback = document.createElement('div');
          feedback.className = 'review-feedback';
          feedback.textContent = r.aiFeedback;
          item.appendChild(feedback);
        }

        // AI suggestions
        if (r.aiSuggestions && r.aiSuggestions.length > 0) {
          const sugBox = document.createElement('div');
          sugBox.className = 'review-suggestions';
          const sugTitle = document.createElement('div');
          sugTitle.className = 'review-suggestions-title';
          sugTitle.textContent = '💡 Sugestie:';
          sugBox.appendChild(sugTitle);
          for (const s of r.aiSuggestions) {
            const sug = document.createElement('div');
            sug.className = 'review-suggestion-item';
            sug.textContent = '• ' + s;
            sugBox.appendChild(sug);
          }
          item.appendChild(sugBox);
        }

        list.appendChild(item);
      }
    }

    this.reviewsPanel.classList.remove('hidden');
  }
}
