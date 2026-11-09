const fs = require("fs");

const DEVICE_CONFIG_PATH = "/mnt/UDISK/config/device_config.ini";
const DEFAULT_SYNC_TIME_DIFF_SECONDS = 7200;

/**
 * Mota: el firmware evalúa sus horarios ("no molestar", programaciones) en UTC + sync_time_diff, que no es la hora CST
 * del sistema.
 *
 * @param {string} [configPath]
 * @returns {number} minutos que la hora del firmware va por delante de UTC
 */
function getFirmwareUtcOffsetMinutes(configPath = DEVICE_CONFIG_PATH) {
    let seconds = DEFAULT_SYNC_TIME_DIFF_SECONDS;

    try {
        const match = /^sync_time_diff=(-?\d+)/m.exec(fs.readFileSync(configPath, "utf8"));

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

module.exports = {
    getFirmwareUtcOffsetMinutes: getFirmwareUtcOffsetMinutes,
    shiftTime: shiftTime,
};
