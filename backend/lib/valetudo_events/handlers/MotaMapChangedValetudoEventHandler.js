const ValetudoEventHandler = require("./ValetudoEventHandler");

class MotaMapChangedValetudoEventHandler extends ValetudoEventHandler {
    /**
     * yes = aceptar el mapa nuevo como referencia; no = conservar la referencia anterior
     *
     * @param {ValetudoEventHandler.INTERACTIONS} interaction
     * @returns {Promise<boolean>}
     */
    async interact(interaction) {
        // @ts-ignore: solo existe en el controlador de la Conga
        const mapGuard = this.robot.mapGuard;

        if (!mapGuard) {
            throw new Error("Robot has no map guard");
        }

        if (interaction === ValetudoEventHandler.INTERACTIONS.YES) {
            mapGuard.resolve(true);
        } else if (interaction === ValetudoEventHandler.INTERACTIONS.NO) {
            mapGuard.resolve(false);
        } else {
            throw new Error("Invalid Interaction");
        }

        return true;
    }
}

module.exports = MotaMapChangedValetudoEventHandler;
