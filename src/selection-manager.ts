// Selection Manager - handles object selection, hit testing, and transformations
import { GameObject, SpriteObject } from "./game-objects.js";
import { MagneticSnapManager, SnapPoint, MagneticConfig } from "./magnetic-system.js";

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

    // Magnetic snap system
    private magneticManager: MagneticSnapManager;
    private isShiftPressed: boolean = false;
    private overrideAttempts: number = 0;
    private lastSnapPosition: { x: number; y: number } | null = null;
    private allObjects: GameObject[] = [];

    // Set all objects (called by engine to provide objects for snap detection)
    setAllObjects(objects: GameObject[]): void {
        this.allObjects = objects;
    }

    constructor(canvas: HTMLCanvasElement, magneticConfig?: Partial<MagneticConfig>) {
        this.canvas = canvas;
        this.magneticManager = new MagneticSnapManager(magneticConfig);
        this.setupEventListeners();
        this.setupKeyboardListeners();
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
        this.updatePropertiesPanel(obj);
    }

    // Get currently selected object
    getSelected(): GameObject | null {
        return this.selectedObject;
    }

    // Clear selection
    clearSelection(): void {
        this.selectedObject = null;
        this.updatePropertiesPanel(null);
    }

    // Update properties panel with selected object info
    private updatePropertiesPanel(obj: GameObject | null): void {
        const panel = document.getElementById('object-info');
        if (!panel) return;

        if (!obj) {
            panel.innerHTML = '<p class="no-selection">No object selected</p>';
            return;
        }

        const bounds = obj.getBounds();
        let html = '';

        // Object type
        html += `<div class="property-group">
            <label>Type</label>
            <span class="property-value">${obj.type}</span>
        </div>`;

        // Object ID
        html += `<div class="property-group">
            <label>ID</label>
            <span class="property-value" style="font-size: 10px;">${obj.id.substring(0, 8)}...</span>
        </div>`;

        // Position
        html += `<div class="property-group">
            <label>Position</label>
            <span class="property-value">X: ${Math.round(bounds.x)}</span>
            <span class="property-value">Y: ${Math.round(bounds.y)}</span>
        </div>`;

        // Size
        html += `<div class="property-group">
            <label>Size</label>
            <span class="property-value">W: ${Math.round(bounds.w)}</span>
            <span class="property-value">H: ${Math.round(bounds.h)}</span>
        </div>`;

        // Type-specific properties
        if ('color' in obj) {
            html += `<div class="property-group">
                <label>Color</label>
                <span class="property-value">${(obj as any).color}</span>
            </div>`;
        }

        if ('radius' in obj) {
            html += `<div class="property-group">
                <label>Radius</label>
                <span class="property-value">${(obj as any).radius}</span>
            </div>`;
        }

        if ('imageSource' in obj) {
            html += `<div class="property-group">
                <label>Image Source</label>
                <span class="property-value" style="font-size: 10px;">${(obj as any).imageSource}</span>
            </div>`;
        }

        // Rotation (if available)
        if ('rotation' in obj && (obj as any).rotation !== undefined) {
            html += `<div class="property-group">
                <label>Rotation</label>
                <span class="property-value">${Math.round((obj as any).rotation)}°</span>
            </div>`;
        }

        panel.innerHTML = html;
    }

    // Update properties panel with layer info
    updateLayerInfo(layerName: string): void {
        const panel = document.getElementById('object-info');
        if (!panel) return;

        const currentHtml = panel.innerHTML;
        if (currentHtml.includes('no-selection')) return;

        // Add layer info at the end
        const layerInfo = `<div class="layer-info">
            <label>Layer</label>
            <span class="property-value">${layerName}</span>
        </div>`;

        if (!currentHtml.includes('layer-info')) {
            panel.innerHTML += layerInfo;
        }
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
        
        // Draw magnetic guide lines when dragging
        if (this.isDragging) {
            this.magneticManager.renderGuideLines(ctx, this.canvas.width, this.canvas.height);
            this.magneticManager.renderSnapIndicators(ctx);
        }
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
            this.overrideAttempts = 0;
            this.lastSnapPosition = null;
            this.magneticManager.clearSnap();
            
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
                    // Apply magnetic snap to resize bounds
                    const snapResult = this.applyResizeSnap(obj, newBounds);
                    this.applyResize(obj, snapResult);
                }
                
                this.canvas.style.cursor = this.getResizeCursor(this.activeResizeHandle);
            } else if (this.isDragging && this.selectedObject) {
                // Handle dragging with magnetic snap
                const bounds = this.selectedObject.getBounds();
                let newX = pos.x - this.dragOffset.x;
                let newY = pos.y - this.dragOffset.y;
                
                // Track if we're trying to override by force
                const currentSnap = this.magneticManager.getCurrentSnapPoint();
                if (currentSnap) {
                    // Calculate distance from snap position
                    const snapDistance = currentSnap.axis === 'x' 
                        ? Math.abs(newX - currentSnap.snapOffset)
                        : Math.abs(newY - currentSnap.snapOffset);
                    
                    // If we've moved far enough from snap, count as override attempt
                    const config = this.magneticManager.getConfig();
                    if (snapDistance > config.overrideDistance) {
                        this.overrideAttempts++;
                    }
                }
                
                // Find snap points
                const snapPoints = this.magneticManager.findSnapPoints(this.selectedObject, this.allObjects);
                
                // Apply snap
                const snapResult = this.magneticManager.applySnap(
                    newX, newY, snapPoints, this.isShiftPressed, this.overrideAttempts
                );
                
                // Store last snap position for tracking
                if (snapResult.snapped) {
                    this.lastSnapPosition = { x: snapResult.x, y: snapResult.y };
                }
                
                // Move the object based on its type
                if ('x' in this.selectedObject && 'y' in this.selectedObject) {
                    (this.selectedObject as any).x = snapResult.x;
                    (this.selectedObject as any).y = snapResult.y;
                }
                
                // For Sprite, also move destination
                if (this.selectedObject instanceof SpriteObject) {
                    this.selectedObject.destination.x = snapResult.x;
                    this.selectedObject.destination.y = snapResult.y;
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
            this.magneticManager.clearSnap();
            this.overrideAttempts = 0;
            if (this.selectedObject) {
                this.canvas.style.cursor = "grab";
            }
        });

        // Mouse leave - end drag or resize
        this.canvas.addEventListener("mouseleave", () => {
            this.isDragging = false;
            this.isResizing = false;
            this.activeResizeHandle = null;
            this.magneticManager.clearSnap();
        });
    }

    // Setup keyboard listeners for Shift key and other shortcuts
    private setupKeyboardListeners(): void {
        // Track Shift key state
        document.addEventListener("keydown", (event) => {
            if (event.key === "Shift") {
                this.isShiftPressed = true;
            }
            
            // Rotation shortcuts
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

        document.addEventListener("keyup", (event) => {
            if (event.key === "Shift") {
                this.isShiftPressed = false;
                this.overrideAttempts = 0;
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

    // Apply magnetic snap to resize bounds
    private applyResizeSnap(obj: GameObject, newBounds: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
        // Create a temporary object to get the bounds
        const tempObj = {
            getBounds: () => newBounds
        } as GameObject;

        // Find snap points
        const snapPoints = this.magneticManager.findSnapPoints(tempObj, this.allObjects);

        if (snapPoints.length === 0) {
            return newBounds;
        }

        // Get the best snap point
        const bestSnap = snapPoints[0];
        
        // Check for override
        const currentSnap = this.magneticManager.getCurrentSnapPoint();
        if (currentSnap) {
            const config = this.magneticManager.getConfig();
            const distance = bestSnap.distance;
            if (distance > config.overrideDistance) {
                this.overrideAttempts++;
            }
        }

        if (this.magneticManager.shouldOverride(this.isShiftPressed, this.overrideAttempts)) {
            return newBounds;
        }

        // Apply snap to the appropriate dimension
        let result = { ...newBounds };
        
        switch (bestSnap.anchor) {
            case 'left':
                // Snap right edge to target's left edge
                result.x = bestSnap.snapOffset;
                result.w = newBounds.x + newBounds.w - bestSnap.snapOffset;
                break;
            case 'right':
                // Snap left edge to target's right edge
                result.w = bestSnap.snapOffset + newBounds.w - newBounds.x;
                result.x = bestSnap.snapOffset;
                break;
            case 'top':
                // Snap bottom edge to target's top edge
                result.y = bestSnap.snapOffset;
                result.h = newBounds.y + newBounds.h - bestSnap.snapOffset;
                break;
            case 'bottom':
                // Snap top edge to target's bottom edge
                result.h = bestSnap.snapOffset + newBounds.h - newBounds.y;
                result.y = bestSnap.snapOffset;
                break;
            case 'center-x':
                // Center X alignment
                result.x = bestSnap.snapOffset;
                break;
            case 'center-y':
                // Center Y alignment
                result.y = bestSnap.snapOffset;
                break;
        }

        return result;
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
