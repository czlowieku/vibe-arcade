export class CodeAssembler {
  constructor(registry) {
    this.registry = registry;
  }

  async assemble(recipe) {
    // recipe: { genre: {cardId, stars}, theme: {cardId, stars}, modifier?: {cardId, stars}, engine?: {cardId, stars} }
    const selectedCards = [];

    if (recipe.genre) {
      selectedCards.push({ cardId: recipe.genre.cardId, stars: recipe.genre.stars, category: 'genre' });
    }
    if (recipe.theme) {
      selectedCards.push({ cardId: recipe.theme.cardId, stars: recipe.theme.stars, category: 'theme' });
    }
    if (recipe.modifier) {
      selectedCards.push({ cardId: recipe.modifier.cardId, stars: recipe.modifier.stars, category: 'modifier' });
    }
    if (recipe.engine) {
      selectedCards.push({ cardId: recipe.engine.cardId, stars: recipe.engine.stars, category: 'engine' });
    }

    // Load and resolve all modules
    const { modules, conflicts } = await this.registry.resolveModules(selectedCards);

    if (conflicts.length > 0) {
      console.warn('Card conflicts detected:', conflicts);
    }

    // Merge code strings
    let mergedCode = '';
    const aiContextParts = [];
    const allDependencies = [];

    for (const mod of modules) {
      if (mod.code) {
        mergedCode += '\n// === ' + mod.cardId.toUpperCase() + ' MODULE ===\n';
        mergedCode += mod.code;
      }
      if (mod.aiContext) {
        aiContextParts.push(`[${mod.cardId}] ${mod.aiContext}`);
      }
      if (mod.dependencies && mod.dependencies.length > 0) {
        allDependencies.push(...mod.dependencies);
      }
    }

    // Pick scaffold: engine overrides genre
    let scaffold = null;
    const engineMod = modules.find(m => m.category === 'engine');
    const genreMod = modules.find(m => m.category === 'genre');

    if (engineMod && engineMod.scaffold) {
      scaffold = engineMod.scaffold;
    } else if (genreMod && genreMod.scaffold) {
      scaffold = genreMod.scaffold;
    }

    // Combine aiContext
    const aiContext = aiContextParts.join('\n\n');

    return {
      mergedCode,
      scaffold,
      aiContext,
      dependencies: [...new Set(allDependencies)], // deduplicate
      conflicts,
    };
  }
}
