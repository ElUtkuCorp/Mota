const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecMapSegmentationCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecMapSegmentationCapability");
const CecotecVirtualRooms = require("../../../../lib/robots/cecotec/CecotecVirtualRooms");
const { DeviceMap } = require("@agnoc/core");
const { PolygonMapEntity } = require("../../../../lib/entities/map");

const RESOLUTION = 0.05; // 5 cm por celda
const WIDTH = 200;

/**
 * Forma de la cocina real (2026-11-16) con la que el robot giró sin parar en franjas de 25 cm:
 * '#' cocina, 'o' otra habitación, '.' nada. 71 x 31 celdas (355 x 155 cm).
 */
const KITCHEN = [
    "oooo.................................................................##",
    ".....................................................................##",
    "....................................................................###",
    ".......................................###########................#####",
    "............................######################.......##############",
    "..................#####################################################",
    "........###############################################################",
    ".#####.################################################################",
    ".######################################################################",
    ".######################################################################",
    ".######################################################################",
    "#######################################################################",
    "#######################################################################",
    "#######################################################################",
    "#######################################################################",
    "#######################################################################",
    "#####################################################################.#",
    "##################################################################....#",
    "#######################################################...............o",
    "#######################################################...............o",
    "#######################################################...............o",
    ".######################################################...............o",
    ".....##################################################...............o",
    "......#################################################...............o",
    "......############################################....................o",
    "......######################################..........................o",
    "......#####################################...........................o",
    "......##################.#####.############............................",
    "......##############............###....................................",
    "......#############....................................................",
    "......##########.......................................................",
];

/**
 * @param {number} ox
 * @param {number} oy
 * @returns {{kitchen: Array<number>, other: Array<number>}}
 */
function kitchenCells(ox, oy) {
    const kitchen = [];
    const other = [];

    KITCHEN.forEach((row, y) => {
        [...row].forEach((c, x) => {
            const cell = (oy + y) * WIDTH + ox + x;

            if (c === "#") {
                kitchen.push(cell);
            } else if (c === "o") {
                other.push(cell);
            }
        });
    });

    return { kitchen: kitchen, other: other };
}

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} w
 * @param {number} h
 * @returns {Array<number>}
 */
function rectCells(x0, y0, w, h) {
    const cells = [];

    for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
            cells.push(y * WIDTH + x);
        }
    }

    return cells;
}

/**
 * @param {Array<number>} pixels
 * @param {Array<{x0: number, y0: number, x1: number, y1: number}>} rects
 * @returns {number} parte de las celdas cubiertas por alguna zona
 */
function coverage(pixels, rects) {
    return pixels.filter(cell => {
        const x = cell % WIDTH;
        const y = Math.floor(cell / WIDTH);

        return rects.some(r => {
            return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
        });
    }).length / pixels.length;
}

/**
 * @param {Array<{x0: number, y0: number, x1: number, y1: number}>} rects
 */
function assertNoNarrowZone(rects) {
    const minCells = Math.ceil(CecotecVirtualRooms.MIN_ZONE_SIDE / RESOLUTION);

    rects.forEach(r => {
        assert.ok(r.x1 - r.x0 + 1 >= minCells && r.y1 - r.y0 + 1 >= minCells, `zona estrecha: ${JSON.stringify(r)}`);
    });
}

/**
 * Cocina, una habitación vecina (con las celdas 'o' del dibujo) y otras grandes
 *
 * @returns {CecotecVirtualRooms}
 */
function buildRooms() {
    const { kitchen, other } = kitchenCells(10, 10);
    const rooms = new CecotecVirtualRooms({});

    rooms.data = {
        width: WIDTH,
        rooms: [
            { id: 13, name: "Cocina", pixels: kitchen },
            // Pasillo: las celdas que asoman en el envolvente de la cocina y un tramo largo
            { id: 14, name: "Pasillo", pixels: other.concat(rectCells(90, 10, 30, 100)) },
            // Salón con forma de U (necesita varias zonas)
            { id: 1, name: "Salón", pixels: rectCells(10, 60, 70, 30).concat(rectCells(10, 90, 20, 60), rectCells(60, 90, 20, 60)) },
            { id: 5, name: "Dormitorio", pixels: rectCells(130, 10, 40, 60).concat(rectCells(130, 70, 60, 10), rectCells(170, 10, 10, 40)) },
        ],
    };

    return rooms;
}

