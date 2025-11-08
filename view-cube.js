// View Cube - Camera position visualizer similar to Fusion 360
import * as THREE from 'three';

export class ViewCube {
  constructor(mainCamera, mainScene) {
    this.mainCamera = mainCamera;
    this.mainScene = mainScene;

    // Create separate scene and camera for the view cube
    this.scene = new THREE.Scene();
    // No background - will be semi-transparent
    this.camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100); // Reduced FOV for less dramatic perspective
    this.camera.position.set(0, 0, 5);

    // Create the cube
    this.createCube();

    // Create axes
    this.createAxes();

    // Size and position (will be set during render)
    this.size = 180; // pixels
    this.padding = 20; // pixels from corner

    // Create home button overlay
    this.createHomeButton();

    // Setup raycasting for face interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredFace = null;
    this.setupFaceInteraction();
  }

  createCube() {
    const size = 1.0;  // Smaller cube to leave room for labels

    // Create materials for each face with labels
    const createFaceTexture = (text, color = '#e8e8e8', hoverColor = '#d0d0d0') => {
      const normal = document.createElement('canvas');
      normal.width = 256;
      normal.height = 256;
      const ctx = normal.getContext('2d');

      // Solid grey background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 256);

      // Text
      ctx.fillStyle = '#333';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 128);

      const hover = document.createElement('canvas');
      hover.width = 256;
      hover.height = 256;
      const hoverCtx = hover.getContext('2d');

      // Hover background (lighter)
      hoverCtx.fillStyle = hoverColor;
      hoverCtx.fillRect(0, 0, 256, 256);

      // Text
      hoverCtx.fillStyle = '#333';
      hoverCtx.font = 'bold 48px Arial';
      hoverCtx.textAlign = 'center';
      hoverCtx.textBaseline = 'middle';
      hoverCtx.fillText(text, 128, 128);

      return {
        normal: new THREE.CanvasTexture(normal),
        hover: new THREE.CanvasTexture(hover),
        material: new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(normal),
          side: THREE.FrontSide,
          depthWrite: true,
          transparent: false,
          opacity: 1.0
        })
      };
    };

    // Store face data for interaction
    this.faceData = [
      { name: 'RIGHT', texture: createFaceTexture('RIGHT', '#e8e8e8', '#a0d0ff') },   // +X
      { name: 'LEFT', texture: createFaceTexture('LEFT', '#e8e8e8', '#a0d0ff') },     // -X
      { name: 'TOP', texture: createFaceTexture('TOP', '#f5f5f5', '#a0d0ff') },       // +Y
      { name: 'BOTTOM', texture: createFaceTexture('BOTTOM', '#e0e0e0', '#a0d0ff') }, // -Y
      { name: 'FRONT', texture: createFaceTexture('FRONT', '#e8e8e8', '#a0d0ff') },   // +Z
      { name: 'BACK', texture: createFaceTexture('BACK', '#e8e8e8', '#a0d0ff') }      // -Z
    ];

    const materials = this.faceData.map(face => face.texture.material);

    const geometry = new THREE.BoxGeometry(size, size, size);
    this.cube = new THREE.Mesh(geometry, materials);
    this.cube.renderOrder = 0; // Render cube first
    this.scene.add(this.cube);

    // Add dashed edges
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineDashedMaterial({
      color: 0x666666,  // Brighter gray
      linewidth: 1,
      scale: 1,
      dashSize: 0.25,  // Longer dashes
      gapSize: 0.15,   // Larger gaps
      depthTest: true,
      depthWrite: false
    });
    this.edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.edges.computeLineDistances(); // Required for dashed lines
    this.edges.renderOrder = 1; // Render edges after cube
    this.scene.add(this.edges);
  }

  createAxes() {
    const cubeSize = 1.0;  // Match the cube size
    const axisLength = 1.5; // Length extending from corner

    // Origin point at corner where FRONT, BOTTOM, LEFT meet
    // In cube coordinates: LEFT=-X, BOTTOM=-Y, FRONT=+Z
    const origin = new THREE.Vector3(-cubeSize/2, -cubeSize/2, cubeSize/2);

    // X axis (Red) - along bottom-front edge, pointing RIGHT
    const xGeometry = new THREE.CylinderGeometry(0.015, 0.015, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.set(
      origin.x + axisLength / 2,
      origin.y,
      origin.z
    );
    this.scene.add(xAxis);

    // X label (sprite always faces camera) - closer to end
    this.xLabel = this.createAxisLabel('X',
      origin.x + axisLength + 0.15,
      origin.y,
      origin.z,
      0xff0000
    );

    // Y axis (Green) - along left-front edge, pointing UP
    const yGeometry = new THREE.CylinderGeometry(0.015, 0.015, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.set(
      origin.x,
      origin.y + axisLength / 2,
      origin.z
    );
    this.scene.add(yAxis);

    // Y label (sprite always faces camera) - closer to end
    this.yLabel = this.createAxisLabel('Y',
      origin.x,
      origin.y + axisLength + 0.15,
      origin.z,
      0x00ff00
    );

    // Z axis (Blue) - along left-bottom edge, pointing BACK (away from viewer)
    const zGeometry = new THREE.CylinderGeometry(0.015, 0.015, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.set(
      origin.x,
      origin.y,
      origin.z - axisLength / 2
    );
    this.scene.add(zAxis);

    // Z label (sprite always faces camera) - closer to end
    this.zLabel = this.createAxisLabel('Z',
      origin.x,
      origin.y,
      origin.z - axisLength - 0.15,
      0x0000ff
    );
  }

  createAxisLabel(text, x, y, z, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = '36px Arial';  // Smaller font, no bold
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,  // Hide labels behind cube
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(0.3, 0.3, 1);  // Larger and more readable
    sprite.renderOrder = 1000;  // Render after everything else
    this.scene.add(sprite);
    return sprite;
  }

  createHomeButton() {
    // Create HTML overlay button for home icon
    this.homeButton = document.createElement('div');
    this.homeButton.style.cssText = `
      position: absolute;
      width: 32px;
      height: 32px;
      background: rgba(240, 240, 240, 0.9);
      border: 1px solid #ccc;
      border-radius: 4px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 100;
      transition: background 0.2s;
    `;

    // Create home icon using Lucide
    const homeIcon = document.createElement('i');
    homeIcon.setAttribute('data-lucide', 'home');
    homeIcon.style.cssText = `
      width: 20px;
      height: 20px;
      color: #666;
    `;
    this.homeButton.appendChild(homeIcon);

    // Hover effect
    this.homeButton.addEventListener('mouseenter', () => {
      this.homeButton.style.background = 'rgba(220, 220, 220, 0.95)';
    });
    this.homeButton.addEventListener('mouseleave', () => {
      this.homeButton.style.background = 'rgba(240, 240, 240, 0.9)';
    });

    // Click to reset camera
    this.homeButton.addEventListener('click', () => {
      this.resetCamera();
    });

    document.body.appendChild(this.homeButton);

    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }

    // Track mouse position over view cube area
    this.setupHomeButtonVisibility();
  }

  setupFaceInteraction() {
    document.addEventListener('mousemove', (e) => {
      if (!this.viewCubeBounds) return;

      const { x, y, width, height } = this.viewCubeBounds;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Convert mouse Y from screen coordinates (top-left origin) to WebGL coordinates (bottom-left origin)
      const mouseYGL = window.innerHeight - mouseY;

      // Check if mouse is over view cube (in WebGL coordinates)
      this.isMouseOverCube = (
        mouseX >= x &&
        mouseX <= x + width &&
        mouseYGL >= y &&
        mouseYGL <= y + height
      );

      this.updateHomeButtonVisibility();

      // If over cube, check which face is being hovered
      if (this.isMouseOverCube) {
        // Convert to normalized coordinates within the view cube viewport
        this.mouse.x = ((mouseX - x) / width) * 2 - 1;
        this.mouse.y = ((mouseYGL - y) / height) * 2 - 1;

        // Raycast to find which face
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.cube);

        console.log('Raycasting:', {
          mouse: { x: this.mouse.x, y: this.mouse.y },
          intersects: intersects.length,
          cubeVisible: this.cube.visible,
          materials: this.cube.material.length
        });

        if (intersects.length > 0) {
          const faceIndex = Math.floor(intersects[0].faceIndex / 2); // Each face has 2 triangles
          console.log('Face index:', faceIndex, 'Name:', this.faceData[faceIndex].name);
          this.setHoveredFace(faceIndex);
        } else {
          this.setHoveredFace(null);
        }
      } else {
        this.setHoveredFace(null);
      }
    });

    // Click to snap to face view
    document.addEventListener('click', (e) => {
      if (this.hoveredFace !== null && this.isMouseOverCube) {
        this.snapToFace(this.hoveredFace);
      }
    });
  }

  setupHomeButtonVisibility() {
    // This is now handled in setupFaceInteraction
  }

  updateHomeButtonVisibility() {
    if (this.isMouseOverCube && this.viewCubeBounds) {
      this.homeButton.style.display = 'flex';
      // Position at top-left of view cube (convert from WebGL coords to screen coords)
      this.homeButton.style.left = `${this.viewCubeBounds.x}px`;
      this.homeButton.style.top = `${window.innerHeight - this.viewCubeBounds.y - this.viewCubeBounds.height}px`;
    } else {
      this.homeButton.style.display = 'none';
    }
  }

  setHoveredFace(faceIndex) {
    if (this.hoveredFace === faceIndex) return;

    // Reset previous hovered face
    if (this.hoveredFace !== null && this.hoveredFace < this.faceData.length) {
      const prevFace = this.faceData[this.hoveredFace];
      const prevMaterial = this.cube.material[this.hoveredFace];
      prevMaterial.map = prevFace.texture.normal;
      prevMaterial.needsUpdate = true;
    }

    // Set new hovered face
    this.hoveredFace = faceIndex;
    if (this.hoveredFace !== null && this.hoveredFace < this.faceData.length) {
      const face = this.faceData[this.hoveredFace];
      const material = this.cube.material[this.hoveredFace];
      material.map = face.texture.hover;
      material.needsUpdate = true;
      document.body.style.cursor = 'pointer';

      // Trigger a render to show the change immediately
      if (window.KIVI && window.KIVI.render) {
        window.KIVI.render();
      }
    } else {
      document.body.style.cursor = 'default';
    }
  }

  snapToFace(faceIndex) {
    // Get target face normal (the direction camera will look from)
    const faceNormals = [
      new THREE.Vector3(1, 0, 0),   // RIGHT (+X)
      new THREE.Vector3(-1, 0, 0),  // LEFT (-X)
      new THREE.Vector3(0, 1, 0),   // TOP (+Y)
      new THREE.Vector3(0, -1, 0),  // BOTTOM (-Y)
      new THREE.Vector3(0, 0, 1),   // FRONT (+Z)
      new THREE.Vector3(0, 0, -1)   // BACK (-Z)
    ];

    // Canonical up vectors for each face (for snapping)
    const canonicalUps = [
      new THREE.Vector3(0, 1, 0),   // RIGHT - Y up
      new THREE.Vector3(0, 1, 0),   // LEFT - Y up
      new THREE.Vector3(0, 0, -1),  // TOP - -Z up (back is down)
      new THREE.Vector3(0, 0, 1),   // BOTTOM - +Z up (front is down)
      new THREE.Vector3(0, 1, 0),   // FRONT - Y up
      new THREE.Vector3(0, 1, 0)    // BACK - Y up
    ];

    const distance = 5;
    const targetNormal = faceNormals[faceIndex];
    const targetPosition = targetNormal.clone().multiplyScalar(distance);

    // Get current view direction (from camera to origin)
    const currentViewDir = new THREE.Vector3(0, 0, 0).sub(this.mainCamera.position).normalize();
    const targetViewDir = targetNormal.clone().negate(); // Looking at origin from the face

    // Find the rotation axis (shared edge between current and target face)
    // This is perpendicular to both view directions
    const rotationAxis = new THREE.Vector3().crossVectors(currentViewDir, targetViewDir);

    let intermediateUp;

    if (rotationAxis.length() < 0.001) {
      // Faces are opposite (180° rotation) - maintain current up or flip it
      if (currentViewDir.dot(targetViewDir) < 0) {
        // Opposite faces - flip up
        intermediateUp = this.mainCamera.up.clone().negate();
      } else {
        // Same face - keep up
        intermediateUp = this.mainCamera.up.clone();
      }
    } else {
      // Rotate the current up vector around the shared edge
      rotationAxis.normalize();

      // Calculate rotation angle
      const angle = Math.acos(Math.max(-1, Math.min(1, currentViewDir.dot(targetViewDir))));

      // Rotate current up vector around the rotation axis
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(rotationAxis, angle);
      intermediateUp = this.mainCamera.up.clone().applyQuaternion(quaternion);
    }

    // Ensure intermediate up is perpendicular to target view direction
    const right = new THREE.Vector3().crossVectors(intermediateUp, targetViewDir).normalize();
    intermediateUp = new THREE.Vector3().crossVectors(targetViewDir, right).normalize();

    // Find the nearest canonical orientation by snapping to the closest cardinal direction
    // For each face, there are multiple valid "up" directions - we want the one closest to intermediateUp
    const getValidUpDirections = (faceIndex) => {
      // For TOP and BOTTOM, valid ups are ±X and ±Z
      if (faceIndex === 2) { // TOP
        return [
          new THREE.Vector3(0, 0, -1),  // -Z (canonical: BACK down)
          new THREE.Vector3(0, 0, 1),   // +Z (FRONT down)
          new THREE.Vector3(1, 0, 0),   // +X (RIGHT down)
          new THREE.Vector3(-1, 0, 0)   // -X (LEFT down)
        ];
      } else if (faceIndex === 3) { // BOTTOM
        return [
          new THREE.Vector3(0, 0, 1),   // +Z (canonical: FRONT down)
          new THREE.Vector3(0, 0, -1),  // -Z (BACK down)
          new THREE.Vector3(1, 0, 0),   // +X (RIGHT down)
          new THREE.Vector3(-1, 0, 0)   // -X (LEFT down)
        ];
      } else { // FRONT, BACK, LEFT, RIGHT
        return [
          new THREE.Vector3(0, 1, 0),   // +Y (canonical: up)
          new THREE.Vector3(0, -1, 0),  // -Y (upside down)
          new THREE.Vector3(1, 0, 0),   // +X (rotated 90° CCW)
          new THREE.Vector3(-1, 0, 0)   // -X (rotated 90° CW)
        ];
      }
    };

    // Find the valid up direction closest to intermediateUp
    const validUps = getValidUpDirections(faceIndex);
    let targetUp = validUps[0];
    let maxDot = -Infinity;

    for (const validUp of validUps) {
      const dot = intermediateUp.dot(validUp);
      if (dot > maxDot) {
        maxDot = dot;
        targetUp = validUp.clone();
      }
    }

    // Now we have both the position and final snapped up vector - animate directly to final state
    const duration = 500;
    const startTime = Date.now();
    const startPosition = this.mainCamera.position.clone();
    const startUp = this.mainCamera.up.clone();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.mainCamera.position.lerpVectors(startPosition, targetPosition, eased);
      this.mainCamera.up.lerpVectors(startUp, targetUp, eased);
      this.mainCamera.up.normalize();

      this.mainCamera.lookAt(0, 0, 0);

      // Reset camera controller target
      if (window.KIVI && window.KIVI.system && window.KIVI.system.cameraController) {
        window.KIVI.system.cameraController.target.set(0, 0, 0);
      }

      if (window.KIVI && window.KIVI.render) {
        window.KIVI.render();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  resetCamera() {
    // Animate camera to default position
    const targetPosition = new THREE.Vector3(5, 5, 5);
    const targetUp = new THREE.Vector3(0, 1, 0);
    const duration = 500; // milliseconds
    const startTime = Date.now();

    // Store starting values
    const startPosition = this.mainCamera.position.clone();
    const startUp = this.mainCamera.up.clone();

    // Animation function
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic function for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate position
      this.mainCamera.position.lerpVectors(startPosition, targetPosition, eased);

      // Interpolate up vector
      this.mainCamera.up.lerpVectors(startUp, targetUp, eased);

      // Update lookAt
      this.mainCamera.lookAt(0, 0, 0);

      // Also reset camera controller target if it exists
      if (window.KIVI && window.KIVI.system && window.KIVI.system.cameraController) {
        window.KIVI.system.cameraController.target.set(0, 0, 0);
        window.KIVI.system.cameraController.currentZoom = 5; // Reset zoom

        // Update camera frustum
        const aspect = this.mainCamera.right / this.mainCamera.top;
        this.mainCamera.left = 5 * aspect / -2;
        this.mainCamera.right = 5 * aspect / 2;
        this.mainCamera.top = 5 / 2;
        this.mainCamera.bottom = 5 / -2;
        this.mainCamera.updateProjectionMatrix();
      }

      // Trigger render
      if (window.KIVI && window.KIVI.render) {
        window.KIVI.render();
      }

      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    // Start animation
    animate();
  }

  update() {
    // The view cube shows the orientation of the world
    // It should rotate to match how the camera sees the world

    // Get the actual target from camera controller if available
    let target = new THREE.Vector3(0, 0, 0);
    if (window.KIVI && window.KIVI.system && window.KIVI.system.cameraController) {
      target = window.KIVI.system.cameraController.target.clone();
    }

    // Calculate camera direction relative to target
    const cameraOffset = new THREE.Vector3().subVectors(this.mainCamera.position, target);
    const direction = cameraOffset.clone().normalize();

    // Point the view cube camera in the same direction (further back for zoom out)
    this.camera.position.copy(direction).multiplyScalar(7);

    // Copy the main camera's up vector to match its orientation
    this.camera.up.copy(this.mainCamera.up);

    this.camera.lookAt(0, 0, 0);

    // Update edges to match cube orientation (edges don't rotate, they're part of the scene)
    // Note: edges are already children of the scene, so they don't need manual rotation
  }

  render(renderer, width, height) {
    // Update cube orientation
    this.update();

    // Save current state
    const currentRenderTarget = renderer.getRenderTarget();
    const currentViewport = new THREE.Vector4();
    renderer.getViewport(currentViewport);
    const currentScissor = new THREE.Vector4();
    renderer.getScissor(currentScissor);
    const currentScissorTest = renderer.getScissorTest();
    const currentAutoClear = renderer.autoClear;

    // Set up viewport for view cube (upper right corner)
    const cubeWidth = this.size;
    const cubeHeight = this.size;
    const x = width - cubeWidth - this.padding;
    const y = height - cubeHeight - this.padding;

    // Store bounds for hover detection (keep in WebGL coordinates, we'll convert mouse)
    this.viewCubeBounds = {
      x: x,
      y: y, // WebGL coordinates (bottom-left origin)
      width: cubeWidth,
      height: cubeHeight
    };

    renderer.setViewport(x, y, cubeWidth, cubeHeight);
    renderer.setScissor(x, y, cubeWidth, cubeHeight);
    renderer.setScissorTest(true);
    renderer.autoClear = false;

    // Clear depth buffer in the view cube area so it always renders on top
    renderer.clearDepth();

    // Render the view cube
    renderer.render(this.scene, this.camera);

    // Restore state
    renderer.setViewport(currentViewport);
    renderer.setScissor(currentScissor);
    renderer.setScissorTest(currentScissorTest);
    renderer.autoClear = currentAutoClear;
    if (currentRenderTarget) {
      renderer.setRenderTarget(currentRenderTarget);
    }
  }
}
