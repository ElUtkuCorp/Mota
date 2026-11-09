const BasicControlCapability = require("../../../core/capabilities/BasicControlCapability");
const Logger = require("../../../Logger");
const MotaSafeReturnValetudoEvent = require("../../../valetudo_events/events/MotaSafeReturnValetudoEvent");
const {PresetSelectionStateAttribute, StatusStateAttribute} = require("../../../entities/state/attributes");

/**
 * @extends BasicControlCapability<import("../CecotecCongaRobot")>
 */
class CecotecBasicControlCapability extends BasicControlCapability {
    /**
     * @param {object} options
     */
    constructor(options) {
        super(options);

        /** @type {{cancel: () => void} | undefined} Mota: vuelta segura en curso (ver home()) */
        this.safeReturn = undefined;
    }

    async start() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        this.cancelSafeReturn("start");

        // Mota: en pausa se reanuda lo que estuviera haciendo; si no, se arranca el modo elegido
        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        if (status?.value === StatusStateAttribute.VALUE.PAUSED) {
            await this.robot.robot.start();

            return;
        }

        Logger.info(`Start requested: ${this.robot.selectedOperationMode}, battery ${this.robot.robot.device.battery?.value} %`);

        switch (this.robot.selectedOperationMode) {
            case PresetSelectionStateAttribute.MODE.MOP:
                await this.robot.robot.startMopClean();
                break;
            case PresetSelectionStateAttribute.MODE.EDGE:
                await this.robot.robot.startEdgeClean();
                break;
            case PresetSelectionStateAttribute.MODE.SPIRAL:
                await this.robot.robot.startSpiralClean();
                break;
            default:
                await this.robot.robot.startAutoClean();
        }
    }

    async stop() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        this.cancelSafeReturn("stop");

        // Mota: con el robot parado la orden no hace nada y el firmware solo pita
        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        if (
            (status?.value === StatusStateAttribute.VALUE.DOCKED || status?.value === StatusStateAttribute.VALUE.IDLE) &&
            status.flag !== StatusStateAttribute.FLAG.RESUMABLE
        ) {
            return;
        }

        await this.robot.robot.stop();
    }

    async pause() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        this.cancelSafeReturn("pause");
        await this.robot.robot.pause();
    }

    /**
     * Mota: volver a la base desde pausa recarga el mapa y se relocaliza (Case1 en processModeGoDock). Si falla, el
     * firmware reinicia el mapa. Con la limpieza en marcha, en cambio, va a la base sin recargar (Case2). Por eso,
     * desde pausa se reanuda, se espera a que salga de la relocalización y entonces se manda a casa. Probado a mano
     * 5 de 5 (docs/firmware-revision.md, prueba A).
     *
     * Mota no ve la salida de la relocalización: el 2108 llega al entrar. Se espera un tiempo fijo después. Sin 2108,
     * no se manda a casa a ciegas: se vuelve a pausar y se avisa para que el usuario compruebe el mapa.
     * Parado lejos de la base no hay nada que reanudar (Case3) y el botón físico no pasa por aquí.
     */
    async home() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        // Mota: con un fallo (p. ej. 514) el estado es "error", pero el firmware puede seguir en una pausa (AUTO_PAUSE)
        const pausedWithError = status?.value === StatusStateAttribute.VALUE.ERROR &&
            CecotecBasicControlCapability.PAUSED_WORK_MODES.includes(this.robot.robot.device.motaRawWorkMode);

        if (status?.value === StatusStateAttribute.VALUE.PAUSED || pausedWithError) {
            if (this.safeReturn) {
                return;
            }

            Logger.info(`Return to the dock requested while paused: resuming first, battery ${this.robot.robot.device.battery?.value} %`);
            await this.startSafeReturn();

            return;
        }

        this.cancelSafeReturn("home");
        if (status?.value === StatusStateAttribute.VALUE.IDLE) {
            Logger.warn("Return to the dock requested while stopped: the firmware will reload the map and relocalize");
        }

        Logger.info(`Return to the dock requested, battery ${this.robot.robot.device.battery?.value} %`);
        await this.robot.robot.home();
    }

    /**
     * @private
     */
    async startSafeReturn() {
        const agnoc = this.robot.robot;
        const startedAt = Date.now();
        let relocalizingSince = undefined;
        let finished = false;
        let timer = undefined;
        // Un 2108 anterior a la orden no cuenta
        let armed = agnoc.device.motaRawFaultCode !== CecotecBasicControlCapability.RELOCALIZING_EVENT;

        const finish = () => {
            finished = true;
            clearTimeout(timer);
            agnoc.off("updateDevice", onUpdate);
            if (this.safeReturn === handle) {
                this.safeReturn = undefined;
            }
        };
        const check = () => {
            if (finished) {
                return;
            }

            const value = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute)?.value;
            const elapsed = Date.now() - startedAt;

            // Error, otra pausa o ya en la base: no se manda nada a ciegas
            if (elapsed > CecotecBasicControlCapability.STATUS_GRACE_MS && !CecotecBasicControlCapability.RESUMED_STATES.includes(value)) {
                Logger.warn(`Safe return: cancelled, the robot is ${value}`);
                finish();

                return;
            }

            // Sin 2108 no se sabe si ha terminado de relocalizarse: mandarlo a casa podría acabar en un mapa
            // reiniciado. Se vuelve a pausar y se avisa
            if (relocalizingSince === undefined && elapsed >= CecotecBasicControlCapability.RELOCALIZING_TIMEOUT_MS) {
                finish();
                Logger.warn("Safe return: no relocalization seen, pausing the robot again instead of sending it home");
                this.robot.valetudoEventStore?.raise(new MotaSafeReturnValetudoEvent({}));
                agnoc.pause().catch(e => {
                    Logger.warn("Safe return: unable to pause the robot", e);
                });

                return;
            }

            const due = relocalizingSince !== undefined &&
                Date.now() - relocalizingSince >= CecotecBasicControlCapability.AFTER_RELOCALIZING_MS;

            if (due) {
                finish();
                Logger.info(`Safe return: sending the robot home ${Math.round(elapsed / 1000)} s after resuming`);
                agnoc.home().catch(e => {
                    Logger.warn("Safe return: unable to send the robot home", e);
                });
            } else {
                timer = setTimeout(check, CecotecBasicControlCapability.CHECK_INTERVAL_MS);
            }
        };
        const onUpdate = () => {
            const code = agnoc.device.motaRawFaultCode;

            if (code !== CecotecBasicControlCapability.RELOCALIZING_EVENT) {
                armed = true;
            } else if (armed && relocalizingSince === undefined) {
                relocalizingSince = Date.now();
                Logger.info("Safe return: relocalizing, waiting before sending the robot home");
            }
        };
        const handle = {
            cancel: () => {
                finish();
            }
        };

        this.safeReturn = handle;
        agnoc.on("updateDevice", onUpdate);

        try {
            await agnoc.start();
        } catch (e) {
            finish();

            throw e;
        }

        timer = setTimeout(check, CecotecBasicControlCapability.CHECK_INTERVAL_MS);
    }

    /**
     * @private
     * @param {string} reason
     */
    cancelSafeReturn(reason) {
        if (this.safeReturn) {
            Logger.info(`Safe return: cancelled by ${reason}`);
            this.safeReturn.cancel();
        }
    }
}

// Prueba A: el 2108 llega unos 3,5 s después de reanudar y la relocalización acaba a los 15–16 s
CecotecBasicControlCapability.RELOCALIZING_EVENT = 2108;
CecotecBasicControlCapability.AFTER_RELOCALIZING_MS = 30_000;
// Si en este tiempo desde la reanudación no llega el 2108, no se manda a casa
CecotecBasicControlCapability.RELOCALIZING_TIMEOUT_MS = 20_000;
// Tiempo para que el estado deje de ser "en pausa" tras la orden
CecotecBasicControlCapability.STATUS_GRACE_MS = 10_000;
CecotecBasicControlCapability.CHECK_INTERVAL_MS = 1_000;
// Modos de pausa del firmware (device-state.mapper de agnoc): 4 = AUTO_PAUSE
CecotecBasicControlCapability.PAUSED_WORK_MODES = [4, 9, 26, 31, 37];
CecotecBasicControlCapability.RESUMED_STATES = [StatusStateAttribute.VALUE.CLEANING, StatusStateAttribute.VALUE.MOVING];

module.exports = CecotecBasicControlCapability;
