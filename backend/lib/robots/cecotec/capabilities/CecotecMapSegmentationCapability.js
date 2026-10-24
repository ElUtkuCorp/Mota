const MapSegmentationCapability = require("../../../core/capabilities/MapSegmentationCapability");
const {Pixel} = require("@agnoc/core");

/**
 * Mota: limpieza por habitaciones virtuales. Cada habitación se cubre con rectángulos y se envía
 * como limpieza por zonas (máximo 10 zonas por orden en la 3090).
 *
 * @extends MapSegmentationCapability<import("../CecotecCongaRobot")>
 */
class CecotecMapSegmentationCapability extends MapSegmentationCapability {
    /**
     * @param {Array<import("../../../entities/core/ValetudoMapSegment")>} segments
     * @param {object} [options]
     * @returns {Promise<void>}
     */
    async executeSegmentAction(segments, options) {
        if (!this.robot.robot) {
            throw new Error("There is no robot connected to server");
        }

        const map = this.robot.robot.device.map;

        if (!map) {
            throw new Error("There is no map in connected robot");
        }

        const resolution = this.robot.getMapResolution(map);
        const maxRectsPerRoom = Math.max(1, Math.floor(CecotecMapSegmentationCapability.MAX_ZONES / segments.length));
        const offset = map.size.y;
        const toCoordinate = (x, y) => {
            return map.toCoordinate(new Pixel({x: x, y: offset - y}));
        };
        const areas = [];

        segments.forEach(segment => {
            this.robot.virtualRooms.getCleaningRects(Number(segment.id), maxRectsPerRoom, resolution).forEach(r => {
                areas.push([
                    toCoordinate(r.x0, r.y0),
                    toCoordinate(r.x0, r.y1),
                    toCoordinate(r.x1, r.y1),
                    toCoordinate(r.x1, r.y0),
                ]);
            });
        });

        if (areas.length === 0) {
            throw new Error("The selected rooms are empty");
        }

        // Mota: para poder reanudar tras cargar
        this.robot.lastCleaningRequest = {type: "segments", segments: segments};
        await this.robot.robot.cleanAreas(areas.slice(0, CecotecMapSegmentationCapability.MAX_ZONES));
    }
}

CecotecMapSegmentationCapability.MAX_ZONES = 10;

module.exports = CecotecMapSegmentationCapability;
