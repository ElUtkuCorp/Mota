const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");

/**
 * Mota: historial de limpiezas a partir de los informes que el robot envía al terminar
 * (DEVICE_EVENT_REPORT_CLEANTASK + DEVICE_EVENT_REPORT_CLEANMAP). Se guardan en disco un JSON con
 * el resumen y el PNG del mapa, y se conservan las últimas MAX_ENTRIES para no llenar UDISK.
 */
class CecotecCleanHistory {
    /**
     * @param {object} options
     * @param {string} options.directory
     */
    constructor(options) {
        this.directory = options.directory;
    }

    /**
     * @param {{cleanId: number, task?: Record<string, any>, mapdata?: Uint8Array}} report
     * @param {{time?: number, area?: number}} [lastStatistics] últimos valores de la limpieza en curso
     */
    store(report, lastStatistics) {
        try {
            fs.mkdirSync(this.directory, { recursive: true });

            const task = report.task ?? {};
            const entry = {
                cleanId: report.cleanId,
                startTime: typeof task.startTime === "number" ? new Date(task.startTime * 1000).toISOString() : undefined,
                endTime: typeof task.endTime === "number" ? new Date(task.endTime * 1000).toISOString() : undefined,
                durationSeconds: typeof task.startTime === "number" && typeof task.endTime === "number" ? task.endTime - task.startTime : lastStatistics?.time,
                area: lastStatistics?.area,
                hasMap: report.mapdata !== undefined && report.mapdata.length > 0,
                rawTask: task
            };

            fs.writeFileSync(path.join(this.directory, `${report.cleanId}.json`), JSON.stringify(entry, null, 2));
            if (entry.hasMap) {
                fs.writeFileSync(path.join(this.directory, `${report.cleanId}.png`), report.mapdata);
            }

            Logger.info(`Stored clean report ${report.cleanId} (${entry.durationSeconds ?? "?"} s, map: ${entry.hasMap})`);
            this.prune();
        } catch (e) {
            Logger.warn("Error while storing clean report", e);
        }
    }

    /**
     * @returns {Array<object>} entradas, de la más reciente a la más antigua
     */
    list() {
        try {
            return fs.readdirSync(this.directory)
                .filter(f => {
                    return f.endsWith(".json");
                })
                .map(f => {
                    return JSON.parse(fs.readFileSync(path.join(this.directory, f)).toString());
                })
                .sort((a, b) => {
                    return b.cleanId - a.cleanId;
                });
        } catch (e) {
            return [];
        }
    }

    /**
     * @private
     */
    prune() {
        const ids = this.list().map(e => {
            return e.cleanId;
        });

        ids.slice(CecotecCleanHistory.MAX_ENTRIES).forEach(id => {
            for (const ext of [".json", ".png"]) {
                fs.rmSync(path.join(this.directory, `${id}${ext}`), { force: true });
            }
        });
    }
}

CecotecCleanHistory.MAX_ENTRIES = 50;

module.exports = CecotecCleanHistory;
