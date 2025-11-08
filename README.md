# KIVI Draft

A minimal modeling studio for simulating manufacturing processes with simple primitives, built with Three.js and designed for LLM-driven development.

## Features

- **Three.js-based 3D viewport** with orthographic camera
- **Fusion 360-style view cube** for camera orientation
- **Quaternion-based camera controls** with smooth pole crossing (no gimbal lock)
- **Right-click drag to rotate** camera around the scene
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

## Global KIVI Object

The `window.KIVI` object provides access to the entire scene:

```javascript
// Scene objects
KIVI.objects.box           // The test box mesh

// System objects
KIVI.system.camera         // OrthographicCamera
KIVI.system.gridHelper     // Grid helper
KIVI.system.axesHelper     // Axes helper
KIVI.system.viewCube       // View cube (camera orientation indicator)
KIVI.system.cameraController // Camera controller

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
KIVI.objects.box.material.color.setHex(0xff0000);
KIVI.render();

// Move camera
KIVI.camera.position.set(10, 10, 10);
KIVI.camera.lookAt(0, 0, 0);
KIVI.render();

// Add a sphere
const sphere = new KIVI.THREE.Mesh(
  new KIVI.THREE.SphereGeometry(0.5),
  new KIVI.THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
KIVI.addObject('sphere', sphere);
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
npm run debug:eval:client "KIVI.objects.box.material.color.setHex(0xff0000)"
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
npm run debug:eval:client "KIVI.objects.box.material.color.setHex(0xff0000); KIVI.render()"

# Add a new sphere
npm run debug:eval:client "const sphere = new KIVI.THREE.Mesh(new KIVI.THREE.SphereGeometry(0.5), new KIVI.THREE.MeshStandardMaterial({color: 0x00ff00})); KIVI.addObject('sphere', sphere)"
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

### Logging System

- **Current session**: `logs/current-session.log` (cleared on restart)
- **All sessions**: `logs/app.log` (rotates at 1MB)
- **Transport**: Socket.IO WebSocket
- **Auto-capture**: All console.log/warn/error/debug automatically logged

### Camera Controller

The camera controller uses **quaternion-based rotation** to avoid gimbal lock:
- Horizontal rotation around world Y-axis
- Vertical rotation around camera's local right axis
- Camera's up vector rotates along with position
- Enables smooth rotation through poles without inversion

This is the same approach used in professional 3D applications (Blender, Maya, Fusion 360).

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

## Future Plans

- Boolean operations (union, subtract, intersect)
- Extrude, revolve, sweep operations
- Fillet and chamfer
- Parametric constraints
- Export to STEP/STL formats

## License

ISC

## Version

0.0.1
