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

        // Mota: 0x1105 borra también el mapa guardado del firmware y no se puede deshacer. Si no queda versión, no se envía
        this.robot.saveMapBeforeReset();

        await this.robot.robot.resetMap();
        this.robot.onUserMapReset();
        await this.robot.robot.updateMap();
        this.robot.refreshMap();
    }
}

module.exports = CecotecMapResetCapability;
