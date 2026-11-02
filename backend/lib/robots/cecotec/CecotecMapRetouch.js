const fs = require("fs");
const Logger = require("../../Logger");

const EMPTY = 0;
const FLOOR = 1;
const WALL = 2;

const PAINT_VALUES = {void: EMPTY, floor: FLOOR, wall: WALL};

/**
 * Mota: retoques del mapa. Es una capa solo visual: el firmware, las habitaciones, las zonas de limpieza y el suelo con
 * el que se comparan las versiones siguen usando el mapa real. Solo cambian las capas que se muestran.
 *
 * Los retoques son una lista ordenada que se aplica sobre cada mapa que llega, así que nada se escribe en el mapa y
 * deshacer es quitar el último. El giro va aparte: es una preferencia de la vista y las coordenadas no cambian.
 *
 * Una isla es un trozo de mapa sin conexión con la zona principal, ninguna habitación, la base ni el robot:
 * - Si sigue suelta, sigue oculta aunque el firmware la vuelva a detectar o crezca.
 * - Si se une a la zona principal o a una habitación, o el robot entra en ella, vuelve a verse: es suelo real.
 *   No se borra de la lista: si deja de estar unida, se oculta otra vez.
 *
 * Lo pintado a mano no se reevalúa: manda sobre lo que detecte el firmware hasta que se deshaga.
 * Si las habitaciones no encajan con el mapa actual (mapa temporal u otro mapa del firmware), los retoques son de otro
 * mapa y no se aplican hasta que vuelva.
 */
class CecotecMapRetouch {
    /**
     * @param {object} options
     * @param {string} [options.path] JSON donde se guardan; sin ruta solo viven en memoria
     */
    constructor(options) {
        this.path = options.path;
        /** @type {RetouchData} */
        this.data = {rotation: 0, width: 0, edits: []};

        this.load();
    }

    /**
     * @returns {number} giro de la vista en grados, en el sentido de las agujas del reloj
     */
    getRotation() {
        return this.data.rotation;
    }

    /**
     * @param {number} rotation
     */
    setRotation(rotation) {
        if (!CecotecMapRetouch.ROTATIONS.includes(rotation)) {
            throw new Error("Invalid rotation");
        }

        this.data.rotation = rotation;
        this.save();
    }

    /**
     * @param {RetouchContext} context
     * @returns {boolean} si estos retoques son de este mapa
     */
    isUsable(context) {
        return !context.stale && (this.data.width === 0 || this.data.width === context.width);
    }

    /**
     * Las capas que se muestran. Las celdas de las habitaciones que vuelve son solo para pintar: las zonas de limpieza
     * se calculan siempre con las reales.
     *
     * @param {RetouchContext} context
     * @returns {{floor: Array<number>, walls: Array<number>, rooms?: Map<number, Array<number>>}}
     */
    apply(context) {
        if (this.data.edits.length === 0 || !this.isUsable(context)) {
            return {floor: context.floor, walls: context.walls};
        }

        const { width, height } = context;
        const grid = CecotecMapRetouch.BUILD_GRID(context);
        const hidden = this.getHiddenCells();

        if (hidden.size > 0) {
            CecotecMapRetouch.FIND_ISLANDS(context).forEach(island => {
                if (island.cells.some(cell => {
                    return hidden.has(cell);
                })) {
                    island.cells.forEach(cell => {
                        grid[cell] = EMPTY;
                    });
                }
            });
        }

        const painted = new Set();

        this.data.edits.forEach(edit => {
            if (edit.type === "paint") {
                const value = PAINT_VALUES[edit.value];

                edit.cells.forEach(cell => {
                    grid[cell] = value;
                    painted.add(cell);
                });
            }
        });

        const labels = CecotecMapRetouch.BUILD_ROOM_LABELS(context);

        CecotecMapRetouch.SPREAD_ROOMS_OVER_PAINT(grid, labels, painted, width);

        const floor = [];
        const walls = [];
        const rooms = new Map(context.rooms.map(room => {
            return [room.id, []];
        }));

        for (let cell = 0; cell < grid.length; cell++) {
            if (grid[cell] === FLOOR) {
                floor.push(cell % width, Math.floor(cell / width));

                if (labels[cell] > 0) {
                    rooms.get(labels[cell]).push(cell);
                }
            } else if (grid[cell] === WALL) {
                walls.push(cell % width, Math.floor(cell / width));
            }
        }

        Logger.debug(`Map retouch: ${this.data.edits.length} edits applied on a ${width}x${height} map`);

        return {floor: floor, walls: walls, rooms: rooms};
    }

