const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecCongaRobot = require("../../../../lib/robots/cecotec/CecotecCongaRobot");
const MapLayer = require("../../../../lib/entities/map/MapLayer");

const SIZE = 30;

/**
 * A square room from (6,6) to (23,23) surrounded by walls and split in two by a wall at x = 15
 */
function buildDeviceMap() {
    const grid = new Array(SIZE * (SIZE + 1)).fill(0);
    const set = (x, y, value) => {
        grid[(SIZE - y) * SIZE + x] = value;
    };

    for (let x = 5; x <= 24; x++) {
        for (let y = 5; y <= 24; y++) {
            const isWall = x === 5 || x === 24 || y === 5 || y === 24 || x === 15;

            set(x, y, isWall ? 255 : 1);
        }
    }

    const room = (id, name, pixels) => {
        return {
            id: { value: id },
            name: name,
            isEnabled: true,
            // agnoc reports room pixels with a flipped y axis
            pixels: pixels.map(([x, y]) => {
                return { x: x, y: SIZE - y };
            })
        };
    };

    return {
        size: { x: SIZE, y: SIZE },
        grid: grid,
        rooms: [
            room(1, "Salón", [[8, 10], [12, 20]]),
            room(2, "Cocina", [[18, 8], [20, 22]]),
            room(3, "Vacía", [])
        ]
    };
}

describe("CecotecCongaRobot", () => {
    const robot = Object.create(CecotecCongaRobot.prototype);

    it("extracts floor and wall pixels from the grid", () => {
        const { floor, walls } = robot.getMapPixels(buildDeviceMap());

        // 18x18 inner square minus the dividing wall column
        assert.strictEqual(floor.length / 2, 17 * 18);
        assert.strictEqual(walls.length / 2, 20 * 4 - 4 + 18);
    });

    it("flood-fills each room over the floor up to the walls", () => {
        const map = buildDeviceMap();
        const { floor, walls } = robot.getMapPixels(map);
        const segments = robot.getSegmentEntities(map, robot.mapArrayToMatrix(walls, floor));

        assert.strictEqual(segments.length, 2);

        const [salon, cocina] = segments;

        assert.ok(salon instanceof MapLayer);
        assert.strictEqual(salon.metaData.segmentId, "1");
        assert.strictEqual(salon.metaData.name, "Salón");
        assert.strictEqual(salon.dimensions.pixelCount, 9 * 18);
        assert.deepStrictEqual([salon.dimensions.x.min, salon.dimensions.x.max], [6, 14]);

        assert.strictEqual(cocina.metaData.segmentId, "2");
        assert.strictEqual(cocina.dimensions.pixelCount, 8 * 18);
        assert.deepStrictEqual([cocina.dimensions.x.min, cocina.dimensions.x.max], [16, 23]);

        // Sorted input keeps the RLE compression at one block per row
        assert.strictEqual(salon.compressedPixels.length / 3, 18);
    });

    it("builds no layer for empty pixel lists", () => {
        assert.strictEqual(robot.buildMapLayer(MapLayer.TYPE.FLOOR, []), null);
        assert.deepStrictEqual(robot.mapArrayToMatrix([], []), []);
    });
});
