const fs = require("fs");
const Logger = require("../../Logger");

/**
 * Mota: habitaciones virtuales. El firmware de la 3090 no tiene habitaciones, así que Mota divide el
 * mapa por su cuenta, permite unir, dividir y renombrar, y limpia cada habitación como un conjunto
 * de zonas rectangulares (lo que el firmware sí entiende).
 *
 * Las habitaciones se guardan como listas de índices de celda (y * width + x) en el espacio de
 * píxeles de las capas del mapa de Mota.
 */
class CecotecVirtualRooms {
    /**
     * @param {object} options
     * @param {string} [options.path] JSON donde se guardan; sin ruta solo viven en memoria
     */
    constructor(options) {
        this.path = options.path;
        /** @type {{width: number, rooms: Array<{id: number, name: string, color?: string, pixels: Array<number>}>}} */
        this.data = {width: 0, rooms: []};
        /** @type {Map<number, Array<number>> | undefined} celdas ajustadas al suelo actual (no se guardan) */
        this.fitted = undefined;

        this.load();
    }

    /**
     * @returns {boolean}
     */
    hasRooms() {
        return this.data.rooms.length > 0;
    }

    /**
     * Habitaciones con sus celdas ajustadas al suelo actual si ya se ha llamado a fitToFloor()
     *
     * @returns {Array<{id: number, name: string, color?: string, pixels: Array<number>}>}
     */
    getRooms() {
        return this.data.rooms.map(r => {
            return {id: r.id, name: r.name, color: r.color, pixels: this.fitted?.get(r.id) ?? r.pixels};
        });
    }

    /**
     * Ajusta las habitaciones guardadas al suelo actual del mapa: las celdas que ya no son suelo se
     * descartan y el suelo nuevo (descubierto después de dividir) se asigna a la habitación más
     * cercana recorriendo el suelo. No se guarda: se recalcula con cada mapa.
     *
     * @param {Array<number>} floor pares x, y planos
     * @param {number} width
     * @param {number} height
     */
    fitToFloor(floor, width, height) {
        if (!this.hasRooms() || width !== this.data.width) {
            this.fitted = undefined;

            return;
        }

        const size = width * height;
        const label = new Int32Array(size).fill(-1); // -1 = no es suelo, 0 = suelo sin habitación
        const floorCells = [];

        for (let i = 0; i < floor.length; i += 2) {
            const cell = floor[i + 1] * width + floor[i];

            label[cell] = 0;
            floorCells.push(cell);
        }

        const queue = new Int32Array(size);
        let head = 0;
        let tail = 0;

        this.data.rooms.forEach(room => {
            room.pixels.forEach(cell => {
                if (label[cell] === 0) {
                    label[cell] = room.id;
                    queue[tail++] = cell;
                }
            });
        });

        while (head < tail) {
            const cell = queue[head++];
            const x = cell % width;
            const visit = (n) => {
                if (label[n] === 0) {
                    label[n] = label[cell];
                    queue[tail++] = n;
                }
            };

            if (x > 0) {
                visit(cell - 1);
            }
            if (x < width - 1) {
                visit(cell + 1);
            }
            if (cell >= width) {
                visit(cell - width);
            }
            if (cell < size - width) {
                visit(cell + width);
            }
        }

        this.fitted = new Map(this.data.rooms.map(r => {
            return [r.id, []];
        }));
        floorCells.forEach(cell => {
            if (label[cell] > 0) {
                this.fitted.get(label[cell]).push(cell);
            }
        });
    }

    /**
     * @returns {number}
     */
    getWidth() {
        return this.data.width;
    }

    /**
     * Divide el mapa en habitaciones (sustituye a las que hubiera)
     *
     * @param {Array<number>} floor celdas de suelo como pares x, y planos
     * @param {number} width
     * @param {number} height
     * @param {number} resolution metros por celda
     */
    segment(floor, width, height, resolution) {
        const rooms = CecotecVirtualRooms.SEGMENT(floor, width, height, resolution);

        this.data = {
            width: width,
            rooms: rooms.map((pixels, i) => {
                return {id: i + 1, name: `Habitación ${i + 1}`, pixels: pixels};
            })
        };
        this.save();
        Logger.info(`Virtual rooms: map split into ${rooms.length} rooms`);
    }

