export default {
  code: `
// === Matter.js helper utilities ===

function matterCreateWorld(W, H, gravity) {
  const engine = Matter.Engine.create();
  engine.gravity.y = gravity !== undefined ? gravity : 1;
  const world = engine.world;
  return { engine, world };
}

function matterAddWalls(world, W, H, thickness) {
  const t = thickness || 20;
  const walls = [
    Matter.Bodies.rectangle(W/2, H + t/2, W + t*2, t, { isStatic: true }), // bottom
    Matter.Bodies.rectangle(W/2, -t/2, W + t*2, t, { isStatic: true }),     // top
    Matter.Bodies.rectangle(-t/2, H/2, t, H, { isStatic: true }),           // left
    Matter.Bodies.rectangle(W + t/2, H/2, t, H, { isStatic: true }),        // right
  ];
  Matter.Composite.add(world, walls);
  return walls;
}

function matterCreateBox(world, x, y, w, h, options) {
  const body = Matter.Bodies.rectangle(x, y, w, h, options || {});
  Matter.Composite.add(world, body);
  return body;
}

function matterCreateCircle(world, x, y, radius, options) {
  const body = Matter.Bodies.circle(x, y, radius, options || {});
  Matter.Composite.add(world, body);
  return body;
}

function matterCreatePlatform(world, x, y, w, h) {
  return matterCreateBox(world, x, y, w, h || 16, { isStatic: true, friction: 0.5 });
}

function matterApplyForce(body, fx, fy) {
  Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
}

function matterSetVelocity(body, vx, vy) {
  Matter.Body.setVelocity(body, { x: vx, y: vy });
}

function matterDrawBody(ctx, body, color) {
  const vertices = body.vertices;
  ctx.fillStyle = color || '#00fff5';
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.fill();
}

function matterDrawCircleBody(ctx, body, radius, color) {
  ctx.fillStyle = color || '#00fff5';
  ctx.beginPath();
  ctx.arc(body.position.x, body.position.y, radius, 0, Math.PI * 2);
  ctx.fill();
  // Direction line
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(body.position.x, body.position.y);
  ctx.lineTo(
    body.position.x + Math.cos(body.angle) * radius,
    body.position.y + Math.sin(body.angle) * radius
  );
  ctx.stroke();
}

function matterOnCollision(engine, callback) {
  Matter.Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      callback(pair.bodyA, pair.bodyB);
    }
  });
}

function matterRemoveBody(world, body) {
  Matter.Composite.remove(world, body);
}

function matterCreateConstraint(world, bodyA, bodyB, options) {
  const constraint = Matter.Constraint.create(Object.assign({
    bodyA, bodyB,
    stiffness: 0.5
  }, options || {}));
  Matter.Composite.add(world, constraint);
  return constraint;
}

function matterDrawConstraint(ctx, constraint, color) {
  const posA = constraint.bodyA ? constraint.bodyA.position : constraint.pointA;
  const posB = constraint.bodyB ? constraint.bodyB.position : constraint.pointB;
  ctx.strokeStyle = color || '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(posA.x, posA.y);
  ctx.lineTo(posB.x, posB.y);
  ctx.stroke();
}
`,
  scaffold: `
function startGame(canvas, onScore, onGameOver) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let score = 0;

  // Create physics world
  const { engine, world } = matterCreateWorld(W, H, 1);
  const walls = matterAddWalls(world, W, H, 20);

  // Player ball
  const player = matterCreateCircle(world, W/2, H - 100, 15, {
    restitution: 0.5, friction: 0.1, density: 0.01
  });
  const playerRadius = 15;

  // Platforms
  const platforms = [];
  for (let i = 0; i < 6; i++) {
    const px = 100 + Math.random() * (W - 200);
    const py = 100 + i * 80;
    platforms.push(matterCreatePlatform(world, px, py, 100 + Math.random() * 60, 12));
  }

  // === INPUT ===
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      matterApplyForce(player, 0, -0.005);
    }
  });
  window.addEventListener('keyup', e => keys[e.code] = false);

  // Collision scoring
  matterOnCollision(engine, (a, b) => {
    if ((a === player || b === player) && platforms.includes(a === player ? b : a)) {
      score += 5;
      onScore(5);
    }
  });

  let running = true;
  function gameLoop() {
    if (!running) return;

    // === UPDATE ===
    if (keys['ArrowLeft'] || keys['KeyA']) matterApplyForce(player, -0.002, 0);
    if (keys['ArrowRight'] || keys['KeyD']) matterApplyForce(player, 0.002, 0);

    Matter.Engine.update(engine, 1000/60);

    // Fall off screen
    if (player.position.y > H + 100) {
      running = false;
      onGameOver(score);
      return;
    }

    // === RENDER ===
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Draw platforms
    for (const p of platforms) {
      matterDrawBody(ctx, p, '#4a4a6a');
    }

    // Draw walls (bottom only visible)
    matterDrawBody(ctx, walls[0], '#3a3a5a');

    // Draw player
    matterDrawCircleBody(ctx, player, playerRadius, '#00fff5');

    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE: ' + score, 15, 30);

    requestAnimationFrame(gameLoop);
  }
  gameLoop();
}
`,
  tierCode: {
    3: `
// === Physics chain/rope ===
function matterCreateRope(world, x, y, segments, segLength, options) {
  const bodies = [];
  const constraints = [];
  let prevBody = null;
  for (let i = 0; i < segments; i++) {
    const body = Matter.Bodies.circle(x, y + i * segLength, 4, Object.assign({
      density: 0.005, friction: 0.05
    }, options || {}));
    Matter.Composite.add(world, body);
    bodies.push(body);
    if (prevBody) {
      const c = Matter.Constraint.create({
        bodyA: prevBody, bodyB: body,
        length: segLength, stiffness: 0.8
      });
      Matter.Composite.add(world, c);
      constraints.push(c);
    }
    prevBody = body;
  }
  return { bodies, constraints };
}
`,
    5: `
// === Breakable physics objects ===
class BreakableBody {
  constructor(world, x, y, w, h, breakForce) {
    this.world = world;
    this.body = matterCreateBox(world, x, y, w, h, { label: 'breakable' });
    this.breakForce = breakForce || 5;
    this.broken = false;
    this.pieces = [];
    this.w = w; this.h = h;
  }
  checkBreak(impactSpeed) {
    if (this.broken || impactSpeed < this.breakForce) return false;
    this.broken = true;
    const pos = this.body.position;
    matterRemoveBody(this.world, this.body);
    // Create pieces
    for (let i = 0; i < 4; i++) {
      const px = pos.x + (Math.random() - 0.5) * this.w;
      const py = pos.y + (Math.random() - 0.5) * this.h;
      const piece = matterCreateBox(this.world, px, py, this.w/3, this.h/3, {
        friction: 0.3, restitution: 0.4
      });
      matterApplyForce(piece, (Math.random() - 0.5) * 0.01, -Math.random() * 0.01);
      this.pieces.push(piece);
    }
    return true;
  }
  draw(ctx, color) {
    if (!this.broken) {
      matterDrawBody(ctx, this.body, color || '#8866aa');
    } else {
      for (const p of this.pieces) matterDrawBody(ctx, p, '#665588');
    }
  }
}
`
  },
  aiContext: 'Matter.js helper utilities. matterCreateWorld sets up Engine and World. matterAddWalls creates boundary walls. matterCreateBox/Circle/Platform for physics bodies. matterApplyForce/SetVelocity for movement. matterDrawBody/CircleBody for rendering. matterOnCollision registers collision callbacks. The scaffold creates a physics world with player ball and platforms.',
  provides: ['matterCreateWorld', 'matterAddWalls', 'matterCreateBox', 'matterCreateCircle', 'matterCreatePlatform', 'matterApplyForce', 'matterSetVelocity', 'matterDrawBody', 'matterDrawCircleBody', 'matterOnCollision', 'matterRemoveBody', 'matterCreateConstraint', 'matterDrawConstraint'],
  requires: [],
  conflicts: ['phaser', 'pixijs', 'p5js'],
  dependencies: ['https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js']
};
