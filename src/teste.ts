// Main entry point - initializes and runs the game engine with layer system

import { Engine } from "./engine.js"
import { RectangleObject, SpriteObject } from "./game-objects.js";
import { CircleObject } from "./game-objects.js";
import { ImageRectangleObject } from "./game-objects.js";

// Get the canvas element from the HTML document
const canvas = document.getElementById("canvas") as HTMLCanvasElement

// Create a new engine instance with the canvas
const engine = new Engine(canvas);

// ============================================
// Layer System Demo
// ============================================

// Get the default layer (created automatically)
const defaultLayer = engine.layerManager.getActiveLayer();
console.log("Default layer:", defaultLayer?.name);

// Create a new layer for background elements
const backgroundLayer = engine.layerManager.createLayer("Background", 0);

// Create a new layer for game objects (above background)
const gameLayer = engine.layerManager.createLayer("Game Objects", 1);

// Create a new layer for UI elements (topmost)
const uiLayer = engine.layerManager.createLayer("UI", 2);

// Set active layer to game layer
engine.layerManager.setActiveLayer(gameLayer.id);

// Add objects to different layers
// ============================================

// Add rectangle to background layer
const bgRect = new RectangleObject(50, 50, 200, 150, "#333333");
engine.layerManager.addObjectToLayer(bgRect, backgroundLayer.id);

// Add circle to game layer
const circle = new CircleObject(300, 200, 50, "green");
engine.layerManager.addObjectToLayer(circle, gameLayer.id);

// Add rectangle to game layer
const rect = new RectangleObject(200, 100, 100, 80, "blue");
engine.layerManager.addObjectToLayer(rect, gameLayer.id);

// Add image to game layer
const image = new ImageRectangleObject(450, 100, 150, 200, "../resources/image.png");
engine.layerManager.addObjectToLayer(image, gameLayer.id)

// Sprite example with two rectangles
const destinationRect = new RectangleObject(150, 350, 64, 64, "");
const sourceRect = new RectangleObject(1*250, 2*256, 250, 256, "");

const sprite = new SpriteObject(destinationRect, sourceRect, "../resources/image.png");
engine.layerManager.addObjectToLayer(sprite, gameLayer.id);

// Add rectangle to UI layer
const uiRect = new RectangleObject(500, 500, 200, 60, "purple");
engine.layerManager.addObjectToLayer(uiRect, uiLayer.id);

// ============================================
// Export/Import Demo
// ============================================

// Export scene to JSON
const jsonOutput = engine.exportToJSON();
console.log("Exported JSON:");
console.log(jsonOutput);

// For demo purposes, let's log layer information
console.log("\n=== Layer Information ===");
const layers = engine.layerManager.getLayers();
layers.forEach(layer => {
    console.log(`Layer: ${layer.name} (order: ${layer.order}, visible: ${layer.visible}, locked: ${layer.locked}, opacity: ${layer.opacity})`);
    console.log(`  Objects count: ${layer.objects.length}`);
});

// ============================================
// Keyboard Controls for Layers
// ============================================

// Add keyboard controls for layer management
document.addEventListener("keydown", (event) => {
    const activeLayer = engine.layerManager.getActiveLayer();
    if (!activeLayer) return;
    
    switch (event.key) {
        case "1":
            // Toggle active layer visibility
            engine.layerManager.toggleLayerVisibility(activeLayer.id);
            console.log(`Layer "${activeLayer.name}" visibility: ${activeLayer.visible}`);
            break;
        case "2":
            // Toggle active layer lock
            engine.layerManager.toggleLayerLock(activeLayer.id);
            console.log(`Layer "${activeLayer.name}" locked: ${activeLayer.locked}`);
            break;
        case "3":
            // Toggle layer opacity (cycle through 1.0, 0.5, 0.25)
            if (activeLayer.opacity === 1.0) {
                activeLayer.opacity = 0.5;
            } else if (activeLayer.opacity === 0.5) {
                activeLayer.opacity = 0.25;
            } else {
                activeLayer.opacity = 1.0;
            }
            console.log(`Layer "${activeLayer.name}" opacity: ${activeLayer.opacity}`);
            break;
        case "l":
        case "L":
            // List all layers
            console.log("\n=== All Layers ===");
            engine.layerManager.getLayers().forEach((layer, index) => {
                console.log(`${index + 1}. ${layer.name} (ID: ${layer.id.substring(0, 8)}...)`);
                console.log(`   Visible: ${layer.visible}, Locked: ${layer.locked}, Opacity: ${layer.opacity}`);
                console.log(`   Objects: ${layer.objects.length}`);
            });
            break;
        case "j":
        case "J":
            // Export JSON to console
            console.log("=== JSON Export ===");
            console.log(engine.exportToJSON());
            break;
    }
});

// Start the game loop
engine.start();

console.log("\n=== Controls ===");
console.log("Click: Select object");
console.log("Drag: Move selected object");
console.log("Resize handles: Resize selected object");
console.log("R/T: Rotate selected object");
console.log("Delete/Backspace: Delete selected object");
console.log("1: Toggle active layer visibility");
console.log("2: Toggle active layer lock");
console.log("3: Cycle layer opacity");
console.log("L: List all layers");
console.log("J: Export JSON to console");
