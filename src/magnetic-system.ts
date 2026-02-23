// Magnetic Snap System - Permet aux objets de s'aimanter automatiquement lors du déplacement
import { GameObject } from "./game-objects.js";

// Types pour le système magnétique

// Points d'ancrage possibles pour le snap
export type SnapAnchor = 'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y';

// Bounds interface compatible avec getBounds()
export interface Bounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

// Point de snap détecté
export interface SnapPoint {
    anchor: SnapAnchor;           // Type d'ancrage
    targetBounds: Bounds;          // Bounds de l'objet cible
    targetId: string;             // ID de l'objet cible
    distance: number;             // Distance actuelle
    axis: 'x' | 'y';              // Axe du snap
    snapOffset: number;           // Position snapée finale
}

// Ligne de guidage à dessiner
export interface GuideLine {
    axis: 'x' | 'y';              // Axe de la ligne
    position: number;             // Position sur l'axe perpendiculaire
    start: number;                // Début de la ligne
    end: number;                  // Fin de la ligne
    targetId: string;             // ID de l'objet cible pour référence
}

// Paramètres de configuration du système magnétique
export interface MagneticConfig {
    snapDistance: number;          // Distance de snap en pixels (défaut: 10)
    overrideDistance: number;      // Distance pour override par force (défaut: 15)
    showGuideLines: boolean;      // Afficher les lignes de guidage
    guideLineColor: string;       // Couleur des lignes de guidage
    guideLineWidth: number;       // Largeur des lignes
    guideLineDash: number[];      // Style pointillé [dash, gap]
}

// Configuration par défaut
export const DEFAULT_MAGNETIC_CONFIG: MagneticConfig = {
    snapDistance: 10,
    overrideDistance: 15,
    showGuideLines: true,
    guideLineColor: "#00aaff",
    guideLineWidth: 1,
    guideLineDash: [5, 5]
};

// Classe principale du gestionnaire de snap magnétique
export class MagneticSnapManager {
    private config: MagneticConfig;
    private currentSnapPoint: SnapPoint | null = null;
    private guideLines: GuideLine[] = [];
    private isActive: boolean = true;

    constructor(config: Partial<MagneticConfig> = {}) {
        this.config = { ...DEFAULT_MAGNETIC_CONFIG, ...config };
    }

    // Activer/désactiver le système magnétique
    setActive(active: boolean): void {
        this.isActive = active;
        if (!active) {
            this.clearSnap();
        }
    }

    isSnapActive(): boolean {
        return this.isActive;
    }

