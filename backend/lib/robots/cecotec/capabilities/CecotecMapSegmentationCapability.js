const Logger = require("../../../Logger");
const MapSegmentationCapability = require("../../../core/capabilities/MapSegmentationCapability");
const {Pixel} = require("@agnoc/core");
const {PolygonMapEntity} = require("../../../entities/map");

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
        // Mota: la celda (x, y) de Mota es el píxel del firmware (x, offset - y), que abarca de x a x + 1 y
        // de offset - y a offset - y + 1 (toCoordinate da la esquina inferior del píxel). Para que la zona
        // incluya las celdas enteras, el borde derecho va en x1 + 1 y el superior en offset - y0 + 1; antes
        // se perdía una celda por cada eje y una franja de 25 cm se enviaba de 20.
        const toCoordinate = (x, firmwareY) => {
            return map.toCoordinate(new Pixel({x: x, y: firmwareY}));
        };
        const forbidden = CecotecMapSegmentationCapability.NO_GO_RECTS(this.robot.getRestrictedZoneEntities(map));
        const areas = [];
        const sizes = [];

        segments.forEach(segment => {
            this.robot.virtualRooms.getCleaningRects(Number(segment.id), maxRectsPerRoom, resolution, forbidden).forEach(r => {
                const left = r.x0;
                const right = r.x1 + 1;
                const bottom = offset - r.y1;
                const top = offset - r.y0 + 1;

                areas.push([
                    toCoordinate(left, top),
                    toCoordinate(left, bottom),
                    toCoordinate(right, bottom),
                    toCoordinate(right, top),
                ]);
                sizes.push(`${Math.round((r.x1 - r.x0 + 1) * resolution * 100)}x${Math.round((r.y1 - r.y0 + 1) * resolution * 100)}`);
            });
        });

        const sent = areas.slice(0, CecotecMapSegmentationCapability.MAX_ZONES);
        const names = segments.map(segment => {
            const room = this.robot.virtualRooms.getRooms().find(r => {
                return r.id === Number(segment.id);
            });

            return room ? `${room.id} "${room.name}"` : String(segment.id);
        });

        Logger.info(`Room cleaning: rooms ${names.join(", ")}; ${sent.length} zones (cm): ${sizes.slice(0, sent.length).join(", ")}`);

        if (sent.length === 0) {
            throw new Error("The selected rooms are empty");
        }

        await this.robot.robot.cleanAreas(sent);
    }

    /**
     * @param {Array<any>} entities entidades de restricciones del mapa de Mota
     * @returns {Array<{x0: number, y0: number, x1: number, y1: number}>} zonas prohibidas en celdas
     */
    static NO_GO_RECTS(entities) {
        return entities.filter(e => {
            return e instanceof PolygonMapEntity && e.type === PolygonMapEntity.TYPE.NO_GO_AREA;
        }).map(e => {
            const xs = e.points.filter((_, i) => {
                return i % 2 === 0;
            });
            const ys = e.points.filter((_, i) => {
                return i % 2 === 1;
            });

            return {x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys)};
        });
    }

    /**
     * Mota: las habitaciones se envían en el orden en que el usuario las selecciona. [H] El firmware
     * recorre las zonas en el orden recibido.
     *
     * @returns {import("../../../core/capabilities/MapSegmentationCapability").MapSegmentationCapabilityProperties}
     */
    getProperties() {
        return {
            iterationCount: {
                min: 1,
                max: 1
            },
            customOrderSupport: true
        };
    }
}

CecotecMapSegmentationCapability.MAX_ZONES = 10;

module.exports = CecotecMapSegmentationCapability;