    /**
     * @param {number} idA
     * @param {number} idB
     */
    join(idA, idB) {
        const a = this.getRoom(idA);
        const b = this.getRoom(idB);

        this.fitted = undefined;
        a.pixels = a.pixels.concat(b.pixels);
        this.data.rooms = this.data.rooms.filter(r => {
            return r.id !== b.id;
        });
        this.save();
    }

    /**
     * Divide una habitación por la recta que pasa por pA y pB
     *
     * @param {number} id
     * @param {{x: number, y: number}} pA
     * @param {{x: number, y: number}} pB
     */
    split(id, pA, pB) {
        const room = this.getRoom(id);
        // Se divide la versión ajustada al suelo actual, que es la que ve el usuario
        room.pixels = this.fitted?.get(room.id) ?? room.pixels;
        this.fitted = undefined;
        const width = this.data.width;
        const sideA = [];
        const sideB = [];

        room.pixels.forEach(i => {
            const x = i % width;
            const y = Math.floor(i / width);
            const cross = (pB.x - pA.x) * (y - pA.y) - (pB.y - pA.y) * (x - pA.x);

            (cross >= 0 ? sideA : sideB).push(i);
        });

        if (sideA.length === 0 || sideB.length === 0) {
            throw new Error("The line does not split the room");
        }

        room.pixels = sideA;
        const newId = Math.max(...this.data.rooms.map(r => {
            return r.id;
        })) + 1;
        this.data.rooms.push({id: newId, name: `Habitación ${newId}`, pixels: sideB});
        this.save();
    }

    /**
     * Mota: color con el que se pinta la habitación ("#rrggbb"); undefined vuelve al automático
     *
     * @param {number} id
     * @param {string|undefined} color
     */
    setColor(id, color) {
        if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
            throw new Error("Invalid color");
        }

