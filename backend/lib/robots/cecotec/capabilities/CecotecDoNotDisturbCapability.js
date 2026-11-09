const DoNotDisturbCapability = require("../../../core/capabilities/DoNotDisturbCapability");
const ValetudoDNDConfiguration = require("../../../entities/core/ValetudoDNDConfiguration");
const {DeviceQuietHours, DeviceTime} = require("@agnoc/core");
// Mota: Valetudo guarda el "no molestar" en UTC (la interfaz lo convierte a la hora del navegador). El firmware lo
// evalúa en UTC + sync_time_diff (CQuietHourControl::update)
const {getFirmwareUtcOffsetMinutes, shiftTime} = require("../CecotecFirmwareTime");

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
        const offset = -getFirmwareUtcOffsetMinutes();

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

        const offset = getFirmwareUtcOffsetMinutes();
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