    /**
     * @param {RetouchContext} context
     * @returns {RetouchStatus}
     */
    getStatus(context) {
        const usable = this.isUsable(context);
        const hiddenCells = this.getHiddenCells();
        const islands = [];
        const hidden = [];

        if (usable) {
            CecotecMapRetouch.FIND_ISLANDS(context).forEach(island => {
                const isHidden = island.cells.some(cell => {
                    return hiddenCells.has(cell);
                });

                (isHidden ? hidden : islands).push(island);
            });
        }

        return {
            rotation: this.data.rotation,
            usable: usable,
            width: context.width,
            editCount: this.data.edits.length,
            canUndo: this.canUndo(),
            islands: islands,
            hidden: hidden,
        };
    }

    /**
     * @param {RetouchContext} context
     * @param {Array<number>} [ids] ids de las islas; sin ellos, todas las que se ven
     */
    hideIslands(context, ids) {
        const status = this.getStatus(context);
        const islands = CecotecMapRetouch.SELECT_ISLANDS(status.islands, ids);

        if (islands.length === 0) {
            throw new Error("No hay ninguna isla que ocultar.");
        }

        this.addEdit(context, {type: "hide", cells: islands.flatMap(island => {
            return island.cells;
        })});
    }

    /**
     * @param {RetouchContext} context
     * @param {Array<number>} [ids] ids de las islas; sin ellos, todas las ocultas
     */
    showIslands(context, ids) {
        const status = this.getStatus(context);
        const islands = CecotecMapRetouch.SELECT_ISLANDS(status.hidden, ids);

        if (islands.length === 0) {
            throw new Error("No hay ninguna isla oculta.");
        }

        this.addEdit(context, {type: "show", cells: islands.flatMap(island => {
            return island.cells;
        })});
    }

    /**
     * @param {RetouchContext} context
     * @param {"floor"|"wall"|"void"} value
     * @param {number} radius radio del pincel en celdas
     * @param {Array<number>} points trazo en píxeles del mapa, como pares x, y planos
     */
    paint(context, value, radius, points) {
        if (!Object.keys(PAINT_VALUES).includes(value)) {
            throw new Error("Invalid value");
        }

        const cells = CecotecMapRetouch.RASTERIZE(points, radius, context.width, context.height);

        if (cells.length === 0) {
            throw new Error("El trazo está fuera del mapa.");
        }

        this.addEdit(context, {type: "paint", value: value, cells: cells});
    }

    /**
     * @returns {boolean}
     */
    canUndo() {
        return this.data.edits.length > 0 || this.hasRestorePoint();
    }

    /**
     * Quita el último retoque. Si el último cambio fue sustituir la lista entera (quitar todos o recuperar una
     * versión), vuelve a la lista de antes.
     */
    undo() {
        if (this.hasRestorePoint()) {
            this.data.edits = this.data.restorePoint.edits;
            this.data.width = this.data.restorePoint.width;
            delete this.data.restorePoint;
        } else if (this.data.edits.length > 0) {
            this.data.edits.pop();
        } else {
            throw new Error("No hay nada que deshacer.");
        }

        this.save();
    }

    /**
     * Quita todos los retoques (el giro no, es de la vista), con posibilidad de deshacer
     */
    clear() {
        this.replaceEdits({width: 0, edits: []});
    }

    /**
     * El mapa del que eran ya no existe: no queda nada que deshacer
     */
    forgetMap() {
        this.data.width = 0;
        this.data.edits = [];
        delete this.data.restorePoint;
        this.save();
    }

