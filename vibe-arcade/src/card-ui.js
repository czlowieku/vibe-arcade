import { getCardById, CARDS } from './card-system.js';

export class CardUI {
  constructor(gameState, onGenerate, onCancel) {
    this.gameState = gameState;
    this.onGenerate = onGenerate;
    this.onCancel = onCancel;
    this.selectedRecipe = { genre: null, theme: null, modifier: null };
    this.currentCategory = null;

    this._bindElements();
    this._bindEvents();
  }

  _bindElements() {
    this.createPanel = document.getElementById('create-panel');
    this.cardBar = document.getElementById('card-bar');
    this.cardBarCards = document.getElementById('card-bar-cards');
    this.availableCards = document.getElementById('available-cards');
    this.btnGenerate = document.getElementById('btn-generate');
    this.btnCancel = document.getElementById('btn-cancel');
    this.recipeSlots = document.querySelectorAll('.recipe-slot');
  }

  _bindEvents() {
    this.btnGenerate.addEventListener('click', () => {
      if (this.selectedRecipe.genre && this.selectedRecipe.theme) {
        this.onGenerate(this.selectedRecipe);
        this.hide();
      }
    });

    this.btnCancel.addEventListener('click', () => {
      this.onCancel();
      this.hide();
    });

    this.recipeSlots.forEach(slot => {
      slot.addEventListener('click', () => {
        const category = slot.dataset.category;
        this.currentCategory = category;
        this._renderAvailableCards(category);
      });
    });
  }

  show() {
    this.selectedRecipe = { genre: null, theme: null, modifier: null };
    this.currentCategory = 'genre';
    this._updateSlots();
    this._renderAvailableCards('genre');
    this._updateGenerateButton();
    this.createPanel.classList.remove('hidden');
  }

  hide() {
    this.createPanel.classList.add('hidden');
  }

  _createCardElement(card, pc, size = 'normal') {
    const el = document.createElement('div');
    el.className = `card ${card.category}`;

    if (size === 'small') {
      el.style.width = '60px';
      el.style.height = '80px';
    }

    const stars = document.createElement('div');
    stars.className = 'card-stars';
    if (size === 'small') stars.style.fontSize = '7px';
    stars.textContent = '★'.repeat(pc.stars);

    const icon = document.createElement('div');
    icon.className = 'card-icon';
    if (size === 'small') icon.style.fontSize = '18px';
    icon.textContent = card.icon;

    const name = document.createElement('div');
    name.className = 'card-name';
    if (size === 'small') name.style.fontSize = '8px';
    name.textContent = card.name;

    el.appendChild(stars);
    el.appendChild(icon);
    el.appendChild(name);
    return el;
  }

  _renderAvailableCards(category) {
    this.availableCards.replaceChildren();

    this.recipeSlots.forEach(s => {
      s.style.opacity = s.dataset.category === category ? '1' : '0.5';
    });

    const playerCards = this.gameState.cards.filter(pc => {
      const card = getCardById(pc.cardId);
      return card && card.category === category;
    });

    if (playerCards.length === 0) {
      const msg = document.createElement('div');
      msg.style.cssText = 'color:#666;padding:20px;';
      msg.textContent = `No ${category} cards yet. Buy card packs!`;
      this.availableCards.appendChild(msg);
      return;
    }

    for (const pc of playerCards) {
      const card = getCardById(pc.cardId);
      if (!card) continue;

      const el = this._createCardElement(card, pc);
      if (this.selectedRecipe[category]?.cardId === pc.cardId) {
        el.classList.add('selected');
      }

      el.addEventListener('click', () => {
        this.selectedRecipe[category] = pc;
        this._updateSlots();
        this._renderAvailableCards(category);
        this._updateGenerateButton();

        if (category === 'genre' && !this.selectedRecipe.theme) {
          this.currentCategory = 'theme';
          this._renderAvailableCards('theme');
        } else if (category === 'theme' && !this.selectedRecipe.modifier) {
          this.currentCategory = 'modifier';
          this._renderAvailableCards('modifier');
        }
      });
      this.availableCards.appendChild(el);
    }
  }

  _updateSlots() {
    for (const slot of this.recipeSlots) {
      const category = slot.dataset.category;
      const slotCard = slot.querySelector('.slot-card');
      const pc = this.selectedRecipe[category];

      slotCard.replaceChildren();

      if (pc) {
        const card = getCardById(pc.cardId);
        slotCard.className = `slot-card filled card ${card.category}`;

        const icon = document.createElement('div');
        icon.className = 'card-icon';
        icon.textContent = card.icon;

        const name = document.createElement('div');
        name.className = 'card-name';
        name.textContent = card.name;

        slotCard.appendChild(icon);
        slotCard.appendChild(name);
      } else {
        slotCard.className = 'slot-card empty';
        slotCard.textContent = '?';
      }
    }
  }

  _updateGenerateButton() {
    this.btnGenerate.disabled = !(this.selectedRecipe.genre && this.selectedRecipe.theme);
  }

  showCardBar() {
    this.cardBarCards.replaceChildren();
    for (const pc of this.gameState.cards) {
      const card = getCardById(pc.cardId);
      if (!card) continue;
      const el = this._createCardElement(card, pc, 'small');
      el.draggable = true;
      el.dataset.cardId = pc.cardId;
      el.dataset.stars = pc.stars;
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ cardId: pc.cardId, stars: pc.stars }));
        e.dataTransfer.effectAllowed = 'copy';
        document.body.classList.add('dragging-card');
      });
      el.addEventListener('dragend', () => {
        document.body.classList.remove('dragging-card');
      });
      this.cardBarCards.appendChild(el);
    }
    this.cardBar.classList.remove('hidden');
  }

  hideCardBar() {
    this.cardBar.classList.add('hidden');
  }
}
