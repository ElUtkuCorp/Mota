/**
 * Mota: movimiento animado del robot en el mapa en vivo (F21).
 *
 * El robot envía su posición cada 0,5-3 s, así que sin más el icono "salta". Cada vez que llega una posición nueva:
 * - la animación parte de la posición que se está dibujando en ese instante (si llega a mitad, se encadena);
 * - va en línea recta hasta la nueva posición, y el ángulo gira por el camino más corto;
 * - dura lo mismo que el intervalo medido entre las dos últimas actualizaciones, acotado entre 300 y 2.500 ms.
 * Nunca se extrapola: al terminar, el robot se queda en el último punto recibido.
 *
 * Las posiciones están en píxeles del mapa y el ángulo en grados.
 */

export type RobotPose = {
    x: number;
    y: number;
    angle: number;
};

export const ROBOT_ANIMATION_MIN_DURATION = 300;
export const ROBOT_ANIMATION_MAX_DURATION = 2500;
// Si entre dos actualizaciones pasa más que esto (p. ej. la pestaña estaba oculta), no se anima: se salta al punto
const STALE_UPDATE_THRESHOLD = 10_000;

export function prefersReducedMotion(): boolean {
    try {
        return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
        return false; // Sin matchMedia, se anima
    }
}

function shortestAngleDelta(from: number, to: number): number {
    return ((((to - from) % 360) + 540) % 360) - 180;
}

function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

export class RobotMovementAnimator {
    private from: RobotPose | undefined;
    private to: RobotPose | undefined;
    private startTime = 0;
    private duration = 0;
    private lastUpdateTime: number | undefined;

    /**
     * Registra una posición recibida del robot.
     *
     * @param {RobotPose | undefined} target - la nueva posición (undefined si el mapa ya no tiene robot)
     * @param {number} now - performance.now()
     * @param {boolean} animate - false para saltar directamente (p. ej. con prefers-reduced-motion)
     * @returns {RobotPose | undefined} la posición desde la que arranca la animación, o undefined si no hay animación
     */
    update(target: RobotPose | undefined, now: number, animate: boolean): RobotPose | undefined {
        const previousUpdateTime = this.lastUpdateTime;
        this.lastUpdateTime = now;

        if (target === undefined) {
            this.from = undefined;
            this.to = undefined;

            return undefined;
        }

        const current = this.getPose(now);
        const interval = previousUpdateTime !== undefined ? now - previousUpdateTime : Infinity;

        if (
            !animate ||
            current === undefined ||
            interval > STALE_UPDATE_THRESHOLD
        ) {
            this.snapTo(target);

            return undefined;
        }

        // La misma posición que ya teníamos: se deja seguir la animación en curso, si la hay
        if (this.to !== undefined && RobotMovementAnimator.isSamePose(this.to, target)) {
            return this.isAnimating(now) ? this.from : undefined;
        }

        if (RobotMovementAnimator.isSamePose(current, target)) {
            this.snapTo(target);

            return undefined;
        }

        this.from = current;
        this.to = target;
        this.startTime = now;
        this.duration = Math.min(ROBOT_ANIMATION_MAX_DURATION, Math.max(ROBOT_ANIMATION_MIN_DURATION, interval));

        return current;
    }

    /**
     * La posición que hay que dibujar en el instante indicado
     *
     * @param {number} now - performance.now()
     * @returns {RobotPose | undefined}
     */
    getPose(now: number): RobotPose | undefined {
        if (this.to === undefined) {
            return undefined;
        }

        if (this.from === undefined || !this.isAnimating(now)) {
            return {...this.to};
        }

        const t = Math.min(1, Math.max(0, (now - this.startTime) / this.duration));

        return {
            x: this.from.x + (this.to.x - this.from.x) * t,
            y: this.from.y + (this.to.y - this.from.y) * t,
            angle: normalizeAngle(this.from.angle + shortestAngleDelta(this.from.angle, this.to.angle) * t)
        };
    }

    isAnimating(now: number): boolean {
        return this.from !== undefined && this.to !== undefined && now - this.startTime < this.duration;
    }

    reset(): void {
        this.from = undefined;
        this.to = undefined;
        this.lastUpdateTime = undefined;
    }

    private snapTo(target: RobotPose): void {
        this.from = undefined;
        this.to = {...target};
        this.duration = 0;
    }

    private static isSamePose(a: RobotPose, b: RobotPose): boolean {
        return (
            Math.abs(a.x - b.x) < 0.01 &&
            Math.abs(a.y - b.y) < 0.01 &&
            Math.abs(shortestAngleDelta(a.angle, b.angle)) < 0.1
        );
    }
}
