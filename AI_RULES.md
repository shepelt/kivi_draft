# AI Development Rules for KIVI Draft

## Project Overview
KIVI Draft is a minimal, specialized web-based modeling studio using three.js for visualization, focused on realistic-looking models using simple primitives and manufacturing-oriented operations.

**See also**: README.md for project documentation and getting started guide

**Concept**: "Minimal modeling studio for simulating manufacturing processes with simple primitives"

**Name Origin**: KIVI Draft - Building on KIVI (Finnish: "stone"), focusing on drafting and design

## Core Philosophy

### Constraints as Features
KIVI Draft embraces focused simplicity over general-purpose CAD:
- Simple primitives (box, cylinder, sphere, etc.)
- Limited but powerful operations (extrusion, revolve, cut, fillet)
- Manufacturing-focused workflow
- Realistic visualization over parametric complexity
- Specialized tool vs. GP solutions (Fusion360, Blender)

### Manufacturing-First Design
- Operations mirror real manufacturing processes
- Simple, clear modeling workflow
- Focus on realistic visual results
- Direct manipulation where possible

## Technology Stack (TBD)
- **3D Rendering**: Three.js (confirmed)
- **Language**: JavaScript/TypeScript (TBD)
- **Bundler**: To be decided (Vite, Webpack, Parcel?)
- **UI Framework**: To be decided

## Code Conventions (TBD)
- To be determined based on chosen stack
- Prefer clarity over cleverness
- Self-documenting code

## Development Philosophy

### Start Simple, Grow Naturally
- **Flat structure first**: Keep files at the root level until organization becomes necessary
  - ✅ `src/renderer.js`
  - ❌ `src/renderer/core/systems/rendering/main.js` (too early)

### YAGNI Principle
- Only build what you need right now
- Don't create "future-proof" abstractions
- Examples of YAGNI violations to avoid:
  - Creating an abstraction layer before you have 2 implementations
  - Building a plugin system before you have plugins
  - Adding configuration for features that don't exist yet

### When to Refactor
- When you copy-paste code 3+ times → extract to function
- When a file exceeds 300 lines → consider splitting
- When a pattern becomes clear → then abstract it
- Never before

### Prototype First
- Build a working example before generalizing
- Test ideas with minimal code
- Let the API design emerge from usage

## Modeling Operations

### Priority Operations
1. **Primitives**: Box, Cylinder, Sphere
2. **Extrusion**: 2D sketch to 3D solid
3. **Revolve**: 2D profile around axis
4. **Cut**: Boolean subtraction
5. **Fillet**: Edge rounding

## Development Workflow
- Keep code simple and readable
- Write working examples first
- Document as you go
- **NEVER modify files without explicit user permission**
  - Always show the proposed changes first
  - Wait for user approval before applying
  - Exception: Only when user explicitly requests the change

## Notes
- This file will evolve as the project grows
- Decisions should be made when needed, not before
- Keep the spirit of focused, specialized design
- Prioritize visual quality and manufacturing workflow

## Next Steps
See TODO.md for current tasks and priorities.
