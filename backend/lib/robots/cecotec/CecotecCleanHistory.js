const CecotecFiles = require("./CecotecFiles");
const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");
const zlib = require("zlib");

/**
 * Mota: historial de limpiezas a partir de los informes que el robot envía al terminar
 * (DEVICE_EVENT_REPORT_CLEANTASK + DEVICE_EVENT_REPORT_CLEANMAP). Se guardan en disco un JSON con
 * el resumen, el mapa de Mota al terminar (comprimido, con el recorrido) y el PNG del firmware, y se
 * conservan las últimas MAX_ENTRIES para no llenar UDISK.
 *
 * Si la limpieza se interrumpe por un fallo (p. ej. atasco) el robot no envía informe. Se guarda entonces una entrada
 * "interrupted" con lo que Mota sabe, que no suma en los totales y que se sustituye si al final llega el informe.
 *
 * Unos segundos sin superficie no son una limpieza (p. ej. la de recuperar el mapa, que se manda a casa enseguida): no
 * se guardan ni suman.
 */
class CecotecCleanHistory {
    /**
     * @param {object} options
     * @param {string} options.directory
     */
    constructor(options) {
        this.directory = options.directory;

        // Mota: un fallo de disco al arrancar no debe impedir que arranque Mota
        try {
            this.removeTrivial();
        } catch (e) {
            Logger.warn("Clean history: unable to remove trivial entries", e);
        }
    }

    /**
     * @param {{cleanId: number, task?: Record<string, any>, mapdata?: Uint8Array}} report
     * @param {{time?: number, area?: number}} [lastStatistics] últimos valores de la limpieza en curso
     * @param {any} [motaMap] el mapa de Mota al terminar la limpieza
     */
    store(report, lastStatistics, motaMap) {
        try {
            fs.mkdirSync(this.directory, { recursive: true });

            const task = report.task ?? {};

            this.removeInterrupted(task);

            const entry = {
                cleanId: report.cleanId,
                startTime: typeof task.startTime === "number" ? new Date(task.startTime * 1000).toISOString() : undefined,
                endTime: typeof task.endTime === "number" ? new Date(task.endTime * 1000).toISOString() : undefined,
                durationSeconds: typeof task.startTime === "number" && typeof task.endTime === "number" ? task.endTime - task.startTime : lastStatistics?.time,
                area: lastStatistics?.area,
                hasMap: report.mapdata !== undefined && report.mapdata.length > 0,
                hasMotaMap: motaMap !== undefined && motaMap !== null,
                rawTask: task
            };

            if (CecotecCleanHistory.IS_TRIVIAL(entry)) {
                Logger.info(`Ignored clean report ${report.cleanId} (${entry.durationSeconds} s, no area)`);

                return;
            }

            CecotecFiles.WRITE_ATOMIC(path.join(this.directory, `${report.cleanId}.json`), JSON.stringify(entry, null, 2));
            if (entry.hasMap) {
                fs.writeFileSync(path.join(this.directory, `${report.cleanId}.png`), report.mapdata);
            }
            if (entry.hasMotaMap) {
                fs.writeFileSync(path.join(this.directory, `${report.cleanId}.map.json.gz`), zlib.gzipSync(JSON.stringify(motaMap)));
            }

            this.addToTotals(entry);
            Logger.info(`Stored clean report ${report.cleanId} (${entry.durationSeconds ?? "?"} s, map: ${entry.hasMap})`);
            this.prune();
        } catch (e) {
            Logger.warn("Error while storing clean report", e);
        }
    }

    /**
     * @param {number} cleanId inicio de la limpieza en segundos, como los ids del firmware
     * @param {{time?: number, area?: number}} [lastStatistics] últimos valores de la limpieza en curso
     * @param {any} [motaMap] el mapa de Mota en el momento del fallo
     */
    storeInterrupted(cleanId, lastStatistics, motaMap) {
        try {
            fs.mkdirSync(this.directory, { recursive: true });

            const entry = {
                cleanId: cleanId,
                startTime: new Date(cleanId * 1000).toISOString(),
                endTime: new Date().toISOString(),
                durationSeconds: lastStatistics?.time,
                area: lastStatistics?.area,
                hasMap: false,
                hasMotaMap: motaMap !== undefined && motaMap !== null,
                result: "interrupted",
                rawTask: {}
            };

            CecotecFiles.WRITE_ATOMIC(path.join(this.directory, `${cleanId}.json`), JSON.stringify(entry, null, 2));
            if (entry.hasMotaMap) {
                fs.writeFileSync(path.join(this.directory, `${cleanId}.map.json.gz`), zlib.gzipSync(JSON.stringify(motaMap)));
            }

            Logger.info(`Stored interrupted clean ${cleanId} (${entry.durationSeconds ?? "?"} s)`);
            this.prune();
        } catch (e) {
            Logger.warn("Error while storing interrupted clean", e);
        }
    }

