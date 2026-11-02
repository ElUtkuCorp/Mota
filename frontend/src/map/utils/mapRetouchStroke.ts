// Mota: recorre las celdas de un trazo con un pincel cuadrado, como hace el backend al guardarlo (RASTERIZE).
// Aquí solo sirve para la vista previa.
export const forEachStrokeStamp = (
    points: Array<number>,
    radius: number,
    stamp: (x: number, y: number, size: number) => void
): void => {
    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        const previousX = i > 0 ? points[i - 2] : x;
        const previousY = i > 0 ? points[i - 1] : y;
        const steps = Math.max(Math.abs(x - previousX), Math.abs(y - previousY), 1);

        for (let step = 1; step <= steps; step++) {
            stamp(
                Math.round(previousX + (x - previousX) * step / steps) - radius,
                Math.round(previousY + (y - previousY) * step / steps) - radius,
                radius * 2 + 1
            );
        }
    }
};