    /**
     * Copia de los retoques, para las versiones del mapa
     *
     * @returns {{width: number, edits: Array<RetouchEdit>}}
     */
    exportEdits() {
        return JSON.parse(JSON.stringify({width: this.data.width, edits: this.data.edits}));
    }

    /**
     * Sustituye los retoques por los de una versión guardada, con posibilidad de deshacer
     *
     * @param {{width: number, edits: Array<RetouchEdit>}} data
     */
    importEdits(data) {
        this.replaceEdits(JSON.parse(JSON.stringify(data)));
    }

    /**
     * @private
     * @param {{width: number, edits: Array<RetouchEdit>}} data
     */
    replaceEdits(data) {
        this.data.restorePoint = {width: this.data.width, edits: this.data.edits, length: data.edits.length};
        this.data.width = data.width;
        this.data.edits = data.edits;
        this.save();
    }

    /**
     * @private
     * @returns {boolean} si lo último que queda por deshacer es una sustitución de la lista
     */
    hasRestorePoint() {
        return this.data.restorePoint?.length === this.data.edits.length;
    }

    /**
     * @private
     * @param {RetouchContext} context
     * @param {RetouchEdit} edit
     */
    addEdit(context, edit) {
        if (!this.isUsable(context)) {
            throw new Error("Los retoques son de otro mapa. Vuelve a ese mapa o quítalos.");
        }

        const cellCount = this.data.edits.reduce((total, e) => {
            return total + e.cells.length;
        }, edit.cells.length);

        if (this.data.edits.length >= CecotecMapRetouch.MAX_EDITS || cellCount > CecotecMapRetouch.MAX_CELLS) {
            throw new Error("Hay demasiados retoques. Quita algunos para seguir.");
        }

        this.data.width = context.width;
        this.data.edits.push(edit);
        this.save();
    }

