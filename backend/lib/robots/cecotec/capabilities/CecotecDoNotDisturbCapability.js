const DoNotDisturbCapability = require("../../../core/capabilities/DoNotDisturbCapability");
const ValetudoDNDConfiguration = require("../../../entities/core/ValetudoDNDConfiguration");
const {DeviceQuietHours, DeviceTime} = require("@agnoc/core");

/**
 * Mota: Valetudo guarda el "no molestar" en UTC (la interfaz lo convierte a la hora del navegador),
 * pero el firmware lo evalúa con su reloj local (CST-8 en la 3090). Se convierte usando la zona
 * horaria del proceso, que el script de arranque fija a la del sistema (TZ=$(cat /etc/TZ)).
 *
 * @param {number} hour
 * @param {number} minute
 * @param {number} offsetMinutes minutos a sumar
 * @returns {{hour: number, minute: number}}
 */
function shiftTime(hour, minute, offsetMinutes) {
    const total = (((hour * 60 + minute + offsetMinutes) % 1440) + 1440) % 1440;

    return {hour: Math.floor(total / 60), minute: total % 60};
}

/**
 * @returns {number} minutos que la hora local del robot va por delante de UTC
 */
function getRobotUtcOffsetMinutes() {
    return -new Date().getTimezoneOffset();
}

/**
 * @extends DoNotDisturbCapability<import("../CecotecCongaRobot")>
 */
module.exports = class CecotecDoNotDisturbCapability extends DoNotDisturbCapability {

    /**
     * @returns {Promise<import("../../../entities/core/ValetudoDNDConfiguration")>}
     */
    async getDndConfiguration() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        const quietHours = await this.robot.robot.getQuietHours();
        const offset = -getRobotUtcOffsetMinutes();

        return new ValetudoDNDConfiguration({
            enabled: quietHours.isEnabled,
            start: shiftTime(quietHours.begin.hour, quietHours.begin.minute, offset),
            end: shiftTime(quietHours.end.hour, quietHours.end.minute, offset)
        });
    }

    /**
     * @param {import("../../../entities/core/ValetudoDNDConfiguration")} dndConfig
     * @returns {Promise<void>}
     */
    async setDndConfiguration(dndConfig) {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        const offset = getRobotUtcOffsetMinutes();

        await this.robot.robot.setQuietHours(new DeviceQuietHours({
            isEnabled: dndConfig.enabled,
            begin: new DeviceTime(shiftTime(dndConfig.start.hour, dndConfig.start.minute, offset)),
            end: new DeviceTime(shiftTime(dndConfig.end.hour, dndConfig.end.minute, offset)),
        }));
    }
};
