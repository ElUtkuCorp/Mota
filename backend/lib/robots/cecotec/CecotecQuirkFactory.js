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
};

module.exports = CecotecQuirkFactory;