    /**
     * @private
     * @returns {Set<number>}
     */
    getHiddenCells() {
        const hidden = new Set();

        this.data.edits.forEach(edit => {
            if (edit.type === "hide") {
                edit.cells.forEach(cell => {
                    hidden.add(cell);
                });
            } else if (edit.type === "show") {
                edit.cells.forEach(cell => {
                    hidden.delete(cell);
                });
            }
        });

        return hidden;
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
            // sin retoques todavía
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
            Logger.warn("Map retouch: unable to save", e);
        }
    }

    /**
     * @param {Array<RetouchIsland>} islands
     * @param {Array<number>} [ids]
     * @returns {Array<RetouchIsland>}
     */
    static SELECT_ISLANDS(islands, ids) {
        if (ids === undefined) {
            return islands;
        }

        return islands.filter(island => {
            return ids.includes(island.id);
        });
    }

    /**
     * @param {RetouchContext} context
     * @returns {Uint8Array} EMPTY, FLOOR o WALL por celda
     */
    static BUILD_GRID(context) {
        const { floor, walls, width, height } = context;
        const grid = new Uint8Array(width * height);

        for (let i = 0; i < floor.length; i += 2) {
            grid[floor[i + 1] * width + floor[i]] = FLOOR;
        }
        for (let i = 0; i < walls.length; i += 2) {
            grid[walls[i + 1] * width + walls[i]] = WALL;
        }

        return grid;
    }

    /**
     * @param {RetouchContext} context
     * @returns {Int32Array} id de la habitación por celda (0 si no tiene)
     */
    static BUILD_ROOM_LABELS(context) {
        const labels = new Int32Array(context.width * context.height);

        context.rooms.forEach(room => {
            room.pixels.forEach(cell => {
                labels[cell] = room.id;
            });
        });

        return labels;
    }

    /**
     * El suelo pintado junto a una habitación se pinta del color de esa habitación
     *
     * @param {Uint8Array} grid
     * @param {Int32Array} labels
     * @param {Set<number>} painted
     * @param {number} width
     */
    static SPREAD_ROOMS_OVER_PAINT(grid, labels, painted, width) {
        const queue = [];

        painted.forEach(cell => {
            if (grid[cell] === FLOOR && labels[cell] === 0) {
                CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, grid.length, 1, n => {
                    if (labels[n] > 0 && grid[n] === FLOOR) {
                        queue.push(n);
                    }
                });
            }
        });

        for (let head = 0; head < queue.length; head++) {
            const cell = queue[head];

            CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, grid.length, 1, n => {
                if (labels[n] === 0 && grid[n] === FLOOR && painted.has(n)) {
                    labels[n] = labels[cell];
                    queue.push(n);
                }
            });
        }
    }

    /**
     * @param {number} cell
     * @param {number} width
     * @param {number} size
     * @param {number} radius
     * @param {(cell: number) => void} callback
     */
    static FOR_EACH_NEIGHBOR(cell, width, size, radius, callback) {
        const x = cell % width;
        const y = Math.floor(cell / width);
        const height = size / width;

        for (let ny = Math.max(0, y - radius); ny <= Math.min(height - 1, y + radius); ny++) {
            for (let nx = Math.max(0, x - radius); nx <= Math.min(width - 1, x + radius); nx++) {
                if (nx !== x || ny !== y) {
                    callback(ny * width + nx);
                }
            }
        }
    }

    /**
     * Los trozos del mapa real que no están unidos a nada que importe. Se conserva el trozo de suelo más grande y los
     * que tengan una habitación o estén junto a la base o el robot, con las paredes que los rodean. El resto del suelo
     * y las paredes sueltas, unidos entre sí, son las islas.
     *
     * @param {RetouchContext} context
     * @returns {Array<RetouchIsland>}
     */
    static FIND_ISLANDS(context) {
        const { width, height } = context;
        const size = width * height;
        const grid = CecotecMapRetouch.BUILD_GRID(context);
        const roomLabels = CecotecMapRetouch.BUILD_ROOM_LABELS(context);
        const labels = new Int32Array(size);
        const stack = new Int32Array(size);
        const kept = [false];
        const sizes = [0];

        for (let start = 0; start < size; start++) {
            if (grid[start] !== FLOOR || labels[start] !== 0) {
                continue;
            }

            const label = sizes.length;
            let top = 0;
            let count = 0;
            let hasRoom = false;

            labels[start] = label;
            stack[top++] = start;
            while (top > 0) {
                const cell = stack[--top];

                count++;
                hasRoom = hasRoom || roomLabels[cell] > 0;
                CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, size, 1, n => {
                    if (grid[n] === FLOOR && labels[n] === 0) {
                        labels[n] = label;
                        stack[top++] = n;
                    }
                });
            }

            sizes.push(count);
            kept.push(hasRoom);
        }

        // Sin suelo no hay zona principal con la que comparar
        if (sizes.length === 1) {
            return [];
        }

        kept[sizes.indexOf(Math.max(...sizes))] = true;
        context.anchors.forEach(anchor => {
            const cell = anchor.y * width + anchor.x;

            if (labels[cell] > 0) {
                kept[labels[cell]] = true;
            }
            CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, size, CecotecMapRetouch.ANCHOR_RADIUS, n => {
                if (labels[n] > 0) {
                    kept[labels[n]] = true;
                }
            });
        });

        const loose = new Uint8Array(size);

        for (let cell = 0; cell < size; cell++) {
            if (grid[cell] === FLOOR && !kept[labels[cell]]) {
                loose[cell] = 1;
            }
        }

        const wallSeen = new Uint8Array(size);

        for (let start = 0; start < size; start++) {
            if (grid[start] !== WALL || wallSeen[start] === 1) {
                continue;
            }

            const cells = [];
            let top = 0;
            let attached = false;

            wallSeen[start] = 1;
            stack[top++] = start;
            while (top > 0) {
                const cell = stack[--top];

                cells.push(cell);
                CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, size, 1, n => {
                    if (grid[n] === WALL && wallSeen[n] === 0) {
                        wallSeen[n] = 1;
                        stack[top++] = n;
                    }
                });
                if (!attached) {
                    CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, size, CecotecMapRetouch.WALL_ATTACH_RADIUS, n => {
                        attached = attached || (labels[n] > 0 && kept[labels[n]]);
                    });
                }
            }

            if (!attached) {
                cells.forEach(cell => {
                    loose[cell] = 1;
                });
            }
        }

        /** @type {Array<RetouchIsland>} */
        const islands = [];

        for (let start = 0; start < size; start++) {
            if (loose[start] !== 1) {
                continue;
            }

            const cells = [];
            let top = 0;
            let floorCells = 0;

            loose[start] = 2;
            stack[top++] = start;
            while (top > 0) {
                const cell = stack[--top];

                cells.push(cell);
                floorCells += grid[cell] === FLOOR ? 1 : 0;
                CecotecMapRetouch.FOR_EACH_NEIGHBOR(cell, width, size, 1, n => {
                    if (loose[n] === 1) {
                        loose[n] = 2;
                        stack[top++] = n;
                    }
                });
            }

            islands.push({id: start, cells: cells, floorCells: floorCells});
        }

        return islands;
    }

    /**
     * Celdas que cubre un trazo con un pincel cuadrado (el frontend dibuja la vista previa con el mismo criterio)
     *
     * @param {Array<number>} points pares x, y planos
     * @param {number} radius
     * @param {number} width
     * @param {number} height
     * @returns {Array<number>}
     */
    static RASTERIZE(points, radius, width, height) {
        const cells = new Set();
        const stamp = (x, y) => {
            for (let py = Math.max(0, y - radius); py <= Math.min(height - 1, y + radius); py++) {
                for (let px = Math.max(0, x - radius); px <= Math.min(width - 1, x + radius); px++) {
                    cells.add(py * width + px);
                }
            }
        };

        for (let i = 0; i < points.length; i += 2) {
            const x = points[i];
            const y = points[i + 1];
            const previousX = i > 0 ? points[i - 2] : x;
            const previousY = i > 0 ? points[i - 1] : y;
            const steps = Math.max(Math.abs(x - previousX), Math.abs(y - previousY), 1);

            for (let step = 1; step <= steps; step++) {
                stamp(
                    Math.round(previousX + (x - previousX) * step / steps),
                    Math.round(previousY + (y - previousY) * step / steps)
                );
            }
        }

        return [...cells];
    }
}

