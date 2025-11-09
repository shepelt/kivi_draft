// Sketch Editor - 2D sketch creation on XY plane
// Uses in-memory Sketch representation with vertices and edges

import * as THREE from 'three';
import { Sketch } from './sketch.js';
import { Plane } from './plane.js';

export class SketchEditor {
  constructor(kivi) {
    this.kivi = kivi;
    this.activeSketch = null;
    this.isEditing = false;
    this.editorWindow = null;
    this.savedCameraState = null;
    this.cameraAnimationFrame = null; // Track ongoing animation
    this.savedBodiesVisibility = null; // Store bodies visibility state
  }

  createSketch(name = null, plane = null) {
    // Generate unique name if not provided
    if (!name) {
      name = this.generateSketchName();
    }

    // Create plane based on camera orientation if not provided
    let sketchPlane;
    if (plane) {
      sketchPlane = plane;
    } else {
      // Get camera's looking direction (view direction)
      const cameraDirection = new THREE.Vector3();
      this.kivi.camera.getWorldDirection(cameraDirection);

      // The sketch plane should be perpendicular to camera direction
      // So the plane's normal is the camera's view direction
      const planeNormal = cameraDirection.clone().negate(); // Negate so normal points toward camera

      // Create plane at origin with normal and camera-aligned basis vectors
      sketchPlane = Plane.fromCameraView(
        planeNormal,
        this.kivi.camera.up.clone(),
        new THREE.Vector3(0, 0, 0)
      );

      console.log('Created plane from camera view');
      console.log('Camera direction:', cameraDirection);
      console.log('Plane normal:', planeNormal);
      console.log('Camera up:', this.kivi.camera.up);
    }

    // Create an empty sketch using Sketch class with plane
    const sketchData = new Sketch(sketchPlane);

    // Create THREE.js container for visualization
    const sketchContainer = new THREE.Group();
    sketchContainer.name = name;

    // Store sketch data in userData
    sketchContainer.userData.kivi = {
      type: 'sketch',
      sketchData: sketchData // Store the Sketch instance
    };

    // Add to sketches folder
    this.kivi.objects.sketches.add(sketchContainer);

    // Update objects browser
    this.kivi.system.objectsBrowser.update();
    this.kivi.render();

    console.log('Created sketch:', name);

    // Open sketch editor for the new sketch
    this.openSketchEditor(sketchContainer);

    return sketchContainer;
  }

  openSketchEditor(sketch) {
    if (this.isEditing) {
      console.warn('Already editing a sketch');
      return;
    }

    this.activeSketch = sketch;
    this.isEditing = true;

    // Make sure sketch is visible
    this.activeSketch.visible = true;

    // Update visualization (in case sketch has existing data)
    this.updateSketchVisualization();

    // Save current camera state
    this.saveCameraState();

    // Save and hide bodies
    this.saveBodiesVisibility();
    this.hideBodies();

    // Disable camera rotation, but keep zoom and pan enabled
    if (this.kivi.system.cameraController) {
      this.kivi.system.cameraController.rotationEnabled = false;
      // Keep zoom and pan enabled (don't disable the whole controller)
    }

    // Animate camera to sketch plane
    this.moveCameraToSketchPlane();

    // Create sketch editor window
    this.createEditorWindow();
  }

  saveCameraState() {
    // Also update the camera controller's radius to current distance
    if (this.kivi.system.cameraController) {
      this.kivi.system.cameraController.radius = this.kivi.camera.position.length();
    }

    this.savedCameraState = {
      position: this.kivi.camera.position.clone(),
      rotation: this.kivi.camera.quaternion.clone(),
      up: this.kivi.camera.up.clone(),
      zoom: this.kivi.camera.zoom
    };
  }

  restoreCameraState() {
    if (!this.savedCameraState) return;

    // Restore camera controller's radius after animation completes
    const originalRadius = this.savedCameraState.position.length();

    this.animateCamera(
      this.savedCameraState.position,
      this.savedCameraState.rotation,
      500, // 500ms animation
      () => {
        // Callback when animation completes
        if (this.kivi.system.cameraController) {
          this.kivi.system.cameraController.radius = originalRadius;
        }
      },
      this.savedCameraState.up // Restore up vector
    );
  }

