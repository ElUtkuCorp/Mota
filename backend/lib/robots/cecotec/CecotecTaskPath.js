const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");

/**
 * Mota: recorrido de la limpieza en curso, en coordenadas del firmware (metros) y en un Float32Array, que no cuenta
 * para el límite del heap de V8.
 *
 * - El firmware envía con cada mapa su historial del recorrido. Si llega uno que no continúa el anterior (más corto
 *   o con otro principio, p. ej. tras reanudar después de cargar [H]), lo anterior se conserva delante en vez de
 *   perderse.
 * - Se vuelca de vez en cuando a un archivo en /tmp (memoria, no la flash). Si Mota se reinicia a mitad de la
 *   limpieza (p. ej. por falta de memoria), al volver lo recupera, siempre que el mapa sea el mismo y el robot siga
 *   con la tarea. Se borra al terminar.
 */
class CecotecTaskPath {
    /**
     * @param {object} [options]
     * @param {string} [options.directory] dónde guardar el recorrido; sin él solo vive en memoria
     * @param {number} [options.saveIntervalMs]
     * @param {() => number} [options.now] para los tests
     */
    constructor(options = {}) {
        this.filePath = options.directory ? path.join(options.directory, CecotecTaskPath.FILE_NAME) : undefined;
        this.saveIntervalMs = options.saveIntervalMs ?? CecotecTaskPath.SAVE_INTERVAL_MS;
        this.now = options.now ?? Date.now;

        this.clearMemory();
        /** @type {{mapId: any, startedAt: number|undefined, base: Float32Array, current: Float32Array}|undefined} */
        this.pending = undefined;
        this.saving = undefined;
        this.timer = undefined;
    }

    /**
     * @private
     */
    clearMemory() {
        this.mapId = undefined;
        this.startedAt = undefined;
        /** Tramos anteriores de la misma tarea, que el historial actual del firmware ya no incluye */
        this.base = emptyPath();
        /** Último historial del firmware */
        this.current = emptyPath();
        this.lastSource = undefined;
        /** Cambia con cada modificación, para las cachés de quien lo lee. Nunca se repite */
        this.version = (this.version ?? 0) + 1;
        this.dirty = false;
        this.finished = false;
    }

    /**
     * Número de puntos
     *
     * @returns {number}
     */
    get length() {
        return (this.base.length + this.current.length) / 2;
    }

    /**
     * Lee el recorrido guardado por la ejecución anterior. Se aplica con el primer historial del mismo mapa
     */
    load() {
        if (!this.filePath) {
            return;
        }

        let raw;
        try {
            raw = fs.readFileSync(this.filePath, "utf8");
        } catch (e) {
            return;
        }

        try {
            const data = JSON.parse(raw);

            if (data.version !== 1) {
                throw new Error(`unknown version ${data.version}`);
            }
            this.pending = {
                mapId: data.mapId,
                startedAt: Number.isFinite(data.startedAt) ? data.startedAt : undefined,
                base: CecotecTaskPath.DECODE(data.base),
                current: CecotecTaskPath.DECODE(data.current),
            };
        } catch (e) {
            Logger.warn("Task path: unable to read the saved path", e);
            this.removeFile();
        }
    }

    /**
     * @param {any} mapId id del mapa del firmware
     * @param {Float32Array|Array<{x: number, y: number}>|undefined} source historial del firmware: Float32Array
     *  plano de agnoc, o Coordinates
     * @param {() => boolean} [canRestore] si el robot sigue con la tarea del recorrido guardado
     * @returns {boolean} si ha cambiado el recorrido
     */
    update(mapId, source, canRestore) {
        if (source === this.lastSource && mapId === this.mapId) {
            return false;
        }

        let changed = false;

        if (mapId !== this.mapId) {
            if (this.mapId !== undefined || this.length > 0) {
                this.reset();
                changed = true;
            }
            this.mapId = mapId;
        }

        if (this.pending) {
            const pending = this.pending;

            this.pending = undefined;
            if (pending.mapId === mapId && mapId !== undefined && (canRestore?.() ?? true)) {
                this.base = pending.base;
                this.current = pending.current;
                this.startedAt = pending.startedAt;
                this.version++;
                changed = true;
                Logger.info(`Task path: recovered ${this.length} points of the cleaning in progress`);
            } else {
                Logger.info("Task path: the saved path belongs to another cleaning; discarded");
                this.removeFile();
            }
        }

        this.lastSource = source;

        if (source && source.length > 0) {
            changed = this.merge(CecotecTaskPath.TO_XY(source)) || changed;
        }

        return changed;
    }

    /**
     * @private
     * @param {Float32Array} next
     * @returns {boolean}
     */
    merge(next) {
        const current = this.current;
        const offset = CecotecTaskPath.FIND_CONTINUATION(current, next);

        if (offset === 0 && next.length === current.length) {
            // El mismo historial otra vez
            this.current = next;

            return false;
        }

        if (offset >= 0) {
            this.current = offset === 0 ? next : CecotecTaskPath.CONCAT(current.subarray(0, offset), next);
        } else {
            this.base = CecotecTaskPath.CONCAT(this.base, current);
            this.current = next;
            if (current.length > 0) {
                Logger.info(`Task path: the firmware restarted its path (${current.length / 2} -> ${next.length / 2} points); keeping the previous one`);
            }
        }

        this.version++;
        this.dirty = true;

        return true;
    }

