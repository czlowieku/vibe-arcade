import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'iso'; // 'iso' or 'zoom'
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3(0, 0, 0);
    this.lerpSpeed = 0.12;
    this.isTransitioning = false;
    this.zoomedMachine = null;

    // Overview camera — centered on the room, looking down at an angle
    this.isoPosition = new THREE.Vector3(0, 12, 8);
    this.isoLookAt = new THREE.Vector3(0, 0, -3);

    // Free-look state (orbit around lookAt point)
    this.orbitAngleX = 0; // horizontal angle offset
    this.orbitAngleY = 0; // vertical angle offset
    this.orbitDistance = 0; // computed from isoPosition
    this.zoomLevel = 1.0; // 1.0 = default, smaller = closer
    this.minZoom = 0.4;
    this.maxZoom = 1.6;
    this.panOffset = new THREE.Vector3(0, 0, 0);

    // Drag state
    this._isDragging = false;
    this._isPanning = false;
    this._lastMouse = { x: 0, y: 0 };
    this._dragSensitivity = 0.005;
    this._panSensitivity = 0.02;

    // Compute initial orbit params from iso position
    const diff = new THREE.Vector3().subVectors(this.isoPosition, this.isoLookAt);
    this.orbitDistance = diff.length();
    this.orbitAngleX = Math.atan2(diff.x, diff.z);
    this.orbitAngleY = Math.asin(diff.y / this.orbitDistance);

    this.camera.position.copy(this.isoPosition);
    this.camera.lookAt(this.isoLookAt);
    this.currentLookAt.copy(this.isoLookAt);

    this._setupControls();
  }

  _setupControls() {
    const canvas = document.getElementById('arcade-canvas');

    // Mouse drag to orbit
    canvas.addEventListener('mousedown', (e) => {
      if (this.mode !== 'iso') return;
      if (e.button === 0) {
        // Left click — only start drag if held for a moment (to not conflict with machine clicks)
        this._potentialDrag = true;
        this._dragStartPos = { x: e.clientX, y: e.clientY };
      } else if (e.button === 1 || e.button === 2) {
        // Middle or right click — pan
        e.preventDefault();
        this._isPanning = true;
        this._lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.mode !== 'iso') return;

      // Check if left-click drag started (threshold to distinguish from click)
      if (this._potentialDrag && !this._isDragging) {
        const dx = e.clientX - this._dragStartPos.x;
        const dy = e.clientY - this._dragStartPos.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          this._isDragging = true;
          this._lastMouse = { x: e.clientX, y: e.clientY };
        }
        return;
      }

      if (this._isDragging) {
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;
        this.orbitAngleX -= dx * this._dragSensitivity;
        this.orbitAngleY += dy * this._dragSensitivity;
        // Clamp vertical angle
        this.orbitAngleY = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, this.orbitAngleY));
        this._lastMouse = { x: e.clientX, y: e.clientY };
        this._updateOrbitPosition();
      }

      if (this._isPanning) {
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;
        // Pan relative to camera orientation
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        this.camera.getWorldDirection(right);
        right.cross(up).normalize();
        this.panOffset.add(right.multiplyScalar(-dx * this._panSensitivity));
        this.panOffset.y += dy * this._panSensitivity;
        // Clamp pan
        this.panOffset.x = Math.max(-6, Math.min(6, this.panOffset.x));
        this.panOffset.y = Math.max(-2, Math.min(4, this.panOffset.y));
        this.panOffset.z = Math.max(-6, Math.min(6, this.panOffset.z));
        this._lastMouse = { x: e.clientX, y: e.clientY };
        this._updateOrbitPosition();
      }
    });

    window.addEventListener('mouseup', (e) => {
      this._isDragging = false;
      this._isPanning = false;
      this._potentialDrag = false;
    });

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Scroll to zoom
    canvas.addEventListener('wheel', (e) => {
      if (this.mode !== 'iso') return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.08 : -0.08;
      this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));
      this._updateOrbitPosition();
    }, { passive: false });

    // Touch support
    let lastTouchDist = 0;
    let lastTouch = { x: 0, y: 0 };

    canvas.addEventListener('touchstart', (e) => {
      if (this.mode !== 'iso') return;
      if (e.touches.length === 1) {
        this._potentialDrag = true;
        this._dragStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        // Pinch zoom
        this._isDragging = false;
        this._potentialDrag = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (this.mode !== 'iso') return;
      e.preventDefault();

      if (e.touches.length === 1) {
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;

        if (this._potentialDrag && !this._isDragging) {
          const dx = tx - this._dragStartPos.x;
          const dy = ty - this._dragStartPos.y;
          if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            this._isDragging = true;
          }
          return;
        }

        if (this._isDragging) {
          const dx = tx - lastTouch.x;
          const dy = ty - lastTouch.y;
          this.orbitAngleX -= dx * this._dragSensitivity;
          this.orbitAngleY += dy * this._dragSensitivity;
          this.orbitAngleY = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, this.orbitAngleY));
          this._updateOrbitPosition();
        }
        lastTouch = { x: tx, y: ty };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist > 0) {
          const pinchDelta = (lastTouchDist - dist) * 0.005;
          this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + pinchDelta));
          this._updateOrbitPosition();
        }
        lastTouchDist = dist;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this._isDragging = false;
      this._potentialDrag = false;
      lastTouchDist = 0;
    });
  }

  _updateOrbitPosition() {
    const dist = this.orbitDistance * this.zoomLevel;
    const lookAt = new THREE.Vector3().copy(this.isoLookAt).add(this.panOffset);

    const x = lookAt.x + dist * Math.sin(this.orbitAngleX) * Math.cos(this.orbitAngleY);
    const y = lookAt.y + dist * Math.sin(this.orbitAngleY);
    const z = lookAt.z + dist * Math.cos(this.orbitAngleX) * Math.cos(this.orbitAngleY);

    this.camera.position.set(x, y, z);
    this.currentLookAt.copy(lookAt);
    this.camera.lookAt(lookAt);
  }

  zoomTo(machine) {
    if (this.isTransitioning) return;
    this.mode = 'zoom';
    this.zoomedMachine = machine;
    this.isTransitioning = true;

    // Position camera in front of the target
    const targetPos = new THREE.Vector3();
    if (machine.screenMesh) {
      // Arcade machine — look at screen
      machine.screenMesh.getWorldPosition(targetPos);
    } else {
      // Pinball table or other — look at group center, slightly above
      machine.group.getWorldPosition(targetPos);
      targetPos.y += 1.0;
    }

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(machine.group.quaternion);
    this.targetPosition.copy(targetPos).add(forward.multiplyScalar(2.5));
    this.targetPosition.y = targetPos.y;
    this.targetLookAt.copy(targetPos);
  }

  zoomOut() {
    if (this.mode === 'iso' && !this.isTransitioning) return; // already there
    this.mode = 'iso';
    this.zoomedMachine = null;
    this.isTransitioning = true;

    // Return to current orbit position (not resetting orbit/pan)
    this._updateOrbitPosition();
    this.targetPosition.copy(this.camera.position);
    this.targetLookAt.copy(this.currentLookAt);

    // Actually set target to orbit position
    const dist = this.orbitDistance * this.zoomLevel;
    const lookAt = new THREE.Vector3().copy(this.isoLookAt).add(this.panOffset);
    this.targetPosition.set(
      lookAt.x + dist * Math.sin(this.orbitAngleX) * Math.cos(this.orbitAngleY),
      lookAt.y + dist * Math.sin(this.orbitAngleY),
      lookAt.z + dist * Math.cos(this.orbitAngleX) * Math.cos(this.orbitAngleY)
    );
    this.targetLookAt.copy(lookAt);
  }

  update() {
    if (!this.isTransitioning) return;

    const target = this.targetPosition;
    const lookTarget = this.targetLookAt;

    this.camera.position.lerp(target, this.lerpSpeed);
    this.currentLookAt.lerp(lookTarget, this.lerpSpeed);
    this.camera.lookAt(this.currentLookAt);

    const dist = this.camera.position.distanceTo(target);
    if (dist < 0.01) {
      this.camera.position.copy(target);
      this.currentLookAt.copy(lookTarget);
      this.camera.lookAt(this.currentLookAt);
      this.isTransitioning = false;
    }
  }

  isZoomed() {
    return this.mode === 'zoom' && !this.isTransitioning;
  }

  isIso() {
    return this.mode === 'iso' && !this.isTransitioning;
  }

  /** Returns true if user is currently dragging the camera */
  isDragging() {
    return this._isDragging || this._isPanning;
  }
}
