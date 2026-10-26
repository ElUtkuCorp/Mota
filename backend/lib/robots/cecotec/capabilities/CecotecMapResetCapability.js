const MapResetCapability = require("../../../core/capabilities/MapResetCapability");

/**
 * @extends MapResetCapability<import("../CecotecCongaRobot")>
 */
class CecotecMapResetCapability extends MapResetCapability {
    /**
     * @returns {Promise<void>}
     */
    async reset() {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        // Mota: antes de borrar, el mapa queda guardado como versión (por si se borró sin querer)
        this.robot.onUserMapReset();

        await this.robot.robot.resetMap();
        await this.robot.robot.updateMap();
    }
}

module.exports = CecotecMapResetCapability;
