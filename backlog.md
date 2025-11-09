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

- TASK-10: Basic extrusion editor (box primitives only)

## Next Up (v0.0.2)

- TASK-11: Feature history system (store extrude operations in userData)
- TASK-12: Basic cut operation (CSG subtract)
- TASK-13: Extrusion UI (depth parameter, direction)
- TASK-14: 2D sketch editor on selected plane/face
- TASK-15: Sketch data structure (entities, constraints, parameters)
- TASK-16: Line tool
- TASK-17: Arc tool
- TASK-18: Circle tool
- TASK-19: Basic sketch constraints (horizontal, vertical, coincident)
- TASK-20: Connect sketch editor to extrusion (replace box primitives)

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

### LLM Integration Strategy

**Primary focus: Assembly assistance (highest value)**

**Why Assembly > Sketching/Extrusion:**
- Sketching: Humans are already good at drawing shapes, minimal LLM benefit
- Extrusion: Simple one-parameter operation, no need for LLM
- Assembly: Most tedious (trial/error positioning), maximum LLM value

**Division of Labor:**
- LLM: Understand intent, select tools, sequence operations
- Your code: Precise math, collision detection, geometric reasoning
- User: Final tweaks, validation

**Approach:**
1. Build manual assembly tools first (align, snap, joints, constraints)
2. LLM orchestrates those tools via natural language
3. Iterative refinement: user feedback → LLM adjusts → tools execute

**Example Workflow:**
```
User: "Attach motor shaft to wheel hub"
LLM: {tool: "alignAxes", part1: "motor_shaft", part2: "wheel_hub"}
     {tool: "createRevoluteJoint", axis: "Z"}
Code: Executes alignment + creates joint automatically
```

**Libraries to Consider:**
- THREE.CSGMesh for boolean operations (extrude, cut)
- cassowary.js or kiwi.js for constraint solving (sketches)
- Graph neural networks for assembly optimization (future/optional)

**Sketch DSL (Optional Future Enhancement):**
- Define 2D primitives (rectangle, circle, slot, mounting holes)
- JSON-based intermediate format for combining primitives
- LLM generates DSL → interpreter renders sketch
- More tractable than image→sketch conversion

## Future (v0.1+)

### Phase 3: 3D Operations
- Revolve operation (axial symmetry)
- Blend operation (fillets/chamfers)
- Advanced extrusion (taper, draft angle)

### Phase 4: Advanced
- Pattern (linear, circular)
- Mirror
- Shell (hollow out parts)
- Assembly constraints (mates)
- Joint definitions (revolute, prismatic, fixed)

### Phase 5: Export & Simulation
- STL export (3D printing)
- STEP export (CAD interchange)
- Motion simulation (kinematics)
- Basic collision detection

## Technical Debt & Improvements

- DEBT-1: Consider proper B-Rep library for exact geometry
- DEBT-2: CSG library for boolean operations
- DEBT-3: Constraint solver for parametric sketches
- DEBT-4: History-based regeneration system
