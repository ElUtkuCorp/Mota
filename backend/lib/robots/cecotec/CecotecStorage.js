const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");

/**
 * Mota: espacio en UDISK (la partición de datos de la 3090, con unos 50 MB) y limpieza de logs rotados del fabricante.
 *
 * Solo se borran logs rotados que casan con una lista blanca de nombres conocidos, dejando los más recientes de cada
 * familia. Nunca los .temp (los que el firmware está escribiendo) ni nada que pueda ser del mapa.
 */
class CecotecStorage {
    /**
     * @param {object} [options]
     * @param {string} [options.udiskPath]
     * @param {string} [options.motaDirectory] binario y datos de Mota
     * @param {string} [options.backupsDirectory] copias del mapa del firmware (dentro de motaDirectory)
     * @param {string} [options.vendorLogDirectory]
     */
    constructor(options = {}) {
        this.udiskPath = options.udiskPath ?? "/mnt/UDISK";
        this.motaDirectory = options.motaDirectory ?? path.join(this.udiskPath, "valetudo");
        this.backupsDirectory = options.backupsDirectory ?? path.join(this.motaDirectory, "copias-mapa");
        this.vendorLogDirectory = options.vendorLogDirectory ?? path.join(this.udiskPath, "log");
    }

    /**
     * @param {number} [keep]
     * @returns {object} ver el contrato de la API
     */
    getStatus(keep = CecotecStorage.DEFAULT_KEEP) {
        const stats = fs.statfsSync(this.udiskPath);
        const binaries = CecotecStorage.BINARIES.reduce((sum, name) => {
            return sum + CecotecStorage.SIZE_OF(path.join(this.motaDirectory, name));
        }, 0);
        const backups = CecotecStorage.SIZE_OF(this.backupsDirectory);
        let vendorLogs = 0;
        let vendorMap = 0;

        CecotecStorage.READ_DIR(this.vendorLogDirectory).forEach(name => {
            const size = CecotecStorage.SIZE_OF(path.join(this.vendorLogDirectory, name));

            if (CecotecStorage.MAP_FILE.test(name) || /\.(data|info)$/i.test(name)) {
                vendorMap += size;
            } else {
                vendorLogs += size;
            }
        });

        const files = this.getCleanupCandidates(keep);

        return {
            totalBytes: stats.blocks * stats.bsize,
            freeBytes: stats.bavail * stats.bsize,
            reserveBytes: CecotecStorage.RESERVE_BYTES,
            parts: {
                motaBinaries: binaries,
                motaData: Math.max(0, CecotecStorage.SIZE_OF(this.motaDirectory) - binaries - (this.isInside(this.backupsDirectory) ? backups : 0)),
                mapBackups: backups,
                vendorLogs: vendorLogs,
                vendorMap: vendorMap,
            },
            cleanup: {
                keep: keep,
                bytes: files.reduce((sum, f) => {
                    return sum + f.sizeBytes;
                }, 0),
                files: files,
            },
        };
    }

    /**
     * Logs rotados que sobran: de cada familia, todos menos los `keep` más recientes por fecha de modificación
     *
     * @param {number} [keep]
     * @returns {Array<{name: string, sizeBytes: number, modifiedAt: string}>}
     */
    getCleanupCandidates(keep = CecotecStorage.DEFAULT_KEEP) {
        CecotecStorage.ASSERT_KEEP(keep);

        /** @type {Map<string, Array<{name: string, sizeBytes: number, mtimeMs: number}>>} */
        const families = new Map();

        CecotecStorage.READ_DIR(this.vendorLogDirectory).forEach(name => {
            const family = CecotecStorage.GET_FAMILY(name);

            if (!family) {
                return;
            }

            try {
                const stat = fs.lstatSync(path.join(this.vendorLogDirectory, name));

                if (!stat.isFile()) {
                    return;
                }
                if (!families.has(family)) {
                    families.set(family, []);
                }
                families.get(family).push({name: name, sizeBytes: stat.size, mtimeMs: stat.mtimeMs});
            } catch (e) {
                // Ya no está
            }
        });

        const result = [];
        families.forEach(files => {
            files.sort((a, b) => {
                return b.mtimeMs - a.mtimeMs;
            }).slice(keep).forEach(f => {
                result.push({name: f.name, sizeBytes: f.sizeBytes, modifiedAt: new Date(f.mtimeMs).toISOString()});
            });
        });

        return result.sort((a, b) => {
            return a.name < b.name ? -1 : 1;
        });
    }

