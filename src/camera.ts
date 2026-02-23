// Camera System - Gestion de la vue camera pour l'editeur 2D
// Permet le deplacement, le zoom et l'affichage d'une grille avec origine (0,0)

// Configuration de la grille
export interface GridConfig {
    visible: boolean;
    cellSize: number;        // Taille d'une cellule en pixels world
    majorCellSize: number;  // Taille pour les lignes majeures
    color: string;
    majorColor: string;
    originColor: string;
}

// Configuration par defaut de la grille
export const DEFAULT_GRID_CONFIG: GridConfig = {
    visible: true,
    cellSize: 50,
    majorCellSize: 250,
    color: "#e0e0e0",
    majorColor: "#aaaaaa",
    originColor: "#ff0000"
};

// Classe principale de la camera
export class Camera {
    // Position de la camera en coordonnees monde
    public x: number = 0;
    public y: number = 0;
    
    // Niveau de zoom (1 = 100%)
    public zoom: number = 1;
    public minZoom: number = 0.1;
    public maxZoom: number = 5;
    
    // Configuration de la grille
    public grid: GridConfig;
    
    // Reference au canvas pour les conversions
    private canvas: HTMLCanvasElement;
    
    // Dimensions du canvas (cache)
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;

    constructor(canvas: HTMLCanvasElement, gridConfig?: Partial<GridConfig>) {
        this.canvas = canvas;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.grid = { ...DEFAULT_GRID_CONFIG, ...gridConfig };
        
        // Mettre a jour les dimensions si le canvas est redimensionne
        this.updateCanvasSize();
    }

    // Mettre a jour les dimensions du canvas
    updateCanvasSize(): void {
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
    }

    // Definir la position de la camera
    setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    // Deplacer la camera
    pan(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    // Zoomer vers un point specifique
    zoomAt(screenX: number, screenY: number, delta: number): void {
        // Calculer la position monde du point avant le zoom
        const worldPos = this.screenToWorld(screenX, screenY);
        
        // Appliquer le zoom
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * delta));
        
