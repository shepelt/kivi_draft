// Face Selector - Hover and select faces from sketches using raycasting
import * as THREE from 'three';

export class FaceSelector {
  constructor(camera, domElement, scene, renderCallback) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.renderCallback = renderCallback;
    this.enabled = true;

    // Raycaster for mouse picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // State
    this.hoveredFace = null;
    this.selectedFace = null;
    this.selectedFaceGroup = null; // Store the complete face group data

    // Highlight meshes
    this.hoverHighlight = null;
    this.selectionHighlight = null;

    // Cache for unified face groups (maps mesh UUID to face groups)
    this.faceGroupsCache = new Map();

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.domElement.addEventListener('click', (e) => this.onClick(e));
    this.domElement.addEventListener('contextmenu', (e) => this.onContextMenu(e));
  }

  // Build unified face groups for a mesh (group coplanar AND adjacent triangles)
  buildFaceGroups(mesh) {
    // Check cache first
    if (this.faceGroupsCache.has(mesh.uuid)) {
      return this.faceGroupsCache.get(mesh.uuid);
    }

    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const faceCount = position.count / 3;
    const groups = [];
    const processed = new Set();
    const ANGLE_THRESHOLD = 0.9999; // ~0.8 degrees - faces must be nearly coplanar
    const VERTEX_THRESHOLD = 0.0001; // Vertices must be very close to be considered shared

    // Helper to get face normal
    const getFaceNormal = (faceIndex) => {
      const i1 = faceIndex * 3;
      const i2 = faceIndex * 3 + 1;
      const i3 = faceIndex * 3 + 2;

      const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
      const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
      const v3 = new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      return new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    };

    // Helper to get face vertices
    const getFaceVertices = (faceIndex) => {
      const i1 = faceIndex * 3;
      const i2 = faceIndex * 3 + 1;
      const i3 = faceIndex * 3 + 2;

      return [
        new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1)),
        new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2)),
        new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3))
      ];
    };

    // Helper to check if two faces share an edge (at least 2 vertices)
    const facesShareEdge = (face1Verts, face2Verts) => {
      let sharedCount = 0;
      for (const v1 of face1Verts) {
        for (const v2 of face2Verts) {
          if (v1.distanceTo(v2) < VERTEX_THRESHOLD) {
            sharedCount++;
            break;
          }
        }
      }
      return sharedCount >= 2; // Share at least 2 vertices (an edge)
    };

    // Build groups using flood fill with adjacency check
    for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
      if (processed.has(faceIndex)) continue;

      const group = { faceIndices: [faceIndex] };
      const queue = [faceIndex];
      const normal = getFaceNormal(faceIndex);
      processed.add(faceIndex);

      while (queue.length > 0) {
        const currentFace = queue.shift();
        const currentVerts = getFaceVertices(currentFace);

        // Check all other unprocessed faces
        for (let otherFace = 0; otherFace < faceCount; otherFace++) {
          if (processed.has(otherFace)) continue;

          const otherNormal = getFaceNormal(otherFace);
          const otherVerts = getFaceVertices(otherFace);

          // Check if normals are parallel (coplanar) AND faces share an edge
          if (Math.abs(normal.dot(otherNormal)) > ANGLE_THRESHOLD &&
              facesShareEdge(currentVerts, otherVerts)) {
            // Add to group
            group.faceIndices.push(otherFace);
            queue.push(otherFace);
            processed.add(otherFace);
          }
        }
      }

      groups.push(group);
    }

    // Create reverse lookup: faceIndex -> group
    const faceToGroup = new Map();
    groups.forEach((group, groupIndex) => {
      group.faceIndices.forEach(faceIndex => {
        faceToGroup.set(faceIndex, groupIndex);
      });
    });

    const result = { groups, faceToGroup };
    this.faceGroupsCache.set(mesh.uuid, result);
    return result;
  }

  onMouseMove(event) {
    if (!this.enabled) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Get all sketch faces (look for mesh children in sketches folder)
    const sketchFaces = this.getSketchFaces();

    // Check for intersections
    const intersects = this.raycaster.intersectObjects(sketchFaces, false);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const face = intersection.object;
      const faceIndex = intersection.faceIndex;

      // For 3D bodies, check if face is front-facing (backface culling)
      if (!face.userData.sketchFace) {
        // Get face normal
        const geometry = face.geometry;
        const position = geometry.attributes.position;

        const i1 = faceIndex * 3;
        const i2 = faceIndex * 3 + 1;
        const i3 = faceIndex * 3 + 2;

        const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
        const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
        const v3 = new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

        // Calculate face normal in local space
        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        // Transform normal to world space
        const worldNormal = normal.clone().transformDirection(face.matrixWorld);

        // Get view direction (from face to camera)
        const faceWorldPos = intersection.point;
        const viewDir = new THREE.Vector3().subVectors(this.camera.position, faceWorldPos).normalize();

        // Check if face is front-facing (normal points toward camera)
        const dotProduct = worldNormal.dot(viewDir);

        if (dotProduct < 0) {
          // Face is back-facing, ignore it
          if (this.hoveredFace) {
            this.clearHover();
          }
          return;
        }
      }

      // For 3D bodies, find the unified face group
      let unifiedFaceId = faceIndex;
      if (!face.userData.sketchFace) {
        const faceGroups = this.buildFaceGroups(face);
        unifiedFaceId = faceGroups.faceToGroup.get(faceIndex);
      }

      // Only update if we're hovering a different face
      if (this.hoveredFace !== face || this.hoveredFaceIndex !== unifiedFaceId) {
        this.setHoveredFace(face, unifiedFaceId);
      }
    } else {
      // No intersection, clear hover
      if (this.hoveredFace) {
        this.clearHover();
      }
    }
  }

  onClick(event) {
    if (!this.enabled) return;

    // Ignore if right-click or middle-click
    if (event.button !== 0) return;

    if (this.hoveredFace) {
      // Click on a face - select it with the face index
      this.selectFace(this.hoveredFace, this.hoveredFaceIndex);
    } else {
      // Click on empty space - deselect
      this.deselectFace();
    }
  }

  getSketchFaces() {
    const faces = [];

    // Get faces from 3D bodies
    const bodiesFolder = this.scene.children.find(obj => obj.name === 'bodies');
    if (bodiesFolder) {
      bodiesFolder.traverse((obj) => {
        if (obj.isMesh) {
          faces.push(obj);
        }
      });
    }

    // Get faces from sketches (invisible selection meshes)
    const sketchesFolder = this.scene.children.find(obj => obj.name === 'sketches');
    if (sketchesFolder) {
      sketchesFolder.traverse((obj) => {
        // Look for sketch face meshes (marked with userData.sketchFace)
        if (obj.isMesh && obj.userData.sketchFace) {
          faces.push(obj);
        }
      });
    }

    return faces;
  }

  setHoveredFace(face, faceIndex = null) {
    // Clear previous hover
    this.clearHover();

    this.hoveredFace = face;
    this.hoveredFaceIndex = faceIndex;

    const faceDesc = face.userData.sketchFace ?
      (face.name || 'sketch face') :
      `${face.name || 'body'} face ${faceIndex}`;
    console.log('Face hovered:', faceDesc);

    // Create dark edge highlight
    this.createHoverHighlight(face, faceIndex);

    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  clearHover() {
    if (this.hoveredFace) {
      console.log('Face unhovered:', this.hoveredFace.name || 'unnamed');
      this.hoveredFace = null;
    }

    // Remove hover highlight
    if (this.hoverHighlight) {
      this.scene.remove(this.hoverHighlight);
      this.hoverHighlight = null;
    }

    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  selectFace(face, faceIndex = null) {
    // If clicking the same face (same object and face index), ignore
    if (this.selectedFace === face && this.selectedFaceIndex === faceIndex) {
      console.log('Face already selected, ignoring');
      return;
    }

    // Deselect previous if different
    if (this.selectedFace) {
      this.deselectFace();
    }

    this.selectedFace = face;
    this.selectedFaceIndex = faceIndex;

    // Store the complete face group data for body faces
    if (!face.userData.sketchFace) {
      const faceGroups = this.buildFaceGroups(face);
      this.selectedFaceGroup = faceGroups.groups[faceIndex];
    } else {
      this.selectedFaceGroup = null; // Sketch faces don't need face groups
    }

    const faceDesc = face.userData.sketchFace ?
      (face.name || 'sketch face') :
      `${face.name || 'body'} face ${faceIndex}`;
    console.log('Face selected:', faceDesc);

    // Create blue face highlight
    this.createSelectionHighlight(face, faceIndex);

    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  deselectFace() {
    if (this.selectedFace) {
      console.log('Face deselected:', this.selectedFace.name || 'unnamed');
      this.selectedFace = null;
      this.selectedFaceIndex = null;
      this.selectedFaceGroup = null;
    }

    // Remove selection highlight
    if (this.selectionHighlight) {
      this.scene.remove(this.selectionHighlight);
      this.selectionHighlight = null;
    }

    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  createHoverHighlight(face, faceIndex = null) {
    // Check if this is a sketch face
    if (face.userData.sketchFace) {
      // For sketch faces, highlight the edges that form the loop
      this.createSketchEdgeHighlight(face, 0x222222); // Dark color for hover
    } else {
      // For 3D body faces, highlight only the specific face
      this.createBodyFaceHighlight(face, faceIndex, 0x222222);
    }
  }

  createBodyFaceHighlight(bodyMesh, groupIndex, color) {
    // Get the unified face group
    const faceGroups = this.buildFaceGroups(bodyMesh);
    const group = faceGroups.groups[groupIndex];

    const geometry = bodyMesh.geometry;
    const position = geometry.attributes.position;

    // Calculate face normal from first triangle
    const firstFaceIndex = group.faceIndices[0];
    const i1 = firstFaceIndex * 3;
    const i2 = firstFaceIndex * 3 + 1;
    const i3 = firstFaceIndex * 3 + 2;

    const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
    const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
    const v3 = new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    // Don't use offset - instead rely on renderOrder and depthTest to render on top
    // Collect all unique edges from all triangles in the group
    const edgeMap = new Map(); // key: "v1_v2", value: count

    const vertexKey = (v) => `${v.x.toFixed(6)}_${v.y.toFixed(6)}_${v.z.toFixed(6)}`;

    group.faceIndices.forEach(faceIndex => {
      const i1 = faceIndex * 3;
      const i2 = faceIndex * 3 + 1;
      const i3 = faceIndex * 3 + 2;

      const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
      const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
      const v3 = new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

      // Add three edges of this triangle
      const edges = [
        [v1, v2],
        [v2, v3],
        [v3, v1]
      ];

      edges.forEach(([va, vb]) => {
        // Create consistent edge key (sorted)
        const keyA = vertexKey(va);
        const keyB = vertexKey(vb);
        const edgeKey = keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;

        edgeMap.set(edgeKey, (edgeMap.get(edgeKey) || 0) + 1);
      });
    });

    // Only draw edges that appear once (perimeter edges)
    const perimeterEdges = [];
    const vertexCache = new Map();

    const getVertex = (key) => {
      if (!vertexCache.has(key)) {
        const [x, y, z] = key.split('_').map(parseFloat);
        vertexCache.set(key, new THREE.Vector3(x, y, z));
      }
      return vertexCache.get(key);
    };

    edgeMap.forEach((count, edgeKey) => {
      if (count === 1) {
        // This is a perimeter edge
        const [keyA, keyB] = edgeKey.split('|');
        perimeterEdges.push([getVertex(keyA), getVertex(keyB)]);
      }
    });

    // Create line segments for perimeter (no offset, just render on top)
    const highlightGroup = new THREE.Group();
    perimeterEdges.forEach(([v1, v2]) => {
      const points = [v1, v2];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 3,
        depthTest: false,
        depthWrite: false,
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.renderOrder = 999;
      highlightGroup.add(line);
    });

    highlightGroup.position.copy(bodyMesh.position);
    highlightGroup.rotation.copy(bodyMesh.rotation);
    highlightGroup.scale.copy(bodyMesh.scale);

    this.hoverHighlight = highlightGroup;
    this.scene.add(this.hoverHighlight);
  }

  createSketchEdgeHighlight(face, color) {
    // Get the sketch data from the parent
    const sketchContainer = face.parent?.parent; // face -> selectionMeshes group -> sketch container
    if (!sketchContainer?.userData?.kivi?.sketchData) return;

    const sketchData = sketchContainer.userData.kivi.sketchData;
    const edgeIds = face.userData.edgeIds;

    // Create lines for each edge in the loop
    const group = new THREE.Group();
    edgeIds.forEach(edgeId => {
      const edge = sketchData.edges.find(e => e.id === edgeId);
      if (!edge) return;

      const v1 = sketchData.getVertex(edge.v1);
      const v2 = sketchData.getVertex(edge.v2);
      if (!v1 || !v2) return;

      // Convert plane coordinates to world coordinates
      const points = [
        sketchData.plane.toWorld(v1.u, v1.v),
        sketchData.plane.toWorld(v2.u, v2.v)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 3,
        depthTest: false,
      });

      const line = new THREE.Line(geometry, material);
      line.renderOrder = 999;
      group.add(line);
    });

    this.hoverHighlight = group;
    this.scene.add(this.hoverHighlight);
  }

  createSelectionHighlight(face, faceIndex = null) {
    if (face.userData.sketchFace) {
      // For sketch faces, create overlay for the entire face
      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x4287f5, // Blue (like text selection)
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthTest: false,
      });

      this.selectionHighlight = new THREE.Mesh(face.geometry.clone(), highlightMaterial);
      this.selectionHighlight.position.copy(face.position);
      this.selectionHighlight.rotation.copy(face.rotation);
      this.selectionHighlight.scale.copy(face.scale);
      this.selectionHighlight.renderOrder = 998; // Below hover edges

      this.scene.add(this.selectionHighlight);
    } else {
      // For 3D body faces, create overlay for all triangles in the unified face group
      const faceGroups = this.buildFaceGroups(face);
      const group = faceGroups.groups[faceIndex];

      const geometry = face.geometry;
      const position = geometry.attributes.position;

      // Collect all vertices from all triangles in the group
      const allVertices = [];
      group.faceIndices.forEach(triIndex => {
        const i1 = triIndex * 3;
        const i2 = triIndex * 3 + 1;
        const i3 = triIndex * 3 + 2;

        const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
        const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
        const v3 = new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

        allVertices.push(v1.x, v1.y, v1.z);
        allVertices.push(v2.x, v2.y, v2.z);
        allVertices.push(v3.x, v3.y, v3.z);
      });

      // Create geometry for all triangles
      const groupGeometry = new THREE.BufferGeometry();
      groupGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVertices), 3));

      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0x4287f5,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthTest: false,
      });

      this.selectionHighlight = new THREE.Mesh(groupGeometry, highlightMaterial);
      this.selectionHighlight.position.copy(face.position);
      this.selectionHighlight.rotation.copy(face.rotation);
      this.selectionHighlight.scale.copy(face.scale);
      this.selectionHighlight.renderOrder = 998;

      this.scene.add(this.selectionHighlight);
    }
  }

  onContextMenu(event) {
    if (!this.enabled) return;

    // Check if we're right-clicking on a face
    const rect = this.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);
    const sketchFaces = this.getSketchFaces();
    const intersects = this.raycaster.intersectObjects(sketchFaces, false);

    if (intersects.length > 0) {
      const face = intersects[0].object;
      const faceIndex = intersects[0].faceIndex;

      // For 3D bodies, check if face is front-facing (same logic as onMouseMove)
      if (!face.userData.sketchFace) {
        const geometry = face.geometry;
        const position = geometry.attributes.position;

        const i1 = faceIndex * 3;
        const i2 = faceIndex * 3 + 1;
        const i3 = faceIndex * 3 + 2;

        const v1 = new THREE.Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
        const v2 = new THREE.Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
        const v3 = new THREE.Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

        const worldNormal = normal.clone().transformDirection(face.matrixWorld);
        const faceWorldPos = intersects[0].point;
        const viewDir = new THREE.Vector3().subVectors(this.camera.position, faceWorldPos).normalize();
        const dotProduct = worldNormal.dot(viewDir);

        if (dotProduct < 0) {
          // Face is back-facing, treat as empty space
          event.preventDefault();
          this.hideContextMenu();
          this.deselectFace();
          return;
        }
      }

      // For 3D bodies, convert to unified face group
      let unifiedFaceId = faceIndex;
      if (!face.userData.sketchFace) {
        const faceGroups = this.buildFaceGroups(face);
        unifiedFaceId = faceGroups.faceToGroup.get(faceIndex);
      }

      // Select the face if not already selected
      if (face !== this.selectedFace || this.selectedFaceIndex !== unifiedFaceId) {
        this.selectFace(face, unifiedFaceId);
      }

      // Close objects browser context menu if it's open
      if (window.KIVI?.system?.objectsBrowser) {
        window.KIVI.system.objectsBrowser.hideContextMenu();
      }

      // Show context menu
      event.preventDefault();
      this.showContextMenu(face, event.clientX, event.clientY);
    } else {
      // Right-click on empty space - close context menus and deselect
      event.preventDefault();
      this.hideContextMenu();

      // Also close objects browser context menu if it's open
      if (window.KIVI?.system?.objectsBrowser) {
        window.KIVI.system.objectsBrowser.hideContextMenu();
      }

      this.deselectFace();
    }
  }

  showContextMenu(face, x, y) {
    // Remove any existing context menu
    this.hideContextMenu();

    // Determine if this is a sketch face or body face
    const isSketchFace = face.userData.sketchFace;
    let targetObject = null;

    if (isSketchFace) {
      // Get the sketch from the face
      const sketchContainer = face.parent?.parent; // face -> selectionMeshes group -> sketch container
      if (!sketchContainer?.userData?.kivi?.sketchData) {
        console.warn('Could not find sketch for face');
        return;
      }
      targetObject = sketchContainer;
    } else {
      // It's a body face
      targetObject = face;
    }

    // Create context menu
    this.contextMenu = document.createElement('div');
    this.contextMenu.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      min-width: 120px;
    `;

    // Create menu item
    const extrudeItem = document.createElement('div');
    extrudeItem.textContent = 'Extrude';
    extrudeItem.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.2s;
    `;

    extrudeItem.addEventListener('mouseenter', () => {
      extrudeItem.style.background = '#f0f0f0';
    });
    extrudeItem.addEventListener('mouseleave', () => {
      extrudeItem.style.background = 'transparent';
    });
    extrudeItem.addEventListener('click', () => {
      this.hideContextMenu();

      if (isSketchFace) {
        // Extrude sketch face
        if (window.KIVI?.system?.objectsBrowser) {
          window.KIVI.system.objectsBrowser.showExtrudeDialog(targetObject);
        }
      } else {
        // Extrude body face - pass the stored face group directly
        if (window.KIVI?.system?.objectsBrowser) {
          window.KIVI.system.objectsBrowser.showExtrudeBodyFaceDialog(targetObject, this.selectedFaceGroup);
        }
      }
    });

    this.contextMenu.appendChild(extrudeItem);
    document.body.appendChild(this.contextMenu);

    // Close menu when clicking elsewhere
    const closeMenu = (e) => {
      if (!this.contextMenu?.contains(e.target)) {
        this.hideContextMenu();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  dispose() {
    this.clearHover();
    this.deselectFace();
    this.hideContextMenu();
  }
}
