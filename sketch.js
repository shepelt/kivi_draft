// Sketch data structure - in-memory representation of 2D sketch
// Structure: vertices + edges + constraints + parameters

import * as THREE from 'three';
import { Plane } from './plane.js';

export class Sketch {
  constructor(plane = null) {
    // Plane object defining the 2D sketch plane in 3D space
    this.plane = plane || Plane.XY(); // Default to XY plane

    this.vertices = []; // Array of {id, u, v} in plane coordinates
    this.edges = []; // Array of {id, type, v1, v2, ...params}
    this.constraints = []; // Array of {type, ...params}
    this.parameters = {}; // Named parameters
    this.nextVertexId = 0;
    this.nextEdgeId = 0;
  }

  // Add a vertex at position (u, v) in plane coordinates
  addVertex(u, v) {
    const vertex = {
      id: this.nextVertexId++,
      u: u,
      v: v
    };
    this.vertices.push(vertex);
    return vertex;
  }

  // Add an edge (line) between two vertices
  addEdge(v1Id, v2Id, type = 'line') {
    const edge = {
      id: this.nextEdgeId++,
      type: type,
      v1: v1Id,
      v2: v2Id
    };
    this.edges.push(edge);
    return edge;
  }

  // Add a box (4 vertices + 4 edges)
  addBox(centerX, centerZ, width, height) {
    const halfW = width / 2;
    const halfH = height / 2;

    // Create 4 vertices
    const v0 = this.addVertex(centerX - halfW, centerZ - halfH); // bottom-left
    const v1 = this.addVertex(centerX + halfW, centerZ - halfH); // bottom-right
    const v2 = this.addVertex(centerX + halfW, centerZ + halfH); // top-right
    const v3 = this.addVertex(centerX - halfW, centerZ + halfH); // top-left

    // Create 4 edges
    const e0 = this.addEdge(v0.id, v1.id); // bottom
    const e1 = this.addEdge(v1.id, v2.id); // right
    const e2 = this.addEdge(v2.id, v3.id); // top
    const e3 = this.addEdge(v3.id, v0.id); // left

    return {
      vertices: [v0, v1, v2, v3],
      edges: [e0, e1, e2, e3]
    };
  }

  // Get vertex by id
  getVertex(id) {
    return this.vertices.find(v => v.id === id);
  }

  // Detect closed loops (faces) in the sketch
  // Returns array of loops, where each loop is an array of edge IDs
  detectClosedLoops() {
    const loops = [];
    const visitedEdges = new Set();

    // Build adjacency map: vertex -> edges connected to it
    const adjacencyMap = new Map();
    this.edges.forEach(edge => {
      if (!adjacencyMap.has(edge.v1)) adjacencyMap.set(edge.v1, []);
      if (!adjacencyMap.has(edge.v2)) adjacencyMap.set(edge.v2, []);
      adjacencyMap.get(edge.v1).push(edge);
      adjacencyMap.get(edge.v2).push(edge);
    });

    // Try to find a loop starting from each edge
    this.edges.forEach(startEdge => {
      if (visitedEdges.has(startEdge.id)) return;

      const loop = this.findLoop(startEdge, adjacencyMap, visitedEdges);
      if (loop && loop.length >= 3) { // Valid loop has at least 3 edges
        loops.push(loop);
        loop.forEach(edgeId => visitedEdges.add(edgeId));
      }
    });

    return loops;
  }

  // Find a loop starting from a given edge
  findLoop(startEdge, adjacencyMap, visitedEdges) {
    const loop = [];
    const visitedInLoop = new Set();

    let currentEdge = startEdge;
    let currentVertex = currentEdge.v2; // Start from v2, trying to get back to v1
    const targetVertex = currentEdge.v1;

    loop.push(currentEdge.id);
    visitedInLoop.add(currentEdge.id);

    // Follow edges until we get back to start or hit a dead end
    let maxIterations = 100; // Prevent infinite loops
    while (maxIterations-- > 0) {
      // Find next edge connected to currentVertex (not already visited in this loop)
      const connectedEdges = adjacencyMap.get(currentVertex) || [];
      const nextEdge = connectedEdges.find(edge =>
        !visitedInLoop.has(edge.id) &&
        !visitedEdges.has(edge.id)
      );

      if (!nextEdge) break; // Dead end

      loop.push(nextEdge.id);
      visitedInLoop.add(nextEdge.id);

      // Move to next vertex
      currentVertex = (nextEdge.v1 === currentVertex) ? nextEdge.v2 : nextEdge.v1;

      // Check if we've closed the loop
      if (currentVertex === targetVertex) {
        return loop; // Success!
      }
    }

    return null; // Didn't close the loop
  }

