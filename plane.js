// Plane - Represents a 2D plane in 3D space with position and rotation
// Used for sketching on arbitrary planes

import * as THREE from 'three';

export class Plane {
  constructor(origin = new THREE.Vector3(0, 0, 0), normal = new THREE.Vector3(0, 1, 0)) {
    // Position of the plane origin in 3D space
    this.origin = origin.clone();

    // Normal vector of the plane
    this.normal = normal.clone().normalize();

    // Calculate rotation quaternion from normal
    this.rotation = this.calculateRotationFromNormal(this.normal);

    // Calculate basis vectors for the plane (u, v directions in the plane)
    this.calculateBasisVectors();
  }

  // Create plane from a normal vector
  static fromNormal(normal, origin = new THREE.Vector3(0, 0, 0)) {
    return new Plane(origin, normal);
  }

  // Create plane from camera view (normal and camera up vector)
  // This ensures the plane's basis vectors align with the camera's orientation
  static fromCameraView(normal, cameraUp, origin = new THREE.Vector3(0, 0, 0)) {
    const plane = new Plane(origin, normal);

    // Override the basis vectors to align with camera orientation
    // V axis should align with camera's up direction (projected onto the plane)
    const vAxis = cameraUp.clone();
    // Remove component along normal to project onto plane
    vAxis.addScaledVector(normal, -vAxis.dot(normal));
    vAxis.normalize();

    // U axis is perpendicular to both normal and vAxis
    const uAxis = new THREE.Vector3().crossVectors(vAxis, normal).normalize();

    plane.uAxis = uAxis;
    plane.vAxis = vAxis;

    return plane;
  }

  // Create standard XY plane (external coords: horizontal plane in Z-up system)
  // External XY plane has normal +Z → Internal normal +Y
  static XY(origin = new THREE.Vector3(0, 0, 0)) {
    return new Plane(origin, new THREE.Vector3(0, 1, 0)); // Normal pointing in +Y (internal)
  }

  // Create standard XZ plane (external coords: front-facing vertical plane)
  // External XZ plane has normal +Y → Internal normal +Z
  static XZ(origin = new THREE.Vector3(0, 0, 0)) {
    return new Plane(origin, new THREE.Vector3(0, 0, 1)); // Normal pointing in +Z (internal)
  }

  // Create standard YZ plane (external coords: side-facing vertical plane)
  // External YZ plane has normal +X → Internal normal +X (unchanged)
  static YZ(origin = new THREE.Vector3(0, 0, 0)) {
    return new Plane(origin, new THREE.Vector3(1, 0, 0)); // Normal pointing in +X (internal)
  }

  // Calculate rotation quaternion that aligns ShapeGeometry plane to this plane's normal
  // ShapeGeometry creates shapes in XY plane with normal (0,0,1)
  calculateRotationFromNormal(normal) {
    const shapeNormal = new THREE.Vector3(0, 0, 1); // ShapeGeometry default normal
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(shapeNormal, normal);
    return quaternion;
  }

  // Calculate basis vectors (u, v) in the plane
  calculateBasisVectors() {
    // U vector (first axis in plane, analogous to X in XY plane)
    // Choose a vector perpendicular to normal
    let tempVector;
    if (Math.abs(this.normal.x) < 0.9) {
      tempVector = new THREE.Vector3(1, 0, 0);
    } else {
      tempVector = new THREE.Vector3(0, 1, 0);
    }

    // V = normal × temp (gives us one axis in the plane)
    this.vAxis = new THREE.Vector3().crossVectors(this.normal, tempVector).normalize();

    // U = V × normal (gives us the other axis, perpendicular to V and in the plane)
    this.uAxis = new THREE.Vector3().crossVectors(this.vAxis, this.normal).normalize();
  }

  // Convert 2D plane coordinates (u, v) to 3D world coordinates
  toWorld(u, v) {
    const worldPos = this.origin.clone();
    worldPos.addScaledVector(this.uAxis, u);
    worldPos.addScaledVector(this.vAxis, v);
    return worldPos;
  }

  // Convert 3D world coordinates to 2D plane coordinates (u, v)
  toPlane(worldPos) {
    const relative = worldPos.clone().sub(this.origin);
    const u = relative.dot(this.uAxis);
    const v = relative.dot(this.vAxis);
    return { u, v };
  }

  // Get a THREE.js Matrix4 representing the plane's transform
  getMatrix() {
    const matrix = new THREE.Matrix4();
    matrix.makeRotationFromQuaternion(this.rotation);
    matrix.setPosition(this.origin);
    return matrix;
  }

  // Clone the plane
  clone() {
    return new Plane(this.origin, this.normal);
  }

  // Serialize to JSON
  toJSON() {
    return {
      origin: { x: this.origin.x, y: this.origin.y, z: this.origin.z },
      normal: { x: this.normal.x, y: this.normal.y, z: this.normal.z }
    };
  }

  // Deserialize from JSON
  static fromJSON(data) {
    const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
    const normal = new THREE.Vector3(data.normal.x, data.normal.y, data.normal.z);
    return new Plane(origin, normal);
  }
}