  moveCameraToSketchPlane() {
    if (!this.activeSketch) return;

    const sketchData = this.activeSketch.userData.kivi.sketchData;
    if (!sketchData || !sketchData.plane) return;

    const plane = sketchData.plane;
    const distance = 20; // Distance from plane

    // Position camera along the plane's normal
    const targetPosition = plane.origin.clone().addScaledVector(plane.normal, distance);

    // For XY plane view (looking down Z axis), up should point in +Y direction
    const targetUp = new THREE.Vector3(0, 1, 0);

    // Calculate target rotation by looking at the plane origin with correct up vector
    const tempCamera = new THREE.OrthographicCamera();
    tempCamera.up.copy(targetUp);
    tempCamera.position.copy(targetPosition);
    tempCamera.lookAt(plane.origin);
    tempCamera.updateMatrix();
    const targetRotation = tempCamera.quaternion.clone();

    this.animateCamera(targetPosition, targetRotation, 500, null, targetUp);
  }

  animateCamera(targetPosition, targetRotation, duration, onComplete = null, targetUp = null) {
    // Cancel any ongoing animation
    if (this.cameraAnimationFrame) {
      cancelAnimationFrame(this.cameraAnimationFrame);
    }

    const startPosition = this.kivi.camera.position.clone();
    const startRotation = this.kivi.camera.quaternion.clone();
    const startUp = this.kivi.camera.up.clone();
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease in-out
      const t = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      // Interpolate position
      this.kivi.camera.position.lerpVectors(startPosition, targetPosition, t);

      // Interpolate rotation
      this.kivi.camera.quaternion.slerpQuaternions(startRotation, targetRotation, t);

      // Interpolate up vector if provided
      if (targetUp) {
        this.kivi.camera.up.lerpVectors(startUp, targetUp, t).normalize();
      }

      this.kivi.camera.updateProjectionMatrix();
      this.kivi.render();

      if (progress < 1) {
        this.cameraAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.cameraAnimationFrame = null;
        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    };

    this.cameraAnimationFrame = requestAnimationFrame(animate);
  }

  createEditorWindow() {
    // Create sketch editor window UI
    this.editorWindow = document.createElement('div');
    this.editorWindow.className = 'panel sketch-editor';

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'panel-title';
    titleBar.textContent = 'Sketch Editor';

    // Content
    const content = document.createElement('div');
    content.className = 'panel-content';

    // Sketch name
    const sketchName = document.createElement('div');
    sketchName.className = 'text-base text-secondary mb-md';
    sketchName.textContent = `Editing: ${this.activeSketch.name}`;
    content.appendChild(sketchName);

    // Tools section
    const toolsSection = document.createElement('div');
    toolsSection.className = 'mb-md';

    const toolsLabel = document.createElement('div');
    toolsLabel.className = 'sketch-editor-label';
    toolsLabel.textContent = 'Tools';
    toolsSection.appendChild(toolsLabel);

    // Draw Box button
    const drawBoxButton = document.createElement('button');
    drawBoxButton.className = 'btn btn-primary btn-full-width mb-sm';
    drawBoxButton.textContent = 'Draw Box';
    drawBoxButton.addEventListener('click', () => {
      this.drawBox();
    });
    toolsSection.appendChild(drawBoxButton);

    content.appendChild(toolsSection);

    // Instructions
    const instructions = document.createElement('div');
    instructions.className = 'sketch-editor-instructions mb-md';
    instructions.innerHTML = `
      <div>Use tools above to draw shapes.</div>
      <div>Pan/zoom available while editing.</div>
    `;
    content.appendChild(instructions);

    // Close Sketch button at bottom
    const closeSketchButton = document.createElement('button');
    closeSketchButton.className = 'btn btn-secondary btn-full-width';
    closeSketchButton.textContent = 'Close Sketch';
    closeSketchButton.style.fontWeight = '500';
    closeSketchButton.addEventListener('click', () => {
      this.closeSketchEditor();
    });
    content.appendChild(closeSketchButton);

    this.editorWindow.appendChild(titleBar);
    this.editorWindow.appendChild(content);
    document.body.appendChild(this.editorWindow);
  }

