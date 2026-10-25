import {RawMapLayer, RawMapLayerType} from "../../api";

/**
 * Mota: convierte los píxeles de pared en un trazado vectorial (Path2D) en el espacio de píxeles del mapa.
 *
 * Antes las paredes iban dentro de la imagen de píxeles y, al ampliar, se veían en escalera.
 * Ahora cada píxel de pared se une con sus vecinos mediante segmentos que pasan por el centro de los píxeles:
 * - las filas y columnas seguidas se juntan en un único segmento (así hay muchos menos que píxeles);
 * - las diagonales solo se unen si no hay ya un camino en ángulo recto, para no rellenar triángulos en las esquinas;
 * - los píxeles sueltos se dibujan como un punto.
 *
 * Al trazarlo con extremos y uniones redondeados, las escaleras diagonales quedan como líneas rectas y las esquinas
 * redondeadas. El trazado se construye una vez por mapa (unos 2.000-3.000 píxeles: menos de 1 ms) y en cada
 * fotograma solo se hace un stroke() con la transformación actual, así que respeta el zoom y se ve nítido.
 *
 * @param {Array<RawMapLayer>} layers - las capas del mapa
 * @returns {Path2D | undefined} el trazado en píxeles del mapa, o undefined si no hay paredes
 */
export function BUILD_WALL_PATH(layers: Array<RawMapLayer>): Path2D | undefined {
    const wallLayers = layers.filter(l => {
        return l.type === RawMapLayerType.Wall;
    });

    if (wallLayers.length === 0) {
        return undefined;
    }

    const occupied = new Set<number>();
    const pixels: Array<number> = [];
    // Las coordenadas de píxel del mapa son pequeñas (< 2^15), así que caben en una única clave numérica
    const key = (x: number, y: number) => {
        return (x + 32768) * 65536 + (y + 32768);
    };

    wallLayers.forEach(layer => {
        for (let i = 0; i < layer.pixels.length; i = i + 2) {
            const x = layer.pixels[i];
            const y = layer.pixels[i + 1];
            const k = key(x, y);

            if (!occupied.has(k)) {
                occupied.add(k);
                pixels.push(x, y);
            }
        }
    });

    if (pixels.length === 0) {
        return undefined;
    }

    const has = (x: number, y: number) => {
        return occupied.has(key(x, y));
    };

    const path = new Path2D();
    const linked = new Set<number>();
    const segment = (x0: number, y0: number, x1: number, y1: number) => {
        path.moveTo(x0 + 0.5, y0 + 0.5);
        path.lineTo(x1 + 0.5, y1 + 0.5);
    };

    for (let i = 0; i < pixels.length; i = i + 2) {
        const x = pixels[i];
        const y = pixels[i + 1];

        // Fila: solo desde el primer píxel de cada tramo horizontal
        if (!has(x - 1, y) && has(x + 1, y)) {
            let end = x + 1;
            while (has(end + 1, y)) {
                end++;
            }

            segment(x, y, end, y);
            for (let xx = x; xx <= end; xx++) {
                linked.add(key(xx, y));
            }
        }

        // Columna: solo desde el primer píxel de cada tramo vertical
        if (!has(x, y - 1) && has(x, y + 1)) {
            let end = y + 1;
            while (has(x, end + 1)) {
                end++;
            }

            segment(x, y, x, end);
            for (let yy = y; yy <= end; yy++) {
                linked.add(key(x, yy));
            }
        }

        // Diagonales (solo hacia abajo para no repetirlas), si no hay ya una esquina en ángulo recto que las una
        if (has(x + 1, y + 1) && !has(x + 1, y) && !has(x, y + 1)) {
            segment(x, y, x + 1, y + 1);
            linked.add(key(x, y));
            linked.add(key(x + 1, y + 1));
        }
        if (has(x - 1, y + 1) && !has(x - 1, y) && !has(x, y + 1)) {
            segment(x, y, x - 1, y + 1);
            linked.add(key(x, y));
            linked.add(key(x - 1, y + 1));
        }
    }

    // Píxeles sueltos: un segmento casi nulo que, con extremos redondeados, se dibuja como un punto
    for (let i = 0; i < pixels.length; i = i + 2) {
        const x = pixels[i];
        const y = pixels[i + 1];

        if (!linked.has(key(x, y))) {
            path.moveTo(x + 0.5, y + 0.5);
            path.lineTo(x + 0.51, y + 0.5);
        }
    }

    return path;
}
