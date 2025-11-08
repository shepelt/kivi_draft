// Smart Grid with adaptive labeling based on zoom level
// 1 unit = 1mm

import * as THREE from 'three';
import { coordinateSystem } from './coordinate-system.js';

export class SmartGrid extends THREE.Group {
  constructor(camera = null) {
    super();
    this.name = 'grid';

    // Grid parameters
    this.currentZoom = 5;
    this.gridSize = 100; // Total grid size in units (mm)
    this.camera = camera;

    // Create grid mesh
    this.gridMesh = null;
    this.labels = [];

    this.createGrid();
  }

  setCamera(camera) {
    this.camera = camera;
  }

  createGrid() {
    // Clear existing grid and labels
    if (this.gridMesh) {
      this.remove(this.gridMesh);
      this.gridMesh.geometry.dispose();
      this.gridMesh.material.dispose();
    }

    this.labels.forEach(label => {
      this.remove(label);
    });
    this.labels = [];

    // Calculate adaptive spacing based on zoom level
    const spacing = this.calculateSpacing(this.currentZoom);
    const divisions = Math.floor(this.gridSize / spacing);

    // Create grid helper
    this.gridMesh = new THREE.GridHelper(this.gridSize, divisions);
    this.gridMesh.material.opacity = 0.3;
    this.gridMesh.material.transparent = true;
    this.gridMesh.material.depthTest = false; // Show through objects
    this.gridMesh.material.depthWrite = false;
    this.gridMesh.renderOrder = 998; // Render before labels but after objects
    this.add(this.gridMesh);

    // Add labels along X and Y axes
    this.createLabels(spacing, divisions);
  }

  calculateSpacing(zoom) {
    // Determine appropriate grid spacing based on zoom level
    // We want roughly 10-20 grid lines visible at any zoom

    // Available spacings in mm: 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, etc.
    const spacingOptions = [
      0.1, 0.2, 0.5,
      1, 2, 5,
      10, 20, 50,
      100, 200, 500,
      1000, 2000, 5000,
      10000, 20000, 50000
    ];

    // Estimate how many units fit in the view
    const unitsInView = zoom;

    // Find the spacing that gives us ~10 divisions
    const targetDivisions = 10;
    const idealSpacing = unitsInView / targetDivisions;

    // Find closest spacing option
    let bestSpacing = spacingOptions[0];
    let bestDiff = Math.abs(Math.log10(idealSpacing) - Math.log10(bestSpacing));

    for (const spacing of spacingOptions) {
      const diff = Math.abs(Math.log10(idealSpacing) - Math.log10(spacing));
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSpacing = spacing;
      }
    }

    return bestSpacing;
  }

  createLabels(spacing, divisions) {
    const halfSize = this.gridSize / 2;

    // Determine camera position to decide which side to show labels
    let cameraX = 0;
    let cameraY = 0; // Internal Y is up
    let cameraZ = 0; // Internal Z is external Y

    if (this.camera) {
      cameraX = this.camera.position.x;
      cameraY = this.camera.position.y;
      cameraZ = this.camera.position.z; // Internal Z
    }

    // Calculate camera angle from horizontal plane
    const cameraDistance = Math.sqrt(cameraX * cameraX + cameraY * cameraY + cameraZ * cameraZ);
    const cameraAngleFromHorizontal = Math.abs(Math.asin(cameraY / cameraDistance));

    // Hide labels when viewing from nearly flat angle (within 15 degrees of horizontal)
    const hideLabels = cameraAngleFromHorizontal < (15 * Math.PI / 180);

    if (hideLabels) {
      return; // Don't create any labels when viewing flat
    }

    // Show ~5 labels in each direction
    const maxLabels = 5;

    // Create labels along X axis (external X)
    // Show positive X labels on the side visible from camera
    for (let i = 1; i <= maxLabels; i++) {
      const position = i * spacing;
      if (Math.abs(position) > halfSize) continue;

      const label = this.createTextLabel(
        this.formatValue(position), // Always show absolute value
        position,
        0.01, // Slightly above grid to ensure visibility
        0 // Place along grid, not offset
      );
      this.labels.push(label);
      this.add(label);
    }

    // Also show on negative X side
    for (let i = 1; i <= maxLabels; i++) {
      const position = -i * spacing;
      if (Math.abs(position) > halfSize) continue;

      const label = this.createTextLabel(
        this.formatValue(Math.abs(position)), // Always show absolute value
        position,
        0.01, // Slightly above grid to ensure visibility
        0 // Place along grid, not offset
      );
      this.labels.push(label);
      this.add(label);
    }

    // Create labels along Y axis (external Y, internal Z)
    // Show positive Y labels on the side visible from camera
    for (let i = 1; i <= maxLabels; i++) {
      const position = i * spacing;
      if (Math.abs(position) > halfSize) continue;

      const label = this.createTextLabel(
        this.formatValue(position),
        0, // Place along grid, not offset
        0.01,
        position
      );
      this.labels.push(label);
      this.add(label);
    }

    // Also show on negative Y side
    for (let i = 1; i <= maxLabels; i++) {
      const position = -i * spacing;
      if (Math.abs(position) > halfSize) continue;

      const label = this.createTextLabel(
        this.formatValue(Math.abs(position)),
        0, // Place along grid, not offset
        0.01,
        position
      );
      this.labels.push(label);
      this.add(label);
    }
  }

  formatValue(value) {
    // Format value intelligently based on magnitude
    // Value is in mm (1 unit = 1mm)

    if (Math.abs(value) >= 1000) {
      // Show in meters for large values
      return (value / 1000).toFixed(1) + 'm';
    } else if (Math.abs(value) >= 10) {
      // Show in mm without decimals
      return value.toFixed(0);
    } else if (Math.abs(value) >= 1) {
      // Show in mm with 1 decimal
      return value.toFixed(1);
    } else {
      // Show in mm with 2 decimals for small values
      return value.toFixed(2);
    }
  }

  createTextLabel(text, x, y, z) {
    // Create a canvas-based text sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    // Calculate appropriate font size based on zoom
    const fontSize = Math.max(32, Math.min(64, 32 * (5 / this.currentZoom)));

    context.font = `${fontSize}px monospace`;
    context.fillStyle = '#666666';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // Show through objects
      depthWrite: false,
      opacity: 0.5, // Half-visible through objects
      blending: THREE.NormalBlending
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.renderOrder = 999; // Render after other objects

    // Scale sprite based on zoom level
    const scale = this.currentZoom * 0.08;
    sprite.scale.set(scale, scale / 2, 1);

    // Position: X is internal X, Z is internal Z (external Y)
    sprite.position.set(x, y, z);

    return sprite;
  }

  updateZoom(zoom) {
    this.currentZoom = zoom;
    this.createGrid(); // Recreate grid with new spacing and labels
  }

  dispose() {
    if (this.gridMesh) {
      this.gridMesh.geometry.dispose();
      this.gridMesh.material.dispose();
    }

    this.labels.forEach(label => {
      if (label.material.map) {
        label.material.map.dispose();
      }
      label.material.dispose();
    });
  }
}
