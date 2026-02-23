// Layer module - manages layers for organizing game objects
import { GameObject, GameObjectType, RectangleObject, CircleObject, ImageRectangleObject, SpriteObject } from "./game-objects.js";

// Layer properties interface
export interface LayerProperties {
    id: string;
    name: string;
    order: number;
    visible: boolean;
    locked: boolean;
    opacity: number;
}

// Factory function to create GameObject from JSON
export function createGameObjectFromJSON(data: Record<string, unknown>): GameObject {
    const type = data.type as GameObjectType;
    
    switch (type) {
        case 'rectangle':
            return RectangleObject.fromJSON(data);
        case 'circle':
            return CircleObject.fromJSON(data);
        case 'image':
            return ImageRectangleObject.fromJSON(data);
        case 'sprite':
            return SpriteObject.fromJSON(data);
        default:
            throw new Error(`Unknown object type: ${type}`);
    }
}

// Layer class - represents a single layer with its objects
export class Layer {
    public id: string;
    public name: string;
    public order: number;
    public visible: boolean;
    public locked: boolean;
    public opacity: number;
    public objects: GameObject[];

    constructor(
        name: string = "New Layer",
        order: number = 0,
        visible: boolean = true,
        locked: boolean = false,
        opacity: number = 1.0
    ) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.order = order;
        this.visible = visible;
        this.locked = locked;
        this.opacity = opacity;
        this.objects = [];
    }

    // Add an object to the layer
    addObject(obj: GameObject): void {
        if (!this.locked) {
            this.objects.push(obj);
        }
    }

    // Remove an object from the layer by ID
    removeObject(objectId: string): GameObject | null {
        const index = this.objects.findIndex(obj => obj.id === objectId);
        if (index !== -1) {
            return this.objects.splice(index, 1)[0];
        }
        return null;
    }

    // Get object by ID
    getObject(objectId: string): GameObject | undefined {
        return this.objects.find(obj => obj.id === objectId);
    }

    // Clear all objects from the layer
    clearObjects(): void {
        this.objects = [];
    }

    // Serialize layer to JSON
    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            name: this.name,
            order: this.order,
            visible: this.visible,
            locked: this.locked,
            opacity: this.opacity,
            objects: this.objects.map(obj => obj.toJSON())
        };
    }

    // Create layer from JSON data
    static fromJSON(data: Record<string, unknown>): Layer {
        const layer = new Layer(
            data.name as string,
            data.order as number,
            data.visible as boolean,
            data.locked as boolean,
            data.opacity as number
        );
        layer.id = data.id as string;
        
        // Restore objects
        const objectsData = data.objects as Record<string, unknown>[];
        layer.objects = objectsData.map(objData => createGameObjectFromJSON(objData));
        
        return layer;
    }

    // Create a GameObject from JSON data
    private static objectFromJSON(data: Record<string, unknown>): GameObject {
        const type = data.type as GameObjectType;
        
        switch (type) {
            case 'rectangle':
                const { RectangleObject } = require('./game-objects.js');
                return RectangleObject.fromJSON(data);
            case 'circle':
                const { CircleObject } = require('./game-objects.js');
                return CircleObject.fromJSON(data);
            case 'image':
                const { ImageRectangleObject } = require('./game-objects.js');
                return ImageRectangleObject.fromJSON(data);
            case 'sprite':
                const { SpriteObject } = require('./game-objects.js');
                return SpriteObject.fromJSON(data);
            default:
                throw new Error(`Unknown object type: ${type}`);
        }
    }
}

// Layer Manager - manages all layers in the scene
export class LayerManager {
    private layers: Layer[] = [];
    private activeLayerId: string | null = null;

    constructor() {
        // Create default layer
        this.createLayer("Default", 0);
    }

    // Create a new layer
    createLayer(name: string = "New Layer", order?: number): Layer {
        const orderNum = order ?? this.layers.length;
        const layer = new Layer(name, orderNum);
        this.layers.push(layer);
        this.layers.sort((a, b) => a.order - b.order);
        
        // Set as active if it's the first layer
        if (this.activeLayerId === null) {
            this.activeLayerId = layer.id;
        }
        
        return layer;
    }

    // Delete a layer by ID
    deleteLayer(layerId: string): boolean {
        // Prevent deleting the last layer
        if (this.layers.length <= 1) {
            return false;
        }
        
        const index = this.layers.findIndex(layer => layer.id === layerId);
        if (index !== -1) {
            this.layers.splice(index, 1);
            
            // Update active layer if deleted
            if (this.activeLayerId === layerId) {
                this.activeLayerId = this.layers[0].id;
            }
            
            return true;
        }
        return false;
    }

