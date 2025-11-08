# KIVI Draft

A mechanical CAD tool for designing realistic sci-fi robots and mechanisms, built with Three.js and designed for LLM-driven development.

## Design Philosophy

KIVI is built around three core principles:

### 1. Realistic Mechanics for Sci-Fi
KIVI uses real-world manufacturing primitives to create **believable mechanical designs** for science fiction:
- **Engineering-based operations** (extrude, cut, revolve, blend)
- **Real mechanical principles** (gears, shafts, joints, linkages)
- **Grounded in reality** - no magical mesh sculpting
- **Perfect for:** Sci-fi robots, mechs, droids, spacecraft mechanisms, futuristic vehicles

By constraining designs to real machining operations, you get **plausible fictional mechanics** that feel engineered, not just artistic shapes.

### 2. Simplicity Over Features
Professional CAD tools have 100+ features. KIVI focuses on **4 core operations** that cover 90% of mechanical design:
- **Extrude** - Add material from 2D sketch
- **Revolve** - Create axially symmetric parts (shafts, gears, pulleys)
- **Cut** - Remove material (holes, pockets, slots)
- **Blend** - Round or bevel edges (fillets, chamfers)

With just these operations, you can design: robot limbs, gear assemblies, articulated joints, mechanical appendages, and complete mech designs.

### 3. Built for Sci-Fi Creators
KIVI targets **concept artists, game developers, and sci-fi worldbuilders** who need:
- Fast iteration on mechanical designs
- Realistic-looking robotics and machinery
- Lightweight, web-based workflow
- Parametric design capabilities
- Export to 3D formats (STL, STEP)

**Not trying to be:**
- Blender (artistic sculpting)
- SolidWorks (actual manufacturing)
- ZBrush (organic modeling)

**Targeting:**
- Believable sci-fi mechanics
- Realistic robot design
- Plausible futuristic machinery
- The simplicity of Tinkercad, but for mechanical realism

## Current Features

- **Three.js-based 3D viewport** with orthographic camera
- **Fusion 360-style view cube** for camera orientation
- **Smart grid** with adaptive labeling (1 unit = 1mm)
- **Objects browser** with folder hierarchy and visibility controls
- **Copy/paste** functionality for rapid design iteration
- **Context menu** operations (rename, delete, hide/show, duplicate)
- **Right-click drag to rotate** camera with quaternion-based controls (no gimbal lock)
- **Middle-click drag to pan** camera
- **Mouse wheel to zoom** with CAD-like infinite zoom (0.001mm to 10km)
- **Global KIVI object** for easy manipulation via console/LLM
- **Comprehensive logging system** with WebSocket-based debugging
- **LLM-friendly architecture** - No complex build system, designed for AI code generation

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Camera Controls

- **Right-click + drag**: Rotate camera around the scene
  - Horizontal drag: Rotate left/right
  - Vertical drag: Rotate up/down
  - Can rotate through top/bottom poles smoothly (no inversion)
- **Middle-click + drag**: Pan camera
- **Mouse wheel**: Zoom in/out (infinite zoom from 0.001mm to 10km)

## Objects Browser

The left sidebar shows your design hierarchy:
- **Folders** organize objects (system, bodies)
- **Eye icon** toggles visibility
- **Right-click** for context menu (copy, paste, rename, delete)
- **Click** to select objects
- **Expand/collapse** folders with arrow icon

## Global KIVI Object

The `window.KIVI` object provides access to the entire scene:

```javascript
// Scene objects
KIVI.objects.bodies        // Bodies folder (user parts)
KIVI.objects.system        // System folder (grid, axes)

// System objects
KIVI.system.camera         // OrthographicCamera
KIVI.system.viewCube       // View cube (camera orientation indicator)
KIVI.system.cameraController // Camera controller
KIVI.system.objectsBrowser // Objects browser UI

// Utilities
KIVI.scene                 // THREE.Scene
KIVI.camera                // THREE.OrthographicCamera
KIVI.renderer              // THREE.WebGLRenderer
KIVI.THREE                 // Full THREE.js library
KIVI.logger                // Logger instance
KIVI.debug                 // DebugInterface instance

// Methods
KIVI.render()              // Manually trigger a render
KIVI.getStats()            // Get current state
KIVI.logState()            // Log state to file
KIVI.listObjects()         // List all objects
KIVI.getObject(name)       // Get object by name
KIVI.addObject(name, obj)  // Add object to scene
KIVI.removeObject(name)    // Remove object from scene
```