/**
 * Mapa de 200 x 200 celdas de 5 cm, de -5 a 5 m, con la conversión real de agnoc
 *
 * @returns {DeviceMap}
 */
function buildMap() {
    return Object.create(DeviceMap.prototype, {
        size: { value: { x: WIDTH, y: WIDTH } },
        min: { value: { x: -5, y: -5 } },
        max: { value: { x: 5, y: 5 } },
    });
}

describe("Mota: zonas de la limpieza por habitaciones", () => {
    it("COVER no deja zonas más estrechas que el robot en la cocina y cubre lo mismo o más", () => {
        const { kitchen } = kitchenCells(10, 10);
        const rects = CecotecVirtualRooms.COVER(kitchen, WIDTH, 10, RESOLUTION);

        assertNoNarrowZone(rects);
        // Antes: 5 zonas, tres de 25 cm de lado, con un 92,4 % de la cocina cubierta
        assert.ok(coverage(kitchen, rects) >= 1347 / 1458, `cobertura ${coverage(kitchen, rects)}`);
        assert.ok(rects.length <= 10);
    });

    it("COVER descarta una franja de 25 cm que no se puede ampliar", () => {
        const pixels = rectCells(10, 10, 60, 40).concat(rectCells(70, 20, 30, 5));
        const rects = CecotecVirtualRooms.COVER(pixels, WIDTH, 10, RESOLUTION);

        assertNoNarrowZone(rects);
        assert.deepStrictEqual(rects, [{ x0: 10, y0: 10, x1: 69, y1: 49 }]);
    });

    it("COVER amplía una franja estrecha hacia el suelo de la habitación ya cubierto", () => {
        // Rectángulo de 60 x 40 celdas y una franja de 30 x 5 pegada abajo que solo cabe con su vecina
        const pixels = rectCells(10, 10, 60, 40).concat(rectCells(10, 50, 30, 5));
        const rects = CecotecVirtualRooms.COVER(pixels, WIDTH, 10, RESOLUTION);

        assertNoNarrowZone(rects);
        assert.strictEqual(coverage(pixels, rects), 1);
        assert.deepStrictEqual(rects[1], { x0: 10, y0: 45, x1: 39, y1: 54 });
    });

    it("la cocina se limpia con una sola zona: su rectángulo envolvente", () => {
        const rooms = buildRooms();
        const rects = rooms.getCleaningRects(13, 10, RESOLUTION, []);

        assert.deepStrictEqual(rects, [{ x0: 10, y0: 10, x1: 80, y1: 40 }]);
        assert.strictEqual(coverage(rooms.data.rooms[0].pixels, rects), 1);
    });

    it("no usa una sola zona si toca una zona prohibida o invade otra habitación", () => {
        const rooms = buildRooms();
        const kitchen = rooms.data.rooms[0].pixels;

        let rects = rooms.getCleaningRects(13, 10, RESOLUTION, [{ x0: 75, y0: 35, x1: 85, y1: 45 }]);
        assert.ok(rects.length > 1);
        assertNoNarrowZone(rects);

        // Con el 5 % de las celdas de la cocina dentro del envolvente siendo de otra habitación
        const extra = kitchen.length * 0.05;
        const { other } = kitchenCells(10, 10);
        rooms.data.rooms[1].pixels = other.concat(rectCells(66, 31, 15, Math.ceil(extra / 15)).filter(c => {
            return !kitchen.includes(c);
        }), rectCells(90, 10, 30, 100));
        rects = rooms.getCleaningRects(13, 10, RESOLUTION, []);
        assert.ok(rects.length > 1);
        assertNoNarrowZone(rects);
    });

    it("una habitación grande no se manda como una sola zona", () => {
        const pixels = rectCells(0, 0, 80, 70); // 4 x 3,5 m = 14 m²

        assert.strictEqual(CecotecVirtualRooms.SINGLE_ZONE(pixels, WIDTH, RESOLUTION, () => {
            return false;
        }, []), undefined);
    });

    it("con varias habitaciones respeta el límite de 10 zonas y ninguna es estrecha", async () => {
        const rooms = buildRooms();
        const sent = [];
        const logged = [];
        const map = buildMap();
        const capability = new CecotecMapSegmentationCapability({
            robot: {
                robot: {
                    device: { map: map },
                    cleanAreas: async (areas) => {
                        sent.push(areas);
                    },
                },
                virtualRooms: rooms,
                getMapResolution: () => {
                    return RESOLUTION;
                },
                getRestrictedZoneEntities: () => {
                    return [];
                },
            },
        });
        const Logger = require("../../../../lib/Logger");
        const info = Logger.info;
        Logger.info = (msg) => {
            logged.push(msg);
        };

        try {
            for (const ids of [[13, 14], [13, 14, 1], [13, 14, 1, 5]]) {
                await capability.executeSegmentAction(ids.map(id => {
                    return { id: String(id) };
                }));
                const areas = sent[sent.length - 1];
                const maxPerRoom = Math.floor(10 / ids.length);

                assert.ok(areas.length <= 10);
                ids.forEach(id => {
                    assert.ok(rooms.getCleaningRects(id, maxPerRoom, RESOLUTION, []).length <= maxPerRoom);
                });
                areas.forEach(a => {
                    const w = Math.abs(a[2].x - a[0].x);
                    const h = Math.abs(a[1].y - a[0].y);

                    assert.ok(w >= CecotecVirtualRooms.MIN_ZONE_SIDE - 1e-9 && h >= CecotecVirtualRooms.MIN_ZONE_SIDE - 1e-9, `zona de ${w} x ${h} m`);
                });
                assert.match(logged[logged.length - 1], new RegExp(`^Room cleaning: rooms 13 "Cocina".*; ${areas.length} zones \\(cm\\): `));
            }
        } finally {
            Logger.info = info;
        }
    });

    it("la zona enviada abarca las celdas enteras (sin perder un píxel por eje)", async () => {
        const rooms = new CecotecVirtualRooms({});
        rooms.data = { width: WIDTH, rooms: [{ id: 1, name: "A", pixels: rectCells(20, 30, 10, 10) }] };
        let sent;
        const map = buildMap();
        const capability = new CecotecMapSegmentationCapability({
            robot: {
                robot: { device: { map: map }, cleanAreas: async (areas) => {
                    sent = areas;
                } },
                virtualRooms: rooms,
                getMapResolution: () => {
                    return RESOLUTION;
                },
                getRestrictedZoneEntities: () => {
                    return [new PolygonMapEntity({ type: PolygonMapEntity.TYPE.NO_GO_AREA, points: [100, 100, 110, 100, 110, 110, 100, 110] })];
                },
            },
        });

        await capability.executeSegmentAction([{ id: "1" }]);

        const [area] = sent;
        const xs = area.map(c => {
            return c.x;
        });
        const ys = area.map(c => {
            return c.y;
        });

        assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 0.5) < 1e-9);
        assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 0.5) < 1e-9);
        // Cada esquina cae en el borde de la celda de la habitación que le toca (convención de toPixel)
        const inside = map.toPixel({ x: Math.min(...xs) + 0.01, y: Math.max(...ys) - 0.01 });
        assert.deepStrictEqual({ x: inside.x, y: WIDTH - inside.y }, { x: 20, y: 30 });
        const corner = map.toPixel({ x: Math.max(...xs) - 0.01, y: Math.min(...ys) + 0.01 });
        assert.deepStrictEqual({ x: corner.x, y: WIDTH - corner.y }, { x: 29, y: 39 });
    });

    it("convierte las zonas prohibidas del mapa en rectángulos de celdas", () => {
        const rects = CecotecMapSegmentationCapability.NO_GO_RECTS([
            new PolygonMapEntity({ type: PolygonMapEntity.TYPE.NO_GO_AREA, points: [10, 20, 30, 20, 30, 40, 10, 40] }),
            new PolygonMapEntity({ type: PolygonMapEntity.TYPE.ACTIVE_ZONE, points: [0, 0, 5, 0, 5, 5, 0, 5] }),
        ]);

        assert.deepStrictEqual(rects, [{ x0: 10, y0: 20, x1: 30, y1: 40 }]);
    });
});