  drawBox() {
    if (!this.activeSketch) return;

    // Get sketch data
    const sketchData = this.activeSketch.userData.kivi.sketchData;
    if (!sketchData) return;

    // Default box size: 4x4mm, centered at origin (better matches default zoom level)
    const width = 4;
    const height = 4;

    // Add box to sketch (creates 4 vertices + 4 edges)
    sketchData.addBox(0, 0, width, height);

    // Update visualization
    this.updateSketchVisualization();

    console.log('Drew box:', width, 'x', height);
    console.log('Vertices:', sketchData.vertices.length);
    console.log('Edges:', sketchData.edges.length);
  }

  updateSketchVisualization() {
    if (!this.activeSketch) return;

    const sketchData = this.activeSketch.userData.kivi.sketchData;
    if (!sketchData) return;

    // Clear existing visualization
    while (this.activeSketch.children.length > 0) {
      this.activeSketch.remove(this.activeSketch.children[0]);
    }

    // Generate new visualization from sketch data
    const visualization = sketchData.toGeometry();
    this.activeSketch.add(visualization);

    // Update objects browser and render
    this.kivi.system.objectsBrowser.update();
    this.kivi.render();
  }

  createRectangleGeometry(width, height) {
    // Create a simple rectangle outline on XZ plane (Y=0)
    const points = [];
    points.push(new THREE.Vector3(-width/2, 0, -height/2));
    points.push(new THREE.Vector3(width/2, 0, -height/2));
    points.push(new THREE.Vector3(width/2, 0, height/2));
    points.push(new THREE.Vector3(-width/2, 0, height/2));
    points.push(new THREE.Vector3(-width/2, 0, -height/2)); // Close the rectangle

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00bcd4, // Cyan for sketches (distinguishable from axis blue)
      linewidth: 2,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1000; // Render on top

    return line;
  }

  saveBodiesVisibility() {
    // Save visibility state of all bodies
    const bodiesFolder = this.kivi.objects.bodies;
    if (!bodiesFolder) return;

    this.savedBodiesVisibility = new Map();

    // Save folder visibility
    this.savedBodiesVisibility.set('_folder', bodiesFolder.visible);

    // Save each child's visibility
    bodiesFolder.children.forEach(child => {
      this.savedBodiesVisibility.set(child.uuid, child.visible);
    });
  }

  hideBodies() {
    // Hide all bodies
    const bodiesFolder = this.kivi.objects.bodies;
    if (!bodiesFolder) return;

    bodiesFolder.visible = false;
    bodiesFolder.children.forEach(child => {
      child.visible = false;
    });

    this.kivi.render();
  }

  restoreBodiesVisibility() {
    // Restore visibility state of all bodies
    if (!this.savedBodiesVisibility) return;

    const bodiesFolder = this.kivi.objects.bodies;
    if (!bodiesFolder) return;

    // Restore folder visibility
    bodiesFolder.visible = this.savedBodiesVisibility.get('_folder');

    // Restore each child's visibility
    bodiesFolder.children.forEach(child => {
      const savedVisibility = this.savedBodiesVisibility.get(child.uuid);
      if (savedVisibility !== undefined) {
        child.visible = savedVisibility;
      }
    });

    this.savedBodiesVisibility = null;
    this.kivi.render();
  }

  closeSketchEditor() {
    if (!this.isEditing) return;

    // Generate invisible selection meshes for face picking
    this.generateSelectionMeshes();

    // Save sketch (already saved in userData)
    console.log('Sketch saved:', this.activeSketch.name);

    // Remove editor window
    if (this.editorWindow) {
      document.body.removeChild(this.editorWindow);
      this.editorWindow = null;
    }

    // Restore bodies visibility
    this.restoreBodiesVisibility();

    // Re-enable camera rotation
    if (this.kivi.system.cameraController) {
      this.kivi.system.cameraController.rotationEnabled = true;
    }

    // Restore camera position
    this.restoreCameraState();

    // Reset state
    this.activeSketch = null;
    this.isEditing = false;
  }

