// Engine class - manages the game canvas and rendering loop
import { GameObject } from "./game-objects.js";
import { SelectionManager } from "./selection-manager.js";

export class Engine {
    // The HTML canvas element used for rendering
    private canvas: HTMLCanvasElement;
    // 2D rendering context for drawing
    private ctx: CanvasRenderingContext2D | null;
    // Array of game objects to render
    private objects: GameObject[] = [];
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
        this.objects = [];
        this.selectionManager = new SelectionManager(canvas);
        this.setupClickHandler();
    }

    // Setup click handler for object selection
    private setupClickHandler(): void {
        this.canvas.addEventListener("click", (event) => {
            if (!this.selectionManager) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left);
            const y = (event.clientY - rect.top);
            
            // Hit test all objects
            const hitObject = this.selectionManager.hitTest(x, y, this.objects);
            
            if (hitObject) {
                this.selectionManager.select(hitObject);
            } else {
                this.selectionManager.clearSelection();
            }
        });
    }

    // Add a game object to the rendering list
    addObjets(obj: GameObject) {
        this.objects.push(obj)
    }

    // Main render function - draws all game objects to the canvas
    Render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.objects.forEach(obj => {
            obj.draw(this.ctx!)
        })
        
        // Draw selection outline if an object is selected
        if (this.selectionManager) {
            this.selectionManager.drawSelectionOutline(this.ctx!);
        }
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