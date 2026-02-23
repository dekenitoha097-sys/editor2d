# Editor2D

## 🎯 Objective

The goal of this project is to create a simple 2D map editor.

The editor will allow:

- Add 2D objects to a scene
- Edit map elements
- Export scene data in JSON format

The exported JSON will be used later in **Raylib** projects.

---

## 🛠 Technologies

- TypeScript
- HTML Canvas
- JavaScript

---

## 🚀 Current Features

### Core System
- Canvas rendering system
- Rectangle objects system
- Scene object management

### Layer System (NEW!)
- Multiple layers with independent properties
- Layer visibility toggle
- Layer lock/unlock
- Layer opacity control
- Object organization by layer
- JSON export/import for entire scene

### Supported Object Types
- **RectangleObject**: Basic rectangles with color
- **CircleObject**: Circles with radius and color
- **ImageRectangleObject**: Images displayed as rectangles
- **SpriteObject**: Sprites from image atlases

### Selection & Editing
- Click to select objects
- Drag to move objects
- Resize handles for resizing
- R/T keys for rotation
- Delete/Backspace to remove objects

---

## 📚 Layer System Documentation

### Architecture

```
Engine
  └── LayerManager
        ├── Layer (Background)
        │     └── GameObject[]
        ├── Layer (Game Objects)
        │     └── GameObject[]
        └── Layer (UI)
              └── GameObject[]
```

### Layer Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique UUID identifier |
| `name` | string | Layer display name |
| `order` | number | Rendering order (0 = bottom) |
| `visible` | boolean | Whether layer is rendered |
| `locked` | boolean | Whether objects can be edited |
| `opacity` | number | Layer opacity (0.0 - 1.0) |
| `objects` | GameObject[] | Array of layer objects |

### LayerManager API

```typescript
// Create a new layer
const layer = engine.layerManager.createLayer("My Layer", 0);

// Delete a layer
engine.layerManager.deleteLayer(layerId);

// Get layer by ID
const layer = engine.layerManager.getLayer(layerId);

// Get all layers (sorted by order)
const layers = engine.layerManager.getLayers();

// Set active layer
engine.layerManager.setActiveLayer(layerId);

// Add object to specific layer
engine.layerManager.addObjectToLayer(object, layerId);

// Add object to active layer
engine.layerManager.addObject(object);

// Move object between layers
engine.layerManager.moveObjectToLayer(objectId, sourceLayerId, targetLayerId);

// Toggle layer visibility
engine.layerManager.toggleLayerVisibility(layerId);

// Toggle layer lock
engine.layerManager.toggleLayerLock(layerId);

// Export scene to JSON
const json = engine.exportToJSON();

// Import scene from JSON
engine.importFromJSON(json);
```

### JSON Export Format

```json
{
  "version": "1.0",
  "layers": [
    {
      "id": "uuid-string",
      "name": "Background",
      "order": 0,
      "visible": true,
      "locked": false,
      "opacity": 1.0,
      "objects": [
        {
          "type": "rectangle",
          "id": "uuid-string",
          "x": 100,
          "y": 100,
          "w": 200,
          "h": 50,
          "color": "blue"
        }
      ]
    }
  ]
}
```

---

## ⌨️ Keyboard Controls

| Key | Action |
|-----|--------|
| Click | Select object |
| Drag | Move selected object |
| R | Rotate clockwise |
| T | Rotate counter-clockwise |
| Delete/Backspace | Delete selected object |
| 1 | Toggle active layer visibility |
| 2 | Toggle active layer lock |
| 3 | Cycle layer opacity (1.0 → 0.5 → 0.25 → 1.0) |
| L | List all layers in console |
| J | Export JSON to console |

---

## 🏗️ Project Structure

```
editor2D/
├── src/
│   ├── engine.ts          # Main engine class
│   ├── game-objects.ts    # Game object classes (Rectangle, Circle, Image, Sprite)
│   ├── layer.ts          # Layer and LayerManager classes
│   ├── selection-manager.ts  # Object selection and manipulation
│   └── teste.ts          # Demo/example code
├── resources/
│   └── image.png         # Sample image resource
├── templates/
│   └── index.html        # HTML template
├── dist/                 # Compiled JavaScript
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

---

## 📦 Building

### Compile TypeScript

```bash
npx tsc
```

### Watch Mode

```bash
npx tsc --watch
```

---

## 📌 Future Goals

- [x] Object selection
- [x] Layer system
- [x] JSON export for Raylib
- [ ] Camera control
- [ ] Object snapping
- [ ] Grid system

---

## 👨‍💻 Status

👉 Layer system implemented - v1.0
