const Logger = require("../../Logger");
const {StatusStateAttribute} = require("../../entities/state/attributes");

/**
 * Mota: recupera el mapa guardado del firmware cuando este lo ha sustituido por uno temporal (lo hace al volver a la
 * base desde una pausa sin relocalizarse). No hay orden para cargar un mapa: una limpieza general desde la base lo
 * recarga y relocaliza (2110 → 2208 → 2108), así que basta con arrancarla y mandar el robot a casa en cuanto se
 * relocalice. Terminar una limpieza con el mapa temporal sobrescribiría el bueno.
 *
 * Señales, porque Mota no ve RS_CTRL_RESET_MAP (es interno del firmware) ni el evento 2208:
 * - el id del mapa no sirve: no cambió con el reinicio del 2/11 y cambia dos veces en cada inicio;
 * - el evento 2108 dice que se ha relocalizado, pero no en qué mapa: un mapa temporal también puede relocalizar;
 * - las habitaciones son la prueba: se guardan en celdas del mapa bueno. Solo si vuelven a encajar y el suelo cubre
 *   casi todas sus celdas se da por recuperado. Sin 2108 a tiempo, no ha vuelto.
 */
class CecotecMapRecovery {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     */
    constructor(options) {
        this.robot = options.robot;
        /** @type {"idle"|"starting"|"returning"} */
        this.state = "idle";
        /** @type {"recovered"|"not_recovered"|"home_failed"|null} */
        this.result = null;
        this.finishedAt = undefined;
        /** @type {{armed: boolean, left: boolean, timer: any} | undefined} */
        this.run = undefined;
        /** @type {any} esperando a que el mapa bueno llegue tras el 2108 */
        this.verifyTimer = undefined;
    }

    /**
     * @returns {{temporaryMap: boolean, docked: boolean, state: string, result: string|null}}
     */
    getStatus() {
        if (this.finishedAt !== undefined && Date.now() - this.finishedAt > CecotecMapRecovery.RESULT_TTL_MS) {
            this.result = null;
            this.finishedAt = undefined;
        }

        return {
            temporaryMap: this.robot.hasTemporaryFirmwareMap(),
            docked: this.isFreeAtDock(),
            state: this.state,
            result: this.result,
        };
    }

    /**
     * Arranca la recuperación. Solo con el robot en la base y un mapa temporal.
     */
    async start() {
        const agnoc = this.robot.robot;

        if (!agnoc) {
            throw new Error("El robot no está conectado.");
        }
        if (this.state !== "idle") {
            throw new Error("La recuperación del mapa ya está en marcha.");
        }
        if (!this.isFreeAtDock()) {
            throw new Error("El robot tiene que estar en la base y sin una limpieza por reanudar para recuperar el mapa.");
        }
        if (!this.robot.hasTemporaryFirmwareMap()) {
            throw new Error("El mapa actual no es temporal: no hay nada que recuperar.");
        }

        this.state = "starting";
        this.result = null;
        this.finishedAt = undefined;
        this.run = {
            // Un 2108 anterior a esta orden no cuenta
            armed: agnoc.device.motaRawFaultCode !== CecotecMapRecovery.RELOCALIZED_EVENT,
            left: false,
            timer: setTimeout(() => {
                Logger.warn("Map recovery: no relocalization in time");
                void this.finish(false);
            }, CecotecMapRecovery.RELOCALIZE_TIMEOUT_MS),
        };

        Logger.info(`Map recovery: starting a general cleanup from the dock, battery ${agnoc.device.battery?.value} %`);

        try {
            await agnoc.startAutoClean();
        } catch (e) {
            Logger.warn("Map recovery: unable to start the cleanup", e);
            await this.finish(false);

            throw new Error("El robot no ha aceptado la orden de limpieza.");
        }
    }