    /**
     * @returns {Array<object>} entradas, de la más reciente a la más antigua
     */
    list() {
        try {
            return fs.readdirSync(this.directory)
                .filter(f => {
                    return f.endsWith(".json") && f !== "totales.json";
                })
                // Mota: una entrada dañada (corte de luz) se aparta y no deja sin historial ni sin poda
                .map(f => {
                    return CecotecFiles.READ_JSON(path.join(this.directory, f), e => {
                        return Number.isFinite(e?.cleanId);
                    });
                })
                .filter(e => {
                    return e !== undefined;
                })
                .sort((a, b) => {
                    return b.cleanId - a.cleanId;
                });
        } catch (e) {
            return [];
        }
    }

    /**
     * Totales acumulados de todas las limpiezas (no solo de las que se conservan)
     *
     * @returns {{count: number, timeSeconds: number, areaCm2: number}}
     */
    getTotals() {
        const totals = CecotecFiles.READ_JSON(path.join(this.directory, "totales.json"), t => {
            return Number.isFinite(t?.count) && Number.isFinite(t?.timeSeconds) && Number.isFinite(t?.areaCm2);
        });

        return totals ?? {count: 0, timeSeconds: 0, areaCm2: 0};
    }

    /**
     * @param {number} cleanId
     * @returns {string|undefined} ruta del PNG del mapa de esa limpieza, si existe
     */
    getMapPath(cleanId) {
        const mapPath = path.join(this.directory, `${Number(cleanId)}.png`);

        return Number.isInteger(Number(cleanId)) && fs.existsSync(mapPath) ? mapPath : undefined;
    }

    /**
     * @param {number} cleanId
     * @returns {any|undefined} el mapa de Mota de esa limpieza, si se guardó
     */
    getMotaMap(cleanId) {
        const mapPath = path.join(this.directory, `${Number(cleanId)}.map.json.gz`);

        if (!Number.isInteger(Number(cleanId)) || !fs.existsSync(mapPath)) {
            return undefined;
        }

        return JSON.parse(zlib.gunzipSync(fs.readFileSync(mapPath)).toString());
    }

    /**
     * @private
     * @param {{durationSeconds?: number, area?: number}} entry
     */
    addToTotals(entry) {
        const totals = this.getTotals();

        totals.count += 1;
        totals.timeSeconds += entry.durationSeconds ?? 0;
        totals.areaCm2 += entry.area ?? 0;

        CecotecFiles.WRITE_ATOMIC(path.join(this.directory, "totales.json"), JSON.stringify(totals));
    }

    /**
     * @private
     */
    prune() {
        const ids = this.list().map(e => {
            return e.cleanId;
        });

        ids.slice(CecotecCleanHistory.MAX_ENTRIES).forEach(id => {
            this.remove(id);
        });
    }

    /**
     * Quita las entradas de unos segundos guardadas antes de ignorarlas, también de los totales
     *
     * @private
     */
    removeTrivial() {
        this.list().filter(CecotecCleanHistory.IS_TRIVIAL).forEach(entry => {
            const totals = this.getTotals();

            this.remove(entry.cleanId);

            if (entry.result !== "interrupted" && totals.count > 0) {
                totals.count -= 1;
                totals.timeSeconds = Math.max(0, totals.timeSeconds - entry.durationSeconds);
                CecotecFiles.WRITE_ATOMIC(path.join(this.directory, "totales.json"), JSON.stringify(totals));
            }
            Logger.info(`Removed clean ${entry.cleanId} from the history (${entry.durationSeconds} s, no area)`);
        });
    }

    /**
     * @param {{durationSeconds?: number, area?: number}} entry
     * @returns {boolean} si son unos segundos sin superficie
     */
    static IS_TRIVIAL(entry) {
        return typeof entry.durationSeconds === "number" &&
            entry.durationSeconds < CecotecCleanHistory.MIN_CLEAN_SECONDS &&
            !(entry.area > 0);
    }

    /**
     * @private
     * @param {{startTime?: number, endTime?: number}} task resumen del informe del firmware
     */
    removeInterrupted(task) {
        if (typeof task.startTime !== "number" || typeof task.endTime !== "number") {
            return;
        }

        this.list().filter(e => {
            return e.result === "interrupted" &&
                e.cleanId >= task.startTime - CecotecCleanHistory.START_MARGIN_SECONDS &&
                e.cleanId <= task.endTime;
        }).forEach(e => {
            this.remove(e.cleanId);
        });
    }

    /**
     * @private
     * @param {number} cleanId
     */
    remove(cleanId) {
        for (const ext of [".json", ".png", ".map.json.gz"]) {
            fs.rmSync(path.join(this.directory, `${cleanId}${ext}`), { force: true });
        }
    }
}

CecotecCleanHistory.MAX_ENTRIES = 50;
CecotecCleanHistory.START_MARGIN_SECONDS = 60;
CecotecCleanHistory.MIN_CLEAN_SECONDS = 60;

module.exports = CecotecCleanHistory;
