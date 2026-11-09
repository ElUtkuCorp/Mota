const BasicControlCapability = require("../../core/capabilities/BasicControlCapability");
const Logger = require("../../Logger");
const MotaEscapeReturnValetudoEvent = require("../../valetudo_events/events/MotaEscapeReturnValetudoEvent");
const {StatusStateAttribute} = require("../../entities/state/attributes");

/**
 * Mota: con el fallo 514 (escape_failed) el firmware se queda parado donde está y no vuelve a la base. Si queda
 * batería, Mota lo manda volver una sola vez y avisa. No hay reintentos: si vuelve a fallar, solo avisa. Se rearma al
 * llegar a la base.
 *
 * La orden pasa por la vuelta segura (CecotecBasicControlCapability.home): en pausa reanuda y espera a la
 * relocalización; parado manda a casa directamente.
 */
class CecotecEscapeReturn {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     */
    constructor(options) {
        this.robot = options.robot;
        /** Ya se mandó volver tras un 514 y el robot aún no ha llegado a la base */
        this.used = false;
        /** El último código visto no era 514: un 514 nuevo cuenta */
        this.armed = true;
        this.timer = undefined;
    }

    /**
     * @param {import("../../entities/state/attributes/StatusStateAttribute")} newStatus
     */
    onDeviceUpdate(newStatus) {
        const code = this.robot.robot?.device.motaRawFaultCode;

        if (newStatus.value === StatusStateAttribute.VALUE.DOCKED) {
            this.used = false;
        }

        if (code !== CecotecEscapeReturn.ESCAPE_FAILED_CODE) {
            this.armed = true;

            return;
        }

        if (!this.armed) {
            return;
        }
        this.armed = false;

        clearTimeout(this.timer);
        // Se deja que el firmware asiente el estado tras el fallo antes de decidir
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.act().catch(e => {
                Logger.warn("Escape return: unable to send the robot home", e);
            });
        }, CecotecEscapeReturn.SETTLE_MS);
    }

    /**
     * @private
     */
    async act() {
        const agnoc = this.robot.robot;
        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute)?.value;
        const battery = agnoc?.device.battery?.value;

        if (!agnoc || agnoc.device.motaRawFaultCode !== CecotecEscapeReturn.ESCAPE_FAILED_CODE) {
            return;
        }
        if (CecotecEscapeReturn.IGNORED_STATES.includes(status)) {
            return;
        }

        let reason = undefined;
        if (this.used) {
            reason = "already_tried";
        } else if (typeof battery !== "number" || battery < CecotecEscapeReturn.MIN_BATTERY) {
            reason = "low_battery";
        }

        if (reason) {
            Logger.warn(`Escape return: stuck (514), not sending the robot home (${reason}, battery ${battery} %)`);
            this.raise({sent: false, reason: reason, battery: battery});

            return;
        }

        const capability = this.robot.capabilities[BasicControlCapability.TYPE];
        if (!capability) {
            return;
        }

        this.used = true;
        Logger.info(`Escape return: stuck (514) with battery ${battery} %, sending the robot home once`);
        this.raise({sent: true, battery: battery});
        await capability.home();
    }

    /**
     * @private
     * @param {object} metaData
     */
    raise(metaData) {
        try {
            this.robot.valetudoEventStore?.raise(new MotaEscapeReturnValetudoEvent({metaData: metaData}));
        } catch (e) {
            Logger.warn("Escape return: unable to raise the event", e);
        }
    }

    shutdown() {
        clearTimeout(this.timer);
        this.timer = undefined;
    }
}

CecotecEscapeReturn.ESCAPE_FAILED_CODE = 514;
CecotecEscapeReturn.MIN_BATTERY = 20;
CecotecEscapeReturn.SETTLE_MS = 5_000;
// Ya en la base, volviendo o limpiando otra vez: no hace falta
CecotecEscapeReturn.IGNORED_STATES = [
    StatusStateAttribute.VALUE.DOCKED,
    StatusStateAttribute.VALUE.RETURNING,
    StatusStateAttribute.VALUE.CLEANING,
    StatusStateAttribute.VALUE.MOVING,
    StatusStateAttribute.VALUE.MANUAL_CONTROL
];

module.exports = CecotecEscapeReturn;