        this.getRoom(id).color = color?.toLowerCase();
        this.save();
    }

    /**
     * @param {number} id
     * @param {string} name
     */
    rename(id, name) {
        this.getRoom(id).name = name;
        this.save();
    }

    /**
     * Rectángulos (en celdas) que cubren una habitación, para limpiarla como zonas
     *
     * @param {number} id
     * @param {number} maxRects
     * @param {number} resolution metros por celda
     * @returns {Array<{x0: number, y0: number, x1: number, y1: number}>}
     */
    getCleaningRects(id, maxRects, resolution) {
        return CecotecVirtualRooms.COVER(this.fitted?.get(Number(id)) ?? this.getRoom(id).pixels, this.data.width, maxRects, resolution);
    }

    /**
     * Mota: habitaciones que el recorrido aún no ha cubierto (para reanudar tras cargar)
     *
     * @param {Array<number>} path pares x, y planos del recorrido
     * @param {number} resolution metros por celda
     * @returns {Array<number>} ids de las habitaciones con menos del 60 % de sus celdas a menos de 30 cm del recorrido
     */
    getUncoveredRoomIds(path, resolution) {
        const width = this.data.width;
        const radius = Math.max(1, Math.round(0.3 / resolution));
        const near = new Set();

        for (let i = 0; i < path.length; i += 2) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    near.add((path[i + 1] + dy) * width + path[i] + dx);
                }
            }
        }

        return this.getRooms().filter(room => {
            const covered = room.pixels.filter(cell => {
                return near.has(cell);
            }).length;

            return room.pixels.length > 0 && covered / room.pixels.length < 0.6;
        }).map(room => {
            return room.id;
        });
    }

    /**
     * @private
     * @param {number} id
     */
    getRoom(id) {
        const room = this.data.rooms.find(r => {
            return r.id === Number(id);
        });

        if (!room) {
            throw new Error(`There is no room with id ${id}`);
        }

        return room;
    }

    /**
     * @private
     */
    load() {
        if (!this.path) {
            return;
        }

        try {
            this.data = JSON.parse(fs.readFileSync(this.path).toString());
        } catch (e) {
            // sin habitaciones todavía
        }
    }

    /**
     * @private
     */
    save() {
        if (!this.path) {
            return;
        }

        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data));
        } catch (e) {
            Logger.warn("Virtual rooms: unable to save", e);
        }
    }

    /**
     * Segmentación sencilla por "estrechamientos": se erosiona el suelo con un radio de media puerta,
     * cada componente conexa que queda es el núcleo de una habitación, y el resto del suelo se asigna
     * al núcleo más cercano recorriendo el suelo (BFS multi-origen). Las habitaciones muy pequeñas se
     * unen a la vecina con la que más frontera comparten.
     *
     * @param {Array<number>} floor pares x, y planos
     * @param {number} width
     * @param {number} height
     * @param {number} resolution metros por celda
     * @returns {Array<Array<number>>} índices de celda por habitación, de mayor a menor
     */
    static SEGMENT(floor, width, height, resolution) {
        const size = width * height;
        const isFloor = new Uint8Array(size);

        for (let i = 0; i < floor.length; i += 2) {
            isFloor[floor[i + 1] * width + floor[i]] = 1;
        }

        // Distancia (en celdas, 8-vecindad) al obstáculo más cercano
        const dist = new Int32Array(size).fill(-1);
        let queue = new Int32Array(size);
        let head = 0;
        let tail = 0;

        for (let i = 0; i < size; i++) {
            if (!isFloor[i]) {
                dist[i] = 0;
                queue[tail++] = i;
            }
        }
        while (head < tail) {
            const i = queue[head++];
            const x = i % width;
            const y = (i - x) / width;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if ((dx !== 0 || dy !== 0) && nx >= 0 && ny >= 0 && nx < width && ny < height) {
                        const n = ny * width + nx;

                        if (dist[n] === -1) {
                            dist[n] = dist[i] + 1;
                            queue[tail++] = n;
                        }
                    }
                }
            }
        }

        const doorHalfWidth = Math.max(2, Math.round(0.4 / resolution));
        const minCoreCells = Math.round(0.25 / (resolution * resolution));
        const minRoomCells = Math.round(1.5 / (resolution * resolution));
        const label = new Int32Array(size);
        const neighbors4 = (i, fn) => {
            const x = i % width;

            if (x > 0) {
                fn(i - 1);
            }
            if (x < width - 1) {
                fn(i + 1);
            }
            if (i >= width) {
                fn(i - width);
            }
            if (i < size - width) {
                fn(i + width);
            }
        };

        // Núcleos: componentes conexas de las celdas lejos de cualquier obstáculo
        let nextLabel = 1;
        const coreSizes = [0];

        for (let i = 0; i < size; i++) {
            if (isFloor[i] && dist[i] > doorHalfWidth && label[i] === 0) {
                const cells = [i];

                label[i] = nextLabel;
                for (let k = 0; k < cells.length; k++) {
                    neighbors4(cells[k], n => {
                        if (isFloor[n] && dist[n] > doorHalfWidth && label[n] === 0) {
                            label[n] = nextLabel;
                            cells.push(n);
                        }
                    });
                }

                if (cells.length < minCoreCells) {
                    cells.forEach(c => {
                        label[c] = 0;
                    });
                } else {
                    coreSizes.push(cells.length);
                    nextLabel++;
                }
            }
        }

        if (nextLabel === 1) {
            // Mapa sin estrechamientos claros: una sola habitación
            const all = [];
            for (let i = 0; i < size; i++) {
                if (isFloor[i]) {
                    all.push(i);
                }
            }

            return all.length > 0 ? [all] : [];
        }

        // Asignar el resto del suelo al núcleo más cercano
        queue = new Int32Array(size);
        head = 0;
        tail = 0;
        for (let i = 0; i < size; i++) {
            if (label[i] > 0) {
                queue[tail++] = i;
            }
        }
        while (head < tail) {
            const i = queue[head++];

            neighbors4(i, n => {
                if (isFloor[n] && label[n] === 0) {
                    label[n] = label[i];
                    queue[tail++] = n;
                }
            });
        }

        // Unir habitaciones pequeñas a la vecina con más frontera
        const rooms = new Map();
        for (let i = 0; i < size; i++) {
            if (label[i] > 0) {
                if (!rooms.has(label[i])) {
                    rooms.set(label[i], []);
                }
                rooms.get(label[i]).push(i);
            }
        }

        let merged = true;
        while (merged && rooms.size > 1) {
            merged = false;
            const smallest = [...rooms.entries()].sort((a, b) => {
                return a[1].length - b[1].length;
            })[0];

            if (smallest[1].length < minRoomCells) {
                const contacts = new Map();

                smallest[1].forEach(i => {
                    neighbors4(i, n => {
                        if (label[n] > 0 && label[n] !== smallest[0]) {
                            contacts.set(label[n], (contacts.get(label[n]) ?? 0) + 1);
                        }
                    });
                });

                const target = [...contacts.entries()].sort((a, b) => {
                    return b[1] - a[1];
                })[0];

                if (target) {
                    smallest[1].forEach(i => {
                        label[i] = target[0];
                    });
                    rooms.get(target[0]).push(...smallest[1]);
                    rooms.delete(smallest[0]);
                    merged = true;
                }
            }
        }

        return [...rooms.values()].sort((a, b) => {
            return b.length - a.length;
        });
    }

    /**
     * Cubre una habitación con pocos rectángulos: se trabaja en bloques de ~25 cm y se toma
     * repetidamente el mayor rectángulo de bloques sin cubrir, hasta cubrir el 95 % o llegar a
     * maxRects.
     *
     * @param {Array<number>} pixels índices de celda
     * @param {number} width
     * @param {number} maxRects
     * @param {number} resolution metros por celda
     * @returns {Array<{x0: number, y0: number, x1: number, y1: number}>} en celdas, extremos incluidos
     */
    static COVER(pixels, width, maxRects, resolution) {
        if (pixels.length === 0) {
            return [];
        }

        const block = Math.max(1, Math.round(0.25 / resolution));
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        pixels.forEach(i => {
            const x = i % width;
            const y = Math.floor(i / width);

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        const cols = Math.floor((maxX - minX) / block) + 1;
        const rows = Math.floor((maxY - minY) / block) + 1;
        const counts = new Int32Array(cols * rows);

        pixels.forEach(i => {
            const x = i % width;
            const y = Math.floor(i / width);

            counts[Math.floor((y - minY) / block) * cols + Math.floor((x - minX) / block)]++;
        });

        const threshold = Math.max(1, Math.floor(block * block / 2));
        const todo = new Uint8Array(cols * rows);
        let remaining = 0;

        for (let i = 0; i < counts.length; i++) {
            if (counts[i] >= threshold) {
                todo[i] = 1;
                remaining++;
            }
        }

        const total = remaining;
        const rects = [];

        while (remaining > 0 && rects.length < maxRects && remaining > total * 0.05) {
            const best = CecotecVirtualRooms.LARGEST_RECTANGLE(todo, cols, rows);

            if (!best) {
                break;
            }

            for (let r = best.r0; r <= best.r1; r++) {
                for (let c = best.c0; c <= best.c1; c++) {
                    if (todo[r * cols + c]) {
                        todo[r * cols + c] = 0;
                        remaining--;
                    }
                }
            }

            rects.push({
                x0: minX + best.c0 * block,
                y0: minY + best.r0 * block,
                x1: Math.min(maxX, minX + (best.c1 + 1) * block - 1),
                y1: Math.min(maxY, minY + (best.r1 + 1) * block - 1),
            });
        }

        return rects;
    }

    /**
     * Mayor rectángulo de unos en una matriz binaria (método del histograma)
     *
     * @param {Uint8Array} grid
     * @param {number} cols
     * @param {number} rows
     * @returns {{r0: number, r1: number, c0: number, c1: number} | undefined}
     */
    static LARGEST_RECTANGLE(grid, cols, rows) {
        const heights = new Int32Array(cols);
        let best;
        let bestArea = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                heights[c] = grid[r * cols + c] ? heights[c] + 1 : 0;
            }

            const stack = [];
            for (let c = 0; c <= cols; c++) {
                const h = c < cols ? heights[c] : 0;

                while (stack.length > 0 && heights[stack[stack.length - 1]] >= h) {
                    const top = stack.pop();
                    const height = heights[top];
                    const left = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
                    const area = height * (c - left);

                    if (height > 0 && area > bestArea) {
                        bestArea = area;
                        best = {r0: r - height + 1, r1: r, c0: left, c1: c - 1};
                    }
                }
                stack.push(c);
            }
        }

        return best;
    }
}

module.exports = CecotecVirtualRooms;
