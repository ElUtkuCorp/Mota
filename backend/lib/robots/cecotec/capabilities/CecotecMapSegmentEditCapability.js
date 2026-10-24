const MapSegmentEditCapability = require("../../../core/capabilities/MapSegmentEditCapability");

/**
 * Mota: unir y dividir habitaciones virtuales (el firmware de la 3090 no tiene habitaciones)
 *
 * @extends MapSegmentEditCapability<import("../CecotecCongaRobot")>
 */
class CecotecMapSegmentEditCapability extends MapSegmentEditCapability {
    /**
     * @param {import("../../../entities/core/ValetudoMapSegment")} segmentA
     * @param {import("../../../entities/core/ValetudoMapSegment")} segmentB
     * @returns {Promise<void>}
     */
    async joinSegments(segmentA, segmentB) {
        this.robot.virtualRooms.join(Number(segmentA.id), Number(segmentB.id));
        this.robot.refreshMap();
    }

    /**
     * @param {import("../../../entities/core/ValetudoMapSegment")} segment
     * @param {object} pA
     * @param {number} pA.x
     * @param {number} pA.y
     * @param {object} pB
     * @param {number} pB.x
     * @param {number} pB.y
     * @returns {Promise<void>}
     */
    async splitSegment(segment, pA, pB) {
        this.robot.virtualRooms.split(Number(segment.id), pA, pB);
        this.robot.refreshMap();
    }
}

module.exports = CecotecMapSegmentEditCapability;