  // Create invisible selection meshes for closed loops (faces)
  // Returns THREE.Group containing invisible meshes for raycasting
  createSelectionMeshes() {
    const group = new THREE.Group();
    const loops = this.detectClosedLoops();

    loops.forEach((loop, loopIndex) => {
      // Get vertices for this loop in order
      const loopVertices = this.getLoopVertices(loop);

      if (loopVertices.length < 3) return; // Need at least 3 vertices for a face

      // Create a shape from the loop vertices (in 2D plane coordinates)
      const shape = new THREE.Shape();
      loopVertices.forEach((vertex, i) => {
        if (i === 0) {
          shape.moveTo(vertex.u, vertex.v);
        } else {
          shape.lineTo(vertex.u, vertex.v);
        }
      });

      // Create geometry from shape (creates in XY plane by default)
      const geometry = new THREE.ShapeGeometry(shape);

      // Create invisible material for raycasting
      const material = new THREE.MeshBasicMaterial({
        visible: false, // Invisible but still pickable by raycaster
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `sketch-face-${loopIndex}`;
      mesh.userData.sketchFace = true;
      mesh.userData.loopIndex = loopIndex;
      mesh.userData.edgeIds = loop; // Store which edges form this face

      // Apply plane's transformation to align mesh
      // Build transformation matrix from plane's basis vectors
      // ShapeGeometry is in XY plane, so we need to map:
      // X -> uAxis, Y -> vAxis, Z -> normal
      const matrix = new THREE.Matrix4();
      matrix.makeBasis(this.plane.uAxis, this.plane.vAxis, this.plane.normal);
      matrix.setPosition(this.plane.origin);

      // Apply the transformation matrix to the mesh
      mesh.applyMatrix4(matrix);

      group.add(mesh);
    });

    return group;
  }

  // Get ordered vertices for a loop of edges
  getLoopVertices(edgeIds) {
    if (edgeIds.length === 0) return [];

    const vertices = [];
    const edges = edgeIds.map(id => this.edges.find(e => e.id === id));

    // Start with first edge
    let currentVertex = edges[0].v1;
    vertices.push(this.getVertex(currentVertex));

    // Follow the loop
    edges.forEach(edge => {
      const nextVertex = (edge.v1 === currentVertex) ? edge.v2 : edge.v1;
      vertices.push(this.getVertex(nextVertex));
      currentVertex = nextVertex;
    });

    // Remove last vertex (it's the same as first, closing the loop)
    vertices.pop();

    return vertices;
  }

  // Convert to THREE.js geometry for visualization
  toGeometry() {
    const group = new THREE.Group();

    // Draw edges as lines
    this.edges.forEach(edge => {
      const v1 = this.getVertex(edge.v1);
      const v2 = this.getVertex(edge.v2);

      if (!v1 || !v2) return;

      // Convert plane coordinates to world coordinates
      const points = [
        this.plane.toWorld(v1.u, v1.v),
        this.plane.toWorld(v2.u, v2.v)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00bcd4, // Cyan for sketch lines (distinguishable from axis blue)
        linewidth: 2
        // Remove depthTest/depthWrite settings - let it render normally
      });
      const line = new THREE.Line(geometry, material);
      group.add(line);
    });

    // Draw vertices using Points (constant screen size, like Fusion 360)
    // Create a canvas texture for the point with white fill and black outline
    const canvas = document.createElement('canvas');
    const size = 32; // 32x32 pixels for crisp rendering
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Draw black outline circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Draw white inner circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);

    // Create geometry with all vertex positions (convert to world coords)
    const positions = [];
    this.vertices.forEach(vertex => {
      const worldPos = this.plane.toWorld(vertex.u, vertex.v);
      positions.push(worldPos.x, worldPos.y, worldPos.z);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      map: texture,
      size: 12, // Size in pixels
      sizeAttenuation: false, // Constant screen size
      transparent: true,
      alphaTest: 0.1,
      depthTest: true
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    return group;
  }

  // Serialize to JSON
  toJSON() {
    return {
      plane: this.plane,
      vertices: this.vertices,
      edges: this.edges,
      constraints: this.constraints,
      parameters: this.parameters
    };
  }

  // Deserialize from JSON
  static fromJSON(data) {
    const sketch = new Sketch(data.plane);
    sketch.vertices = data.vertices || [];
    sketch.edges = data.edges || [];
    sketch.constraints = data.constraints || [];
    sketch.parameters = data.parameters || {};

    // Update ID counters
    sketch.nextVertexId = Math.max(...sketch.vertices.map(v => v.id), -1) + 1;
    sketch.nextEdgeId = Math.max(...sketch.edges.map(e => e.id), -1) + 1;

    return sketch;
  }
}
