// Game Objects module - defines the base interface for all game objects

// Base interface that all game objects must implement
export interface GameObject {
    // Unique identifier for the object
    id: string;
    // Method to draw the object on the canvas
    draw(ctx: CanvasRenderingContext2D): void;
    // Check if a point is inside the object (hit testing)
    containsPoint(x: number, y: number): boolean;
    // Get bounding box for selection outline
    getBounds(): { x: number; y: number; w: number; h: number };
}


// Rectangle game object implementation
export class RectangleObject implements GameObject {
    public id: string;

    constructor(
        public x: number,
        public y: number,
        public w: number,
        public h: number,
        public color: string
    ) { 
        this.id = crypto.randomUUID();
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }

    containsPoint(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    getBounds(): { x: number; y: number; w: number; h: number } {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// Circle game object implementation
export class CircleObject implements GameObject {
    public id: string;

    constructor(
        public x: number,
        public y: number,
        public radius: number,
        public color: string
    ) { 
        this.id = crypto.randomUUID();
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    containsPoint(px: number, py: number): boolean {
        const dx = px - this.x;
        const dy = py - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    getBounds(): { x: number; y: number; w: number; h: number } {
        return { 
            x: this.x - this.radius, 
            y: this.y - this.radius, 
            w: this.radius * 2, 
            h: this.radius * 2 
        };
    }
}

// Image Rectangle game object implementation
export class ImageRectangleObject implements GameObject {
    public id: string;
    private image: HTMLImageElement;
    private loaded: boolean = false;

    constructor(
        public x: number,
        public y: number,
        public w: number,
        public h: number,
        public imageSource: string
    ) {
        this.id = crypto.randomUUID();
        this.image = new Image();
        this.image.src = this.imageSource;
        this.image.onload = () => {
            this.loaded = true;
        };
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.loaded) {
            ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
        }
    }

    containsPoint(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    getBounds(): { x: number; y: number; w: number; h: number } {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// Sprite game object - draws a specific portion of an image
export class SpriteObject implements GameObject {
    public id: string;
    private image: HTMLImageElement;
    private loaded: boolean = false;

    constructor(
        public destination: RectangleObject,
        public source: RectangleObject,
        public imageSource: string
    ) {
        this.id = crypto.randomUUID();
        this.image = new Image();
        this.image.src = this.imageSource;
        this.image.onload = () => {
            this.loaded = true;
        };
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (this.loaded) {
            // drawImage can take 9 parameters: image, sx, sy, sw, sh, dx, dy, dw, dh
            ctx.drawImage(
                this.image,
                this.source.x, this.source.y, this.source.w, this.source.h,  // Source rectangle
                this.destination.x, this.destination.y, this.destination.w, this.destination.h   // Destination rectangle
            );
        }
    }

    containsPoint(x: number, y: number): boolean {
        return x >= this.destination.x && x <= this.destination.x + this.destination.w 
            && y >= this.destination.y && y <= this.destination.y + this.destination.h;
    }

    getBounds(): { x: number; y: number; w: number; h: number } {
        return { 
            x: this.destination.x, 
            y: this.destination.y, 
            w: this.destination.w, 
            h: this.destination.h 
        };
    }
}