// Engine class - manages the game canvas and rendering loop
import { GameObject } from "./game-objects.js";
import { SelectionManager } from "./selection-manager.js";
import { LayerManager } from "./layer.js";

export class Engine {
    // The HTML canvas element used for rendering
    private canvas: HTMLCanvasElement;
    // 2D rendering context for drawing
    private ctx: CanvasRenderingContext2D | null;
    // Layer manager for organizing objects
    public layerManager: LayerManager;
    // Animation frame ID for the game loop
    private animationId: number | null = null;
    // Whether the game loop is running
    private isRunning: boolean = false;
    // Selection manager for handling object selection
    public selectionManager: SelectionManager | null = null;

    // Constructor - initializes the engine with a canvas element
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.layerManager = new LayerManager();
        this.selectionManager = new SelectionManager(canvas);
        this.setupClickHandler();
        this.setupKeyboardHandler();
    }

    // Update objects in selection manager for magnetic snap detection
    private updateSelectionManagerObjects(): void {
        if (this.selectionManager) {
            const allObjects = this.layerManager.getAllVisibleObjects();
            this.selectionManager.setAllObjects(allObjects);
        }
    }

    // Setup click handler for object selection
    private setupClickHandler(): void {
        this.canvas.addEventListener("click", (event) => {
            if (!this.selectionManager) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left);
            const y = (event.clientY - rect.top);
            
            // Hit test all visible objects from all layers
            const objects = this.layerManager.getAllVisibleObjects();
            const hitObject = this.selectionManager.hitTest(x, y, objects);
            
            if (hitObject) {
                this.selectionManager.select(hitObject);
                
                // Update layer info
                const layer = this.layerManager.findLayerForObject(hitObject.id);
                if (layer) {
                    this.selectionManager.updateLayerInfo(layer.name);
                }
            } else {
                this.selectionManager.clearSelection();
            }
        });
    }

    // Setup keyboard handler for object deletion
    private setupKeyboardHandler(): void {
        document.addEventListener("keydown", (event) => {
            if (!this.selectionManager) return;
            
            const selectedObject = this.selectionManager.getSelected();
            if (!selectedObject) return;
            
            if (event.key === "Delete" || event.key === "Backspace") {
                // Find and remove the object from its layer
                const layer = this.layerManager.findLayerForObject(selectedObject.id);
                if (layer && !layer.locked) {
                    layer.removeObject(selectedObject.id);
                    this.selectionManager.clearSelection();
                }
            }
        });
    }

    // Add a game object to the active layer
    addObjets(obj: GameObject) {
        this.layerManager.addObject(obj);
    }

    // Add a game object to a specific layer
    addObjectToLayer(obj: GameObject, layerId: string): boolean {
        return this.layerManager.addObjectToLayer(obj, layerId);
    }

    // Main render function - draws all game objects to the canvas
    Render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update objects in selection manager for magnetic snap detection
        this.updateSelectionManagerObjects();
        
        // Render all visible objects from all layers (sorted by layer order)
        const layers = this.layerManager.getLayers();
        for (const layer of layers) {
            if (layer.visible) {
                this.ctx.globalAlpha = layer.opacity;
                for (const obj of layer.objects) {
                    obj.draw(this.ctx!);
                }
            }
        }
        
        // Reset opacity
        this.ctx.globalAlpha = 1.0;
        
        // Draw selection outline if an object is selected
        if (this.selectionManager) {
            this.selectionManager.drawSelectionOutline(this.ctx!);
        }
    }

    // Export scene to JSON
    exportToJSON(): string {
        return this.layerManager.toJSON();
    }

    // Import scene from JSON
    importFromJSON(jsonString: string): void {
        this.layerManager.fromJSON(jsonString);
    }

    // Start the game loop
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        const gameLoop = () => {
            this.Render();
            this.animationId = requestAnimationFrame(gameLoop);
        };
        this.animationId = requestAnimationFrame(gameLoop);
    }

    // Stop the game loop
    stop() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isRunning = false;
    }
}
