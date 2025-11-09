// Camera controller for orthographic camera
// Right-click drag to rotate camera around origin
import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement, renderCallback, grid = null) {
    this.camera = camera;
    this.domElement = domElement;
    this.renderCallback = renderCallback;
    this.grid = grid;
    this.enabled = true; // Can be disabled to prevent camera control
    this.rotationEnabled = true; // Can disable rotation separately

    // Store camera distance from target
    this.radius = this.camera.position.length();

    // Throttle grid updates
    this.lastGridUpdate = 0;
    this.gridUpdateInterval = 100; // ms

    // Mouse state
    this.isRightDragging = false;
    this.isMiddleDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    // Rotation speed
    this.rotateSpeed = 0.005;

    // Pan speed
    this.panSpeed = 0.0015; // 1.5x faster

    // Zoom settings
    this.zoomSpeed = 0.1;
    this.minZoom = 0.001;  // Very close (millimeter scale)
    this.maxZoom = 10000;  // Very far (kilometer scale)
    this.currentZoom = 5; // Initial frustum size

    // Target point (what camera looks at)
    this.target = new THREE.Vector3(0, 0, 0);

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Prevent context menu
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 2) { // Right click
        if (this.rotationEnabled) {
          this.isRightDragging = true;
          this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
      } else if (e.button === 1) { // Middle click
        this.isMiddleDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        e.preventDefault(); // Prevent browser scroll behavior
      }
    });

    this.domElement.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.isRightDragging && this.rotationEnabled) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.rotateCamera(deltaX, deltaY);

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      } else if (this.isMiddleDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.panCamera(deltaX, deltaY);

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.domElement.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightDragging = false;
      } else if (e.button === 1) {
        this.isMiddleDragging = false;
      }
    });

    this.domElement.addEventListener('mouseleave', () => {
      this.isRightDragging = false;
      this.isMiddleDragging = false;
    });

    // Wheel event for zooming
    this.domElement.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.zoom(e.deltaY);
    }, { passive: false });
  }

  rotateCamera(deltaX, deltaY) {
    // Get camera's current position relative to target
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);

    // Get the current up axis (use actual up, but we'll check if it should snap)
    const currentUp = this.camera.up.clone().normalize();
    const upAxis = this.snapToCardinal(currentUp);

    // Check if we're close enough to a cardinal to use it for rotation axis
    const isCloseToCardinal = currentUp.dot(upAxis) > 0.99; // Within ~8 degrees

    // HORIZONTAL ROTATION (left-right mouse movement)
    if (Math.abs(deltaX) > 0.00001) {
      // Use snapped axis if close, otherwise use current up
      const rotationAxis = isCloseToCardinal ? upAxis : currentUp;

      const quaternionHorizontal = new THREE.Quaternion();
      quaternionHorizontal.setFromAxisAngle(rotationAxis, -deltaX * this.rotateSpeed);

      // Apply horizontal rotation to offset
      offset.applyQuaternion(quaternionHorizontal);

      // Don't modify up vector during horizontal rotation
    }

    // VERTICAL ROTATION (up-down mouse movement)
    if (Math.abs(deltaY) > 0.00001) {
      // Calculate the right vector
      const viewDir = offset.clone().normalize();
      const rotationAxis = isCloseToCardinal ? upAxis : currentUp;
      const right = new THREE.Vector3().crossVectors(rotationAxis, viewDir);

      // Check for gimbal lock (when view direction is parallel to up axis)
      if (right.length() > 0.001) {
        right.normalize();

        // Check angle between view direction and up axis to prevent flipping over pole
        const angleToUp = Math.acos(Math.max(-1, Math.min(1, Math.abs(viewDir.dot(rotationAxis)))));
        const minAngle = 0.1; // Minimum 0.1 radians (~5.7 degrees) from pole
        const desiredRotation = -deltaY * this.rotateSpeed;

        // Calculate how much rotation is safe
        let safeRotation = desiredRotation;
        if (angleToUp < minAngle && desiredRotation * viewDir.dot(rotationAxis) < 0) {
          // Moving toward pole - limit rotation
          safeRotation = 0;
        } else if (angleToUp - Math.abs(desiredRotation) < minAngle) {
          // Would cross too close to pole - clamp rotation
          safeRotation = Math.sign(desiredRotation) * (angleToUp - minAngle);
        }

        if (Math.abs(safeRotation) > 0.00001) {
          const quaternionVertical = new THREE.Quaternion();
          quaternionVertical.setFromAxisAngle(right, safeRotation);

          // Apply vertical rotation to offset
          offset.applyQuaternion(quaternionVertical);

          // Apply vertical rotation to the up vector
          this.camera.up.applyQuaternion(quaternionVertical);
          this.camera.up.normalize();
        }
      }
    }

    // Update camera position
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    // Update grid labels based on new camera position (throttled)
    const now = Date.now();
    if (this.grid && this.grid.createGrid && (now - this.lastGridUpdate) > this.gridUpdateInterval) {
      this.grid.createGrid();
      this.lastGridUpdate = now;
    }

    // Trigger render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  snapToCardinal(vector) {
    // Snap a vector to the nearest cardinal direction (+/-X, +/-Y, +/-Z)
    // But only if it's already close (within ~20 degrees)
    const threshold = 0.94; // cos(~20 degrees)

    const absX = Math.abs(vector.x);
    const absY = Math.abs(vector.y);
    const absZ = Math.abs(vector.z);

    // Find the dominant component
    const maxComponent = Math.max(absX, absY, absZ);

    // Check if the dominant component is strong enough to snap
    if (maxComponent > threshold) {
      if (absX === maxComponent) {
        return new THREE.Vector3(vector.x > 0 ? 1 : -1, 0, 0);
      } else if (absY === maxComponent) {
        return new THREE.Vector3(0, vector.y > 0 ? 1 : -1, 0);
      } else {
        return new THREE.Vector3(0, 0, vector.z > 0 ? 1 : -1);
      }
    }

    // Not close to any cardinal direction - return normalized original
    return vector.clone().normalize();
  }

  panCamera(deltaX, deltaY) {
    // Pan the camera and target together
    // We need to move in camera's local space (right and up directions)

    // Get camera's right vector (perpendicular to view direction and up)
    const viewDir = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
    const right = new THREE.Vector3().crossVectors(viewDir, this.camera.up).normalize();
    const up = this.camera.up.clone().normalize();

    // Scale pan speed by current zoom level (larger frustum = faster pan)
    const scaledPanSpeed = this.panSpeed * this.currentZoom;

    // Calculate pan offset
    const panOffset = new THREE.Vector3();
    panOffset.add(right.multiplyScalar(-deltaX * scaledPanSpeed)); // Negative for natural direction
    panOffset.add(up.multiplyScalar(deltaY * scaledPanSpeed));

    // Move both camera and target
    this.camera.position.add(panOffset);
    this.target.add(panOffset);

    // Trigger render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  zoom(deltaY) {
    // Adjust zoom level based on scroll direction
    // deltaY > 0 = scroll down = zoom in
    // deltaY < 0 = scroll up = zoom out
    const zoomFactor = deltaY > 0 ? 1 - this.zoomSpeed : 1 + this.zoomSpeed;
    this.currentZoom *= zoomFactor;

    // Clamp zoom
    this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom));

    // Update camera frustum
    const aspect = this.camera.right / this.camera.top; // Calculate current aspect ratio
    this.camera.left = this.currentZoom * aspect / -2;
    this.camera.right = this.currentZoom * aspect / 2;
    this.camera.top = this.currentZoom / 2;
    this.camera.bottom = this.currentZoom / -2;
    this.camera.updateProjectionMatrix();

    // Update grid spacing if grid is available
    if (this.grid && this.grid.updateZoom) {
      this.grid.updateZoom(this.currentZoom);
    }

    // Trigger render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  dispose() {
    // Clean up event listeners if needed
  }
}
