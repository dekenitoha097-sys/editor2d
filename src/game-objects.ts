// Game Objects module - defines the base interface for all game objects

// Base interface that all game objects must implement
export interface GameObject {
    // Method to draw the object on the canvas
    draw(ctx: CanvasRenderingContext2D): void;
}

/*
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
*/