  generateSelectionMeshes() {
    if (!this.activeSketch) return;

    const sketchData = this.activeSketch.userData.kivi.sketchData;
    if (!sketchData) return;

    // Remove old selection meshes if they exist
    const oldSelectionMeshes = this.activeSketch.children.find(
      child => child.name === 'selectionMeshes'
    );
    if (oldSelectionMeshes) {
      this.activeSketch.remove(oldSelectionMeshes);
    }

    // Create new selection meshes
    const selectionMeshes = sketchData.createSelectionMeshes();
    selectionMeshes.name = 'selectionMeshes';
    this.activeSketch.add(selectionMeshes);

    console.log('Generated selection meshes for face picking');
  }

  createRectangleSketch(width, height) {
    // Create a simple rectangle outline on XZ plane (Y=0)
    // This represents a 2D sketch that can later be extruded

    const points = [];
    points.push(new THREE.Vector3(-width/2, 0, -height/2));
    points.push(new THREE.Vector3(width/2, 0, -height/2));
    points.push(new THREE.Vector3(width/2, 0, height/2));
    points.push(new THREE.Vector3(-width/2, 0, height/2));
    points.push(new THREE.Vector3(-width/2, 0, -height/2)); // Close the rectangle

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00bcd4, // Cyan for sketches (distinguishable from axis blue)
      linewidth: 2,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1000; // Render on top

    // Store sketch data in userData
    line.userData.kivi = {
      type: 'sketch',
      plane: 'XZ',
      entities: [
        {type: 'line', start: {x: -width/2, z: -height/2}, end: {x: width/2, z: -height/2}},
        {type: 'line', start: {x: width/2, z: -height/2}, end: {x: width/2, z: height/2}},
        {type: 'line', start: {x: width/2, z: height/2}, end: {x: -width/2, z: height/2}},
        {type: 'line', start: {x: -width/2, z: height/2}, end: {x: -width/2, z: -height/2}}
      ],
      parameters: {
        width: width,
        height: height
      }
    };

    return line;
  }

  createCircleSketch(radius) {
    // Create a circle outline on XZ plane
    const segments = 32;
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00bcd4, // Cyan for sketches
      linewidth: 2,
      depthTest: false,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1000;

    // Store sketch data
    line.userData.kivi = {
      type: 'sketch',
      plane: 'XZ',
      entities: [
        {type: 'circle', center: {x: 0, z: 0}, radius: radius}
      ],
      parameters: {
        radius: radius
      }
    };

    return line;
  }

  generateSketchName() {
    // Generate unique sketch name
    const existingNames = new Set(
      this.kivi.objects.sketches.children.map(child => child.name)
    );

    let counter = 1;
    let name = `sketch_${counter}`;
    while (existingNames.has(name)) {
      counter++;
      name = `sketch_${counter}`;
    }

    return name;
  }

  // Convert sketch to THREE.Shape for extrusion
  sketchToShape(sketch) {
    const sketchData = sketch.userData.kivi;
    if (!sketchData || sketchData.type !== 'sketch') {
      console.error('Not a valid sketch');
      return null;
    }

    const shape = new THREE.Shape();

    // For now, handle simple rectangle
    if (sketchData.entities[0].type === 'line') {
      const firstEntity = sketchData.entities[0];
      shape.moveTo(firstEntity.start.x, firstEntity.start.y);

      sketchData.entities.forEach(entity => {
        if (entity.type === 'line') {
          shape.lineTo(entity.end.x, entity.end.y);
        }
      });
    } else if (sketchData.entities[0].type === 'circle') {
      const circle = sketchData.entities[0];
      shape.absarc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2, false);
    }

    return shape;
  }
}
