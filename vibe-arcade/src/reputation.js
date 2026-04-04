export class Reputation {
  constructor(gameState, saveCallback) {
    this.gameState = gameState;
    this.save = saveCallback;
    if (!this.gameState.machineRatings) {
      this.gameState.machineRatings = Array(6).fill(null);
    }
    if (!this.gameState.totalNpcCoinsEarned) {
      this.gameState.totalNpcCoinsEarned = 0;
    }
  }

  addRating(machineIndex, stars) {
    stars = Math.max(1, Math.min(5, Math.round(stars)));
    if (!this.gameState.machineRatings[machineIndex]) {
      this.gameState.machineRatings[machineIndex] = { totalStars: 0, count: 0 };
    }
    const r = this.gameState.machineRatings[machineIndex];
    r.totalStars += stars;
    r.count += 1;
    this.save();
    return stars;
  }

  getMachineRating(machineIndex) {
    const r = this.gameState.machineRatings?.[machineIndex];
    if (!r || r.count === 0) return 0;
    return r.totalStars / r.count;
  }

  getReputation() {
    let total = 0;
    let count = 0;
    for (const r of this.gameState.machineRatings || []) {
      if (r && r.count > 0) {
        total += r.totalStars / r.count;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  calculateRating(npcStandards, avgCardStars) {
    const baseRating = 2 + Math.random() * 2;
    const cardBonus = (avgCardStars - 1) * 0.5;
    const standardsPenalty = (npcStandards - 0.5) * 1.5;
    return Math.max(1, Math.min(5, Math.round(baseRating + cardBonus - standardsPenalty)));
  }

  calculatePayment(npcGenerosity, rating) {
    const basePay = Math.floor(5 * npcGenerosity);
    let tip = 0;
    if (rating >= 5) {
      tip = 5 + Math.floor(Math.random() * 6);
    } else if (rating >= 4) {
      tip = 2 + Math.floor(Math.random() * 4);
    }
    return basePay + tip;
  }

  getLevel() {
    return Math.floor(this.gameState.totalGamesPlayed / 5) + 1;
  }

  getSpawnInterval() {
    const level = this.getLevel();
    const rep = this.getReputation();
    const baseRate = 0.1;
    const rate = baseRate * (1 + level * 0.15) * (0.5 + rep / 5);
    return rate > 0 ? 1 / rate : 999;
  }

  getMaxNpcs() {
    const level = this.getLevel();
    return Math.min(12, 4 + level);
  }

  hasActiveGames(machines) {
    return machines.some(m => m && m.state === 'ready');
  }
}
