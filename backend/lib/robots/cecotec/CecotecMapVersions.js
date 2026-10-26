const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");
const zlib = require("zlib");

/**
 * Mota: versiones del mapa (sustituye al guardián del mapa).
 *
 * Al empezar cada limpieza se toma en memoria una foto del mapa (el mapa de Mota tal como se ve y las
 * habitaciones). Al terminar se compara el suelo de antes y el de después (intersección / unión): si ha
 * cambiado más de lo permitido, la foto de antes se guarda en disco como versión, para poder verla y
 * recuperar sus habitaciones. Si todavía no hay ninguna versión, la primera foto se guarda siempre.
 *
 * El firmware de la 3090 no acepta que se le cargue un mapa por el protocolo de nube, así que restaurar
 * una versión recupera las habitaciones de Mota (divisiones, nombres y colores), no el mapa del robot.
 */
class CecotecMapVersions {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     * @param {string} options.directory
     */
    constructor(options) {
        this.robot = options.robot;
        this.directory = options.directory;
        /** @type {Snapshot | undefined} foto tomada al empezar la limpieza en curso */
        this.pending = undefined;
    }

    /**
     * @returns {number} umbral de parecido en % por debajo del cual se guarda una versión (0 = desactivado)
     */
    getThreshold() {
        return Number(this.robot.config.get("robot").implementationSpecificConfig?.motaMapVersions?.threshold ?? CecotecMapVersions.DEFAULT_THRESHOLD);
    }

    /**
     * @param {number} threshold
     */
    setThreshold(threshold) {
        const robotConfig = this.robot.config.get("robot");
        const implementationSpecificConfig = Object.assign({}, robotConfig.implementationSpecificConfig, {
            motaMapVersions: {threshold: threshold}
        });

        this.robot.config.set("robot", Object.assign({}, robotConfig, {implementationSpecificConfig: implementationSpecificConfig}));
    }

    /**
     * @param {Snapshot} snapshot el mapa justo antes de empezar a limpiar
     */
    onCleaningStarted(snapshot) {
        if (this.getThreshold() <= 0 || snapshot.floor.length === 0) {
            this.pending = undefined;

            return;
        }

        this.pending = snapshot;

        if (this.list().length === 0) {
            this.save(snapshot, null, "first");
        }
    }

    /**
     * @param {{width: number, floor: Array<number>}} current el suelo al terminar la limpieza
     */
    onCleaningFinished(current) {
        const before = this.pending;
        this.pending = undefined;

        if (!before || current.floor.length === 0 || this.getThreshold() <= 0) {
            return;
        }

        const similarity = CecotecMapVersions.SIMILARITY(before, current);

        Logger.info(`Map versions: similarity to the map before the cleaning ${similarity} % (threshold ${this.getThreshold()} %)`);

        if (similarity < this.getThreshold()) {
            this.save(before, similarity, "changed");
        }
    }

    /**
     * @returns {Array<VersionInfo>} de la más reciente a la más antigua
     */
    list() {
        try {
            return fs.readdirSync(this.directory)
                .filter(f => {
                    return f.endsWith(".meta.json");
                })
                .map(f => {
                    return JSON.parse(fs.readFileSync(path.join(this.directory, f)).toString());
                })
                .sort((a, b) => {
                    return b.id - a.id;
                });
        } catch (e) {
            return [];
        }
    }

    /**
     * @param {number} id
     * @returns {{map: any, rooms: any} | undefined}
     */
    get(id) {
        const dataPath = this.getDataPath(id);

        if (!dataPath || !fs.existsSync(dataPath)) {
            return undefined;
        }

        return JSON.parse(zlib.gunzipSync(fs.readFileSync(dataPath)).toString());
    }

    /**
     * Recupera las habitaciones de Mota de una versión
     *
     * @param {number} id
     */
    restoreRooms(id) {
        const version = this.get(id);

        if (!version) {
            throw new Error("Version not found");
        }

        if (!version.rooms || !Array.isArray(version.rooms.rooms)) {
            throw new Error("This version has no rooms");
        }

        this.robot.virtualRooms.importData(version.rooms);
        Logger.info(`Map versions: restored the rooms of version ${id}`);
    }

