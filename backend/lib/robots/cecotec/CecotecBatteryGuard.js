const Logger = require("../../Logger");
const {StatusStateAttribute} = require("../../entities/state/attributes");

/**
 * Mota: "volver a la base al X %" y "reanudar al Y %". El firmware tiene su propio umbral (no se
 * puede bajar); esto permite volver antes y reanudar cuando la batería alcanza el nivel elegido.
 * Al reanudar se repite la última orden de limpieza (el modo elegido o las mismas zonas).
 * Los ajustes se guardan en robot.implementationSpecificConfig.motaBattery.
 */
class CecotecBatteryGuard {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     */
    constructor(options) {
        this.robot = options.robot;
        /** @type {{request: any} | undefined} limpieza interrumpida por batería, pendiente de reanudar */
        this.pendingResume = undefined;
        this.returningForBattery = false;
    }

    /**
     * @returns {{returnAt: number, resumeAt: number}} 0 = desactivado
     */
    getSettings() {
        const settings = this.robot.config.get("robot").implementationSpecificConfig?.motaBattery ?? {};

        return {
            returnAt: Number(settings.returnAt ?? 0),
            resumeAt: Number(settings.resumeAt ?? 0),
        };
    }

    /**
     * @param {{returnAt?: number, resumeAt?: number}} changes
     */
    setSettings(changes) {
        const robotConfig = this.robot.config.get("robot");
        const implementationSpecificConfig = Object.assign({}, robotConfig.implementationSpecificConfig);

        implementationSpecificConfig.motaBattery = Object.assign({}, this.getSettings(), changes);
        this.robot.config.set("robot", Object.assign({}, robotConfig, {implementationSpecificConfig: implementationSpecificConfig}));
    }

    /**
     * Se llama en cada actualización de estado del robot
     *
     * @param {number|undefined} batteryLevel
     * @param {string|undefined} status valor de StatusStateAttribute
     */
    onStateUpdate(batteryLevel, status) {
        if (batteryLevel === undefined || status === undefined) {
            return;
        }

        const {returnAt, resumeAt} = this.getSettings();

        if (status === StatusStateAttribute.VALUE.CLEANING) {
            if (this.returningForBattery === false && this.pendingResume !== undefined) {
                // Alguien ha empezado otra limpieza: se descarta la reanudación pendiente
                this.pendingResume = undefined;
            }

            if (returnAt > 0 && batteryLevel <= returnAt && this.returningForBattery === false) {
                Logger.info(`Battery at ${batteryLevel} % (limit ${returnAt} %): returning to the dock`);
                this.returningForBattery = true;
                this.pendingResume = {request: this.robot.lastCleaningRequest};
                this.robot.robot?.home().catch(err => {
                    Logger.warn("Unable to send the robot home for low battery", err);
                    this.returningForBattery = false;
                });
            }

            return;
        }

        if (status === StatusStateAttribute.VALUE.DOCKED) {
            this.returningForBattery = false;

            if (this.pendingResume !== undefined && resumeAt > 0 && batteryLevel >= resumeAt && !this.robot.isInDoNotDisturb()) {
                const {request} = this.pendingResume;

                this.pendingResume = undefined;
                Logger.info(`Battery at ${batteryLevel} % (resume at ${resumeAt} %): resuming the interrupted cleanup`);
                this.robot.repeatCleaningRequest(request).catch(err => {
                    Logger.warn("Unable to resume the cleanup after charging", err);
                });
            }
        }
    }
}

module.exports = CecotecBatteryGuard;