### Example Usage

```javascript
// Change box color
const box = KIVI.objects.bodies.children[0];
box.material.color.setHex(0xff0000);
KIVI.render();

// Move camera
KIVI.camera.position.set(10, 10, 10);
KIVI.camera.lookAt(0, 0, 0);
KIVI.render();

// Add a new body to bodies folder
const sphere = new KIVI.THREE.Mesh(
  new KIVI.THREE.SphereGeometry(0.5),
  new KIVI.THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
sphere.name = 'sphere';
KIVI.objects.bodies.add(sphere);
KIVI.system.objectsBrowser.update();
KIVI.render();
```

## View Cube

The view cube in the upper-right corner shows the current camera orientation:
- **Labeled faces**: TOP, BOTTOM, LEFT, RIGHT, FRONT, BACK
- **Color-coded axes**: X (red), Y (green), Z (blue)
- **Semi-transparent background** to see underlying scene
- **Automatically updates** as you rotate the camera

## Debugging & LLM Tools

KIVI Draft includes a powerful debugging system designed for LLM interaction. All debugging is done via npm scripts.

### Log Commands

```bash
# View current session logs (formatted)
npm run logs:pretty

# View current session logs (raw JSON)
npm run logs

# View all historical logs
npm run logs:all
```

### WebSocket Debugging

```bash
# Test connection
npm run debug:ping

# Get logs via WebSocket
npm run debug:logs

# Get log file stats
npm run debug:stats

# Clear current session logs
npm run debug:clear

# Reload browser page
npm run debug:refresh
```

### Execute Code Remotely

```bash
# Execute code on CLIENT (browser)
npm run debug:eval:client "KIVI.camera.position.set(5, 5, 5); KIVI.render()"
npm run debug:eval:client "KIVI.objects.bodies.children[0].material.color.setHex(0xff0000)"
npm run debug:eval:client "KIVI.getStats()"

# Execute code on SERVER
npm run debug:eval:server "console.log('Hello from server')"
npm run debug:eval:server "fs.readdirSync('.')"
```

### LLM Workflow Examples

**1. Check if app is running:**
```bash
npm run debug:ping
# Output: "pong"
```

**2. Inspect client state:**
```bash
npm run debug:eval:client "KIVI.getStats()"
# Then check logs to see the result
npm run logs:pretty
```

**3. Modify scene from command line:**
```bash
# Change box color to red
npm run debug:eval:client "KIVI.objects.bodies.children[0].material.color.setHex(0xff0000); KIVI.render()"

# Add a new sphere to bodies folder
npm run debug:eval:client "const sphere = new KIVI.THREE.Mesh(new KIVI.THREE.SphereGeometry(0.5), new KIVI.THREE.MeshStandardMaterial({color: 0x00ff00})); sphere.name = 'sphere'; KIVI.objects.bodies.add(sphere); KIVI.system.objectsBrowser.update(); KIVI.render()"
```

**4. Camera manipulation:**
```bash
# Move to top view
npm run debug:eval:client "KIVI.camera.position.set(0, 10, 0); KIVI.camera.lookAt(0, 0, 0); KIVI.render()"

# Move to isometric view
npm run debug:eval:client "KIVI.camera.position.set(5, 5, 5); KIVI.camera.lookAt(0, 0, 0); KIVI.render()"
```

## Architecture

### File Structure

