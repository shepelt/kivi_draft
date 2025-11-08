// Coordinate System Mapper
// Internal: Y-up (Three.js standard, easier for rendering)
// External: Z-up (CAD/Architecture standard, user-facing)

import * as THREE from 'three';

export class CoordinateSystem {
  constructor() {
    // Internal system: X=right, Y=up, Z=forward (Three.js standard)
    // External system: X=right, Y=forward, Z=up (CAD standard)

    this.internalSystem = 'Y-up';
    this.externalSystem = 'Z-up';
  }

  // Convert internal vector to external
  internalToExternal(internalVec) {
    // Internal Y-up: (x, y, z)
    // External Z-up: (x, z, y) - swap Y and Z
    return new THREE.Vector3(
      internalVec.x,
      internalVec.z,
      internalVec.y
    );
  }

  // Convert external vector to internal
  externalToInternal(externalVec) {
    // External Z-up: (x, y, z)
    // Internal Y-up: (x, z, y) - swap Y and Z
    return new THREE.Vector3(
      externalVec.x,
      externalVec.z,
      externalVec.y
    );
  }

  // Get axis label for external system
  getExternalAxisLabel(internalAxis) {
    const mapping = {
      'X': 'X',
      'Y': 'Z',  // Internal Y becomes External Z
      'Z': 'Y',  // Internal Z becomes External Y
      '-X': '-X',
      '-Y': '-Z',
      '-Z': '-Y'
    };
    return mapping[internalAxis] || internalAxis;
  }

  // Get axis label for internal system
  getInternalAxisLabel(externalAxis) {
    const mapping = {
      'X': 'X',
      'Y': 'Z',  // External Y becomes Internal Z
      'Z': 'Y',  // External Z becomes Internal Y
      '-X': '-X',
      '-Y': '-Z',
      '-Z': '-Y'
    };
    return mapping[externalAxis] || externalAxis;
  }

  // Get view name in external coordinate system
  getExternalViewName(internalViewName) {
    const mapping = {
      'TOP': 'TOP',        // Looking down -Y (internal) = Looking down -Z (external)
      'BOTTOM': 'BOTTOM',  // Looking up +Y (internal) = Looking up +Z (external)
      'FRONT': 'FRONT',    // Looking at +Z (internal) = Looking at +Y (external)
      'BACK': 'BACK',      // Looking at -Z (internal) = Looking at -Y (external)
      'RIGHT': 'RIGHT',    // Looking at +X (same in both)
      'LEFT': 'LEFT'       // Looking at -X (same in both)
    };
    return mapping[internalViewName] || internalViewName;
  }

  // Get axis color (consistent across both systems)
  getAxisColor(externalAxis) {
    const colors = {
      'X': 0xff0000,   // Red
      'Y': 0x00ff00,   // Green
      'Z': 0x0000ff    // Blue
    };
    return colors[externalAxis.replace('-', '')] || 0xffffff;
  }

  // Format position for display (in external coordinates)
  formatPosition(internalPosition) {
    const ext = this.internalToExternal(internalPosition);
    return {
      X: ext.x.toFixed(3),
      Y: ext.y.toFixed(3),
      Z: ext.z.toFixed(3)
    };
  }

  // Format vector for display (in external coordinates)
  formatVector(internalVector) {
    const ext = this.internalToExternal(internalVector);
    return `(${ext.x.toFixed(3)}, ${ext.y.toFixed(3)}, ${ext.z.toFixed(3)})`;
  }

  // Convert rotation matrix from internal to external
  // This is needed for import/export
  matrixInternalToExternal(internalMatrix) {
    // Swap rows and columns for Y and Z
    const m = internalMatrix.elements;

    // Create new matrix with swapped Y and Z
    return new THREE.Matrix4().set(
      m[0], m[2], m[1], m[3],   // Row 0: swap columns 1 and 2
      m[8], m[10], m[9], m[11], // Row 2: (was row 2, now row 1)
      m[4], m[6], m[5], m[7],   // Row 1: (was row 1, now row 2)
      m[12], m[14], m[13], m[15] // Row 3: swap positions
    );
  }

  // Convert rotation matrix from external to internal
  matrixExternalToInternal(externalMatrix) {
    // Same operation (swap is symmetric)
    return this.matrixInternalToExternal(externalMatrix);
  }

  // Get up vector in external system
  getExternalUpVector() {
    return new THREE.Vector3(0, 0, 1); // Z-up in external
  }

  // Get up vector in internal system
  getInternalUpVector() {
    return new THREE.Vector3(0, 1, 0); // Y-up in internal
  }

  // Convert mesh/object from external to internal for rendering
  importObject(externalObject) {
    // Clone the object
    const internalObject = externalObject.clone();

    // Rotate 90 degrees around X to convert Z-up to Y-up
    internalObject.rotateX(-Math.PI / 2);

    return internalObject;
  }

  // Convert mesh/object from internal to external for export
  exportObject(internalObject) {
    // Clone the object
    const externalObject = internalObject.clone();

    // Rotate -90 degrees around X to convert Y-up to Z-up
    externalObject.rotateX(Math.PI / 2);

    return externalObject;
  }
}

// Export a singleton instance
export const coordinateSystem = new CoordinateSystem();
