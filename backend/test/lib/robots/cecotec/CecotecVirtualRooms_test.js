const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecVirtualRooms = require("../../../../lib/robots/cecotec/CecotecVirtualRooms");

const RESOLUTION = 0.05; // 5 cm por celda

/**
 * Dos habitaciones de 4 x 3 m (80 x 60 celdas) separadas por un tabique con una puerta de 80 cm
 */
function twoRoomsFloor() {
    const floor = [];

    for (let y = 10; y < 70; y++) {
        for (let x = 10; x < 171; x++) {
            const isWall = x === 90;
            const isDoor = y >= 32 && y < 48;

            if (!isWall || isDoor) {
                floor.push(x, y);
            }
        }
    }

    return floor;
}

describe("CecotecVirtualRooms", () => {
    it("splits a map at its doorways", () => {
        const rooms = CecotecVirtualRooms.SEGMENT(twoRoomsFloor(), 200, 100, RESOLUTION);

        assert.strictEqual(rooms.length, 2);
        rooms.forEach(pixels => {
            assert.ok(pixels.length > 4000, `room too small: ${pixels.length}`);
        });
    });

    it("joins, splits and renames rooms", () => {
        const rooms = new CecotecVirtualRooms({});

        rooms.segment(twoRoomsFloor(), 200, 100, RESOLUTION);
        assert.strictEqual(rooms.getRooms().length, 2);

        rooms.join(1, 2);
        assert.strictEqual(rooms.getRooms().length, 1);

        rooms.split(1, { x: 90, y: 0 }, { x: 90, y: 100 });
        assert.strictEqual(rooms.getRooms().length, 2);

        rooms.rename(2, "Cocina");
        assert.strictEqual(rooms.getRooms()[1].name, "Cocina");
    });

    it("covers a rectangular room with a single zone", () => {
        const pixels = [];
        for (let y = 0; y < 40; y++) {
            for (let x = 0; x < 60; x++) {
                pixels.push(y * 100 + x);
            }
        }

        const rects = CecotecVirtualRooms.COVER(pixels, 100, 10, RESOLUTION);

        assert.deepStrictEqual(rects, [{ x0: 0, y0: 0, x1: 59, y1: 39 }]);
    });

    it("covers an L-shaped room with few zones", () => {
        const pixels = [];
        for (let y = 0; y < 60; y++) {
            for (let x = 0; x < 60; x++) {
                if (x < 20 || y < 20) {
                    pixels.push(y * 100 + x);
                }
            }
        }

        const rects = CecotecVirtualRooms.COVER(pixels, 100, 10, RESOLUTION);

        assert.strictEqual(rects.length, 2);
    });
});
