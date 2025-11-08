// KIVI Draft - Box Test
// Simple test with orthographic camera and a box primitive

import * as THREE from 'three';
import { logger } from './logger.js';
import { DebugInterface } from './debug.js';
import { ViewCube } from './view-cube.js';
import { CameraController } from './camera-controller.js';
import { ObjectsBrowser } from './objects-browser.js';
import { coordinateSystem } from './coordinate-system.js';

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xf0f0f0); // Light gray background
document.body.appendChild(renderer.domElement);

// Create scene
const scene = new THREE.Scene();

// Create orthographic camera
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 5;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  1000
);

// Position camera for orthographic view
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// Add a box primitive
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x4a90e2,
  roughness: 0.5,
  metalness: 0.1
});
const box = new THREE.Mesh(geometry, material);
scene.add(box);

// Add grid helper for reference
const gridHelper = new THREE.GridHelper(10, 10);
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// Add custom axes helper with external coordinate system colors
// Create a group to hold all three axes
const axes = new THREE.Group();
axes.name = 'axes';

// X axis (Red) - pointing right
const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(2, 0, 0)
]);
const xAxisMaterial = new THREE.LineBasicMaterial({ color: coordinateSystem.getAxisColor('X') });
const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
axes.add(xAxis);

// Y axis (internal Z) - pointing forward, shows as External Y (Green)
const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 2)
]);
const yAxisMaterial = new THREE.LineBasicMaterial({ color: coordinateSystem.getAxisColor('Y') });
const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
axes.add(yAxis);

// Z axis (internal Y) - pointing up, shows as External Z (Blue)
const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 2, 0)
]);
const zAxisMaterial = new THREE.LineBasicMaterial({ color: coordinateSystem.getAxisColor('Z') });
const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
axes.add(zAxis);

scene.add(axes);

// Handle window resize
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = frustumSize * aspect / -2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create view cube
const viewCube = new ViewCube(camera, scene);

// Render function (static by default, no animation)
function render() {
  renderer.clear();
  renderer.render(scene, camera);
  viewCube.render(renderer, window.innerWidth, window.innerHeight);
}

// Create camera controller
const cameraController = new CameraController(camera, renderer.domElement, render);

// Initial render
render();

// Initialize debug interface
const debugInterface = new DebugInterface();

// Create objects browser (but don't pass KIVI yet, we'll set it after)
let objectsBrowser;

// Global KIVI object to expose all scene objects and utilities
window.KIVI = {
  version: '0.0.1',
  scene,
  camera,
  renderer,
  logger,
  debug: debugInterface,
  THREE,
  render, // Expose render function for manual updates

  // Object registry - all named objects in the scene
  objects: {
    box,
    axes,
    grid: gridHelper
  },

  // System objects (helpers, camera, etc.)
  system: {
    camera,
    viewCube,
    cameraController,
    objectsBrowser: null  // Will be set below
  },

  // Helper methods
  getStats() {
    return {
      scene: {
        objects: scene.children.length,
        children: scene.children.map(obj => obj.type)
      },
      renderer: {
        size: { width: renderer.domElement.width, height: renderer.domElement.height },
        clearColor: renderer.getClearColor().getHex()
      },
      camera: {
        type: camera.type,
        position: camera.position,
        rotation: camera.rotation
      },
      objects: Object.keys(this.objects),
      system: Object.keys(this.system)
    };
  },

  // Log current state
  logState() {
    const stats = this.getStats();
    logger.info('KIVI state', stats);
    console.log('Current state:', stats);
    return stats;
  },

  // List all objects
  listObjects() {
    return Object.keys(this.objects);
  },

  // Get object by name
  getObject(name) {
    return this.objects[name];
  },

  // Add object to registry
  addObject(name, object) {
    this.objects[name] = object;
    scene.add(object);
    logger.info('Object added', { name, type: object.type });
    render(); // Re-render after adding
    if (this.system.objectsBrowser) {
      this.system.objectsBrowser.update();
    }
    return object;
  },

  // Remove object from registry
  removeObject(name) {
    const object = this.objects[name];
    if (object) {
      scene.remove(object);
      delete this.objects[name];
      logger.info('Object removed', { name });
      render(); // Re-render after removing
      if (this.system.objectsBrowser) {
        this.system.objectsBrowser.update();
      }
    }
    return object;
  }
};

// Initialize objects browser now that KIVI exists
objectsBrowser = new ObjectsBrowser(window.KIVI);
window.KIVI.system.objectsBrowser = objectsBrowser;

// Keep KIVI_DRAFT for backward compatibility
window.KIVI_DRAFT = window.KIVI;

logger.info('KIVI Draft initialized', {
  renderer: {
    size: { width: window.innerWidth, height: window.innerHeight },
    clearColor: 0xf0f0f0
  },
  camera: {
    type: 'OrthographicCamera',
    position: { x: 5, y: 5, z: 5 },
    frustumSize
  },
  scene: {
    objects: scene.children.length
  }
});

console.log('KIVI Draft - Box test initialized');
console.log('Global object available: window.KIVI');
console.log('Objects registry: KIVI.objects =', Object.keys(window.KIVI.objects));
