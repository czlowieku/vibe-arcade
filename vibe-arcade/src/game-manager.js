import { getCardById } from './card-system.js';
import { GameSandbox } from './game-sandbox.js';
import { getActiveKey } from './storage.js';
import { CardModuleRegistry } from './card-module-registry.js';
import { CodeAssembler } from './code-assembler.js';

// Singleton registry and assembler
const registry = new CardModuleRegistry();
const assembler = new CodeAssembler(registry);

export class GameManager {
  constructor(gameState, saveCallback) {
    this.gameState = gameState;
    this.saveCallback = saveCallback;
    this.sandbox = new GameSandbox();
    this.currentMachine = null;
    this.currentScore = 0;
    this.onGameOver = null;
    this.onScoreUpdate = null;
  }

  async generateGame(machine, recipe, extraInstructions = '') {
    const genre = getCardById(recipe.genre.cardId);
    const theme = getCardById(recipe.theme.cardId);
    const modifier = recipe.modifier ? getCardById(recipe.modifier.cardId) : null;
    const engine = recipe.engine ? getCardById(recipe.engine.cardId) : null;

    // Kick NPC if occupying
    if (machine.npcOccupant) {
      const npc = machine.npcOccupant;
      machine.npcOccupant = null;
      if (npc.gameRunner) { npc.gameRunner.stop(); npc.gameRunner = null; }
      npc.state = 'leaving';
      npc.targetMachine = null;
    }
    machine.state = 'generating';
    machine.streamedCode = '';
    this._drawStreamingScreen(machine, '');

    // Assemble code from card modules
    let codeBundle = null;
    let dependencies = [];
    try {
      codeBundle = await assembler.assemble(recipe);
      dependencies = codeBundle.dependencies || [];
      console.log('[assembler] OK — mergedCode:', codeBundle.mergedCode?.length, 'chars, scaffold:', !!codeBundle.scaffold, 'deps:', dependencies.length);
      console.log('[assembler] aiContext:', codeBundle.aiContext?.slice(0, 200));
    } catch (err) {
      console.warn('[assembler] FAILED, falling back to plain generation:', err);
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: genre.id,
          theme: theme.id,
          modifier: modifier?.id || null,
          cardLevels: {
            genre: recipe.genre.stars,
            theme: recipe.theme.stars,
            modifier: recipe.modifier?.stars || 0,
          },
          extraInstructions,
          apiKey: getActiveKey(),
          codeBundle: codeBundle || undefined,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'chunk') {
            machine.streamedCode += data.text;
            this._drawStreamingScreen(machine, machine.streamedCode);
          } else if (data.type === 'done') {
            machine.setGame(data.gameCode, data.title, data.description);
            machine.suggestions = [];
            machine.brokenCount = 0;
            machine._healthStats = null;
            this.gameState.machines[machine.index] = {
              gameCode: data.gameCode,
              title: data.title,
              description: data.description,
              highScore: 0,
              recipe: {
                genre: genre.id,
                theme: theme.id,
                modifier: modifier?.id || null,
                engine: engine?.id || null,
                cardLevels: {
                  genre: recipe.genre.stars,
                  theme: recipe.theme.stars,
                  modifier: recipe.modifier?.stars || 0,
                  engine: recipe.engine?.stars || 0,
                },
              },
              dependencies: dependencies,
              suggestions: [],
              brokenCount: 0,
            };
            this.saveCallback();
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to generate game:', err);
      machine.state = 'empty';
      machine._drawEmptyScreen();

      const ctx = machine.screenCtx;
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#ff4444';
      ctx.font = '28px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('GENERATION FAILED', 400, 270);
      ctx.fillStyle = '#888';
      ctx.font = '16px Courier New';
      ctx.fillText(err.message, 400, 320);
      ctx.fillText('Click to try again', 400, 360);
      machine.screenTexture.needsUpdate = true;

      return false;
    }
  }

