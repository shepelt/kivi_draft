// Camera controller for orthographic camera
// Right-click drag to rotate camera around origin
import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement, renderCallback) {
    this.camera = camera;
    this.domElement = domElement;
    this.renderCallback = renderCallback;

    // Store camera distance from target
    this.radius = this.camera.position.length();

    // Mouse state
    this.isRightDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    // Rotation speed
    this.rotateSpeed = 0.005;

    // Zoom settings
    this.zoomSpeed = 0.1;
    this.minZoom = 0.5;
    this.maxZoom = 20;
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
      if (e.button === 2) { // Right click
        this.isRightDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.domElement.addEventListener('mousemove', (e) => {
      if (this.isRightDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.rotateCamera(deltaX, deltaY);

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.domElement.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightDragging = false;
      }
    });

    this.domElement.addEventListener('mouseleave', () => {
      this.isRightDragging = false;
    });

    // Wheel event for zooming
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY);
    }, { passive: false });
  }

  rotateCamera(deltaX, deltaY) {
    // Use quaternion rotation for smooth, gimbal-lock-free rotation

    // Get camera's current position relative to target
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);

    // Rotate around world Y axis (horizontal rotation)
    const quaternionY = new THREE.Quaternion();
    quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * this.rotateSpeed); // Negative for natural mouse direction
    offset.applyQuaternion(quaternionY);
    this.camera.up.applyQuaternion(quaternionY);

    // Rotate around camera's local right axis (vertical rotation)
    // The right axis is perpendicular to both the view direction and camera up
    const viewDir = offset.clone().normalize();
    const right = new THREE.Vector3().crossVectors(this.camera.up, viewDir).normalize();

    const quaternionX = new THREE.Quaternion();
    quaternionX.setFromAxisAngle(right, -deltaY * this.rotateSpeed); // Negative for natural mouse direction
    offset.applyQuaternion(quaternionX);
    this.camera.up.applyQuaternion(quaternionX);

    // Update camera position
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

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

    // Trigger render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  dispose() {
    // Clean up event listeners if needed
  }
}
