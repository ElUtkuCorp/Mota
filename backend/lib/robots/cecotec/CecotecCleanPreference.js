/**
 * Mota: preferencias de limpieza del firmware 3irobotix (USER_SET_DEVICE_CLEANPREFERENCE_REQ).
 * El firmware acepta actualizaciones parciales: solo cambia los campos enviados.
 * agnoc 0.17.2 no tiene setters para repeatClean ni cleanBroken, así que se envían aquí y se
 * actualiza la copia local de la configuración hasta que el robot envíe la siguiente.
 */
class CecotecCleanPreference {
    /**
     * @param {import("@agnoc/core").Robot} agnocRobot
     * @param {"repeatClean"|"cleanBroken"} field
     * @returns {boolean}
     */
    static GET(agnocRobot, field) {
        const config = agnocRobot.device.config;

        switch (field) {
            case "repeatClean":
                return config?.isRepeatCleanEnabled === true;
            case "cleanBroken":
                return config?.isBrokenCleanEnabled === true;
        }
    }

    /**
     * @param {import("@agnoc/core").Robot} agnocRobot
     * @param {"repeatClean"|"cleanBroken"} field
     * @param {boolean} enabled
     * @returns {Promise<void>}
     */
    static async SET(agnocRobot, field, enabled) {
        await agnocRobot.sendRecv("USER_SET_DEVICE_CLEANPREFERENCE_REQ", "USER_SET_DEVICE_CLEANPREFERENCE_RSP", {
            [field]: enabled
        });

        // @ts-ignore: agnoc no expone setters de estos campos; se actualiza la copia local como hace con carpetTurbo
        const props = agnocRobot.device.config?.props;
        if (props) {
            props[field === "repeatClean" ? "isRepeatCleanEnabled" : "isBrokenCleanEnabled"] = enabled;
        }
    }
}

module.exports = CecotecCleanPreference;
