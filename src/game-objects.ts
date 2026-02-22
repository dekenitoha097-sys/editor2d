// Game Objects module - defines the base interface for all game objects

// Base interface that all game objects must implement
export interface GameObject {
    // Method to draw the object on the canvas
    draw(ctx: CanvasRenderingContext2D): void;
}


// Rectangle game object implementation
export class RectangleObject implements GameObject {
    constructor(
        public x: number,
        public y: number,
        public w: number,
        public h: number,
        public color: string
    ) { }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

// Circle game object implementation
export class CircleObject implements GameObject {
    constructor(
        public x: number,
        public y: number,
        public raduis: number,
        public color: string
    ) { }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.raduis, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Image Rectangle game object implementation
export class ImageRectangleObject implements GameObject {
    private image: HTMLImageElement;
    private loaded: boolean = false;

    constructor(
        public x: number,
        public y: number,
        public w: number,
        public h: number,
        public imageSource: string
    ) {
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
}

// Sprite game object - draws a specific portion of an image
export class SpriteObject implements GameObject {
    private image: HTMLImageElement;
    private loaded: boolean = false;

    constructor(
        public destination: RectangleObject,
        public source: RectangleObject,
        public imageSource: string
    ) {
        this.image = new Image();
        this.image.src = this.imageSource;
        this.image.onload = () => {
            this.loaded = true;
        };
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.loaded) {
            // drawImage can take 9 parameters: image, sx, sy, sw, sh, dx, dy, dw, dh
            ctx.drawImage(
                this.image,
                this.source.x, this.source.y, this.source.w, this.source.h,  // Source rectangle
                this.destination.x, this.destination.y, this.destination.w, this.destination.h   // Destination rectangle
            );
        }
    }
}