    // Get layer by ID
    getLayer(layerId: string): Layer | undefined {
        return this.layers.find(layer => layer.id === layerId);
    }

    // Get all layers (sorted by order)
    getLayers(): Layer[] {
        return [...this.layers].sort((a, b) => a.order - b.order);
    }

    // Get active layer
    getActiveLayer(): Layer | undefined {
        if (!this.activeLayerId) return undefined;
        return this.getLayer(this.activeLayerId);
    }

    // Set active layer
    setActiveLayer(layerId: string): boolean {
        const layer = this.getLayer(layerId);
        if (layer) {
            this.activeLayerId = layerId;
            return true;
        }
        return false;
    }

    // Add object to a specific layer
    addObjectToLayer(obj: GameObject, layerId: string): boolean {
        const layer = this.getLayer(layerId);
        if (layer && !layer.locked) {
            layer.addObject(obj);
            return true;
        }
        return false;
    }

    // Add object to active layer
    addObject(obj: GameObject): boolean {
        const layer = this.getActiveLayer();
        if (layer && !layer.locked) {
            layer.addObject(obj);
            return true;
        }
        return false;
    }

    // Remove object from a layer
    removeObjectFromLayer(objectId: string, layerId: string): GameObject | null {
        const layer = this.getLayer(layerId);
        if (layer) {
            return layer.removeObject(objectId);
        }
        return null;
    }

    // Remove object from active layer
    removeObject(objectId: string): GameObject | null {
        const layer = this.getActiveLayer();
        if (layer) {
            return layer.removeObject(objectId);
        }
        return null;
    }

    // Move object between layers
    moveObjectToLayer(objectId: string, sourceLayerId: string, targetLayerId: string): boolean {
        const sourceLayer = this.getLayer(sourceLayerId);
        const targetLayer = this.getLayer(targetLayerId);
        
        if (sourceLayer && targetLayer && !targetLayer.locked) {
            const obj = sourceLayer.removeObject(objectId);
            if (obj) {
                targetLayer.addObject(obj);
                return true;
            }
        }
        return false;
    }

    // Reorder layer
    reorderLayer(layerId: string, newOrder: number): boolean {
        const layer = this.getLayer(layerId);
        if (layer) {
            layer.order = newOrder;
            this.layers.sort((a, b) => a.order - b.order);
            
            // Update orders for all layers
            this.layers.forEach((l, index) => {
                l.order = index;
            });
            return true;
        }
        return false;
    }

    // Get all visible objects from all layers (for rendering)
    getAllVisibleObjects(): GameObject[] {
        const allObjects: GameObject[] = [];
        
        for (const layer of this.layers) {
            if (layer.visible) {
                allObjects.push(...layer.objects);
            }
        }
        
        return allObjects;
    }

    // Get objects from specific layer
    getLayerObjects(layerId: string): GameObject[] {
        const layer = this.getLayer(layerId);
        return layer ? layer.objects : [];
    }

    // Find which layer contains an object
    findLayerForObject(objectId: string): Layer | undefined {
        return this.layers.find(layer => 
            layer.objects.some(obj => obj.id === objectId)
        );
    }

    // Serialize entire scene to JSON
    toJSON(): string {
        const data = {
            version: "1.0",
            layers: this.layers.map(layer => layer.toJSON())
        };
        return JSON.stringify(data, null, 2);
    }

    // Import scene from JSON
    fromJSON(jsonString: string): void {
        const data = JSON.parse(jsonString);
        
        if (data.layers && Array.isArray(data.layers)) {
            this.layers = data.layers.map((layerData: Record<string, unknown>) => 
                Layer.fromJSON(layerData)
            );
            
            // Set active layer to first layer
            if (this.layers.length > 0) {
                this.activeLayerId = this.layers[0].id;
            }
        }
    }

    // Get layer count
    getLayerCount(): number {
        return this.layers.length;
    }

    // Check if a layer is locked
    isLayerLocked(layerId: string): boolean {
        const layer = this.getLayer(layerId);
        return layer ? layer.locked : false;
    }

    // Toggle layer visibility
    toggleLayerVisibility(layerId: string): boolean {
        const layer = this.getLayer(layerId);
        if (layer) {
            layer.visible = !layer.visible;
            return layer.visible;
        }
        return false;
    }

    // Toggle layer lock
    toggleLayerLock(layerId: string): boolean {
        const layer = this.getLayer(layerId);
        if (layer) {
            layer.locked = !layer.locked;
            return layer.locked;
        }
        return false;
    }
}
