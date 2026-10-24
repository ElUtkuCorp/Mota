const CecotecCleanPreference = require("./CecotecCleanPreference");
const Quirk = require("../../core/Quirk");

class CecotecQuirkFactory {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     */
    constructor(options) {
        this.robot = options.robot;
    }

    /**
     * @param {string} id
     */
    getQuirk(id) {
        switch (id) {
            case CecotecQuirkFactory.KNOWN_QUIRKS.RESUME_AFTER_CHARGE:
                return new Quirk({
                    id: id,
                    title: "Reanudar tras cargar",
                    description: "Si la batería se agota durante una limpieza, vuelve a la base, carga y continúa donde lo dejó. El firmware no reanuda durante las horas de No molestar.",
                    options: ["on", "off"],
                    getter: async () => {
                        return CecotecCleanPreference.GET(this.getAgnocRobot(), "cleanBroken") ? "on" : "off";
                    },
                    setter: async (value) => {
                        switch (value) {
                            case "on":
                                return CecotecCleanPreference.SET(this.getAgnocRobot(), "cleanBroken", true);
                            case "off":
                                return CecotecCleanPreference.SET(this.getAgnocRobot(), "cleanBroken", false);
                            default:
                                throw new Error(`Received invalid value ${value}`);
                        }
                    }
                });
            case CecotecQuirkFactory.KNOWN_QUIRKS.RETURN_AT_BATTERY:
                return new Quirk({
                    id: id,
                    title: "Volver a la base con batería al",
                    description: "Mota manda el robot a cargar al llegar a este nivel, antes que el propio firmware (que vuelve con su umbral, más bajo). Al cargar reanuda según el ajuste siguiente.",
                    options: ["off", "20", "30", "40", "50"],
                    getter: async () => {
                        const {returnAt} = this.robot.batteryGuard.getSettings();

                        return returnAt > 0 ? String(returnAt) : "off";
                    },
                    setter: async (value) => {
                        this.robot.batteryGuard.setSettings({returnAt: value === "off" ? 0 : Number(value)});
                    }
                });
            case CecotecQuirkFactory.KNOWN_QUIRKS.RESUME_AT_BATTERY:
                return new Quirk({
                    id: id,
                    title: "Reanudar la limpieza con batería al",
                    description: "Si Mota mandó el robot a cargar por batería, repite la última limpieza (mismo modo o mismas zonas) al alcanzar este nivel, salvo en horas de No molestar.",
                    options: ["off", "80", "90", "100"],
                    getter: async () => {
                        const {resumeAt} = this.robot.batteryGuard.getSettings();

                        return resumeAt > 0 ? String(resumeAt) : "off";
                    },
                    setter: async (value) => {
                        this.robot.batteryGuard.setSettings({resumeAt: value === "off" ? 0 : Number(value)});
                    }
                });
            default:
                throw new Error(`There's no quirk with id ${id}`);
        }
    }

    /**
     * @private
     * @returns {import("@agnoc/core").Robot}
     */
    getAgnocRobot() {
        const agnocRobot = this.robot.robot;

        if (!agnocRobot) {
            throw new Error("There is no robot connected to server");
        }

        return agnocRobot;
    }
}

CecotecQuirkFactory.KNOWN_QUIRKS = {
    RESUME_AFTER_CHARGE: "35d25e85-64fe-4ea2-9943-b6b2adb3dd16",
    RETURN_AT_BATTERY: "1746911f-2ba3-4d01-966d-f4dc658ad71f",
    RESUME_AT_BATTERY: "59c7a63b-da61-477e-80dc-bb8cf4fd744a",
};

module.exports = CecotecQuirkFactory;
