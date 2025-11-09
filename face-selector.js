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

    // Highlight meshes
    this.hoverHighlight = null;
    this.selectionHighlight = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.domElement.addEventListener('click', (e) => this.onClick(e));
    this.domElement.addEventListener('contextmenu', (e) => this.onContextMenu(e));
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
      const face = intersects[0].object;

      // Only update if we're hovering a different face
      if (this.hoveredFace !== face) {
        this.setHoveredFace(face);
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
      // Click on a face - select it
      this.selectFace(this.hoveredFace);
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

  setHoveredFace(face) {
    // Clear previous hover
    this.clearHover();

    this.hoveredFace = face;
    console.log('Face hovered:', face.name || 'unnamed');

    // Create dark edge highlight
    this.createHoverHighlight(face);

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

  selectFace(face) {
    // If clicking the same face, ignore (already selected)
    if (this.selectedFace === face) {
      console.log('Face already selected, ignoring');
      return;
    }

    // Deselect previous if different
    if (this.selectedFace && this.selectedFace !== face) {
      this.deselectFace();
    }

    this.selectedFace = face;
    console.log('Face selected:', face.name || 'unnamed');

    // Create blue face highlight
    this.createSelectionHighlight(face);

    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  deselectFace() {
    if (this.selectedFace) {
      console.log('Face deselected:', this.selectedFace.name || 'unnamed');
      this.selectedFace = null;
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

  createHoverHighlight(face) {
    // Check if this is a sketch face
    if (face.userData.sketchFace) {
      // For sketch faces, highlight the edges that form the loop
      this.createSketchEdgeHighlight(face, 0x222222); // Dark color for hover
    } else {
      // For 3D body faces, use edge geometry
      const edges = new THREE.EdgesGeometry(face.geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x222222, // Very dark gray, almost black
        linewidth: 3,
        depthTest: false,
      });

      this.hoverHighlight = new THREE.LineSegments(edges, lineMaterial);
      this.hoverHighlight.position.copy(face.position);
      this.hoverHighlight.rotation.copy(face.rotation);
      this.hoverHighlight.scale.copy(face.scale);
      this.hoverHighlight.renderOrder = 999; // Render on top

      this.scene.add(this.hoverHighlight);
    }
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

  createSelectionHighlight(face) {
    // Create blue semi-transparent face overlay
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

      // Only show context menu for sketch faces that are selected
      if (face.userData.sketchFace && face === this.selectedFace) {
        event.preventDefault();
        this.showContextMenu(face, event.clientX, event.clientY);
      }
    }
  }

  showContextMenu(face, x, y) {
    // Remove any existing context menu
    this.hideContextMenu();

    // Get the sketch from the face
    const sketchContainer = face.parent?.parent; // face -> selectionMeshes group -> sketch container
    if (!sketchContainer?.userData?.kivi?.sketchData) {
      console.warn('Could not find sketch for face');
      return;
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
      // Get the KIVI instance from the scene (assuming it's available globally)
      if (window.KIVI?.system?.objectsBrowser) {
        window.KIVI.system.objectsBrowser.showExtrudeDialog(sketchContainer);
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