  _drawStreamingScreen(machine, code) {
    const ctx = machine.screenCtx;

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, 800, 600);

    // Header
    ctx.fillStyle = '#00fff5';
    ctx.font = 'bold 18px Courier New';
    ctx.textAlign = 'left';
    const dots = '.'.repeat((Math.floor(Date.now() / 400) % 3) + 1);
    ctx.fillText('AI IS CODING' + dots, 20, 30);

    // Code lines — show last ~28 lines
    ctx.font = '13px Courier New';
    const lines = code.split('\n');
    const maxLines = 28;
    const startLine = Math.max(0, lines.length - maxLines);
    const visibleLines = lines.slice(startLine);

    for (let i = 0; i < visibleLines.length; i++) {
      const line = visibleLines[i];
      const y = 55 + i * 19;

      // Simple syntax highlighting
      if (line.match(/^\s*(function|const|let|var|if|else|for|while|return|class)\b/)) {
        ctx.fillStyle = '#ff00ff';
      } else if (line.match(/^\s*\/\//)) {
        ctx.fillStyle = '#666';
      } else if (line.includes('{') || line.includes('}')) {
        ctx.fillStyle = '#ffe600';
      } else {
        ctx.fillStyle = '#00fff5';
      }

      const display = line.length > 60 ? line.substring(0, 60) + '...' : line;
      ctx.fillText(display, 20, y);
    }

    // Infinite pulsing loader bar
    const t = Date.now() / 1000;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(20, 570, 760, 12);
    // Moving glow segment
    const barW = 200;
    const barX = 20 + ((Math.sin(t * 1.5) * 0.5 + 0.5) * (760 - barW));
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, 'rgba(0,255,245,0)');
    grad.addColorStop(0.5, 'rgba(0,255,245,0.8)');
    grad.addColorStop(1, 'rgba(0,255,245,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, 570, barW, 12);

    // Bottom status
    ctx.fillStyle = '#666';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`${lines.length} lines | ${code.length} chars`, 20, 558);

    machine.screenTexture.needsUpdate = true;
  }

  playGame(machine, onScoreUpdate, onGameOver) {
    if (!machine.gameCode) return;

    this.currentMachine = machine;
    this.currentScore = 0;
    this.onScoreUpdate = onScoreUpdate;
    this.onGameOver = onGameOver;
    machine.state = 'playing';
    window.__vibe_player_playing = true;

    // Get dependencies from saved machine data
    const saved = this.gameState.machines[machine.index];
    const deps = saved?.dependencies || [];

    this.sandbox.load(
      machine.gameCode,
      (points) => {
        this.currentScore += points;
        if (this.onScoreUpdate) this.onScoreUpdate(this.currentScore);
      },
      (finalScore) => {
        const score = finalScore || this.currentScore;
        machine.state = 'ready';
        window.__vibe_player_playing = false;

        if (score > machine.highScore) {
          machine.highScore = score;
          if (this.gameState.machines[machine.index]) {
            this.gameState.machines[machine.index].highScore = score;
          }
        }

        this.gameState.totalGamesPlayed++;
        this.saveCallback();

        machine.drawReady();

        if (this.onGameOver) {
          this.onGameOver(score, 0);
        }
      },
      deps
    );
  }

  updateMachineTexture() {
    if (!this.currentMachine || this.currentMachine.state !== 'playing') return;

    const captured = this.sandbox.captureFrame(
      this.currentMachine.screenCanvas,
      this.currentMachine.screenCtx
    );
    if (captured) {
      this.currentMachine.screenTexture.needsUpdate = true;
    }
  }

  forwardInput(type, key, code) {
    this.sandbox.sendInput(type, key, code);
  }

  stopGame() {
    this.sandbox.stop();
    window.__vibe_player_playing = false;
    this.onGameOver = null;
    this.onScoreUpdate = null;
    if (this.currentMachine) {
      this.currentMachine.state = 'ready';
      this.currentMachine.drawReady();
      this.currentMachine = null;
    }
  }
}