CecotecMapRetouch.ROTATIONS = [0, 90, 180, 270];
CecotecMapRetouch.MAX_EDITS = 300;
CecotecMapRetouch.MAX_CELLS = 200000;
// Celdas: la base y el robot están junto al suelo, no siempre sobre él
CecotecMapRetouch.ANCHOR_RADIUS = 6;
// Celdas: una pared cerca del suelo conservado es parte de la casa aunque no llegue a tocarlo
CecotecMapRetouch.WALL_ATTACH_RADIUS = 2;

/**
 * @typedef {object} RetouchEdit
 * @property {"hide"|"show"|"paint"} type
 * @property {"floor"|"wall"|"void"} [value] solo en "paint"
 * @property {Array<number>} cells índices y * width + x
 */

/**
 * @typedef {object} RetouchData
 * @property {number} rotation
 * @property {number} width ancho del mapa de los retoques; 0 si no hay
 * @property {Array<RetouchEdit>} edits
 * @property {{width: number, edits: Array<RetouchEdit>, length: number}} [restorePoint] la lista antes de sustituirla
 */

/**
 * @typedef {object} RetouchContext
 * @property {number} width
 * @property {number} height
 * @property {Array<number>} floor el suelo real, como pares x, y planos
 * @property {Array<number>} walls las paredes reales, como pares x, y planos
 * @property {Array<{id: number, pixels: Array<number>}>} rooms las habitaciones ajustadas al suelo real
 * @property {Array<{x: number, y: number}>} anchors base y robot
 * @property {boolean} stale las habitaciones son de otro mapa
 */

/**
 * @typedef {object} RetouchIsland
 * @property {number} id la primera de sus celdas
 * @property {Array<number>} cells
 * @property {number} floorCells
 */

/**
 * @typedef {object} RetouchStatus
 * @property {number} rotation
 * @property {boolean} usable
 * @property {number} width
 * @property {number} editCount
 * @property {boolean} canUndo
 * @property {Array<RetouchIsland>} islands las que se ven
 * @property {Array<RetouchIsland>} hidden las ocultas
 */

module.exports = CecotecMapRetouch;
