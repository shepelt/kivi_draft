# KIVI Draft Backlog

## Rules
- Keep backlog items short and simple, ideally one-liners

## Done (v0.0.1)

- TASK-1: Three.js viewport with orthographic camera
- TASK-2: View cube for camera orientation
- TASK-3: Quaternion-based camera controls (no gimbal lock)
- TASK-4: Smart grid with adaptive labeling (1 unit = 1mm)
- TASK-5: Objects browser with folder hierarchy
- TASK-6: Copy/paste functionality
- TASK-7: Context menu operations (rename, delete, hide/show)
- TASK-8: LLM debugging system (WebSocket, remote eval)
- TASK-9: Global KIVI object for console access

## In Progress

## Next Up (v0.0.2)

- TASK-10: 2D sketch editor on selected plane/face
- TASK-11: Sketch data structure (entities, constraints, parameters)
- TASK-12: Line tool
- TASK-13: Arc tool
- TASK-14: Circle tool
- TASK-15: Basic sketch constraints (horizontal, vertical, coincident)

## Ideas & Architecture Decisions

### Data Representations

**2D Sketches:**
- Store as structured data (not SVG), render to SVG/Canvas for display
- Structure: entities (lines, arcs, circles) + constraints + parameters
- Supports parametric relationships and dimensions
- Can be evaluated to precise geometry for 3D operations

**3D Solids (Hybrid B-Rep + Feature History):**
- Store feature history (extrude, cut, revolve, blend) for parametric editing
- Generate B-Rep (boundary representation) from features
- Convert B-Rep to THREE.js mesh for display
- Allows regeneration when features are edited
- Store in object.userData.kivi

**Phase 1 (MVP):** Use THREE.js BufferGeometry + feature history, add proper B-Rep later

### Core Operations (Design Philosophy)

**4 primitives for realistic sci-fi mechanics:**
1. **Extrude** - Add material from 2D sketch
2. **Revolve** - Axially symmetric parts (shafts, gears, pulleys)
3. **Cut** - Remove material (holes, pockets, slots)
4. **Blend** - Fillets and chamfers

**Intentionally excluded:**
- Sweep, loft, sculpting (artistic mesh manipulation)
- Advanced surfacing (too complex, not mechanical)

**Rationale:** Real engineering constraints create believable sci-fi mechanics

## Future (v0.1+)

### Phase 3: 3D Operations
- TASK-16: Extrude operation (add material)
- TASK-17: Cut operation (subtract material via extrude/revolve)
- TASK-18: Revolve operation (axial symmetry)
- TASK-19: Blend operation (fillets/chamfers)

### Phase 4: Advanced
- TASK-20: Pattern (linear, circular)
- TASK-21: Mirror
- TASK-22: Shell (hollow out parts)
- TASK-23: Assembly constraints (mates)
- TASK-24: Joint definitions (revolute, prismatic, fixed)

### Phase 5: Export & Simulation
- TASK-25: STL export (3D printing)
- TASK-26: STEP export (CAD interchange)
- TASK-27: Motion simulation (kinematics)
- TASK-28: Basic collision detection

## Technical Debt & Improvements

- DEBT-1: Consider proper B-Rep library for exact geometry
- DEBT-2: CSG library for boolean operations
- DEBT-3: Constraint solver for parametric sketches
- DEBT-4: History-based regeneration system
