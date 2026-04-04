import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * PinballEngine - A complete 3D pinball physics engine for Vibe Arcade.
 *
 * Table dimensions (Three.js units):
 *   Width: 0.7 (x: -0.3 to 0.3)
 *   Length: 1.4 (z: -0.65 to 0.65, negative=top, positive=drain)
 *   Height: 0.05 (playfield thickness)
 *   Surface at y=0 within the group.
 *   Table tilted 6 degrees (0.105 rad) around X so balls roll toward +Z.
 */
export class PinballEngine {
  constructor(parentGroup, config) {
    this.parentGroup = parentGroup;
    this.config = config;

    // Merge defaults
    this.scoring = Object.assign(
      { bumperBase: 100, rampBonus: 500, comboMultiplier: 2, comboTimeout: 5 },
      config.scoring
    );
    this.visualStyle = Object.assign(
      {
        playfieldColor: '#1a1a2e',
        bumperColor: '#ff4444',
        bumperEmissive: '#ff2222',
        rampColor: '#44aaff',
        wallColor: '#888888',
        glowIntensity: 0.5,
        particleColor: '#ffaa00',
      },
      config.visualStyle
    );
    this.genreRules = Object.assign({}, config.genreRules);
    this.modifierRules = Object.assign({}, config.modifierRules);
    this.layout = config.layout || { bumpers: [], ramps: [], lanes: [], targets: [], walls: [] };

    // State
    this.score = 0;
    this.ballsLeft = this.genreRules.startBalls || config.balls || 3;
    this.gameOver = false;
    this.ballInPlay = false;
    this.launchCharging = false;
    this.launchPower = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;

    // Input state
    this.inputState = { leftFlipper: false, rightFlipper: false, launch: false };

    // Flipper angles
    this.leftFlipperAngle = 0.5;
    this.rightFlipperAngle = -0.5;

    // Collections for cleanup
    this.bumpers = [];
    this.ramps = [];
    this.walls = [];
    this.bodies = [];
    this.meshes = [];
    this.lights = [];
    this.trailMeshes = [];
    this.trailPositions = [];

    // Callbacks
    this.onGameOver = null;

    this._init();
  }

  // ---------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------

  _init() {
    // Create group and tilt the table
    this.group = new THREE.Group();
    this.group.rotation.x = 0.105; // 6-degree tilt
    this.parentGroup.add(this.group);

    this._initPhysics();
    this._createPlayfield();
    this._createWalls();
    this._createBumpers();
    this._createRamps();
    this._createFlippers();
    this._createBall();
    this._createBallTrail();
    this._setupCollisions();
  }

  _initPhysics() {
    const gravMult = this.genreRules.gravityMultiplier || 1;
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -15 * gravMult, 0),
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.fixedTimeStep = 1 / 60;
    this.accumulator = 0;

    // Materials
    this.ballMaterial = new CANNON.Material('ball');
    this.tableMaterial = new CANNON.Material('table');
    this.bumperMaterial = new CANNON.Material('bumper');
    this.flipperMaterial = new CANNON.Material('flipper');