    // Mettre à jour la configuration
    setConfig(config: Partial<MagneticConfig>): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): MagneticConfig {
        return { ...this.config };
    }

    // Obtenir le point de snap actif actuel
    getCurrentSnapPoint(): SnapPoint | null {
        return this.currentSnapPoint;
    }

    // Obtenir les lignes de guidage actuelles
    getGuideLines(): GuideLine[] {
        return this.guideLines;
    }

    // Effacer les données de snap
    clearSnap(): void {
        this.currentSnapPoint = null;
        this.guideLines = [];
    }

    // Vérifier si le snap doit être appliqué ou overridé
    shouldOverride(shiftPressed: boolean, overrideAttempts: number): boolean {
        // Override si Shift est pressé
        if (shiftPressed) {
            return true;
        }
        // Override par force si nombre d'essais dépasse le seuil
        // (cela signifie que l'utilisateur essaie de dépasser le point de snap)
        if (overrideAttempts > 0) {
            return true;
        }
        return false;
    }

    // Trouver les points de snap potentiels
    findSnapPoints(
        movingObject: GameObject,
        otherObjects: GameObject[]
    ): SnapPoint[] {
        if (!this.isActive) return [];

        const movingBounds = movingObject.getBounds();
        const snapPoints: SnapPoint[] = [];

        // Pour chaque autre objet, calculer les distances aux points d'ancrage
        for (const obj of otherObjects) {
            // Ne pas snap sur soi-même
            if (obj.id === movingObject.id) continue;

            const targetBounds = obj.getBounds();

            // Calculer les distances pour chaque type d'ancrage
            const distances = this.calculateAnchorDistances(movingBounds, targetBounds);

            // Pour chaque ancrage avec distance < seuil, créer un SnapPoint
            for (const [anchor, distance] of Object.entries(distances)) {
                if (distance !== null && distance <= this.config.snapDistance) {
                    const snapPoint = this.createSnapPoint(
                        anchor as SnapAnchor,
                        movingBounds,
                        targetBounds,
                        obj.id,
                        distance
                    );
                    if (snapPoint) {
                        snapPoints.push(snapPoint);
                    }
                }
            }
        }

        // Trier par distance croissante
        snapPoints.sort((a, b) => a.distance - b.distance);

        // Générer les lignes de guidage
        this.generateGuideLines(snapPoints, movingBounds);

        return snapPoints;
    }

    // Calculer les distances pour chaque ancrage
    private calculateAnchorDistances(
        moving: Bounds,
        target: Bounds
    ): Record<SnapAnchor, number | null> {
        // Centroid des objets
        const movingCenterX = moving.x + moving.w / 2;
        const movingCenterY = moving.y + moving.h / 2;
        const targetCenterX = target.x + target.w / 2;
        const targetCenterY = target.y + target.h / 2;

        // Vérifier le chevauchement sur l'axe perpendiculaire
        const verticalOverlap = this.checkOverlap(moving.y, moving.y + moving.h, target.y, target.y + target.h);
        const horizontalOverlap = this.checkOverlap(moving.x, moving.x + moving.w, target.x, target.x + target.w);

        // Pour center-x et center-y, vérifier le chevauchement
        const centerXOverlap = this.checkOverlap(moving.y, moving.y + moving.h, target.y, target.y + target.h);
        const centerYOverlap = this.checkOverlap(moving.x, moving.x + moving.w, target.x, target.x + target.w);

        // Moving object's edges
        const movingRight = moving.x + moving.w;
        const movingBottom = moving.y + moving.h;
        const targetRight = target.x + target.w;
        const targetBottom = target.y + target.h;

        return {
            // Left snap: right edge of moving aligns with left edge of target
            // Valid when moving is to the left of target (movingRight <= target.x)
            'left': verticalOverlap ? Math.abs(movingRight - target.x) : null,
            // Right snap: left edge of moving aligns with right edge of target
            // Valid when moving is to the right of target (moving.x >= targetRight)
            'right': verticalOverlap ? Math.abs(moving.x - targetRight) : null,
            // Top snap: bottom edge of moving aligns with top edge of target
            // Valid when moving is above target (movingBottom <= target.y)
            'top': horizontalOverlap ? Math.abs(movingBottom - target.y) : null,
            // Bottom snap: top edge of moving aligns with bottom edge of target
            // Valid when moving is below target (moving.y >= targetBottom)
            'bottom': horizontalOverlap ? Math.abs(moving.y - targetBottom) : null,
            // Center-X snap: center X of both objects align
            'center-x': centerXOverlap ? Math.abs(movingCenterX - targetCenterX) : null,
            // Center-Y snap: center Y of both objects align
            'center-y': centerYOverlap ? Math.abs(movingCenterY - targetCenterY) : null
        };
    }

    // Vérifier si deux intervalles se chevauchent
    private checkOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
        return start1 < end2 && start2 < end1;
    }

    // Créer un point de snap
    private createSnapPoint(
        anchor: SnapAnchor,
        moving: Bounds,
        target: Bounds,
        targetId: string,
        distance: number
    ): SnapPoint | null {
        const axis: 'x' | 'y' = ['left', 'right', 'center-x'].includes(anchor) ? 'x' : 'y';
        let snapOffset: number;

        switch (anchor) {
            case 'left':
                snapOffset = target.x - moving.w;
                break;
            case 'right':
                snapOffset = target.x + target.w;
                break;
            case 'top':
                snapOffset = target.y - moving.h;
                break;
            case 'bottom':
                snapOffset = target.y + target.h;
                break;
            case 'center-x':
                snapOffset = target.x + target.w / 2 - moving.w / 2;
                break;
            case 'center-y':
                snapOffset = target.y + target.h / 2 - moving.h / 2;
                break;
            default:
                return null;
        }

        return {
            anchor,
            targetBounds: { ...target },
            targetId,
            distance,
            axis,
            snapOffset
        };
    }

    // Générer les lignes de guidage
    private generateGuideLines(snapPoints: SnapPoint[], movingBounds: Bounds): void {
        this.guideLines = [];

        if (!this.config.showGuideLines || snapPoints.length === 0) {
            return;
        }

        // Prendre les snap points les plus proches pour chaque axe
        const xSnaps = snapPoints.filter(s => s.axis === 'x').slice(0, 2);
        const ySnaps = snapPoints.filter(s => s.axis === 'y').slice(0, 2);

        // Créer les lignes pour les snaps X (verticaux)
        for (const snap of xSnaps) {
            this.guideLines.push({
                axis: 'x',
                position: snap.axis === 'x' ? snap.snapOffset : snap.targetBounds.x + snap.targetBounds.w / 2,
                start: Math.min(movingBounds.y, snap.targetBounds.y) - 20,
                end: Math.max(movingBounds.y + movingBounds.h, snap.targetBounds.y + snap.targetBounds.h) + 20,
                targetId: snap.targetId
            });
        }

        // Créer les lignes pour les snaps Y (horizontaux)
        for (const snap of ySnaps) {
            this.guideLines.push({
                axis: 'y',
                position: snap.axis === 'y' ? snap.snapOffset : snap.targetBounds.y + snap.targetBounds.h / 2,
                start: Math.min(movingBounds.x, snap.targetBounds.x) - 20,
                end: Math.max(movingBounds.x + movingBounds.w, snap.targetBounds.x + snap.targetBounds.w) + 20,
                targetId: snap.targetId
            });
        }
    }

    // Appliquer le snap à une position
    applySnap(
        proposedX: number,
        proposedY: number,
        snapPoints: SnapPoint[],
        shiftPressed: boolean,
        overrideAttempts: number
    ): { x: number; y: number; snapped: boolean; snapPoint: SnapPoint | null } {
        // Vérifier si on doit override
        if (this.shouldOverride(shiftPressed, overrideAttempts)) {
            this.currentSnapPoint = null;
            return { x: proposedX, y: proposedY, snapped: false, snapPoint: null };
        }

        // Si pas de snap points, pas de snap
        if (snapPoints.length === 0) {
            this.currentSnapPoint = null;
            return { x: proposedX, y: proposedY, snapped: false, snapPoint: null };
        }

        // Prendre le snap point le plus proche
        const bestSnap = snapPoints[0];
        this.currentSnapPoint = bestSnap;

        // Appliquer le snap sur l'axe approprié
        let newX = proposedX;
        let newY = proposedY;

        if (bestSnap.axis === 'x') {
            newX = bestSnap.snapOffset;
        } else {
            newY = bestSnap.snapOffset;
        }

        return {
            x: newX,
            y: newY,
            snapped: true,
            snapPoint: bestSnap
        };
    }

    // Dessiner les lignes de guidage
    renderGuideLines(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
        if (!this.config.showGuideLines || this.guideLines.length === 0) return;

        ctx.save();
        ctx.strokeStyle = this.config.guideLineColor;
        ctx.lineWidth = this.config.guideLineWidth;
        ctx.setLineDash(this.config.guideLineDash);
        ctx.globalAlpha = 0.8;

        for (const line of this.guideLines) {
            ctx.beginPath();
            if (line.axis === 'x') {
                // Ligne verticale
                ctx.moveTo(line.position, Math.max(0, line.start));
                ctx.lineTo(line.position, Math.min(canvasHeight, line.end));
            } else {
                // Ligne horizontale
                ctx.moveTo(Math.max(0, line.start), line.position);
                ctx.lineTo(Math.min(canvasWidth, line.end), line.position);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    // Dessiner les indicateurs de snap (petits points aux bords)
    renderSnapIndicators(ctx: CanvasRenderingContext2D): void {
        if (!this.currentSnapPoint) return;

        const snap = this.currentSnapPoint;
        const target = snap.targetBounds;

        ctx.save();
        ctx.fillStyle = this.config.guideLineColor;
        ctx.globalAlpha = 1;

        // Dessiner un petit carré à la position de snap
        const indicatorSize = 6;
        let px: number, py: number;

        switch (snap.anchor) {
            case 'left':
                px = snap.snapOffset + (target.x - snap.snapOffset - target.w) / 2;
                py = target.y + target.h / 2;
                break;
            case 'right':
                px = snap.snapOffset - (snap.snapOffset - target.x) / 2;
                py = target.y + target.h / 2;
                break;
            case 'top':
                px = target.x + target.w / 2;
                py = snap.snapOffset + (target.y - snap.snapOffset - target.h) / 2;
                break;
            case 'bottom':
                px = target.x + target.w / 2;
                py = snap.snapOffset - (snap.snapOffset - target.y) / 2;
                break;
            case 'center-x':
                px = snap.snapOffset;
                py = target.y + target.h / 2;
                break;
            case 'center-y':
                px = target.x + target.w / 2;
                py = snap.snapOffset;
                break;
        }

        ctx.fillRect(px - indicatorSize / 2, py - indicatorSize / 2, indicatorSize, indicatorSize);
        ctx.restore();
    }
}
