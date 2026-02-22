// Engine class - manages the game canvas and rendering loop
import { GameObject } from "./game-objects.js";

export class Engine {
    // The HTML canvas element used for rendering
    private canvas: HTMLCanvasElement;
    // 2D rendering context for drawing
    private ctx: CanvasRenderingContext2D | null;
    // Array of game objects to render
    private objects: GameObject[] = [];

    // Constructor - initializes the engine with a canvas element
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.objects = [];
    }

    // Add a game object to the rendering list
    addObjets(obj: GameObject) {
        this.objects.push(obj)
    }
    
    // Main render function - draws all game objects to the canvas
    Render() {
        if (!this.ctx) return;
        this.objects.forEach(obj => {
            obj.draw(this.ctx!)
            
        })
    }
}