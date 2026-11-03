const CecotecMapVersions = require("./CecotecMapVersions");
const crypto = require("crypto");
const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");
const zlib = require("zlib");
const {exec, execSync} = require("child_process");
const {StatusStateAttribute} = require("../../entities/state/attributes");

/**
 * Mota: copias versionadas del par del mapa del firmware (carto_slam.data + resume_data.info).
 *
 * El firmware guarda el par sin comprobar si el mapa es temporal, y a veces lo sustituye por uno temporal al volver a
 * la base. No hay orden para cargarle un mapa, pero sí acepta el par si se pone en su sitio con el robot parado en la
 * base y se reinicia (prueba B del 2/11). Estas copias permiten volver a un par bueno.
 *
 * Nunca se copia un mapa temporal ni un par a medio escribir: robot en la base, sin limpieza por reanudar, mapa bueno,
 * informe de la limpieza ya llegado, más de un minuto sin cambios en los dos archivos y dos lecturas iguales separadas
 * DOUBLE_READ_DELAY_MS (la escritura del firmware no es atómica [H]). El par se reescribe también a mitad de limpieza y
 * al ir a recargar, así que con una limpieza en curso o por reanudar no se copia nunca.
 *
 * Cada copia va en su directorio (<id>/ con los dos archivos comprimidos y meta.json). Se guardan MAX_COPIES copias
 * normales; la del par activo antes de restaurar ("before_restore") va aparte y se sustituye en cada restauración.
 */
class CecotecFirmwareMapBackups {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     * @param {string} options.directory donde se guardan las copias
     * @param {string} [options.vendorDirectory] donde están los archivos del firmware
     * @param {() => void} [options.reboot] reinicio completo del robot (inyectable para las pruebas)
     * @param {() => void} [options.sync] vuelca a la flash lo pendiente
     */
    constructor(options) {
        this.robot = options.robot;
        this.directory = options.directory;
        this.vendorDirectory = options.vendorDirectory ?? "/mnt/UDISK/log";
        this.reboot = options.reboot ?? CecotecFirmwareMapBackups.REBOOT;
        this.sync = options.sync ?? (() => {
            execSync("sync");
        });
        /** @type {boolean|undefined} copias automáticas (se lee de STATE_FILE la primera vez) */
        this.autoEnabled = undefined;
        /** Se está haciendo una copia (tarda DOUBLE_READ_DELAY_MS) */
        this.busy = false;
        this.restoring = false;
        /** Copia pendiente tras una limpieza correcta */
        this.afterClean = {pending: false, attempts: 0, timer: undefined};
        /** @type {{cartoMd5: string, resumeMd5: string, mtimes: string, at: number} | undefined} lectura del par en la base */
        this.dockedCheck = undefined;
        /** @type {string|undefined} copia que se está restaurando */
        this.restoringId = undefined;
        /** @type {any} */
        this.rebootTimer = undefined;
        /** @type {Map<string, {key: string, md5: string}>} md5 por archivo, mientras no cambie */
        this.md5Cache = new Map();

        this.removeLeftovers();
    }

    /**
     * @returns {boolean}
     */
    isAutoEnabled() {
        if (this.autoEnabled === undefined) {
            try {
                this.autoEnabled = JSON.parse(fs.readFileSync(path.join(this.directory, CecotecFirmwareMapBackups.STATE_FILE)).toString()).autoEnabled === true;
            } catch (e) {
                this.autoEnabled = false;
            }
        }

        return this.autoEnabled;
    }

    /**
     * @param {boolean} enabled
     */
    setAutoEnabled(enabled) {
        fs.mkdirSync(this.directory, {recursive: true});
        fs.writeFileSync(path.join(this.directory, CecotecFirmwareMapBackups.STATE_FILE), JSON.stringify({autoEnabled: enabled}));
        this.autoEnabled = enabled;
        Logger.info(`Firmware map backups: automatic copies ${enabled ? "enabled" : "disabled"}`);

        if (!enabled) {
            this.cancelAfterClean();
        }
    }

    /**
     * @returns {object} estado para la API (ver el contrato)
     */
    getStatus() {
        const active = this.getActive();

        return {
            autoEnabled: this.isAutoEnabled(),
            maxCopies: CecotecFirmwareMapBackups.MAX_COPIES,
            active: active,
            copies: this.list().map(copy => {
                return {
                    id: copy.id,
                    createdAt: copy.createdAt,
                    reason: copy.reason,
                    sizeBytes: copy.sizeBytes,
                    cartoMd5: copy.cartoMd5,
                    resumeMd5: copy.resumeMd5,
                    floorCells: copy.floorCells,
                    roomCount: copy.roomCount,
                    mapVersionId: copy.mapVersionId,
                    isActive: CecotecFirmwareMapBackups.SAME_MD5(copy, active),
                };
            }),
            canBackup: CecotecFirmwareMapBackups.TO_RESULT(this.getBackupProblem()),
            canRestore: CecotecFirmwareMapBackups.TO_RESULT(this.getRestoreProblem()),
            restoring: this.restoring,
        };
    }

