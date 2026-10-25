import {RawMapEntity, RawMapEntityType} from "../api";
import {PaletteMode} from "@mui/material";
import {simplify} from "./utils/simplify_js";

type PathDrawerOptions = {
    pathMapEntities: Array<RawMapEntity>,
    mapWidth: number,
    mapHeight: number,
    pixelSize: number,
    paletteMode: PaletteMode,
    width?: number,
    opacity?: number,
};

// Grosor por defecto del recorrido, en píxeles del mapa
export const DEFAULT_PATH_WIDTH = 0.5;

// Mota: pasadas de Chaikin para suavizar las esquinas del recorrido (solo al dibujar; los datos no cambian)
const PATH_SMOOTHING_ITERATIONS = 2;

/**
 * Suavizado de Chaikin sobre una lista plana [x0, y0, x1, y1, ...]. Conserva el primer y el último punto.
 *
 * @param {Array<number>} points
 * @param {number} iterations - número de pasadas
 * @returns {Array<number>}
 */
export function chaikinSmooth(points: Array<number>, iterations: number): Array<number> {
    let current = points;

    for (let iteration = 0; iteration < iterations; iteration++) {
        if (current.length < 6) { // Menos de tres puntos: no hay esquinas que suavizar
            return current;
        }

        const next: Array<number> = [current[0], current[1]];

        for (let i = 0; i < current.length - 2; i = i + 2) {
            const x0 = current[i];
            const y0 = current[i + 1];
            const x1 = current[i + 2];
            const y1 = current[i + 3];

            next.push(
                0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1,
                0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1
            );
        }

        // Los extremos se conservan tal cual
        next.push(current[current.length - 2], current[current.length - 1]);

        current = next;
    }

    return current;
}

export class PathDrawer {
    static getPathColor(paletteMode: PaletteMode): string {
        // Mota: sobre los pasteles de habitación el blanco apenas se ve; se usa un tono de la paleta (2.4)
        return paletteMode === "dark" ? "#E8EEEC" : "#3D4A46";
    }

    static drawPaths(options: PathDrawerOptions): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            if (options.pathMapEntities.length > 0) {
                img.src = PathDrawer.createSVGDataUrlFromPaths(options);

                img.decode().then(() => {
                    resolve(img);
                }).catch(err => {
                    reject(err);
                });
            } else {
                resolve(img);
            }
        });
    }

    private static createSVGDataUrlFromPaths(options: PathDrawerOptions) {
        const {
            mapWidth,
            mapHeight,
            paletteMode,
            pathMapEntities,
            pixelSize,
            width,
            opacity
        } = options;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${mapWidth}" height="${mapHeight}" viewBox="0 0 ${mapWidth} ${mapHeight}">`;
        const pathColor = PathDrawer.getPathColor(paletteMode);

        const paths = pathMapEntities.filter(e => e.type === RawMapEntityType.Path).map(e => e.points);
        if (paths.length > 0) {
            svg += PathDrawer.createSVGPathFromPaths(
                paths,
                RawMapEntityType.Path,
                pixelSize,
                pathColor,
                width,
                opacity
            );
        }

        const predictedPaths = pathMapEntities.filter(e => e.type === RawMapEntityType.PredictedPath).map(e => e.points);
        if (predictedPaths.length > 0) {
            svg += PathDrawer.createSVGPathFromPaths(
                predictedPaths,
                RawMapEntityType.PredictedPath,
                pixelSize,
                pathColor,
                width,
                opacity
            );
        }

        svg += "</svg>";

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    private static createSVGPathFromPaths(
        paths: Array<Array<number>>,
        type: RawMapEntityType,
        pixelSize: number,
        color: string,
        width?: number,
        opacity?: number,
    ) {
        const pathWidth = width ?? DEFAULT_PATH_WIDTH;
        const pathOpacity = opacity ?? 1;
        let commands = "";

        paths.forEach(points => {
            const simplifiedPoints = chaikinSmooth(simplify(points, 0.8), PATH_SMOOTHING_ITERATIONS);

            for (let i = 0; i < simplifiedPoints.length; i = i + 2) {
                let type = "L";

                if (i === 0) {
                    type = "M";
                }

                commands += `${type} ${simplifiedPoints[i] / pixelSize} ${simplifiedPoints[i + 1] / pixelSize} `;
            }
        });

        let svgPath = `<path d="${commands}" fill="none" stroke="${color}" stroke-width="${pathWidth}" stroke-opacity="${pathOpacity}" stroke-linecap="round" stroke-linejoin="round"`;

        if (type === RawMapEntityType.PredictedPath) {
            svgPath += " stroke-dasharray=\"1,1\"";
        }

        svgPath += "/>";

        return svgPath;
    }
}
