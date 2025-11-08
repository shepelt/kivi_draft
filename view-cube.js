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
  }

  createCube() {
    const size = 1.0;  // Smaller cube to leave room for labels
    const geometry = new THREE.BoxGeometry(size, size, size);

    // Create materials for each face with labels
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const createFaceTexture = (text, color = '#e8e8e8') => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Solid grey background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 256);

      // Text
      ctx.fillStyle = '#333';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      return new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.FrontSide,  // Only render front faces
        depthWrite: true,  // Write to depth buffer so labels can hide behind
        transparent: false,  // Completely opaque
        opacity: 1.0  // Full opacity
      });
    };

    const materials = [
      createFaceTexture('RIGHT', '#e8e8e8'),   // +X
      createFaceTexture('LEFT', '#e8e8e8'),    // -X
      createFaceTexture('TOP', '#f5f5f5'),     // +Y
      createFaceTexture('BOTTOM', '#e0e0e0'),  // -Y
      createFaceTexture('FRONT', '#e8e8e8'),   // +Z
      createFaceTexture('BACK', '#e8e8e8')     // -Z
    ];

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
    const arrowLength = 0.25;
    const arrowWidth = 0.08;

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

    // X arrow
    const xArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.set(
      origin.x + axisLength + arrowLength / 2,
      origin.y,
      origin.z
    );
    this.scene.add(xArrow);

    // X label (sprite always faces camera)
    this.xLabel = this.createAxisLabel('X',
      origin.x + axisLength + arrowLength + 0.15,
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

    // Y arrow
    const yArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.set(
      origin.x,
      origin.y + axisLength + arrowLength / 2,
      origin.z
    );
    this.scene.add(yArrow);

    // Y label (sprite always faces camera)
    this.yLabel = this.createAxisLabel('Y',
      origin.x,
      origin.y + axisLength + arrowLength + 0.15,
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

    // Z arrow
    const zArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = -Math.PI / 2; // Point away from viewer
    zArrow.position.set(
      origin.x,
      origin.y,
      origin.z - axisLength - arrowLength / 2
    );
    this.scene.add(zArrow);

    // Z label (sprite always faces camera)
    this.zLabel = this.createAxisLabel('Z',
      origin.x,
      origin.y,
      origin.z - axisLength - arrowLength - 0.15,
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

  update() {
    // The view cube shows the orientation of the world
    // It should rotate to match how the camera sees the world
    // Extract camera position relative to target
    const cameraPos = this.mainCamera.position.clone();

    // Point the view cube camera at the same relative position (further back for zoom out)
    this.camera.position.copy(cameraPos).normalize().multiplyScalar(7);

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