    // Contact materials
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.ballMaterial, this.tableMaterial, {
        friction: 0.3,
        restitution: 0.3,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.ballMaterial, this.bumperMaterial, {
        friction: 0.1,
        restitution: 0.8,
      })
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.ballMaterial, this.flipperMaterial, {
        friction: 0.4,
        restitution: 0.6,
      })
    );
  }

  // ---------------------------------------------------------------
  // Playfield
  // ---------------------------------------------------------------

  _createPlayfield() {
    // Visual playfield
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.visualStyle.playfieldColor;
    ctx.fillRect(0, 0, 256, 512);
    // Add subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const playfieldGeo = new THREE.PlaneGeometry(0.66, 1.36);
    const playfieldMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const playfieldMesh = new THREE.Mesh(playfieldGeo, playfieldMat);
    playfieldMesh.rotation.x = -Math.PI / 2;
    playfieldMesh.position.y = -0.001; // Just below y=0
    this.group.add(playfieldMesh);
    this.meshes.push(playfieldMesh);

    // Physics floor (static plane)
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.tableMaterial,
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(floorBody);
    this.bodies.push(floorBody);
  }

  // ---------------------------------------------------------------
  // Walls
  // ---------------------------------------------------------------

  _createWalls() {
    const wallHeight = 0.04;
    const wallThickness = 0.01;
    const wallColor = this.visualStyle.wallColor;

    // Left wall
    this._addWall(-0.3, wallHeight / 2, 0, wallThickness, wallHeight, 1.36, wallColor);
    // Right wall
    this._addWall(0.3, wallHeight / 2, 0, wallThickness, wallHeight, 1.36, wallColor);
    // Top wall
    this._addWall(0, wallHeight / 2, -0.65, 0.66, wallHeight, wallThickness, wallColor);

    // Launch chute right wall (separates chute from playfield)
    this._addWall(0.25, wallHeight / 2, 0.2, wallThickness, wallHeight, 0.9, wallColor);

    // Config walls (slingshots, etc.)
    if (this.layout.walls) {
      for (const w of this.layout.walls) {
        const wx = w.x || 0;
        const wz = w.z || 0;
        const ww = w.width || 0.1;
        const wl = w.length || 0.01;
        this._addWall(wx, wallHeight / 2, wz, ww, wallHeight, wl, wallColor);
      }
    }
  }

  _addWall(x, y, z, width, height, depth, color) {
    // Visual
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.meshes.push(mesh);

    // Physics
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
      material: this.tableMaterial,
    });
    body.position.set(x, y, z);
    this.world.addBody(body);
    this.bodies.push(body);
    this.walls.push({ mesh, body });
  }

  // ---------------------------------------------------------------
  // Bumpers
  // ---------------------------------------------------------------

  _createBumpers() {
    if (!this.layout.bumpers) return;

    for (const bumperDef of this.layout.bumpers) {
      const radius = bumperDef.radius || 0.03;
      const x = bumperDef.x || 0;
      const z = bumperDef.z || 0;
      const scoreVal = bumperDef.score || this.scoring.bumperBase;

      // Visual cylinder
      const geo = new THREE.CylinderGeometry(radius, radius, 0.04, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: this.visualStyle.bumperColor,
        emissive: this.visualStyle.bumperEmissive,
        emissiveIntensity: this.visualStyle.glowIntensity,
        roughness: 0.3,
        metalness: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.02, z);
      this.group.add(mesh);
      this.meshes.push(mesh);

      // Point light for glow
      const light = new THREE.PointLight(this.visualStyle.bumperEmissive, 0.2, 0.2);
      light.position.set(x, 0.05, z);
      this.group.add(light);
      this.lights.push(light);

      // Physics body
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Sphere(radius),
        material: this.bumperMaterial,
      });
      body.position.set(x, 0.02, z);
      this.world.addBody(body);
      this.bodies.push(body);

      this.bumpers.push({
        mesh,
        body,
        light,
        radius,
        score: scoreVal,
        flashTimer: 0,
        baseEmissiveIntensity: this.visualStyle.glowIntensity,
      });
    }
  }

  // ---------------------------------------------------------------
  // Ramps
  // ---------------------------------------------------------------

  _createRamps() {
    if (!this.layout.ramps) return;

    for (const rampDef of this.layout.ramps) {
      const start = rampDef.start || { x: 0, z: 0 };
      const end = rampDef.end || { x: 0, z: -0.3 };
      const rampHeight = rampDef.height || 0.03;

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      const midX = (start.x + end.x) / 2;
      const midZ = (start.z + end.z) / 2;

      // Incline angle from height
      const incline = Math.atan2(rampHeight, length);

      // Visual
      const geo = new THREE.BoxGeometry(0.04, 0.005, length);
      const mat = new THREE.MeshStandardMaterial({
        color: this.visualStyle.rampColor,
        roughness: 0.4,
        metalness: 0.5,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(midX, rampHeight / 2, midZ);
      mesh.rotation.y = -angle;
      mesh.rotation.x = -incline;
      this.group.add(mesh);
      this.meshes.push(mesh);

      // Physics body
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(0.02, 0.0025, length / 2)),
        material: this.tableMaterial,
      });
      body.position.set(midX, rampHeight / 2, midZ);
      body.quaternion.setFromEuler(-incline, -angle, 0);
      this.world.addBody(body);
      this.bodies.push(body);

      this.ramps.push({
        mesh,
        body,
        start,
        end,
        length,
        rampHeight,
        ballEntered: false,
      });
    }
  }

  // ---------------------------------------------------------------
  // Flippers
  // ---------------------------------------------------------------

  _createFlippers() {
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.15,
      metalness: 0.9,
    });

    // Left flipper
    this.leftFlipper = this._createFlipper(
      { x: -0.12, y: 0.01, z: 0.55 },
      0.5, // rest angle (pointing outward-down)
      chromeMat.clone()
    );

    // Right flipper
    this.rightFlipper = this._createFlipper(
      { x: 0.12, y: 0.01, z: 0.55 },
      -0.5, // rest angle (pointing outward-down, mirrored)
      chromeMat.clone()
    );

    this.leftFlipperAngle = 0.5;
    this.rightFlipperAngle = -0.5;
  }

  _createFlipper(pivot, restAngle, material) {
    // Visual mesh
    const geo = new THREE.BoxGeometry(0.12, 0.01, 0.03);
    const mesh = new THREE.Mesh(geo, material);
    // Offset geometry so it rotates around the pivot end
    geo.translate(restAngle > 0 ? 0.06 : -0.06, 0, 0);
    mesh.position.set(pivot.x, pivot.y, pivot.z);
    mesh.rotation.y = restAngle;
    this.group.add(mesh);
    this.meshes.push(mesh);

    // Physics body (kinematic)
    const halfExtents = new CANNON.Vec3(0.06, 0.005, 0.015);
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(halfExtents),
      material: this.flipperMaterial,
    });
    body.position.set(pivot.x, pivot.y, pivot.z);
    this.world.addBody(body);
    this.bodies.push(body);

    const flipper = {
      mesh,
      body,
      pivot,
      restAngle,
      activeAngle: -restAngle, // flipped
      currentAngle: restAngle,
      isSwingingUp: false,
    };

    return flipper;
  }

  _updateFlipperBody(flipper) {
    const angle = flipper.currentAngle;
    const p = flipper.pivot;
    const offsetX = flipper.restAngle > 0 ? 0.06 : -0.06;

    // Calculate offset center based on rotation
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const cx = p.x + offsetX * cosA;
    const cz = p.z + offsetX * sinA;

    flipper.body.position.set(cx, p.y, cz);
    flipper.body.quaternion.setFromEuler(0, angle, 0);
    flipper.mesh.rotation.y = angle;
  }

  // ---------------------------------------------------------------
  // Ball
  // ---------------------------------------------------------------

  _createBall() {
    const radius = 0.015;

    // Visual
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.1,
      metalness: 0.95,
    });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.ballMesh.position.set(0.28, 0.02, 0.5);
    this.group.add(this.ballMesh);
    this.meshes.push(this.ballMesh);

    // Physics
    this.ballBody = new CANNON.Body({
      mass: 0.1,
      shape: new CANNON.Sphere(radius),
      material: this.ballMaterial,
      linearDamping: 0.1,
      angularDamping: 0.3,
    });
    this.ballBody.position.set(0.28, 0.02, 0.5);
    this.world.addBody(this.ballBody);
    this.bodies.push(this.ballBody);
  }

  _resetBall() {
    this.ballBody.position.set(0.28, 0.02, 0.5);
    this.ballBody.velocity.set(0, 0, 0);
    this.ballBody.angularVelocity.set(0, 0, 0);
    this.ballMesh.position.set(0.28, 0.02, 0.5);
    this.ballInPlay = false;
    this.launchPower = 0;
    this.launchCharging = false;

    // Clear trail
    for (let i = 0; i < this.trailPositions.length; i++) {
      this.trailPositions[i] = null;
    }
  }

  // ---------------------------------------------------------------
  // Ball trail
  // ---------------------------------------------------------------

  _createBallTrail() {
    for (let i = 0; i < 8; i++) {
      const size = 0.008 * (1 - i * 0.1);
      const geo = new THREE.SphereGeometry(size, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: this.visualStyle.particleColor,
        transparent: true,
        opacity: 0.6 * (1 - i / 8),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.trailMeshes.push(mesh);
      this.trailPositions.push(null);
      this.meshes.push(mesh);
    }
    this._trailCounter = 0;
  }

  _updateTrail() {
    this._trailCounter++;
    // Record position every 2 frames
    if (this._trailCounter % 2 === 0 && this.ballInPlay) {
      // Shift positions
      for (let i = this.trailPositions.length - 1; i > 0; i--) {
        this.trailPositions[i] = this.trailPositions[i - 1];
      }
      this.trailPositions[0] = this.ballBody.position.clone();
    }

    // Update trail mesh positions
    for (let i = 0; i < this.trailMeshes.length; i++) {
      const pos = this.trailPositions[i];
      if (pos) {
        this.trailMeshes[i].position.set(pos.x, pos.y, pos.z);
        this.trailMeshes[i].visible = true;
      } else {
        this.trailMeshes[i].visible = false;
      }
    }
  }

  // ---------------------------------------------------------------
  // Collision handling
  // ---------------------------------------------------------------

  _setupCollisions() {
    this.world.addEventListener('beginContact', (event) => {
      const { bodyA, bodyB } = event;
      const ballBody = this.ballBody;

      // Determine which body is the ball
      let otherBody = null;
      if (bodyA === ballBody) otherBody = bodyB;
      else if (bodyB === ballBody) otherBody = bodyA;
      else return; // Not a ball collision

      // Check bumpers
      for (const bumper of this.bumpers) {
        if (otherBody === bumper.body) {
          this._onBumperHit(bumper);
          return;
        }
      }

      // Check flippers - boost ball when flipper is swinging up
      if (otherBody === this.leftFlipper.body && this.leftFlipper.isSwingingUp) {
        this._onFlipperHit();
      } else if (otherBody === this.rightFlipper.body && this.rightFlipper.isSwingingUp) {
        this._onFlipperHit();
      }
    });
  }

  _onBumperHit(bumper) {
    // Apply impulse away from bumper center
    const ballPos = this.ballBody.position;
    const bumperPos = bumper.body.position;
    const dir = new CANNON.Vec3(
      ballPos.x - bumperPos.x,
      0,
      ballPos.z - bumperPos.z
    );
    const dist = dir.length();
    if (dist > 0.001) {
      dir.scale(1 / dist, dir); // normalize
    } else {
      dir.set(0, 0, -1);
    }

    const speed = this.ballBody.velocity.length();
    const impulseMag = Math.max(speed * 1.3, 1.5);
    dir.scale(impulseMag * this.ballBody.mass, dir);
    this.ballBody.applyImpulse(dir);

    // Score
    const scoreMult = this.genreRules.scoreMultiplier || 1;
    this.score += Math.round(bumper.score * this.comboMultiplier * scoreMult);

    // Flash effect
    bumper.flashTimer = 0.3;
    bumper.mesh.material.emissiveIntensity = 2.0;
    bumper.light.intensity = 1.0;
  }

  _onFlipperHit() {
    // Boost ball velocity
    const vel = this.ballBody.velocity;
    vel.scale(1.6, vel);
  }

  // ---------------------------------------------------------------
  // Ramp traversal tracking
  // ---------------------------------------------------------------

  _checkRampTraversal() {
    const bx = this.ballBody.position.x;
    const bz = this.ballBody.position.z;
    const threshold = 0.05;

    for (const ramp of this.ramps) {
      const startDist = Math.sqrt(
        (bx - ramp.start.x) ** 2 + (bz - ramp.start.z) ** 2
      );
      const endDist = Math.sqrt(
        (bx - ramp.end.x) ** 2 + (bz - ramp.end.z) ** 2
      );

      if (!ramp.ballEntered && startDist < threshold) {
        ramp.ballEntered = true;
      }

      if (ramp.ballEntered && endDist < threshold) {
        ramp.ballEntered = false;
        // Award ramp bonus and activate combo
        const scoreMult = this.genreRules.scoreMultiplier || 1;
        this.score += Math.round(this.scoring.rampBonus * this.comboMultiplier * scoreMult);
        this.comboMultiplier = Math.min(
          this.comboMultiplier + this.scoring.comboMultiplier,
          10
        );
        this.comboTimer = this.scoring.comboTimeout;
      }

      // Reset if ball moves far from start without completing
      if (ramp.ballEntered && startDist > ramp.length * 0.8 && endDist > threshold * 2) {
        ramp.ballEntered = false;
      }
    }
  }

  // ---------------------------------------------------------------
  // Drain detection
  // ---------------------------------------------------------------

  _checkDrain() {
    if (!this.ballInPlay) return;
    if (this.ballBody.position.z > 0.65) {
      this.ballsLeft--;

      // Genre rule: randomize layout on ball lost
      if (this.genreRules.onBallLost === 'randomizeLayout') {
        this._shuffleBumpers();
      }

      if (this.ballsLeft > 0) {
        this._resetBall();
      } else {
        this.gameOver = true;
        this.ballInPlay = false;
        if (this.onGameOver) {
          this.onGameOver(this.score);
        }
      }
    }

    // Also reset if ball falls below table (y < -1)
    if (this.ballBody.position.y < -1) {
      if (this.ballsLeft > 0) {
        this._resetBall();
      }
    }
  }

  _shuffleBumpers() {
    for (const bumper of this.bumpers) {
      const newX = -0.2 + Math.random() * 0.4;
      const newZ = -0.5 + Math.random() * 0.7;
      bumper.body.position.set(newX, 0.02, newZ);
      bumper.mesh.position.set(newX, 0.02, newZ);
      bumper.light.position.set(newX, 0.05, newZ);
    }
  }

  // ---------------------------------------------------------------
  // Launch mechanic
  // ---------------------------------------------------------------

  _updateLaunch(dt) {
    if (this.ballInPlay || this.gameOver) return;

    if (this.launchCharging) {
      this.launchPower = Math.min(this.launchPower + dt / 1.5, 1);
    }
  }

  _releaseLaunch() {
    if (this.ballInPlay || this.gameOver) return;
    if (this.launchPower <= 0) return;

    // Apply launch velocity (negative z = toward top of table)
    this.ballBody.velocity.set(0, 0, -10 * this.launchPower);
    this.ballInPlay = true;
    this.launchPower = 0;
    this.launchCharging = false;
  }

  // ---------------------------------------------------------------
  // Flipper animation
  // ---------------------------------------------------------------

  _updateFlippers(dt) {
    // Left flipper
    const leftTarget = this.inputState.leftFlipper ? -0.5 : 0.5;
    const leftSpeed = this.inputState.leftFlipper ? 12 : 8;
    this.leftFlipper.isSwingingUp = this.inputState.leftFlipper && this.leftFlipperAngle > leftTarget;
    const leftDiff = leftTarget - this.leftFlipperAngle;
    const leftStep = Math.sign(leftDiff) * Math.min(Math.abs(leftDiff), leftSpeed * dt);
    this.leftFlipperAngle += leftStep;
    this.leftFlipper.currentAngle = this.leftFlipperAngle;
    this._updateFlipperBody(this.leftFlipper);

    // Right flipper
    const rightTarget = this.inputState.rightFlipper ? 0.5 : -0.5;
    const rightSpeed = this.inputState.rightFlipper ? 12 : 8;
    this.rightFlipper.isSwingingUp = this.inputState.rightFlipper && this.rightFlipperAngle < rightTarget;
    const rightDiff = rightTarget - this.rightFlipperAngle;
    const rightStep = Math.sign(rightDiff) * Math.min(Math.abs(rightDiff), rightSpeed * dt);
    this.rightFlipperAngle += rightStep;
    this.rightFlipper.currentAngle = this.rightFlipperAngle;
    this._updateFlipperBody(this.rightFlipper);
  }

  // ---------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------

  _updateEffects(dt) {
    // Bumper flash decay
    for (const bumper of this.bumpers) {
      if (bumper.flashTimer > 0) {
        bumper.flashTimer -= dt;
        const t = Math.max(bumper.flashTimer / 0.3, 0);
        bumper.mesh.material.emissiveIntensity =
          bumper.baseEmissiveIntensity + (2.0 - bumper.baseEmissiveIntensity) * t;
        bumper.light.intensity = 0.2 + 0.8 * t;
      }
    }

    // Combo timer decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboMultiplier = 1;
        this.comboTimer = 0;
      }
    }
  }

  // ---------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------

  update(dt) {
    if (!this.world) return;
    if (this.gameOver) return;

    // Clamp dt to avoid spiral of death
    const clampedDt = Math.min(dt, 0.05);

    // Launch charging
    this._updateLaunch(clampedDt);

    // Step physics with fixed timestep
    this.accumulator += clampedDt;
    while (this.accumulator >= this.fixedTimeStep) {
      this._updateFlippers(this.fixedTimeStep);
      this.world.step(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
    }

    // Sync ball mesh from physics body
    this.ballMesh.position.copy(this.ballBody.position);
    this.ballMesh.quaternion.copy(this.ballBody.quaternion);

    // Check drain
    this._checkDrain();

    // Check ramp traversal
    this._checkRampTraversal();

    // Update visual effects
    this._updateEffects(clampedDt);

    // Update trail
    this._updateTrail();

    // Keep ball from going out of bounds on X
    if (this.ballBody.position.x < -0.3) {
      this.ballBody.position.x = -0.29;
      this.ballBody.velocity.x = Math.abs(this.ballBody.velocity.x) * 0.5;
    }
    if (this.ballBody.position.x > 0.32) {
      this.ballBody.position.x = 0.31;
      this.ballBody.velocity.x = -Math.abs(this.ballBody.velocity.x) * 0.5;
    }
  }

  // ---------------------------------------------------------------
  // Input handling
  // ---------------------------------------------------------------

  handleInput(key, isDown) {
    switch (key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.inputState.leftFlipper = isDown;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.inputState.rightFlipper = isDown;
        break;
      case ' ':
        if (isDown) {
          if (!this.ballInPlay && !this.gameOver) {
            this.launchCharging = true;
          }
        } else {
          if (this.launchCharging) {
            this._releaseLaunch();
          }
        }
        break;
    }
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  getScore() {
    return this.score;
  }

  isGameOver() {
    return this.gameOver;
  }

  getBallsLeft() {
    return this.ballsLeft;
  }

  getLaunchPower() {
    return this.launchPower;
  }

  getComboMultiplier() {
    return this.comboMultiplier;
  }

  // ---------------------------------------------------------------
  // Dispose / cleanup
  // ---------------------------------------------------------------

  dispose() {
    // Remove all meshes and dispose geometry/materials
    this.group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });

    // Remove lights
    for (const light of this.lights) {
      this.group.remove(light);
    }

    // Remove group from parent
    if (this.parentGroup) {
      this.parentGroup.remove(this.group);
    }

    // Clear physics world
    for (const body of this.bodies) {
      this.world.removeBody(body);
    }

    this.world = null;
    this.bumpers = [];
    this.ramps = [];
    this.walls = [];
    this.bodies = [];
    this.meshes = [];
    this.lights = [];
    this.trailMeshes = [];
    this.trailPositions = [];
    this.ballBody = null;
    this.ballMesh = null;
    this.leftFlipper = null;
    this.rightFlipper = null;
  }
}
