const MapSegmentRenameCapability = require("../../../core/capabilities/MapSegmentRenameCapability");

/**
 * Mota: renombrar habitaciones virtuales
 *
 * @extends MapSegmentRenameCapability<import("../CecotecCongaRobot")>
 */
class CecotecMapSegmentRenameCapability extends MapSegmentRenameCapability {
    /**
     * @param {import("../../../entities/core/ValetudoMapSegment")} segment
     * @param {string} name
     */
    async renameSegment(segment, name) {
        this.robot.virtualRooms.rename(Number(segment.id), name);
        this.robot.refreshMap();
    }
}

module.exports = CecotecMapSegmentRenameCapability;