    /**
     * Se llama con cada estado del robot.
     */
    onDeviceUpdate() {
        const run = this.run;

        if (!run) {
            return;
        }

        const code = this.robot.robot?.device.motaRawFaultCode;
        const status = this.getStatusValue();

        if (code !== CecotecMapRecovery.RELOCALIZED_EVENT) {
            run.armed = true;
        } else if (run.armed) {
            void this.finish(true);

            return;
        }

        if (status !== StatusStateAttribute.VALUE.DOCKED) {
            run.left = true;
        }
        if (status === StatusStateAttribute.VALUE.ERROR || (run.left && status === StatusStateAttribute.VALUE.DOCKED)) {
            Logger.warn(`Map recovery: stopped by the robot state ${status}`);
            void this.finish(false);
        }
    }

    /**
     * Se llama con cada mapa nuevo.
     */
    onMapUpdate() {
        if (this.verifyTimer && this.robot.isGoodMapLoaded()) {
            this.conclude("recovered");
        }
    }

    shutdown() {
        clearTimeout(this.run?.timer);
        clearTimeout(this.verifyTimer);
    }

    /**
     * Pasa lo que pase, el robot no debe seguir limpiando: terminar la limpieza con un mapa temporal lo guardaría
     *
     * @private
     * @param {boolean} relocalized
     */
    async finish(relocalized) {
        const run = this.run;

        if (!run) {
            return;
        }

        this.run = undefined;
        clearTimeout(run.timer);
        this.state = "returning";

        // Si no llegó a salir de la base no hay nada que mandar a casa
        if (relocalized || this.getStatusValue() !== StatusStateAttribute.VALUE.DOCKED) {
            if (!await this.sendHome()) {
                this.conclude("home_failed");

                return;
            }
        }

        if (!relocalized) {
            this.conclude("not_recovered");
        } else if (this.robot.isGoodMapLoaded()) {
            this.conclude("recovered");
        } else {
            this.verifyTimer = setTimeout(() => {
                this.conclude("not_recovered");
            }, CecotecMapRecovery.VERIFY_TIMEOUT_MS);

            try {
                await this.robot.robot?.updateMap();
            } catch (e) {
                Logger.warn("Map recovery: unable to request the map", e);
            }
        }
    }

    /**
     * @private
     * @returns {Promise<boolean>}
     */
    async sendHome() {
        for (let attempt = 0; attempt < CecotecMapRecovery.HOME_ATTEMPTS; attempt++) {
            try {
                await this.robot.robot?.home();
                Logger.info("Map recovery: sent the robot back to the dock");

                return true;
            } catch (e) {
                Logger.warn("Map recovery: unable to send the robot home", e);
            }
        }

        return false;
    }

    /**
     * @private
     * @param {"recovered"|"not_recovered"|"home_failed"} result
     */
    conclude(result) {
        clearTimeout(this.verifyTimer);
        this.verifyTimer = undefined;
        this.state = "idle";
        this.result = result;
        this.finishedAt = Date.now();
        Logger.info(`Map recovery: ${result}`);
    }

    /**
     * Cargando para reanudar está en la base, pero una orden de inicio se mezclaría con esa limpieza
     *
     * @private
     * @returns {boolean}
     */
    isFreeAtDock() {
        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);

        return status?.value === StatusStateAttribute.VALUE.DOCKED && status.flag !== StatusStateAttribute.FLAG.RESUMABLE;
    }

    /**
     * @private
     * @returns {string|undefined}
     */
    getStatusValue() {
        return this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute)?.value;
    }
}

// El 2/11: 5 s del inicio al 2108 en el firmware, 8 s en Mota
CecotecMapRecovery.RELOCALIZE_TIMEOUT_MS = 30_000;
CecotecMapRecovery.VERIFY_TIMEOUT_MS = 20_000;
CecotecMapRecovery.RESULT_TTL_MS = 10 * 60_000;
CecotecMapRecovery.HOME_ATTEMPTS = 3;
CecotecMapRecovery.RELOCALIZED_EVENT = 2108;

module.exports = CecotecMapRecovery;