    /**
     * Borra lo que vuelve a casar ahora (no una lista que llegue de fuera)
     *
     * @param {number} [keep]
     * @returns {{deleted: Array<string>, freedBytes: number}}
     */
    cleanup(keep = CecotecStorage.DEFAULT_KEEP) {
        const deleted = [];
        let freedBytes = 0;

        this.getCleanupCandidates(keep).forEach(file => {
            // Segunda comprobación junto al borrado
            if (!CecotecStorage.GET_FAMILY(file.name)) {
                return;
            }

            try {
                fs.rmSync(path.join(this.vendorLogDirectory, file.name));
                deleted.push(file.name);
                freedBytes += file.sizeBytes;
                Logger.info(`Storage: deleted vendor log ${file.name} (${file.sizeBytes} bytes)`);
            } catch (e) {
                Logger.warn(`Storage: unable to delete vendor log ${file.name}`, e);
            }
        });

        return {deleted: deleted, freedBytes: freedBytes};
    }

    /**
     * @private
     * @param {string} dir
     * @returns {boolean}
     */
    isInside(dir) {
        const relative = path.relative(this.motaDirectory, dir);

        return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
    }

    /**
     * @param {string} name
     * @returns {string|undefined} familia del log rotado, o nada si no se puede borrar
     */
    static GET_FAMILY(name) {
        if (CecotecStorage.IS_PROTECTED(name)) {
            return undefined;
        }

        return CecotecStorage.FAMILIES.find(f => {
            return f.pattern.test(name);
        })?.name;
    }

    /**
     * @param {string} name
     * @returns {boolean} lo que nunca se borra, aunque case con una familia
     */
    static IS_PROTECTED(name) {
        return /\.(temp|data|info|png|ini)$/i.test(name) ||
            (/\.txt$/i.test(name) && !/_upgrade\.txt$/.test(name)) ||
            CecotecStorage.MAP_FILE.test(name);
    }

    /**
     * @param {unknown} keep
     */
    static ASSERT_KEEP(keep) {
        if (typeof keep !== "number" || !Number.isInteger(keep) || keep < CecotecStorage.MIN_KEEP || keep > CecotecStorage.MAX_KEEP) {
            throw new Error(`keep tiene que ser un entero entre ${CecotecStorage.MIN_KEEP} y ${CecotecStorage.MAX_KEEP}`);
        }
    }

    /**
     * @param {string} dir
     * @returns {Array<string>}
     */
    static READ_DIR(dir) {
        try {
            return fs.readdirSync(dir);
        } catch (e) {
            return [];
        }
    }

    /**
     * @param {string} target archivo o directorio (recursivo, sin seguir enlaces)
     * @returns {number} bytes
     */
    static SIZE_OF(target) {
        try {
            const stat = fs.lstatSync(target);

            if (!stat.isDirectory()) {
                return stat.isFile() ? stat.size : 0;
            }

            return fs.readdirSync(target).reduce((sum, name) => {
                return sum + CecotecStorage.SIZE_OF(path.join(target, name));
            }, 0);
        } catch (e) {
            return 0;
        }
    }
}

CecotecStorage.BINARIES = ["valetudo", "valetudo.prev"];
CecotecStorage.RESERVE_BYTES = 10 * 1024 * 1024;
CecotecStorage.DEFAULT_KEEP = 2;
CecotecStorage.MIN_KEEP = 1;
CecotecStorage.MAX_KEEP = 10;
CecotecStorage.MAP_FILE = /carto|unfinish|resume|dock|map/i;
// Mota: nombres reales de la 3090 (noviembre de 2026). Lo que no case se queda
CecotecStorage.FAMILIES = [
    {name: "app_logfile", pattern: /^\d+_\d{8}-\d{6}_app_logfile\.txt\.gz$/},
    {name: "logfile", pattern: /^\d+_\d+_E?\d{8}-\d{6}_logfile\.txt\.gz$/},
    {name: "client_file", pattern: /^\d+_\d+_E?client_file\.log\.gz$/},
    {name: "wifimanager", pattern: /^\d{7,8}-\d{6}_wifimanager\.txt\.gz$/},
    {name: "upgrade", pattern: /^\d+_\d{8}-\d{6}_upgrade\.txt$/},
];

module.exports = CecotecStorage;
