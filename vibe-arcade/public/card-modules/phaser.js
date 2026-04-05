export default {
  code: `
// === Phaser 3 helper utilities ===
// These helpers simplify common Phaser patterns

function phaserPreloadSprite(scene, key, w, h, color) {
  // Create a colored rectangle as a texture
  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  gfx.fillStyle(color || 0x00fff5, 1);
  gfx.fillRect(0, 0, w || 32, h || 32);
  gfx.generateTexture(key, w || 32, h || 32);
  gfx.destroy();
}

function phaserCreatePlayer(scene, x, y, key, config) {
  const cfg = config || {};
  const player = scene.physics.add.sprite(x, y, key);
  player.setCollideWorldBounds(true);
  if (cfg.bounce) player.setBounce(cfg.bounce);
  if (cfg.gravity) player.setGravityY(cfg.gravity);
  player.setScale(cfg.scale || 1);
  return player;
}

function phaserCreateGroup(scene, config) {
  return scene.physics.add.group(config || {});
}

function phaserCreatePlatforms(scene, key, positions) {
  const platforms = scene.physics.add.staticGroup();
  for (const pos of positions) {
    platforms.create(pos.x, pos.y, key).setScale(pos.sx || 1, pos.sy || 1).refreshBody();
  }
  return platforms;
}

function phaserSetupCursor(scene) {
  return scene.input.keyboard.createCursorKeys();
}

function phaserAddText(scene, x, y, text, style) {
  const defaultStyle = { fontSize: '20px', fontFamily: 'Courier New', color: '#ffffff' };
  return scene.add.text(x, y, text, Object.assign(defaultStyle, style || {}));
}

function phaserTimedEvent(scene, delay, callback, repeat) {
  return scene.time.addEvent({
    delay: delay,
    callback: callback,
    callbackScope: scene,
    repeat: repeat || 0
  });
}

function phaserParticleEmitter(scene, x, y, key, config) {
  const cfg = config || {};
  return scene.add.particles(x, y, key, {
    speed: cfg.speed || { min: 50, max: 150 },
    scale: cfg.scale || { start: 0.5, end: 0 },
    lifespan: cfg.lifespan || 500,
    quantity: cfg.quantity || 5,
    frequency: cfg.frequency || 100,
    blendMode: cfg.blendMode || 'ADD',
    emitting: cfg.emitting !== undefined ? cfg.emitting : true
  });
}

function phaserCreateAnimation(scene, key, spriteKey, frames, frameRate, repeat) {
  scene.anims.create({
    key: key,
    frames: scene.anims.generateFrameNumbers(spriteKey, frames),
    frameRate: frameRate || 10,
    repeat: repeat !== undefined ? repeat : -1
  });
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const W = canvas.width, H = canvas.height;
  let score = 0;

  const config = {
    type: Phaser.CANVAS,
    canvas: canvas,
    width: W,
    height: H,
    backgroundColor: '#0a0a1a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 300 },
        debug: false
      }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };

  let player, cursors, platforms, scoreText;

  function preload() {
    phaserPreloadSprite(this, 'player', 30, 40, 0x00fff5);
    phaserPreloadSprite(this, 'platform', 120, 16, 0x4a4a6a);
    phaserPreloadSprite(this, 'ground', W, 20, 0x3a3a5a);
  }

  function create() {
    // Platforms
    platforms = phaserCreatePlatforms(this, 'ground', [
      { x: W/2, y: H - 10 }
    ]);
    for (let i = 0; i < 6; i++) {
      platforms.create(
        100 + Math.random() * (W - 200),
        100 + Math.random() * (H - 200),
        'platform'
      );
    }

    // Player
    player = phaserCreatePlayer(this, 100, H - 80, 'player', { bounce: 0.2 });
    this.physics.add.collider(player, platforms);

    // Input
    cursors = phaserSetupCursor(this);

    // Score
    scoreText = phaserAddText(this, 15, 10, 'SCORE: 0');

    // Scoring timer
    phaserTimedEvent(this, 1000, () => {
      score += 1;
      onScore(1);
      scoreText.setText('SCORE: ' + score);
    }, -1);
  }

  function update() {
    if (cursors.left.isDown) player.setVelocityX(-200);
    else if (cursors.right.isDown) player.setVelocityX(200);
    else player.setVelocityX(0);

    if (cursors.up.isDown && player.body.touching.down) {
      player.setVelocityY(-400);
    }

    if (player.y > H + 50) {
      this.scene.pause();
      onGameOver(score);
    }
  }

  const game = new Phaser.Game(config);
}
`,
  tierCode: {
    3: `
// === Phaser scene management helper ===
function phaserCreateSceneManager() {
  return {
    currentScene: null,
    transition(game, fromKey, toKey, data) {
      game.scene.start(toKey, data);
      game.scene.stop(fromKey);
      this.currentScene = toKey;
    }
  };
}
`,
    5: `
// === Phaser advanced camera ===
function phaserSetupCamera(scene, player, worldW, worldH) {
  scene.cameras.main.setBounds(0, 0, worldW, worldH);
  scene.physics.world.setBounds(0, 0, worldW, worldH);
  scene.cameras.main.startFollow(player, true, 0.08, 0.08);
  scene.cameras.main.setZoom(1);
  return scene.cameras.main;
}
`
  },
  aiContext: 'Phaser 3 helper utilities for rapid game creation. phaserPreloadSprite generates colored rectangle textures. phaserCreatePlayer sets up a physics sprite. phaserCreatePlatforms makes static platform groups. The scaffold creates a Phaser.Game with arcade physics targeting the provided canvas. Use Phaser API for everything.',
  provides: ['phaserPreloadSprite', 'phaserCreatePlayer', 'phaserCreateGroup', 'phaserCreatePlatforms', 'phaserSetupCursor', 'phaserAddText', 'phaserTimedEvent', 'phaserParticleEmitter', 'phaserCreateAnimation'],
  requires: [],
  conflicts: ['pixijs', 'p5js', 'matterjs'],
  dependencies: ['https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js']
};