    /**
     * Recorrido entero como Float32Array plano [x, y, ...] en metros
     *
     * @returns {Float32Array}
     */
    getPoints() {
        if (this.base.length === 0) {
            return this.current;
        }
        if (this.current.length === 0) {
            return this.base;
        }

        return CecotecTaskPath.CONCAT(this.base, this.current);
    }

    /**
     * @param {number|undefined} startedAt inicio de la limpieza en curso (segundos)
     */
    setStartedAt(startedAt) {
        if (startedAt !== this.startedAt) {
            this.startedAt = startedAt;
            this.dirty = this.length > 0;
        }
    }

    /**
     * Limpieza nueva, mapa nuevo o borrado: se olvida el recorrido
     */
    reset() {
        const mapId = this.mapId;

        this.clearMemory();
        this.mapId = mapId;
        this.removeFile();
    }

    /**
     * La limpieza ha terminado y su informe está guardado. El recorrido se sigue enseñando hasta la siguiente, pero
     * ya no hace falta recuperarlo
     */
    finish() {
        this.dirty = false;
        this.pending = undefined;
        this.finished = true;
        this.removeFile();
    }

    startSaving() {
        if (!this.filePath || this.timer) {
            return;
        }

        this.timer = setInterval(() => {
            void this.save();
        }, this.saveIntervalMs);
        this.timer.unref?.();
    }

    stopSaving() {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    /**
     * Escribe el recorrido si ha cambiado: a un temporal y renombrado, sin bloquear
     *
     * @returns {Promise<void>}
     */
    async save() {
        if (!this.filePath || !this.dirty || this.saving || this.length === 0 || this.finished) {
            return;
        }

        this.dirty = false;
        const version = this.version;
        const data = JSON.stringify({
            version: 1,
            mapId: this.mapId,
            startedAt: this.startedAt,
            savedAt: this.now(),
            base: CecotecTaskPath.ENCODE(this.base),
            current: CecotecTaskPath.ENCODE(this.current),
        });
        const temporary = `${this.filePath}.tmp`;

        this.saving = (async () => {
            try {
                await fs.promises.writeFile(temporary, data);
                // Un reset o finish mientras se escribía: ya no hay que dejarlo
                if ((this.version !== version && this.length === 0) || this.finished) {
                    await fs.promises.rm(temporary, { force: true });

                    return;
                }
                await fs.promises.rename(temporary, this.filePath);
            } catch (e) {
                this.dirty = true;
                Logger.warn("Task path: unable to save the path", e);
            }
        })();

        try {
            await this.saving;
        } finally {
            this.saving = undefined;
        }
    }

    /**
     * @private
     */
    removeFile() {
        if (!this.filePath) {
            return;
        }
        for (const file of [this.filePath, `${this.filePath}.tmp`]) {
            fs.rm(file, { force: true }, () => {});
        }
    }

    /**
     * @param {Float32Array|Array<{x: number, y: number}>} source
     * @returns {Float32Array}
     */
    static TO_XY(source) {
        if (source instanceof Float32Array) {
            return source;
        }
        if (ArrayBuffer.isView(source)) {
            return Float32Array.from(/** @type {any} */ (source));
        }

        const xy = new Float32Array(source.length * 2);

        for (let i = 0; i < source.length; i++) {
            xy[2 * i] = source[i].x;
            xy[2 * i + 1] = source[i].y;
        }

        return xy;
    }

    /**
     * Posición (en números, no en puntos) desde la que `next` continúa `current`, o -1 si empieza de nuevo. Lo normal es
     * 0: el historial nuevo es el anterior con más puntos al final
     *
     * @param {Float32Array} current
     * @param {Float32Array} next
     * @returns {number}
     */
    static FIND_CONTINUATION(current, next) {
        if (current.length === 0) {
            return 0;
        }
        if (next.length === 0) {
            return -1;
        }

        for (let offset = 0; offset < current.length; offset += 2) {
            if (current[offset] !== next[0] || current[offset + 1] !== next[1]) {
                continue;
            }

            const overlap = Math.min(current.length - offset, next.length);
            // Si el nuevo es más corto que lo que solapa, no es una continuación
            if (overlap < current.length - offset) {
                continue;
            }

            let matches = true;
            for (let i = 0; i < overlap; i++) {
                if (current[offset + i] !== next[i]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                return offset;
            }
        }

        return -1;
    }

    /**
     * @param {Float32Array} a
     * @param {Float32Array} b
     * @returns {Float32Array}
     */
    static CONCAT(a, b) {
        const result = new Float32Array(a.length + b.length);

        result.set(a, 0);
        result.set(b, a.length);

        return result;
    }

    /**
     * @param {Float32Array} points
     * @returns {string}
     */
    static ENCODE(points) {
        return Buffer.from(points.buffer, points.byteOffset, points.byteLength).toString("base64");
    }

    /**
     * @param {string} text
     * @returns {Float32Array}
     */
    static DECODE(text) {
        const buffer = Buffer.from(String(text ?? ""), "base64");

        if (buffer.length % 8 !== 0) {
            throw new Error(`invalid path length ${buffer.length}`);
        }

        const points = new Float32Array(buffer.length / 4);
        for (let i = 0; i < points.length; i++) {
            points[i] = buffer.readFloatLE(i * 4);
        }

        return points;
    }
}

/**
 * @returns {Float32Array}
 */
function emptyPath() {
    return new Float32Array(0);
}

CecotecTaskPath.FILE_NAME = "mota-recorrido.json";
CecotecTaskPath.SAVE_INTERVAL_MS = 30_000;

module.exports = CecotecTaskPath;
