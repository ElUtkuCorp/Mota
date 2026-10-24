const fs = require("fs");
const Logger = require("../../Logger");
const MotaMapChangedValetudoEvent = require("../../valetudo_events/events/MotaMapChangedValetudoEvent");

/**
 * Mota: guardián del mapa. Guarda un mapa de referencia (las celdas de suelo) y, al terminar cada
 * limpieza, lo compara con el mapa actual del firmware (similitud = intersección / unión). Si la
 * similitud baja del umbral configurado, lanza un aviso para que el usuario decida si acepta el
 * mapa nuevo como referencia o lo descarta (sigue avisando con la referencia anterior).
 * El firmware decide su propio mapa: esto avisa y deja constancia, no puede impedir el cambio.
 */
class CecotecMapGuard {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     * @param {string} options.referencePath
     */
    constructor(options) {
        this.robot = options.robot;
        this.referencePath = options.referencePath;
        /** @type {{width: number, floor: Array<number>} | undefined} mapa pendiente de aceptar */
        this.candidate = undefined;
    }

    /**
     * @returns {number} umbral de similitud en % (0 = desactivado)
     */
    getThreshold() {
        return Number(this.robot.config.get("robot").implementationSpecificConfig?.motaMapGuard?.threshold ?? 0);
    }

    /**
     * @param {number} threshold
     */
    setThreshold(threshold) {
        const robotConfig = this.robot.config.get("robot");
        const implementationSpecificConfig = Object.assign({}, robotConfig.implementationSpecificConfig, {
            motaMapGuard: {threshold: threshold}
        });

        this.robot.config.set("robot", Object.assign({}, robotConfig, {implementationSpecificConfig: implementationSpecificConfig}));
    }

    /**
     * @param {{width: number, floor: Array<number>}} snapshot floor = índices y*width+x de las celdas de suelo
     */
    check(snapshot) {
        const threshold = this.getThreshold();

        if (threshold <= 0 || snapshot.floor.length === 0) {
            return;
        }

        const reference = this.readReference();

        if (!reference) {
            this.writeReference(snapshot);
            Logger.info(`Map guard: stored the first reference map (${snapshot.floor.length} floor cells)`);

            return;
        }

        const similarity = CecotecMapGuard.SIMILARITY(reference, snapshot);

        Logger.info(`Map guard: similarity to the reference map ${similarity} % (threshold ${threshold} %)`);

        if (similarity < threshold) {
            this.candidate = snapshot;
            this.robot.valetudoEventStore.raise(new MotaMapChangedValetudoEvent({
                metaData: {
                    similarity: similarity,
                    threshold: threshold,
                    referenceCells: reference.floor.length,
                    currentCells: snapshot.floor.length
                }
            }));
        }
    }

    /**
     * @param {boolean} accept
     */
    resolve(accept) {
        if (accept && this.candidate) {
            this.writeReference(this.candidate);
            Logger.info("Map guard: the new map was accepted as reference");
        }

        this.candidate = undefined;
    }

    /**
     * @private
     * @returns {{width: number, floor: Array<number>} | undefined}
     */
    readReference() {
        try {
            return JSON.parse(fs.readFileSync(this.referencePath).toString());
        } catch (e) {
            return undefined;
        }
    }

    /**
     * @private
     * @param {{width: number, floor: Array<number>}} snapshot
     */
    writeReference(snapshot) {
        fs.writeFileSync(this.referencePath, JSON.stringify(snapshot));
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

module.exports = CecotecMapGuard;
