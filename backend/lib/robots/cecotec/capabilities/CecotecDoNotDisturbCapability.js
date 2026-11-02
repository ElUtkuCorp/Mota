const DoNotDisturbCapability = require("../../../core/capabilities/DoNotDisturbCapability");
const fs = require("fs");
const ValetudoDNDConfiguration = require("../../../entities/core/ValetudoDNDConfiguration");
const {DeviceQuietHours, DeviceTime} = require("@agnoc/core");

const DEVICE_CONFIG_PATH = "/mnt/UDISK/config/device_config.ini";
const DEFAULT_SYNC_TIME_DIFF_SECONDS = 7200;

/**
 * Mota: Valetudo guarda el "no molestar" en UTC (la interfaz lo convierte a la hora del navegador). El firmware lo
 * evalúa en UTC + sync_time_diff (CQuietHourControl::update), que no es la hora CST del sistema.
 *
 * @returns {number} minutos que la hora de "no molestar" del firmware va por delante de UTC
 */
function getQuietHoursUtcOffsetMinutes() {
    let seconds = DEFAULT_SYNC_TIME_DIFF_SECONDS;

    try {
        const match = /^sync_time_diff=(-?\d+)/m.exec(fs.readFileSync(DEVICE_CONFIG_PATH, "utf8"));

        if (match) {
            seconds = parseInt(match[1]);
        }
    } catch (e) {
        /* fuera del robot se usa el valor por defecto */
    }

    return Math.round(seconds / 60);
}

/**
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
        const offset = -getQuietHoursUtcOffsetMinutes();

        return new ValetudoDNDConfiguration({
            enabled: quietHours.isEnabled,
            start: shiftTime(quietHours.begin.hour, quietHours.begin.minute, offset),
            end: shiftTime(quietHours.end.hour, quietHours.end.minute, offset)
        });
    }

    /**
     * El firmware solo entiende periodos que cruzan su medianoche: comprueba "ahora >= inicio o ahora <= fin", así que
     * con el inicio antes que el fin siempre está en "no molestar" y no reanuda la limpieza ni lanza las programadas.
     * Con inicio o fin a las 00:00 aplica su periodo por defecto, 22:00–07:00.
     *
     * @param {import("../../../entities/core/ValetudoDNDConfiguration")} dndConfig
     * @returns {Promise<void>}
     */
    async setDndConfiguration(dndConfig) {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        const offset = getQuietHoursUtcOffsetMinutes();
        const begin = new DeviceTime(shiftTime(dndConfig.start.hour, dndConfig.start.minute, offset));
        const end = new DeviceTime(shiftTime(dndConfig.end.hour, dndConfig.end.minute, offset));

        if (dndConfig.enabled && (begin.toMinutes() <= end.toMinutes() || end.toMinutes() === 0)) {
            throw new Error("El firmware solo admite periodos de «No molestar» que crucen su medianoche");
        }

        await this.robot.robot.setQuietHours(new DeviceQuietHours({
            isEnabled: dndConfig.enabled,
            begin: begin,
            end: end,
        }));
    }
};
