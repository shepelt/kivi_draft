// Extrude - Creates 3D geometry by extruding a 2D sketch profile
import * as THREE from 'three';

export class Extrude {
  constructor(sketch, distance = 1, direction = 1) {
    this.sketch = sketch; // Reference to the Sketch object
    this.distance = distance; // Extrusion distance
    this.direction = direction; // 1 for normal direction, -1 for reverse
  }

  // Generate 3D geometry from the sketch
  toGeometry() {
    const loops = this.sketch.detectClosedLoops();

    if (loops.length === 0) {
      console.warn('No closed loops found in sketch');
      return null;
    }

    // For now, extrude the first closed loop
    // TODO: Handle multiple loops (holes, multiple profiles)
    const loop = loops[0];
    const loopVertices = this.sketch.getLoopVertices(loop);

    if (loopVertices.length < 3) {
      console.warn('Loop has less than 3 vertices');
      return null;
    }

    return this.extrudeLoop(loopVertices);
  }

  // Extrude a single loop to create 3D geometry
  extrudeLoop(loopVertices) {
    // Create shape from 2D vertices (in plane coordinates)
    const shape = new THREE.Shape();
    loopVertices.forEach((vertex, i) => {
      if (i === 0) {
        shape.moveTo(vertex.u, vertex.v);
      } else {
        shape.lineTo(vertex.u, vertex.v);
      }
    });

    // Extrude settings
    const extrudeSettings = {
      depth: this.distance * this.direction, // Can be negative for reverse
      bevelEnabled: false
    };

    // Create extruded geometry
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Transform geometry to align with sketch plane
    // ExtrudeGeometry extrudes in +Z direction from XY plane
    // We need to transform to sketch plane's coordinate system
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(this.sketch.plane.uAxis, this.sketch.plane.vAxis, this.sketch.plane.normal);
    matrix.setPosition(this.sketch.plane.origin);

    geometry.applyMatrix4(matrix);

    return geometry;
  }

  // Create a mesh from the extruded geometry
  toMesh(material = null) {
    const geometry = this.toGeometry();
    if (!geometry) return null;

    // Default material if none provided
    const mat = material || new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.5,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  // Serialize to JSON
  toJSON() {
    return {
      sketchId: this.sketch.id, // Will need to add ID to sketches
      distance: this.distance,
      direction: this.direction
    };
  }

  // Create from JSON (needs sketch reference)
  static fromJSON(data, sketch) {
    return new Extrude(sketch, data.distance, data.direction);
  }
}