        if (newZoom !== this.zoom) {
            this.zoom = newZoom;
            
            // Ajuster la position pour garder le point sous la souris
            const newWorldPos = this.screenToWorld(screenX, screenY);
            this.x += worldPos.x - newWorldPos.x;
            this.y += worldPos.y - newWorldPos.y;
        }
    }

    // Convertir coordonnees ecran vers coordonnees monde
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        // Centre du canvas
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // Coordonnees relatives au centre, puis ajustees par le zoom
        const x = (screenX - centerX) / this.zoom + this.x;
        const y = (screenY - centerY) / this.zoom + this.y;
        
        return { x, y };
    }

    // Convertir coordonnees monde vers coordonnees ecran
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        // Centre du canvas
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // Coordonnees ajustees par le zoom, puis relatives au centre
        const x = (worldX - this.x) * this.zoom + centerX;
        const y = (worldY - this.y) * this.zoom + centerY;
        
        return { x, y };
    }

    // Obtenir les limites visibles en coordonnees monde
    getVisibleWorldBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(this.canvasWidth, this.canvasHeight);
        
        return {
            minX: topLeft.x,
            minY: topLeft.y,
            maxX: bottomRight.x,
            maxY: bottomRight.y
        };
    }

    // Reinitialiser la camera a la position par defaut
    reset(): void {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
    }

    // Dessiner la grille
    drawGrid(ctx: CanvasRenderingContext2D): void {
        if (!this.grid.visible) return;

        const bounds = this.getVisibleWorldBounds();
        
        // Ne pas dessiner la grille detaillee si le zoom est trop petit
        if (this.zoom < 0.1) return;
        
        // Adjust cell size based on zoom level
        let cellSize = this.grid.cellSize;
        let majorCellSize = this.grid.majorCellSize;
        
        // When very zoomed out, use larger grid cells
        if (this.zoom < 0.3) {
            cellSize = this.grid.cellSize * 5;
            majorCellSize = this.grid.majorCellSize * 5;
        } else if (this.zoom < 0.5) {
            cellSize = this.grid.cellSize * 2;
            majorCellSize = this.grid.majorCellSize * 2;
        }
        
        // Calculer le debut de la grille (arrondi pour aligner sur les cellules)
        const startX = Math.floor(bounds.minX / cellSize) * cellSize;
        const startY = Math.floor(bounds.minY / cellSize) * cellSize;
        
        // Dessiner les lignes mineures seulement if zoom is sufficient
        if (this.zoom >= 0.3) {
            ctx.beginPath();
            ctx.strokeStyle = this.grid.color;
            ctx.lineWidth = 1 / this.zoom; // Garder la largeur constante en pixels
            
            // Lignes verticales
            for (let x = startX; x <= bounds.maxX; x += cellSize) {
                const screenPos = this.worldToScreen(x, 0);
                ctx.moveTo(screenPos.x, 0);
                ctx.lineTo(screenPos.x, this.canvasHeight);
            }
            
            // Lignes horizontales
            for (let y = startY; y <= bounds.maxY; y += cellSize) {
                const screenPos = this.worldToScreen(0, y);
                ctx.moveTo(0, screenPos.y);
                ctx.lineTo(this.canvasWidth, screenPos.y);
            }
            ctx.stroke();
        }
        
        // Dessiner les lignes majeures
        const majorStartX = Math.floor(bounds.minX / majorCellSize) * majorCellSize;
        const majorStartY = Math.floor(bounds.minY / majorCellSize) * majorCellSize;
        
        ctx.beginPath();
        ctx.strokeStyle = this.grid.majorColor;
        ctx.lineWidth = 1.5 / this.zoom;
        
        for (let x = majorStartX; x <= bounds.maxX; x += majorCellSize) {
            const screenPos = this.worldToScreen(x, 0);
            ctx.moveTo(screenPos.x, 0);
            ctx.lineTo(screenPos.x, this.canvasHeight);
        }
        
        for (let y = majorStartY; y <= bounds.maxY; y += majorCellSize) {
            const screenPos = this.worldToScreen(0, y);
            ctx.moveTo(0, screenPos.y);
            ctx.lineTo(this.canvasWidth, screenPos.y);
        }
        ctx.stroke();
    }

    // Dessiner l'origine (0,0)
    drawOrigin(ctx: CanvasRenderingContext2D): void {
        // Ne pas dessiner l'origine si le zoom est trop petit
        if (this.zoom < 0.15) return;
        
        const origin = this.worldToScreen(0, 0);
        
        // Verifier si l'origine est visible
        if (origin.x < 0 || origin.x > this.canvasWidth || 
            origin.y < 0 || origin.y > this.canvasHeight) {
            return;
        }
        
        // Adjust size based on zoom
        const axisLength = Math.max(10, 20 * this.zoom);
        const circleRadius = Math.max(3, 5 * this.zoom);
        
        // Axe X (rouge)
        ctx.beginPath();
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = Math.max(1, 2 * this.zoom);
        ctx.moveTo(origin.x - axisLength, origin.y);
        ctx.lineTo(origin.x + axisLength, origin.y);
        ctx.stroke();
        
        // Axe Y (vert)
        ctx.beginPath();
        ctx.strokeStyle = "#44ff44";
        ctx.moveTo(origin.x, origin.y - axisLength);
        ctx.lineTo(origin.x, origin.y + axisLength);
        ctx.stroke();
        
        // Point d'origine (cercle)
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.max(1, 2 * this.zoom);
        ctx.arc(origin.x, origin.y, circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // Dessiner les marqueurs de coordonnees sur les bords
    drawCoordinates(ctx: CanvasRenderingContext2D): void {
        const bounds = this.getVisibleWorldBounds();
        
        // Ne pas afficher les coordonnees si le zoom est trop petit
        if (this.zoom < 0.2) return;
        
        ctx.save();
        // Use a fixed minimum font size that scales with zoom but stays reasonable
        const fontSize = Math.max(8, Math.min(14, 12 * this.zoom));
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = "#666666";
        
        // Adjust step based on zoom level - show more labels when zoomed out
        let xStep = this.grid.majorCellSize;
        let yStep = this.grid.majorCellSize;
        
        // When very zoomed out, show fewer labels
        if (this.zoom < 0.5) {
            xStep *= Math.ceil(1 / (this.zoom * 2));
            yStep *= Math.ceil(1 / (this.zoom * 2));
        }
        
        const xStart = Math.floor(bounds.minX / xStep) * xStep;
        
        for (let x = xStart; x <= bounds.maxX; x += xStep) {
            if (Math.abs(x) < 0.01) continue; // Skip origin
            const screenPos = this.worldToScreen(x, 0);
            if (screenPos.x >= 0 && screenPos.x <= this.canvasWidth) {
                ctx.fillText(Math.round(x).toString(), screenPos.x + 2, this.canvasHeight - 10);
            }
        }
        
        const yStart = Math.floor(bounds.minY / yStep) * yStep;
        
        for (let y = yStart; y <= bounds.maxY; y += yStep) {
            if (Math.abs(y) < 0.01) continue; // Skip origin
            const screenPos = this.worldToScreen(0, y);
            if (screenPos.y >= 0 && screenPos.y <= this.canvasHeight) {
                ctx.fillText(Math.round(y).toString(), 10, screenPos.y - 2);
            }
        }
        
        ctx.restore();
    }

    // Appliquer la transformation de la camera au contexte
    applyTransform(ctx: CanvasRenderingContext2D): void {
        // Deplacer vers le centre du canvas
        ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
        // Appliquer le zoom
        ctx.scale(this.zoom, this.zoom);
        // Deplacer vers la position de la camera
        ctx.translate(-this.x, -this.y);
    }

    // Restaurer la transformation de la camera
    restoreTransform(ctx: CanvasRenderingContext2D): void {
        ctx.translate(this.x, this.y);
        ctx.scale(1 / this.zoom, 1 / this.zoom);
        ctx.translate(-this.canvasWidth / 2, -this.canvasHeight / 2);
    }
}
