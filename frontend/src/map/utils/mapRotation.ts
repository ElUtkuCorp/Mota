/**
 * Mota: el giro del mapa es solo de la vista. Se aplica a la transformación del lienzo, así que todo lo que vive en el
 * espacio del mapa gira con él, y cualquier punto de la pantalla se convierte al espacio del mapa invirtiendo esa misma
 * transformación: las coordenadas que se envían al robot son las reales con cualquier giro.
 *
 * Solo cuartos de vuelta: las zonas del firmware son rectángulos alineados con los ejes del mapa y así lo siguen
 * estando en la pantalla. Los valores son exactos para no arrastrar errores de redondeo a las coordenadas.
 */
export type MapRotation = 0 | 90 | 180 | 270;

const ROTATION_MATRICES: Record<MapRotation, {a: number, b: number, c: number, d: number}> = {
    0: {a: 1, b: 0, c: 0, d: 1},
    90: {a: 0, b: 1, c: -1, d: 0},
    180: {a: -1, b: 0, c: 0, d: -1},
    270: {a: 0, b: -1, c: 1, d: 0}
};

export const normalizeMapRotation = (rotation: unknown): MapRotation => {
    return rotation === 90 || rotation === 180 || rotation === 270 ? rotation : 0;
};

// Giro en el sentido de las agujas del reloj (positivo) o al contrario (negativo)
export const addMapRotation = (rotation: MapRotation, degrees: number): MapRotation => {
    return normalizeMapRotation((rotation + degrees + 360) % 360);
};

export const getMapRotationMatrix = (rotation: MapRotation): {a: number, b: number, c: number, d: number} => {
    return ROTATION_MATRICES[rotation];
};

// Lo que ocupa en la pantalla un rectángulo del mapa
export const getRotatedSize = (width: number, height: number, rotation: MapRotation): {width: number, height: number} => {
    return rotation === 90 || rotation === 270 ? {width: height, height: width} : {width: width, height: height};
};