    /**
     * @returns {Array<CopyInfo>} de la más reciente a la más antigua
     */
    list() {
        let entries;

        try {
            entries = fs.readdirSync(this.directory, {withFileTypes: true});
        } catch (e) {
            return [];
        }

        return entries
            .filter(entry => {
                return entry.isDirectory() && CecotecFirmwareMapBackups.IS_VALID_ID(entry.name);
            })
            .map(entry => {
                try {
                    const dir = path.join(this.directory, entry.name);
                    const meta = JSON.parse(fs.readFileSync(path.join(dir, "meta.json")).toString());

                    return Object.assign(meta, {
                        id: entry.name,
                        sizeBytes: fs.readdirSync(dir).reduce((sum, f) => {
                            return sum + fs.statSync(path.join(dir, f)).size;
                        }, 0),
                    });
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean)
            .sort((a, b) => {
                return Date.parse(b.createdAt) - Date.parse(a.createdAt) || (b.id < a.id ? -1 : 1);
            });
    }

    /**
     * @param {string} id
     * @returns {CopyInfo|undefined}
     */
    get(id) {
        return CecotecFirmwareMapBackups.IS_VALID_ID(id) ? this.list().find(c => {
            return c.id === id;
        }) : undefined;
    }

    /**
     * @returns {{cartoMd5: string, resumeMd5: string} | null} md5 del par activo
     */
    getActive() {
        try {
            const {carto, resume} = this.getPairPaths();

            return {cartoMd5: this.getCachedMd5(carto), resumeMd5: this.getCachedMd5(resume)};
        } catch (e) {
            return null;
        }
    }

    /**
     * Mota: para el aviso de mapa temporal. La más reciente que no sea el par activo (restaurar ese no cambia nada)
     *
     * @returns {string|null}
     */
    getRestorableId() {
        const active = this.getActive();
        const copy = this.list().find(c => {
            return c.reason !== "before_restore" && !CecotecFirmwareMapBackups.SAME_MD5(c, active);
        });

        return copy?.id ?? null;
    }

    /**
     * Copia manual (o automática tras limpiar). Tarda DOUBLE_READ_DELAY_MS por la doble lectura.
     *
     * @param {"manual"|"after_clean"} [reason]
     * @returns {Promise<CopyInfo>}
     */
    async backup(reason = "manual") {
        if (this.busy) {
            throw CecotecFirmwareMapBackups.ERROR("Ya se está haciendo una copia.", true);
        }

        this.busy = true;
        try {
            this.assertCanCopy();
            const first = this.readPair();

            await new Promise(resolve => {
                setTimeout(resolve, CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS);
            });

            this.assertCanCopy();
            const second = this.readPair();

            if (!CecotecFirmwareMapBackups.SAME_PAIR(first, second)) {
                throw CecotecFirmwareMapBackups.ERROR("El mapa del robot ha cambiado mientras se copiaba. Inténtalo más tarde.", true);
            }

            return this.store(second, reason, true);
        } finally {
            this.busy = false;
        }
    }

    /**
     * @param {string} id
     */
    delete(id) {
        if (!CecotecFirmwareMapBackups.IS_VALID_ID(id)) {
            throw new Error("Identificador de copia no válido.");
        }
        if (this.restoring) {
            throw new Error("Se está restaurando una copia.");
        }
        if (!this.get(id)) {
            throw new Error("No existe esa copia.");
        }

        fs.rmSync(path.join(this.directory, id), {recursive: true, force: true});
        Logger.info(`Firmware map backups: deleted copy ${id}`);
    }

    /**
     * Restaura una copia como en la prueba B: temporales en la misma partición, md5, sync, rename, sync y reinicio
     * completo (el firmware tiene el mapa en memoria y lo volvería a guardar si solo se reiniciaran los procesos).
     *
     * Orden del rename: primero carto_slam.data y al final resume_data.info. El firmware valida resume_data.info al
     * arrancar (detectControllerDataValid, que borra el mapa si no lo puede leer), así que es el último en cambiar: hace
     * de confirmación del par. Si algo fallara entre los dos rename, queda la copia "before_restore" para volver.
     *
     * @param {string} id
     * @returns {{rebootInSeconds: number}}
     */
    restore(id) {
        const problem = this.getRestoreProblem();

        if (problem) {
            throw new Error(problem);
        }

        const copy = this.get(id);

        if (!copy) {
            throw new Error("No existe esa copia.");
        }
        if (CecotecFirmwareMapBackups.SAME_MD5(copy, this.getActive())) {
            throw new Error("Esa copia ya es el mapa activo del robot.");
        }

        const {carto, resume} = this.getPairPaths();
        const temporaries = [carto + CecotecFirmwareMapBackups.TEMP_SUFFIX, resume + CecotecFirmwareMapBackups.TEMP_SUFFIX];
        /** @type {CopyInfo|undefined} */
        let beforeRestore;
        let renamed = false;

        this.restoring = true;
        this.restoringId = id;
        Logger.info(`Firmware map backups: restoring copy ${id}`);

        try {
            // 1. El par activo, por si hay que volver
            const active = this.readPairIfPresent();
            if (active) {
                beforeRestore = this.store(active, "before_restore", false);
            } else {
                Logger.warn("Firmware map backups: the active pair is missing, nothing to keep before restoring");
            }

            // 2. Temporales en la misma partición, comprobados contra meta.json
            [["carto_slam.data.gz", copy.cartoMd5, temporaries[0]], ["resume_data.info.gz", copy.resumeMd5, temporaries[1]]].forEach(([file, md5, temporary]) => {
                const data = zlib.gunzipSync(fs.readFileSync(path.join(this.directory, id, file)));

                if (CecotecFirmwareMapBackups.MD5(data) !== md5) {
                    throw new Error("La copia está dañada: su contenido no coincide con el md5 guardado.");
                }

                CecotecFirmwareMapBackups.WRITE_SYNCED(temporary, data);
                if (CecotecFirmwareMapBackups.MD5(fs.readFileSync(temporary)) !== md5) {
                    throw new Error("No se ha podido escribir la copia en la flash: el md5 no coincide.");
                }
            });
            this.sync();

            // 3. Sustitución
            fs.renameSync(temporaries[0], carto);
            renamed = true;
            fs.renameSync(temporaries[1], resume);
            this.sync();
            this.md5Cache.clear();

            if (CecotecFirmwareMapBackups.MD5(fs.readFileSync(carto)) !== copy.cartoMd5 || CecotecFirmwareMapBackups.MD5(fs.readFileSync(resume)) !== copy.resumeMd5) {
                throw new Error("El par restaurado no coincide con la copia.");
            }
        } catch (e) {
            temporaries.forEach(file => {
                fs.rmSync(file, {force: true});
            });
            if (!renamed && beforeRestore) {
                fs.rmSync(path.join(this.directory, beforeRestore.id), {recursive: true, force: true});
            }
            this.restoring = false;
            this.md5Cache.clear();
            Logger.error(`Firmware map backups: unable to restore copy ${id}`, e);

            throw new Error(renamed ?
                `${e.message} El par puede haber quedado a medias: restaura la copia ${beforeRestore?.id ?? "anterior"}.` :
                `${e.message} El mapa del robot no se ha tocado.`);
        }

        // 4. Las habitaciones de Mota que iban con ella
        if (copy.mapVersionId !== null && copy.mapVersionId !== undefined) {
            try {
                if (this.robot.mapVersions?.get(copy.mapVersionId)) {
                    this.robot.mapVersions.restoreRooms(copy.mapVersionId);
                } else {
                    Logger.warn(`Firmware map backups: map version ${copy.mapVersionId} no longer exists, rooms not restored`);
                }
            } catch (e) {
                Logger.warn("Firmware map backups: unable to restore the rooms", e);
            }
        }

        // 5. Solo queda una copia "before_restore": la de ahora (y la restaurada, si lo era)
        this.list().filter(c => {
            return c.reason === "before_restore" && c.id !== beforeRestore?.id && c.id !== id;
        }).forEach(c => {
            fs.rmSync(path.join(this.directory, c.id), {recursive: true, force: true});
        });

        Logger.info(`Firmware map backups: restored copy ${id}, rebooting in ${CecotecFirmwareMapBackups.REBOOT_DELAY_MS / 1000} s`);
        this.rebootTimer = setTimeout(() => {
            this.reboot();
        }, CecotecFirmwareMapBackups.REBOOT_DELAY_MS);

        return {rebootInSeconds: CecotecFirmwareMapBackups.REBOOT_DELAY_MS / 1000};
    }

    /**
     * @param {string} id
     * @returns {Buffer} .tar.gz con los dos archivos sin comprimir y meta.json
     */
    getArchive(id) {
        const copy = this.get(id);

        if (!copy) {
            throw new Error("No existe esa copia.");
        }

        const dir = path.join(this.directory, id);
        const mtime = Math.floor(Date.parse(copy.createdAt) / 1000);

        return zlib.gzipSync(CecotecFirmwareMapBackups.TAR([
            {name: "carto_slam.data", data: zlib.gunzipSync(fs.readFileSync(path.join(dir, "carto_slam.data.gz"))), mtime: mtime},
            {name: "resume_data.info", data: zlib.gunzipSync(fs.readFileSync(path.join(dir, "resume_data.info.gz"))), mtime: mtime},
            {name: "meta.json", data: fs.readFileSync(path.join(dir, "meta.json")), mtime: mtime},
        ]));
    }

    /**
     * Se llama con cada estado del robot, antes de guardar el nuevo
     *
     * @param {import("../../entities/state/attributes/StatusStateAttribute")|undefined} oldStatus
     * @param {import("../../entities/state/attributes/StatusStateAttribute")} newStatus
     */
    onDeviceUpdate(oldStatus, newStatus) {
        if (!this.isAutoEnabled()) {
            return;
        }

        if (
            oldStatus &&
            CecotecFirmwareMapBackups.START_FROM_STATES.includes(oldStatus.value) &&
            oldStatus.flag !== StatusStateAttribute.FLAG.RESUMABLE &&
            CecotecFirmwareMapBackups.CLEANING_STATES.includes(newStatus.value)
        ) {
            this.cancelAfterClean();
            this.backupBeforeCleaning(oldStatus);
        }

        if (CecotecFirmwareMapBackups.IS_FREE_AT_DOCK(newStatus)) {
            this.updateDockedCheck();
            this.scheduleAfterClean(newStatus);
        } else {
            clearTimeout(this.afterClean.timer);
            this.afterClean.timer = undefined;
        }
    }

    /**
     * Se llama con cada mapa nuevo: el mapa bueno puede llegar después de estar en la base
     */
    onMapUpdate() {
        if (this.afterClean.pending) {
            this.scheduleAfterClean(this.getStatusAttribute());
        }
    }

    /**
     * @param {boolean} temporaryMapMode la limpieza era de bordes o espiral
     */
    onCleanReport(temporaryMapMode) {
        if (!this.isAutoEnabled() || temporaryMapMode) {
            return;
        }

        this.afterClean.pending = true;
        this.afterClean.attempts = 0;
        this.scheduleAfterClean(this.getStatusAttribute());
    }

    shutdown() {
        clearTimeout(this.afterClean.timer);
        clearTimeout(this.rebootTimer);
    }

    /**
     * @returns {string|undefined} por qué no se puede copiar ahora, en español
     */
    getBackupProblem() {
        if (this.busy) {
            return "Ya se está haciendo una copia.";
        }

        const problem = this.getCopyProblem(this.getStatusAttribute());

        if (problem) {
            return problem;
        }

        return this.isDuplicate(this.getActive()) ? "Ya hay una copia igual al mapa actual del robot." : undefined;
    }

    /**
     * @returns {string|undefined} por qué no se puede restaurar ahora, en español
     */
    getRestoreProblem() {
        const status = this.getStatusAttribute();

        if (this.restoring) {
            return "Ya se está restaurando una copia.";
        }
        if (this.busy) {
            return "Se está haciendo una copia.";
        }
        if (!this.robot.robot) {
            return "El robot no está conectado.";
        }
        if (status?.value !== StatusStateAttribute.VALUE.DOCKED) {
            return "El robot tiene que estar en la base y parado para restaurar.";
        }
        if (status.flag === StatusStateAttribute.FLAG.RESUMABLE) {
            return "Hay una limpieza por reanudar: termínala o cancélala antes de restaurar.";
        }
        if (this.robot.mapRecovery?.state !== "idle") {
            return "La recuperación del mapa está en marcha.";
        }
        if (this.list().length === 0) {
            return "No hay ninguna copia.";
        }

        return undefined;
    }

    /**
     * @private
     * @param {import("../../entities/state/attributes/StatusStateAttribute")|undefined} status
     * @returns {string|undefined} condiciones comunes a toda copia (sin la de duplicada)
     */
    getCopyProblem(status) {
        if (this.restoring) {
            return "Se está restaurando una copia.";
        }
        if (!this.robot.robot) {
            return "El robot no está conectado.";
        }
        if (status?.value !== StatusStateAttribute.VALUE.DOCKED) {
            return "El robot tiene que estar en la base: limpiando, el firmware reescribe el mapa.";
        }
        if (status.flag === StatusStateAttribute.FLAG.RESUMABLE) {
            return "Hay una limpieza por reanudar: el firmware puede reescribir el mapa al terminarla.";
        }
        if (this.robot.mapRecovery?.state !== "idle") {
            return "La recuperación del mapa está en marcha.";
        }
        if (this.robot.isTemporaryMapMode()) {
            return "El robot está en un modo con mapa temporal (bordes o espiral).";
        }

        const map = this.robot.robot.device.map;

        if (!map) {
            return "Todavía no ha llegado el mapa del robot.";
        }
        if (this.robot.virtualRooms.hasRooms()) {
            if (this.robot.virtualRooms.stale || !this.robot.isGoodMapLoaded()) {
                return "El mapa cargado no es el de las habitaciones: puede ser temporal o estar incompleto.";
            }
        } else {
            const resolution = this.robot.getMapResolution(map);

            if (this.robot.mapResetPending) {
                return "El mapa se ha borrado y el robot aún no ha hecho uno nuevo.";
            }
            if (this.robot.getFloorSnapshot(map).floor.length * resolution * resolution <= CecotecFirmwareMapBackups.MIN_FLOOR_M2) {
                return "El mapa tiene muy poco suelo (4 m² o menos): no parece la casa.";
            }
        }

        let stats;
        try {
            stats = this.statPair();
        } catch (e) {
            return "No se pueden leer los archivos del mapa del robot.";
        }

        const age = Date.now() - Math.max(stats.carto.mtimeMs, stats.resume.mtimeMs);

        // El informe llega al acabar; sin él la limpieza puede no haber terminado de escribir. Una limpieza parada por
        // un fallo no envía informe: pasado un rato sin cambios se da por terminada
        if (this.robot.cleanStartedAt !== undefined && age < CecotecFirmwareMapBackups.REPORT_WAIT_MS) {
            return "Falta el informe de la última limpieza: el robot puede estar aún guardando el mapa.";
        }
        if (age < CecotecFirmwareMapBackups.STABLE_MS) {
            return "El robot ha escrito el mapa hace menos de un minuto. Se podrá copiar en breve.";
        }

        return undefined;
    }

    /**
     * @private
     */
    assertCanCopy() {
        const problem = this.getCopyProblem(this.getStatusAttribute());

        if (problem) {
            throw CecotecFirmwareMapBackups.ERROR(problem, true);
        }
    }

    /**
     * Antes de una limpieza nueva el par en disco aún es el guardado. No hay tiempo para la doble lectura: la primera
     * es la que se hizo con el robot en la base (dockedCheck) y la segunda esta, que tiene que dar lo mismo.
     *
     * @private
     * @param {import("../../entities/state/attributes/StatusStateAttribute")} oldStatus
     */
    backupBeforeCleaning(oldStatus) {
        if (this.busy) {
            return;
        }

        const problem = this.getCopyProblem(oldStatus);
        const verified = this.dockedCheck;

        if (problem) {
            Logger.info(`Firmware map backups: no copy before the cleaning (${problem})`);

            return;
        }
        if (!verified || Date.now() - verified.at < CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS) {
            Logger.info("Firmware map backups: no copy before the cleaning (the pair was not verified at the dock)");

            return;
        }

        try {
            const pair = this.readPair();

            if (pair.mtimes !== verified.mtimes || pair.carto.md5 !== verified.cartoMd5 || pair.resume.md5 !== verified.resumeMd5) {
                Logger.info("Firmware map backups: no copy before the cleaning (the pair changed since it was verified)");

                return;
            }

            this.store(pair, "before_clean", true);
        } catch (e) {
            Logger.info(`Firmware map backups: no copy before the cleaning (${e.message})`);
        }
    }

    /**
     * Primera de las dos lecturas para la copia de antes de limpiar
     *
     * @private
     */
    updateDockedCheck() {
        try {
            const stats = this.statPair();
            const mtimes = CecotecFirmwareMapBackups.MTIMES(stats.carto, stats.resume);

            if (this.dockedCheck?.mtimes !== mtimes) {
                const {carto, resume} = this.getPairPaths();

                this.dockedCheck = {
                    cartoMd5: CecotecFirmwareMapBackups.MD5(fs.readFileSync(carto)),
                    resumeMd5: CecotecFirmwareMapBackups.MD5(fs.readFileSync(resume)),
                    mtimes: mtimes,
                    at: Date.now(),
                };
            }
        } catch (e) {
            this.dockedCheck = undefined;
        }
    }

    /**
     * @private
     * @param {import("../../entities/state/attributes/StatusStateAttribute")|undefined} status
     */
    scheduleAfterClean(status) {
        if (!this.afterClean.pending || this.afterClean.timer || !CecotecFirmwareMapBackups.IS_FREE_AT_DOCK(status)) {
            return;
        }

        // El firmware escribe el par al terminar: se espera a que acabe
        this.afterClean.timer = setTimeout(() => {
            this.afterClean.timer = undefined;

            if (!CecotecFirmwareMapBackups.IS_FREE_AT_DOCK(this.getStatusAttribute())) {
                return;
            }

            this.backup("after_clean").then(() => {
                this.afterClean.pending = false;
            }).catch(e => {
                this.afterClean.attempts++;

                if (e.retry && this.afterClean.attempts < CecotecFirmwareMapBackups.AFTER_CLEAN_MAX_ATTEMPTS) {
                    Logger.info(`Firmware map backups: copy after the cleaning postponed (${e.message})`);
                    this.scheduleAfterClean(this.getStatusAttribute());
                } else {
                    Logger.info(`Firmware map backups: no copy after the cleaning (${e.message})`);
                    this.afterClean.pending = false;
                }
            });
        }, CecotecFirmwareMapBackups.AFTER_CLEAN_DELAY_MS);
    }

    /**
     * @private
     */
    cancelAfterClean() {
        clearTimeout(this.afterClean.timer);
        this.afterClean = {pending: false, attempts: 0, timer: undefined};
    }

    /**
     * @private
     * @param {Pair} pair
     * @param {"manual"|"after_clean"|"before_clean"|"before_restore"} reason
     * @param {boolean} dedupe no guardar si es igual a la copia normal más reciente
     * @returns {CopyInfo}
     */
    store(pair, reason, dedupe) {
        const md5 = {cartoMd5: pair.carto.md5, resumeMd5: pair.resume.md5};

        if (dedupe && this.isDuplicate(md5)) {
            throw CecotecFirmwareMapBackups.ERROR("Ya hay una copia igual al mapa actual del robot.", false);
        }

        fs.mkdirSync(this.directory, {recursive: true});

        const id = this.getNewId();
        const temporary = path.join(this.directory, id + ".tmp");
        const info = Object.assign({
            id: id,
            createdAt: new Date().toISOString(),
            reason: reason,
        }, md5, {
            cartoBytes: pair.carto.data.length,
            resumeBytes: pair.resume.data.length,
        }, this.describeMap());

        try {
            fs.rmSync(temporary, {recursive: true, force: true});
            fs.mkdirSync(temporary);
            CecotecFirmwareMapBackups.WRITE_SYNCED(path.join(temporary, "carto_slam.data.gz"), zlib.gzipSync(pair.carto.data));
            CecotecFirmwareMapBackups.WRITE_SYNCED(path.join(temporary, "resume_data.info.gz"), zlib.gzipSync(pair.resume.data));
            CecotecFirmwareMapBackups.WRITE_SYNCED(path.join(temporary, "meta.json"), Buffer.from(JSON.stringify(info, null, 2)));
            fs.renameSync(temporary, path.join(this.directory, id));
        } catch (e) {
            fs.rmSync(temporary, {recursive: true, force: true});

            throw e;
        }

        Logger.info(`Firmware map backups: stored copy ${id} (${reason}, md5 ${md5.cartoMd5} / ${md5.resumeMd5})`);

        if (reason !== "before_restore") {
            this.rotate();
        }

        return this.get(id);
    }

    /**
     * Celdas, habitaciones y versión de Mota del mapa cargado
     *
     * @private
     * @returns {{floorCells: number|null, roomCount: number|null, mapVersionId: number|null}}
     */
    describeMap() {
        const map = this.robot.robot?.device.map;

        if (!map) {
            return {floorCells: null, roomCount: null, mapVersionId: null};
        }

        try {
            const snapshot = this.robot.getMapSnapshot(map);

            return {
                floorCells: snapshot.floor.length,
                roomCount: snapshot.rooms?.rooms?.length ?? 0,
                mapVersionId: this.linkMapVersion(snapshot),
            };
        } catch (e) {
            Logger.warn("Firmware map backups: unable to describe the map", e);

            return {floorCells: null, roomCount: null, mapVersionId: null};
        }
    }

    /**
     * Mota: la copia va con una versión de Mota (sus habitaciones). Si la última versión tiene la misma disposición se
     * enlaza con ella; si no, se guarda una nueva.
     *
     * @private
     * @param {import("./CecotecMapVersions").Snapshot} snapshot
     * @returns {number|null}
     */
    linkMapVersion(snapshot) {
        const versions = this.robot.mapVersions;

        if (!versions || snapshot.floor.length === 0) {
            return null;
        }

        try {
            const latest = versions.list()[0];

            if (latest && latest.roomsHash === CecotecMapVersions.ROOMS_HASH(snapshot.rooms)) {
                return latest.id;
            }

            return versions.saveForFirmwareBackup(snapshot).id;
        } catch (e) {
            Logger.warn("Firmware map backups: unable to store the map version", e);

            return null;
        }
    }

    /**
     * Deja las MAX_COPIES copias normales más recientes. Nunca la que se está restaurando
     *
     * @private
     */
    rotate() {
        this.list().filter(c => {
            return c.reason !== "before_restore";
        }).slice(CecotecFirmwareMapBackups.MAX_COPIES).forEach(c => {
            if (this.restoring && this.restoringId === c.id) {
                return;
            }

            fs.rmSync(path.join(this.directory, c.id), {recursive: true, force: true});
            Logger.info(`Firmware map backups: rotated out copy ${c.id}`);
        });
    }

    /**
     * @private
     * @param {{cartoMd5: string, resumeMd5: string}|null} md5
     * @returns {boolean}
     */
    isDuplicate(md5) {
        const latest = this.list().find(c => {
            return c.reason !== "before_restore";
        });

        return CecotecFirmwareMapBackups.SAME_MD5(latest, md5);
    }

    /**
     * @private
     * @returns {string} fecha local tipo 20261103-2019, con sufijo si ya existe
     */
    getNewId() {
        const d = new Date();
        const pad = (n) => {
            return String(n).padStart(2, "0");
        };
        const base = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
        let id = base;

        for (let n = 2; fs.existsSync(path.join(this.directory, id)); n++) {
            id = `${base}-${n}`;
        }

        return id;
    }

    /**
     * @private
     * @returns {{carto: string, resume: string}}
     */
    getPairPaths() {
        return {
            carto: path.join(this.vendorDirectory, "carto_slam.data"),
            resume: path.join(this.vendorDirectory, "resume_data.info"),
        };
    }

    /**
     * @private
     * @returns {{carto: fs.Stats, resume: fs.Stats}}
     */
    statPair() {
        const {carto, resume} = this.getPairPaths();

        return {carto: fs.statSync(carto), resume: fs.statSync(resume)};
    }

    /**
     * Lee el par y comprueba que no ha cambiado mientras se leía
     *
     * @private
     * @returns {Pair}
     */
    readPair() {
        const {carto, resume} = this.getPairPaths();
        const before = this.statPair();
        const cartoData = fs.readFileSync(carto);
        const resumeData = fs.readFileSync(resume);
        const after = this.statPair();
        const mtimes = CecotecFirmwareMapBackups.MTIMES(after.carto, after.resume);

        if (CecotecFirmwareMapBackups.MTIMES(before.carto, before.resume) !== mtimes) {
            throw CecotecFirmwareMapBackups.ERROR("El robot estaba escribiendo el mapa. Inténtalo más tarde.", true);
        }

        return {
            carto: {data: cartoData, md5: CecotecFirmwareMapBackups.MD5(cartoData)},
            resume: {data: resumeData, md5: CecotecFirmwareMapBackups.MD5(resumeData)},
            mtimes: mtimes,
        };
    }

    /**
     * @private
     * @returns {Pair|undefined} el par activo, o nada si falta algún archivo
     */
    readPairIfPresent() {
        const {carto, resume} = this.getPairPaths();

        return fs.existsSync(carto) && fs.existsSync(resume) ? this.readPair() : undefined;
    }

    /**
     * @private
     * @param {string} file
     * @returns {string}
     */
    getCachedMd5(file) {
        const stat = fs.statSync(file);
        const key = `${stat.size}:${stat.mtimeMs}`;
        const cached = this.md5Cache.get(file);

        if (cached?.key === key) {
            return cached.md5;
        }

        const md5 = CecotecFirmwareMapBackups.MD5(fs.readFileSync(file));
        this.md5Cache.set(file, {key: key, md5: md5});

        return md5;
    }

    /**
     * Restos de una copia o restauración interrumpidas (solo nombres propios de Mota)
     *
     * @private
     */
    removeLeftovers() {
        try {
            fs.readdirSync(this.directory).filter(f => {
                return f.endsWith(".tmp");
            }).forEach(f => {
                fs.rmSync(path.join(this.directory, f), {recursive: true, force: true});
            });
        } catch (e) {
            // Sin directorio todavía
        }

        Object.values(this.getPairPaths()).forEach(file => {
            fs.rmSync(file + CecotecFirmwareMapBackups.TEMP_SUFFIX, {force: true});
        });
    }

    /**
     * @private
     * @returns {import("../../entities/state/attributes/StatusStateAttribute")|undefined}
     */
    getStatusAttribute() {
        return this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
    }

    /**
     * @param {{value: string, flag?: string}|undefined} status
     * @returns {boolean}
     */
    static IS_FREE_AT_DOCK(status) {
        return status?.value === StatusStateAttribute.VALUE.DOCKED && status.flag !== StatusStateAttribute.FLAG.RESUMABLE;
    }

    /**
     * @param {string} id
     * @returns {boolean}
     */
    static IS_VALID_ID(id) {
        return typeof id === "string" && /^\d{8}-\d{4}(-\d{1,3})?$/.test(id);
    }

    /**
     * @param {{cartoMd5: string, resumeMd5: string}|null|undefined} a
     * @param {{cartoMd5: string, resumeMd5: string}|null|undefined} b
     * @returns {boolean}
     */
    static SAME_MD5(a, b) {
        return Boolean(a && b) && a.cartoMd5 === b.cartoMd5 && a.resumeMd5 === b.resumeMd5;
    }

    /**
     * @param {Pair} a
     * @param {Pair} b
     * @returns {boolean}
     */
    static SAME_PAIR(a, b) {
        return a.mtimes === b.mtimes && a.carto.md5 === b.carto.md5 && a.resume.md5 === b.resume.md5;
    }

    /**
     * @param {fs.Stats} carto
     * @param {fs.Stats} resume
     * @returns {string}
     */
    static MTIMES(carto, resume) {
        return `${carto.mtimeMs}:${carto.size}/${resume.mtimeMs}:${resume.size}`;
    }

    /**
     * @param {Buffer} data
     * @returns {string}
     */
    static MD5(data) {
        return crypto.createHash("md5").update(data).digest("hex");
    }

    /**
     * @param {string|undefined} problem
     * @returns {{ok: boolean, reason?: string}}
     */
    static TO_RESULT(problem) {
        return problem ? {ok: false, reason: problem} : {ok: true};
    }

    /**
     * @param {string} message
     * @param {boolean} retry se puede volver a intentar más tarde
     * @returns {Error & {retry: boolean}}
     */
    static ERROR(message, retry) {
        return Object.assign(new Error(message), {retry: retry});
    }

    /**
     * Escribe y fuerza el volcado a la flash
     *
     * @param {string} file
     * @param {Buffer} data
     */
    static WRITE_SYNCED(file, data) {
        const fd = fs.openSync(file, "w");

        try {
            let offset = 0;
            while (offset < data.length) {
                offset += fs.writeSync(fd, data, offset, data.length - offset);
            }
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
    }

    /**
     * Mota: tar ustar mínimo (archivos normales, nombres de menos de 100 caracteres), sin dependencias
     *
     * @param {Array<{name: string, data: Buffer, mtime: number}>} entries mtime en segundos
     * @returns {Buffer}
     */
    static TAR(entries) {
        const blocks = [];

        entries.forEach(entry => {
            const header = Buffer.alloc(512);
            const write = (value, offset, length) => {
                header.write(value, offset, length, "ascii");
            };
            const octal = (value, length) => {
                return value.toString(8).padStart(length - 1, "0") + "\0";
            };

            write(entry.name, 0, 100);
            write(octal(0o644, 8), 100, 8);
            write(octal(0, 8), 108, 8);
            write(octal(0, 8), 116, 8);
            write(octal(entry.data.length, 12), 124, 12);
            write(octal(entry.mtime, 12), 136, 12);
            write("        ", 148, 8); // la suma se calcula con este campo en blanco
            write("0", 156, 1);
            write("ustar\0", 257, 6);
            write("00", 263, 2);
            write("root", 265, 32);
            write("root", 297, 32);

            let checksum = 0;
            for (let i = 0; i < 512; i++) {
                checksum += header[i];
            }
            write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);

            blocks.push(header, entry.data, Buffer.alloc((512 - entry.data.length % 512) % 512));
        });

        blocks.push(Buffer.alloc(1024));

        return Buffer.concat(blocks);
    }

    /**
     * Reinicio completo del robot
     */
    static REBOOT() {
        exec("reboot", (err) => {
            if (err) {
                Logger.error("Firmware map backups: unable to reboot", err);
            }
        });
    }
}

CecotecFirmwareMapBackups.MAX_COPIES = 3;
CecotecFirmwareMapBackups.STATE_FILE = "estado.json";
CecotecFirmwareMapBackups.TEMP_SUFFIX = ".rest";
CecotecFirmwareMapBackups.MIN_FLOOR_M2 = 4;
// El par no debe haber cambiado en este tiempo, y dos lecturas separadas así deben dar lo mismo
CecotecFirmwareMapBackups.STABLE_MS = 60_000;
CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS = 10_000;
// Tras el informe de limpieza el firmware escribe el par
CecotecFirmwareMapBackups.AFTER_CLEAN_DELAY_MS = 60_000;
CecotecFirmwareMapBackups.AFTER_CLEAN_MAX_ATTEMPTS = 10;
// Sin informe (limpieza parada por un fallo), un par sin cambios en este tiempo se da por terminado
CecotecFirmwareMapBackups.REPORT_WAIT_MS = 15 * 60_000;
CecotecFirmwareMapBackups.REBOOT_DELAY_MS = 3_000;
CecotecFirmwareMapBackups.START_FROM_STATES = [StatusStateAttribute.VALUE.DOCKED, StatusStateAttribute.VALUE.IDLE];
CecotecFirmwareMapBackups.CLEANING_STATES = [StatusStateAttribute.VALUE.CLEANING, StatusStateAttribute.VALUE.MOVING];

/**
 * @typedef {object} CopyInfo
 * @property {string} id
 * @property {string} createdAt
 * @property {"manual"|"after_clean"|"before_clean"|"before_restore"} reason
 * @property {string} cartoMd5 de carto_slam.data sin comprimir
 * @property {string} resumeMd5 de resume_data.info sin comprimir
 * @property {number} cartoBytes
 * @property {number} resumeBytes
 * @property {number|null} floorCells del mapa cargado al copiar
 * @property {number|null} roomCount
 * @property {number|null} mapVersionId versión de Mota con sus habitaciones
 * @property {number} sizeBytes lo que ocupa en disco (comprimido)
 */

/**
 * @typedef {object} Pair
 * @property {{data: Buffer, md5: string}} carto
 * @property {{data: Buffer, md5: string}} resume
 * @property {string} mtimes
 */

module.exports = CecotecFirmwareMapBackups;
