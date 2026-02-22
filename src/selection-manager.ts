// Selection Manager - handles object selection, hit testing, and transformations
import { GameObject, SpriteObject } from "./game-objects.js";

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

export class SelectionManager {
    // Currently selected object (null if nothing selected)
    private selectedObject: GameObject | null = null;
    
    // Canvas element for coordinate transformation
    private canvas: HTMLCanvasElement;
    
    // Drag state
    private isDragging: boolean = false;
    private isResizing: boolean = false;
    private activeResizeHandle: ResizeHandle = null;
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
    private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
    private initialBounds: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
    private resizeStartPos: { x: number; y: number } = { x: 0, y: 0 };
    
    // Selection outline style
    private readonly OUTLINE_COLOR = "#00ff00";
    private readonly OUTLINE_WIDTH = 2;
    private readonly HANDLE_SIZE = 8;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupEventListeners();
    }

    // Get mouse position relative to canvas
    private getMousePosition(event: MouseEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // Check if a point is inside any object
    hitTest(x: number, y: number, objects: GameObject[]): GameObject | null {
        // Check in reverse order (top-most objects first)
        for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i].containsPoint(x, y)) {
                return objects[i];
            }
        }
        return null;
    }

    // Select an object
    select(obj: GameObject | null): void {
        this.selectedObject = obj;
    }

    // Get currently selected object
    getSelected(): GameObject | null {
        return this.selectedObject;
    }

    // Clear selection
    clearSelection(): void {
        this.selectedObject = null;
    }

    // Check if an object is selected
    isSelected(obj: GameObject): boolean {
        return this.selectedObject === obj;
    }

    // Check if mouse is over a resize handle
    private getHandleAtPosition(x: number, y: number, bounds: { x: number; y: number; w: number; h: number }): ResizeHandle {
        const hs = this.HANDLE_SIZE / 2;
        
        // Define handle positions
        const handles: { handle: ResizeHandle; hx: number; hy: number }[] = [
            { handle: 'nw', hx: bounds.x, hy: bounds.y },
            { handle: 'n', hx: bounds.x + bounds.w / 2, hy: bounds.y },
            { handle: 'ne', hx: bounds.x + bounds.w, hy: bounds.y },
            { handle: 'e', hx: bounds.x + bounds.w, hy: bounds.y + bounds.h / 2 },
            { handle: 'se', hx: bounds.x + bounds.w, hy: bounds.y + bounds.h },
            { handle: 's', hx: bounds.x + bounds.w / 2, hy: bounds.y + bounds.h },
            { handle: 'sw', hx: bounds.x, hy: bounds.y + bounds.h },
            { handle: 'w', hx: bounds.x, hy: bounds.y + bounds.h / 2 }
        ];
        
        for (const { handle, hx, hy } of handles) {
            if (x >= hx - hs && x <= hx + hs && y >= hy - hs && y <= hy + hs) {
                return handle;
            }
        }
        
        return null;
    }

    // Get cursor style for current resize handle
    private getResizeCursor(handle: ResizeHandle): string {
        switch (handle) {
            case 'nw': case 'se': return 'nwse-resize';
            case 'ne': case 'sw': return 'nesw-resize';
            case 'n': case 's': return 'ns-resize';
            case 'e': case 'w': return 'ew-resize';
            default: return 'default';
        }
    }

    // Draw selection outline around selected object
    drawSelectionOutline(ctx: CanvasRenderingContext2D): void {
        if (!this.selectedObject) return;

        const bounds = this.selectedObject.getBounds();
        
        ctx.save();
        ctx.strokeStyle = this.OUTLINE_COLOR;
        ctx.lineWidth = this.OUTLINE_WIDTH;
        ctx.setLineDash([5, 5]);
        
        // Draw bounding box
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
        
        // Draw resize handles (8 handles: 4 corners + 4 edges)
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = this.OUTLINE_COLOR;
        
        const handles: { x: number; y: number }[] = [
            { x: bounds.x, y: bounds.y }, // nw
            { x: bounds.x + bounds.w / 2, y: bounds.y }, // n
            { x: bounds.x + bounds.w, y: bounds.y }, // ne
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 }, // e
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h }, // se
            { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h }, // s
            { x: bounds.x, y: bounds.y + bounds.h }, // sw
            { x: bounds.x, y: bounds.y + bounds.h / 2 } // w
        ];
        
        handles.forEach(handle => {
            ctx.fillRect(
                handle.x - this.HANDLE_SIZE / 2,
                handle.y - this.HANDLE_SIZE / 2,
                this.HANDLE_SIZE,
                this.HANDLE_SIZE
            );
            ctx.strokeRect(
                handle.x - this.HANDLE_SIZE / 2,
                handle.y - this.HANDLE_SIZE / 2,
                this.HANDLE_SIZE,
                this.HANDLE_SIZE
            );
        });
        
        ctx.restore();
    }

    // Setup event listeners
    private setupEventListeners(): void {
        // Click to select
        this.canvas.addEventListener("click", (event) => {
            if (this.isDragging) return;
            
            const pos = this.getMousePosition(event);
            // We'll access objects through the engine later
            // This is handled by the Engine class
        });

        // Mouse down - start drag or resize
        this.canvas.addEventListener("mousedown", (event) => {
            const pos = this.getMousePosition(event);
            this.lastMousePos = pos;
            
            if (this.selectedObject) {
                const bounds = this.selectedObject.getBounds();
                
                // Check if clicking on a resize handle first
                const handle = this.getHandleAtPosition(pos.x, pos.y, bounds);
                
                if (handle) {
                    this.isResizing = true;
                    this.activeResizeHandle = handle;
                    this.initialBounds = { ...bounds };
                    this.resizeStartPos = { x: pos.x, y: pos.y };
                    this.canvas.style.cursor = this.getResizeCursor(handle);
                    return;
                }
                
                // Otherwise check if clicking on the object for dragging
                if (this.selectedObject.containsPoint(pos.x, pos.y)) {
                    this.isDragging = true;
                    this.dragOffset = {
                        x: pos.x - this.selectedObject.getBounds().x,
                        y: pos.y - this.selectedObject.getBounds().y
                    };
                    this.canvas.style.cursor = "grabbing";
                }
            }
        });

        // Mouse move - drag or resize
        this.canvas.addEventListener("mousemove", (event) => {
            const pos = this.getMousePosition(event);
            
            if (this.isResizing && this.selectedObject && this.activeResizeHandle) {
                // Handle resizing - calculate delta from start position
                const obj = this.selectedObject;
                const ib = this.initialBounds;
                const dx = pos.x - this.resizeStartPos.x;
                const dy = pos.y - this.resizeStartPos.y;
                
                let newBounds = { x: ib.x, y: ib.y, w: ib.w, h: ib.h };
                
                switch (this.activeResizeHandle) {
                    case 'nw':
                        newBounds.x = ib.x + dx;
                        newBounds.y = ib.y + dy;
                        newBounds.w = ib.w - dx;
                        newBounds.h = ib.h - dy;
                        break;
                    case 'n':
                        newBounds.y = ib.y + dy;
                        newBounds.h = ib.h - dy;
                        break;
                    case 'ne':
                        newBounds.y = ib.y + dy;
                        newBounds.w = ib.w + dx;
                        newBounds.h = ib.h - dy;
                        break;
                    case 'e':
                        newBounds.w = ib.w + dx;
                        break;
                    case 'se':
                        newBounds.w = ib.w + dx;
                        newBounds.h = ib.h + dy;
                        break;
                    case 's':
                        newBounds.h = ib.h + dy;
                        break;
                    case 'sw':
                        newBounds.x = ib.x + dx;
                        newBounds.w = ib.w - dx;
                        newBounds.h = ib.h + dy;
                        break;
                    case 'w':
                        newBounds.x = ib.x + dx;
                        newBounds.w = ib.w - dx;
                        break;
                }
                
                // Minimum size constraint
                const minSize = 10;
                if (newBounds.w >= minSize && newBounds.h >= minSize) {
                    this.applyResize(obj, newBounds);
                }
                
                this.canvas.style.cursor = this.getResizeCursor(this.activeResizeHandle);
            } else if (this.isDragging && this.selectedObject) {
                // Handle dragging
                const bounds = this.selectedObject.getBounds();
                const newX = pos.x - this.dragOffset.x;
                const newY = pos.y - this.dragOffset.y;
                
                // Move the object based on its type
                if ('x' in this.selectedObject && 'y' in this.selectedObject) {
                    (this.selectedObject as any).x = newX;
                    (this.selectedObject as any).y = newY;
                }
                
                // For Sprite, also move destination
                if (this.selectedObject instanceof SpriteObject) {
                    this.selectedObject.destination.x = newX;
                    this.selectedObject.destination.y = newY;
                }
            } else if (this.selectedObject) {
                // Change cursor if hovering over handles or selected object
                const bounds = this.selectedObject.getBounds();
                const handle = this.getHandleAtPosition(pos.x, pos.y, bounds);
                
                if (handle) {
                    this.canvas.style.cursor = this.getResizeCursor(handle);
                } else if (this.selectedObject.containsPoint(pos.x, pos.y)) {
                    this.canvas.style.cursor = "grab";
                } else {
                    this.canvas.style.cursor = "default";
                }
            }
            
            this.lastMousePos = pos;
        });

        // Mouse up - end drag or resize
        this.canvas.addEventListener("mouseup", () => {
            this.isDragging = false;
            this.isResizing = false;
            this.activeResizeHandle = null;
            if (this.selectedObject) {
                this.canvas.style.cursor = "grab";
            }
        });

        // Mouse leave - end drag or resize
        this.canvas.addEventListener("mouseleave", () => {
            this.isDragging = false;
            this.isResizing = false;
            this.activeResizeHandle = null;
        });

        // Keyboard - rotation
        document.addEventListener("keydown", (event) => {
            if (!this.selectedObject) return;
            
            const rotationSpeed = 5;
            
            switch (event.key) {
                case "r":
                case "R":
                    // Rotate clockwise
                    if ('rotation' in this.selectedObject) {
                        (this.selectedObject as any).rotation = 
                            ((this.selectedObject as any).rotation || 0) + rotationSpeed;
                    }
                    break;
                case "t":
                case "T":
                    // Rotate counter-clockwise
                    if ('rotation' in this.selectedObject) {
                        (this.selectedObject as any).rotation = 
                            ((this.selectedObject as any).rotation || 0) - rotationSpeed;
                    }
                    break;
                case "Delete":
                case "Backspace":
                    // Delete selected object (handled by engine)
                    break;
                case "Escape":
                    // Deselect
                    this.clearSelection();
                    break;
            }
        });
    }

    // Apply resize to object based on its type
    private applyResize(obj: GameObject, newBounds: { x: number; y: number; w: number; h: number }): void {
        // Check if it's a CircleObject (has radius property)
        if ('radius' in obj) {
            const radius = Math.min(newBounds.w, newBounds.h) / 2;
            (obj as any).x = newBounds.x + newBounds.w / 2;
            (obj as any).y = newBounds.y + newBounds.h / 2;
            (obj as any).radius = radius;
            return;
        }
        
        // Check if it's a SpriteObject (has destination property)
        if ('destination' in obj) {
            (obj as any).destination.x = newBounds.x;
            (obj as any).destination.y = newBounds.y;
            (obj as any).destination.w = newBounds.w;
            (obj as any).destination.h = newBounds.h;
            return;
        }
        
        // For RectangleObject, ImageRectangleObject and other rectangular objects
        // (have w and h properties)
        if ('w' in obj && 'h' in obj) {
            (obj as any).x = newBounds.x;
            (obj as any).y = newBounds.y;
            (obj as any).w = newBounds.w;
            (obj as any).h = newBounds.h;
        }
    }

    // Get zoom level (reserved for future use)
    getZoomLevel(): number {
        return 1;
    }

    // Set zoom level (reserved for future use)
    setZoomLevel(level: number): void {
        // Zoom disabled for now
    }

    // Enable/disable selection mode
    private enabled: boolean = true;
    
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.clearSelection();
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}
