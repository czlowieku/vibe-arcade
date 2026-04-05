export class CardModuleRegistry {
  constructor() {
    this.cache = new Map();
  }

  async loadModule(cardId) {
    if (this.cache.has(cardId)) return this.cache.get(cardId);
    try {
      const mod = await import(`/card-modules/${cardId}.js`);
      this.cache.set(cardId, mod.default);
      return mod.default;
    } catch (err) {
      console.warn(`Failed to load card module: ${cardId}`, err);
      return null;
    }
  }

  async resolveModules(selectedCards) {
    // selectedCards: array of { cardId, stars, category }
    const results = [];
    const allConflicts = [];

    for (const card of selectedCards) {
      const mod = await this.loadModule(card.cardId);
      if (!mod) continue;

      // Build resolved code: base + applicable tierCode
      let resolvedCode = mod.code || '';
      if (mod.tierCode) {
        // Apply all tierCode up to and including the card's star level
        for (const [tier, code] of Object.entries(mod.tierCode)) {
          if (card.stars >= parseInt(tier)) {
            resolvedCode += '\n' + code;
          }
        }
      }

      results.push({
        cardId: card.cardId,
        category: card.category,
        stars: card.stars,
        code: resolvedCode,
        scaffold: mod.scaffold || null,
        aiContext: mod.aiContext || '',
        provides: mod.provides || [],
        requires: mod.requires || [],
        conflicts: mod.conflicts || [],
        dependencies: mod.dependencies || [],
      });

      // Collect conflicts
      if (mod.conflicts && mod.conflicts.length > 0) {
        allConflicts.push({ cardId: card.cardId, conflicts: mod.conflicts });
      }
    }

    // Check for conflicts between selected cards
    const detectedConflicts = [];
    for (const entry of allConflicts) {
      for (const other of results) {
        if (other.cardId !== entry.cardId && entry.conflicts.includes(other.cardId)) {
          detectedConflicts.push(`${entry.cardId} conflicts with ${other.cardId}`);
        }
      }
    }

    return { modules: results, conflicts: detectedConflicts };
  }
}
