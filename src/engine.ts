// Engine class - manages the game canvas and rendering loop
import { GameObject } from "./game-objects.js";
import { SelectionManager } from "./selection-manager.js";
import { LayerManager } from "./layer.js";
import { Camera } from "./camera.js";

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
    // Camera for viewport transformation
    public camera: Camera;
    // Pan state
    private isPanning: boolean = false;
    private lastPanPos: { x: number; y: number } = { x: 0, y: 0 };

    // Constructor - initializes the engine with a canvas element
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.layerManager = new LayerManager();
        this.selectionManager = new SelectionManager(canvas);
        this.camera = new Camera(canvas);
        
        // Set up screen to world converter for selection manager
        this.selectionManager.setScreenToWorldConverter((screenX, screenY) => {
            return this.camera.screenToWorld(screenX, screenY);
        });
        
        this.setupClickHandler();
        this.setupKeyboardHandler();
        this.setupCameraControls();
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
            const screenX = (event.clientX - rect.left);
            const screenY = (event.clientY - rect.top);
            
            // Convert screen coordinates to world coordinates
            const worldPos = this.camera.screenToWorld(screenX, screenY);
            
            // Hit test all visible objects from all layers
            const objects = this.layerManager.getAllVisibleObjects();
            const hitObject = this.selectionManager.hitTest(worldPos.x, worldPos.y, objects);
            
            if (hitObject) {
                // Get layer info
                const layer = this.layerManager.findLayerForObject(hitObject.id);
                const layerName = layer ? layer.name : undefined;
                
                // Select the object with layer info
                this.selectionManager.select(hitObject, layerName);
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

    // Get object by ID from all layers
    getObjectById(objectId: string): GameObject | null {
        const allObjects = this.layerManager.getAllVisibleObjects();
        return allObjects.find(obj => obj.id === objectId) || null;
    }

    // Get all objects from all layers (for HTML rendering)
    getAllObjects(): Array<{ id: string; name: string; type: string; layerId: string; layerName: string }> {
        const result: Array<{ id: string; name: string; type: string; layerId: string; layerName: string }> = [];
        const layers = this.layerManager.getLayers();
        
        for (const layer of layers) {
            for (const obj of layer.objects) {
                result.push({
                    id: obj.id,
                    name: obj.name,
                    type: obj.type,
                    layerId: layer.id,
                    layerName: layer.name
                });
            }
        }
        
        return result;
    }

    // Set object color (supports RectangleObject and CircleObject)
    setObjectColor(objectId: string, color: string): boolean {
        const obj = this.getObjectById(objectId);
        if (!obj) return false;
        
        // Check if object has a color property
        if ('color' in obj) {
            (obj as any).color = color;
            return true;
        }
        return false;
    }

    // Set object name
    setObjectName(objectId: string, name: string): boolean {
        const obj = this.getObjectById(objectId);
        if (!obj) return false;
        
        obj.name = name;
        return true;
    }

    // Get object properties as JSON-safe object for HTML rendering
    getObjectProperties(objectId: string): Record<string, unknown> | null {
        const obj = this.getObjectById(objectId);
        if (!obj) return null;
        
        const layer = this.layerManager.findLayerForObject(objectId);
        
        return {
            id: obj.id,
            name: obj.name,
            type: obj.type,
            layerId: layer?.id || null,
            layerName: layer?.name || null,
            bounds: obj.getBounds(),
            // Include type-specific properties
            ...this.getTypeSpecificProperties(obj)
        };
    }

    // Get type-specific properties for an object
    private getTypeSpecificProperties(obj: GameObject): Record<string, unknown> {
        const props: Record<string, unknown> = {};
        
        if (obj.type === 'rectangle') {
            props.x = (obj as any).x;
            props.y = (obj as any).y;
            props.w = (obj as any).w;
            props.h = (obj as any).h;
            props.color = (obj as any).color;
        } else if (obj.type === 'circle') {
            props.x = (obj as any).x;
            props.y = (obj as any).y;
            props.radius = (obj as any).radius;
            props.color = (obj as any).color;
        } else if (obj.type === 'image') {
            props.x = (obj as any).x;
            props.y = (obj as any).y;
            props.w = (obj as any).w;
            props.h = (obj as any).h;
            props.imageSource = (obj as any).imageSource;
        } else if (obj.type === 'sprite') {
            props.destination = (obj as any).destination;
            props.source = (obj as any).source;
            props.imageSource = (obj as any).imageSource;
        }
        
        return props;
    }

    // Add event listener for selection changes
    onSelectionChange(callback: (object: GameObject | null, layerName: string | undefined) => void): void {
        if (this.selectionManager) {
            const originalSelect = this.selectionManager.select.bind(this.selectionManager);
            this.selectionManager.select = (obj: GameObject, layerName?: string) => {
                originalSelect(obj, layerName);
                callback(obj, layerName);
            };
            
            const originalClear = this.selectionManager.clearSelection.bind(this.selectionManager);
            this.selectionManager.clearSelection = () => {
                originalClear();
                callback(null, undefined);
            };
        }
    }

    // Main render function - draws all game objects to the canvas
    Render() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        
        // Update camera canvas size in case of resize
        this.camera.updateCanvasSize();
        
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update objects in selection manager for magnetic snap detection
        this.updateSelectionManagerObjects();
        
        // Draw grid and origin (in screen space, before camera transform)
        this.camera.drawGrid(ctx);
        this.camera.drawOrigin(ctx);
        this.camera.drawCoordinates(ctx);
        
        // Apply camera transformation
        ctx.save();
        this.camera.applyTransform(ctx);
        
        // Render all visible objects from all layers (sorted by layer order)
        const layers = this.layerManager.getLayers();
        for (const layer of layers) {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity;
                for (const obj of layer.objects) {
                    obj.draw(ctx);
                }
            }
        }
        
        // Reset opacity
        ctx.globalAlpha = 1.0;
        
        // Restore camera transformation for selection outline
        // We need to draw selection in world space
        if (this.selectionManager) {
            this.selectionManager.drawSelectionOutline(ctx);
        }
        
        // Restore context
        ctx.restore();
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

    // Setup camera controls (zoom and pan)
    private setupCameraControls(): void {
        // Prevent default on wheel events
        this.canvas.addEventListener("wheel", (event) => {
            event.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            
            // Determine zoom direction and factor
            const delta = event.deltaY > 0 ? 0.9 : 1.1;
            this.camera.zoomAt(mouseX, mouseY, delta);
        }, { passive: false });

        // Middle mouse button (button 1) for panning
        this.canvas.addEventListener("mousedown", (event) => {
            if (event.button === 1) { // Middle click
                event.preventDefault();
                this.isPanning = true;
                this.lastPanPos = { x: event.clientX, y: event.clientY };
                this.canvas.style.cursor = "grabbing";
            }
        });

        this.canvas.addEventListener("mousemove", (event) => {
            if (this.isPanning) {
                const dx = (event.clientX - this.lastPanPos.x) / this.camera.zoom;
                const dy = (event.clientY - this.lastPanPos.y) / this.camera.zoom;
                this.camera.pan(-dx, -dy);
                this.lastPanPos = { x: event.clientX, y: event.clientY };
            }
        });

        this.canvas.addEventListener("mouseup", (event) => {
            if (event.button === 1) { // Middle click release
                this.isPanning = false;
                this.canvas.style.cursor = "default";
            }
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.isPanning = false;
            this.canvas.style.cursor = "default";
        });

        // Space key for alternative panning
        let spacePressed = false;

        document.addEventListener("keydown", (event) => {
            if (event.code === "Space" && !spacePressed) {
                spacePressed = true;
                this.canvas.style.cursor = "grab";
            }
            // Reset camera with Home or 0 key
            if (event.key === "Home" || event.key === "0") {
                this.camera.reset();
            }
        });

        document.addEventListener("keyup", (event) => {
            if (event.code === "Space") {
                spacePressed = false;
                this.canvas.style.cursor = "default";
            }
        });

        // Handle mouse move for Space+drag panning
        this.canvas.addEventListener("mousemove", (event) => {
            if (spacePressed && event.buttons === 1) { // Space + left click drag
                const dx = (event.clientX - this.lastPanPos.x) / this.camera.zoom;
                const dy = (event.clientY - this.lastPanPos.y) / this.camera.zoom;
                this.camera.pan(-dx, -dy);
                this.lastPanPos = { x: event.clientX, y: event.clientY };
            } else if (spacePressed) {
                // Just update last position when hovering
                this.lastPanPos = { x: event.clientX, y: event.clientY };
            }
        });
    }
}