    /**
     * Guarda el mapa actual como versión, a petición del usuario
     *
     * @param {Snapshot} snapshot
     */
    saveManual(snapshot) {
        if (snapshot.floor.length === 0) {
            throw new Error("There is no map to save");
        }

        return this.save(snapshot, null, "manual");
    }

    /**
     * @param {number} id
     */
    delete(id) {
        const dataPath = this.getDataPath(id);

        if (!dataPath) {
            throw new Error("Invalid id");
        }

        fs.rmSync(dataPath, {force: true});
        fs.rmSync(path.join(this.directory, `${Number(id)}.meta.json`), {force: true});
    }

    /**
     * @private
     * @param {Snapshot} snapshot
     * @param {number|null} similarity
     * @param {"first"|"changed"|"manual"} reason
     * @returns {VersionInfo}
     */
    save(snapshot, similarity, reason) {
        fs.mkdirSync(this.directory, {recursive: true});

        let id = Math.floor(snapshot.createdAt / 1000);
        while (fs.existsSync(path.join(this.directory, `${id}.meta.json`))) {
            id++;
        }

        /** @type {VersionInfo} */
        const info = {
            id: id,
            createdAt: new Date(snapshot.createdAt).toISOString(),
            reason: reason,
            similarity: similarity,
            floorCells: snapshot.floor.length,
            roomCount: snapshot.rooms?.rooms?.length ?? 0,
        };

        fs.writeFileSync(
            path.join(this.directory, `${id}.json.gz`),
            zlib.gzipSync(JSON.stringify({map: snapshot.map, rooms: snapshot.rooms}))
        );
        fs.writeFileSync(path.join(this.directory, `${id}.meta.json`), JSON.stringify(info));
        Logger.info(`Map versions: stored version ${id} (${reason}, ${snapshot.floor.length} floor cells)`);

        this.prune();

        return info;
    }

    /**
     * @private
     * @param {number} id
     * @returns {string|undefined}
     */
    getDataPath(id) {
        return Number.isInteger(Number(id)) ? path.join(this.directory, `${Number(id)}.json.gz`) : undefined;
    }

    /**
     * @private
     */
    prune() {
        this.list().slice(CecotecMapVersions.MAX_VERSIONS).forEach(v => {
            this.delete(v.id);
        });
    }

    /**
     * @param {{width: number, floor: Array<number>}} a
     * @param {{width: number, floor: Array<number>}} b
     * @returns {number} intersección / unión en %, redondeado
     */
    static SIMILARITY(a, b) {
        const toKeys = (s) => {
            return new Set(s.floor.map(i => {
                return `${i % s.width},${Math.floor(i / s.width)}`;
            }));
        };
        const setA = toKeys(a);
        const setB = toKeys(b);
        let intersection = 0;

        setB.forEach(k => {
            if (setA.has(k)) {
                intersection++;
            }
        });

        const union = setA.size + setB.size - intersection;

        return union === 0 ? 100 : Math.round(intersection / union * 100);
    }
}

CecotecMapVersions.DEFAULT_THRESHOLD = 85;
CecotecMapVersions.MAX_VERSIONS = 15;

/**
 * @typedef {object} Snapshot
 * @property {number} createdAt ms
 * @property {number} width
 * @property {Array<number>} floor índices y * width + x de las celdas de suelo
 * @property {any} map el mapa de Mota (ValetudoMap) tal como lo devuelve la API
 * @property {any} rooms las habitaciones virtuales (CecotecVirtualRooms.exportData())
 */

/**
 * @typedef {object} VersionInfo
 * @property {number} id
 * @property {string} createdAt
 * @property {"first"|"changed"|"manual"} reason
 * @property {number|null} similarity parecido con el mapa de después de la limpieza, en %
 * @property {number} floorCells
 * @property {number} roomCount
 */

module.exports = CecotecMapVersions;