```
kivi_draft/
├── main.js              # Main application entry
├── camera-controller.js # Quaternion-based camera controls
├── view-cube.js         # Fusion 360-style orientation indicator
├── objects-browser.js   # Objects hierarchy UI panel
├── smart-grid.js        # Adaptive grid with zoom-based labeling
├── coordinate-system.js # Coordinate system configuration
├── logger.js            # Client-side logging
├── debug.js             # Client-side debug interface
├── server.js            # Express server with Socket.IO
├── cli-debug.js         # CLI debugging tool
├── index.html           # Main HTML file
├── package.json         # Dependencies
├── logs/                # Log files (auto-created)
│   ├── current-session.log  # Current session only
│   └── app.log              # All sessions (rotates at 1MB)
└── README.md            # This file
```

### Technology Stack

- **No UI frameworks** - Pure vanilla JavaScript and native DOM
- **THREE.js** - 3D rendering (only external dependency besides icons)
- **Lucide Icons** - Simple icon library
- **ES6 Modules** - Native import/export
- **Socket.IO** - WebSocket debugging

**Why no React/Vue/Angular?**
- Modern browsers are powerful enough with native APIs
- Simpler architecture for LLM code generation
- Smaller bundle size
- Direct DOM manipulation is fast for our use case

### Coordinate System

KIVI uses a **Y-up** coordinate system (standard for CAD/manufacturing):
- **X-axis**: Red (horizontal right)
- **Y-axis**: Green (vertical up) - matches THREE.js internal Z
- **Z-axis**: Blue (horizontal forward) - matches THREE.js internal Y

This matches real-world CNC machines and manufacturing conventions.

### Camera Controller

The camera controller uses **quaternion-based rotation** to avoid gimbal lock:
- Horizontal rotation around world Y-axis
- Vertical rotation around camera's local right axis
- Camera's up vector rotates along with position
- Enables smooth rotation through poles without inversion

This is the same approach used in professional 3D applications (Blender, Maya, Fusion 360).

### Logging System

- **Current session**: `logs/current-session.log` (cleared on restart)
- **All sessions**: `logs/app.log` (rotates at 1MB)
- **Transport**: Socket.IO WebSocket
- **Auto-capture**: All console.log/warn/error/debug automatically logged

## Security Warning

⚠️ **The debugging system is ONLY for single-user development!**
- Server-side `eval()` is dangerous in production
- Client-side `eval()` can execute arbitrary code
- Never expose this to the internet or multi-user environments

## Development Philosophy

KIVI Draft is designed for **LLM-driven development**:
- Simple, flat file structure (no complex build system)
- Everything exposed via global `KIVI` object
- Comprehensive logging for LLM introspection
- WebSocket-based remote code execution
- No TypeScript/JSX - pure JavaScript for better LLM compatibility
- Native HTML5/CSS/JavaScript - no framework dependencies

## Roadmap

### Phase 1: Foundation (Current)
- ✅ 3D viewport with camera controls
- ✅ Objects browser with hierarchy
- ✅ Copy/paste functionality
- ✅ Smart grid with adaptive labeling

### Phase 2: Sketching
- 🔲 2D sketch editor
- 🔲 Line, arc, circle tools
- 🔲 Sketch constraints (horizontal, vertical, parallel, perpendicular)
- 🔲 Dimensions and parametric relationships

### Phase 3: 3D Operations
- 🔲 **Extrude** - Add material from sketch
- 🔲 **Cut** - Remove material (extrude/revolve)
- 🔲 **Revolve** - Axially symmetric parts
- 🔲 **Blend** - Fillets and chamfers

### Phase 4: Advanced Features
- 🔲 Pattern (linear, circular)
- 🔲 Mirror
- 🔲 Shell (hollow out parts)
- 🔲 Assembly constraints (mates)
- 🔲 Joint definitions (revolute, prismatic)

### Phase 5: Export & Simulation
- 🔲 STL export (3D printing)
- 🔲 STEP export (CAD interchange)
- 🔲 G-code generation (CNC)
- 🔲 Motion simulation (kinematics)

## Contributing

KIVI is in active development. Contributions welcome!

## License

ISC

## Version

0.0.1
