const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it } = require("node:test");

const CecotecCombinedVirtualRestrictionsCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecCombinedVirtualRestrictionsCapability");
const CecotecCongaRobot = require("../../../../lib/robots/cecotec/CecotecCongaRobot");
const CecotecMapVersions = require("../../../../lib/robots/cecotec/CecotecMapVersions");

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @returns {Array<number>} pares x, y planos del rectángulo (extremos incluidos)
 */
function rect(x0, y0, x1, y1) {
    const result = [];

    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            result.push(x, y);
        }
    }

    return result;
}

describe("Mota: zonas prohibidas", () => {
    const buildMap = (coordinates) => {
        return {
            size: { x: 800, y: 800 },
            min: { x: -20, y: -20 },
            max: { x: 20, y: 20 },
            restrictedZones: [{ coordinates: coordinates }]
        };
    };

    it("no pierde un píxel cuando la coordenada llega como float", () => {
        const map = buildMap([
            { x: Math.fround(326 / 800 * 40 - 20), y: Math.fround(406 / 800 * 40 - 20) },
            { x: Math.fround(326 / 800 * 40 - 20), y: Math.fround(400 / 800 * 40 - 20) },
            { x: Math.fround(381 / 800 * 40 - 20), y: Math.fround(400 / 800 * 40 - 20) },
            { x: Math.fround(381 / 800 * 40 - 20), y: Math.fround(406 / 800 * 40 - 20) }
        ]);
        const [zone] = CecotecCongaRobot.prototype.getRestrictedZoneEntities(map);

        assert.deepStrictEqual(zone.points, [326, 394, 381, 394, 381, 400, 326, 400]);
    });

    it("vuelve a consultar las zonas después de guardarlas", async () => {
        const calls = [];
        const capability = Object.create(CecotecCombinedVirtualRestrictionsCapability.prototype);
        const delay = CecotecCombinedVirtualRestrictionsCapability.REFRESH_DELAY_MS;

        capability.robot = {
            robot: {
                device: { map: { size: { x: 800, y: 800 }, toCoordinate: (pixel) => pixel } },
                setRestrictedZones: async () => {
                    calls.push("set");
                },
                updateMap: async () => {
                    calls.push("update");
                }
            }
        };
        CecotecCombinedVirtualRestrictionsCapability.REFRESH_DELAY_MS = 0;

        try {
            await capability.setVirtualRestrictions({ virtualWalls: [], restrictedZones: [] });
        } finally {
            CecotecCombinedVirtualRestrictionsCapability.REFRESH_DELAY_MS = delay;
        }

        assert.deepStrictEqual(calls, ["set", "update"]);
    });
});

describe("Mota: recorrido en tramos", () => {
    it("parte el recorrido en los saltos y descarta los tramos de un solo punto", () => {
        const points = [
            0, 0, // la base: luego salta a la zona
            50, 50, 51, 50, 52, 51, 53, 51,
            90, 10, // otro salto (relocalización)
            91, 10, 92, 11
        ];

        assert.deepStrictEqual(CecotecCongaRobot.SPLIT_PATH(points, 10), [
            [50, 50, 51, 50, 52, 51, 53, 51],
            [90, 10, 91, 10, 92, 11]
        ]);
    });

    it("deja el recorrido entero si no hay saltos", () => {
        assert.deepStrictEqual(CecotecCongaRobot.SPLIT_PATH([1, 1, 2, 2, 3, 3], 10), [[1, 1, 2, 2, 3, 3]]);
        assert.deepStrictEqual(CecotecCongaRobot.SPLIT_PATH([], 10), []);
    });
});

describe("Mota: zonas de espejo como pared", () => {
    // La casa (0..19, 0..9), la zona de espejo en x = 20..21 y el reflejo detrás (22..34)
    const mirror = { x0: 20, y0: 0, x1: 21, y1: 9 };
    const house = rect(0, 0, 19, 9);
    const reflection = rect(22, 0, 34, 9);
    // Una isla suelta lejos del espejo (bajo un mueble): no se toca
    const island = rect(0, 15, 2, 17);

    it("oculta el suelo que solo se alcanza cruzando el espejo y deja el resto", () => {
        const { floor } = CecotecCongaRobot.HIDE_BEHIND_MIRRORS(
            [...house, ...reflection, ...island],
            [],
            [mirror],
            { x: 1, y: 1 }
        );

        assert.strictEqual(floor.length / 2, (house.length + island.length) / 2);
    });

    it("quita las paredes del reflejo pero no las de la casa", () => {
        const walls = [...rect(-1, 0, -1, 9), ...rect(35, 0, 35, 9)];
        const result = CecotecCongaRobot.HIDE_BEHIND_MIRRORS([...house, ...reflection], walls, [mirror], { x: 1, y: 1 });

        assert.deepStrictEqual(result.walls, rect(-1, 0, -1, 9));
    });

    it("sin la posición de la base no oculta nada", () => {
        const floor = [...house, ...reflection];

        assert.strictEqual(CecotecCongaRobot.HIDE_BEHIND_MIRRORS(floor, [], [mirror], undefined).floor.length, floor.length);
    });
});

describe("Mota: versiones del mapa", () => {
    const build = (threshold) => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-versiones-"));
        let robotConfig = { implementationSpecificConfig: { motaMapVersions: { threshold: threshold } } };
        const imported = [];
        const robot = {
            config: {
                get: () => {
                    return robotConfig;
                },
                set: (key, value) => {
                    robotConfig = value;
                }
            },
            virtualRooms: {
                importData: (data) => {
                    imported.push(data);
                }
            }
        };

        return { versions: new CecotecMapVersions({ robot: robot, directory: directory }), imported: imported };
    };
    const snapshot = (floor, createdAt) => {
        return {
            createdAt: createdAt,
            width: 100,
            floor: floor,
            map: { layers: [], entities: [] },
            rooms: { width: 100, rooms: [{ id: 1, name: "Salón", pixels: [1, 2, 3] }] }
        };
    };
    const cells = (from, to) => {
        const result = [];

        for (let i = from; i < to; i++) {
            result.push(i);
        }

        return result;
    };

    it("guarda la primera foto y luego solo cuando el mapa cambia mucho", () => {
        const { versions } = build(85);

        versions.onCleaningStarted(snapshot(cells(0, 1000), 1000000));
        assert.strictEqual(versions.list().length, 1);
        assert.strictEqual(versions.list()[0].reason, "first");

        // Casi igual: no se guarda nada
        versions.onCleaningFinished({ width: 100, floor: cells(0, 1010) });
        versions.onCleaningStarted(snapshot(cells(0, 1010), 2000000));
        assert.strictEqual(versions.list().length, 1);

        // El firmware perdió medio mapa: se guarda el de antes
        versions.onCleaningFinished({ width: 100, floor: cells(0, 500) });
        const list = versions.list();
        assert.strictEqual(list.length, 2);
        assert.strictEqual(list[0].reason, "changed");
        assert.strictEqual(list[0].floorCells, 1010);
        assert.strictEqual(list[0].similarity, 50);
        assert.deepStrictEqual(versions.get(list[0].id).map, { layers: [], entities: [] });
    });

    it("recupera las habitaciones de una versión y la puede borrar", () => {
        const { versions, imported } = build(85);
        const info = versions.saveManual(snapshot(cells(0, 10), 3000000));

        versions.restoreRooms(info.id);
        assert.strictEqual(imported[0].rooms[0].name, "Salón");

        versions.delete(info.id);
        assert.strictEqual(versions.list().length, 0);
    });

    it("con el umbral a 0 no guarda versiones", () => {
        const { versions } = build(0);

        versions.onCleaningStarted(snapshot(cells(0, 1000), 1000000));
        versions.onCleaningFinished({ width: 100, floor: cells(0, 10) });
        assert.strictEqual(versions.list().length, 0);
    });
});

describe("Mota: borrar el mapa", () => {
    it("guarda el mapa como versión y borra habitaciones y espejos", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const calls = [];

        Object.defineProperty(robot, "robot", { value: { device: { map: {} } } });
        robot.getMapSnapshot = () => {
            return { createdAt: 1, width: 10, floor: [1, 2, 3], map: null, rooms: { width: 10, rooms: [] } };
        };
        robot.mapVersions = {
            saveBeforeReset: (snapshot) => {
                calls.push(["version", snapshot.floor.length]);
            }
        };
        robot.virtualRooms = {
            clear: () => {
                calls.push(["rooms"]);
            }
        };
        robot.setMirrorZones = (zones) => {
            calls.push(["mirrors", zones.length]);
        };
        robot.mapRetouch = {
            forgetMap: () => {
                calls.push(["retouch"]);
            }
        };

        robot.saveMapBeforeReset();
        robot.onUserMapReset();

        assert.deepStrictEqual(calls, [["version", 3], ["rooms"], ["retouch"], ["mirrors", 0]]);
    });

    it("no enseña el recorrido desde que se borra hasta la siguiente limpieza", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);

        Object.defineProperty(robot, "robot", { value: undefined });
        robot.virtualRooms = { clear: () => {} };
        robot.setMirrorZones = () => {};
        robot.mapRetouch = { forgetMap: () => {} };
        robot.pathPoints = [1, 1, 2, 2];
        robot.livePathTail = [3, 3];
        robot.lastPathPoints = [4, 4, 5, 5];

        robot.onUserMapReset();

        assert.strictEqual(robot.mapResetPending, true);
        assert.deepStrictEqual(robot.pathPoints, []);
        assert.deepStrictEqual(robot.lastPathPoints, []);
        assert.deepStrictEqual(robot.getPathEntities({}), []);
    });

    it("mantiene el recorrido cuando el firmware deja de enviarlo y lo cambia por el de la limpieza nueva", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const buildMap = (robotPath, id = 1) => {
            return {
                id: { value: id },
                size: { x: 100, y: 100 },
                robotPath: robotPath,
                robot: { toCoordinates: () => {
                    return { x: 7, y: 7 };
                } },
                toPixel: (coordinate) => coordinate
            };
        };

        robot.pathPoints = [];
        robot.lastPathPoints = [];

        assert.deepStrictEqual(robot.getPathPoints(buildMap([{ x: 1, y: 90 }, { x: 2, y: 90 }])), [1, 10, 2, 10]);

        const emptyMap = buildMap([]);

        robot.updatePathPoints(emptyMap);

        assert.deepStrictEqual(robot.getPathPoints(emptyMap), [1, 10, 2, 10]);
        assert.deepStrictEqual(robot.pathPoints, []);

        // La limpieza nueva trae otro mapa del firmware
        assert.deepStrictEqual(robot.getPathPoints(buildMap([{ x: 5, y: 95 }], 2)), [5, 5]);
    });

    it("guarda la limpieza al fallar, solo una vez y solo si estaba limpiando", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const calls = [];
        const status = (value) => {
            return { value: value };
        };

        robot.cleanHistory = {
            storeInterrupted: (...args) => {
                calls.push(args);
            }
        };
        Object.defineProperty(robot, "state", { value: { map: "mapa" } });
        robot.lastCleanStatistics = { time: 60 };

        robot.trackInterruptedClean(status("docked"), status("error"));
        assert.strictEqual(calls.length, 0);

        robot.trackInterruptedClean(status("docked"), status("moving"));
        robot.trackInterruptedClean(status("moving"), status("error"));
        assert.strictEqual(calls.length, 0);

        robot.trackInterruptedClean(status("error"), status("cleaning"));
        const startedAt = robot.cleanStartedAt;

        robot.trackInterruptedClean(status("cleaning"), status("docked"));
        robot.trackInterruptedClean(status("docked"), status("cleaning"));
        assert.strictEqual(robot.cleanStartedAt, startedAt);

        robot.trackInterruptedClean(status("cleaning"), status("error"));
        robot.trackInterruptedClean(status("error"), status("error"));

        assert.deepStrictEqual(calls, [[startedAt, { time: 60 }, "mapa"]]);
    });

    it("sin suelo no hay recorrido", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);

        robot.floorCells = new Set();

        assert.deepStrictEqual(robot.getPathEntities({}), []);
    });
});

describe("Mota: mapas distintos del firmware", () => {
    const CecotecVirtualRooms = require("../../../../lib/robots/cecotec/CecotecVirtualRooms");
    const WIDTH = 100;
    const cellsOf = (pairs) => {
        const result = [];

        for (let i = 0; i < pairs.length; i += 2) {
            result.push(pairs[i + 1] * WIDTH + pairs[i]);
        }

        return result;
    };
    const roomsData = { width: WIDTH, rooms: [{ id: 1, name: "Salón", pixels: cellsOf(rect(10, 10, 39, 29)) }] };

    it("reconoce el mismo mapa, también a medio reconstruir, y rechaza otro", () => {
        assert.strictEqual(CecotecVirtualRooms.MATCHES_FLOOR(roomsData, rect(10, 10, 39, 29), WIDTH), true);
        assert.strictEqual(CecotecVirtualRooms.MATCHES_FLOOR(roomsData, rect(10, 10, 18, 15), WIDTH), true);
        assert.strictEqual(CecotecVirtualRooms.MATCHES_FLOOR(roomsData, rect(50, 50, 69, 79), WIDTH), false);
    });

    it("oculta las habitaciones mientras el mapa sea otro y las recupera si vuelve", () => {
        const rooms = new CecotecVirtualRooms({});

        rooms.importData(roomsData);
        rooms.fitToFloor(rect(50, 50, 69, 79), WIDTH, WIDTH);
        assert.strictEqual(rooms.getRooms().length, 0);
        assert.strictEqual(rooms.isUsable(), false);
        assert.strictEqual(rooms.hasRooms(), true);

        rooms.fitToFloor(rect(10, 10, 39, 29), WIDTH, WIDTH);
        assert.strictEqual(rooms.getRooms().length, 1);
        assert.strictEqual(rooms.isUsable(), true);
    });

    it("descarta el tramo de recorrido que no cae sobre el suelo actual", () => {
        const floorCells = new Set();
        const floor = rect(10, 10, 39, 29);

        for (let i = 0; i < floor.length; i += 2) {
            floorCells.add((floor[i + 1] << 16) | floor[i]);
        }

        assert.strictEqual(CecotecCongaRobot.IS_PATH_ON_FLOOR([12, 12, 13, 12, 14, 13], floorCells), true);
        assert.strictEqual(CecotecCongaRobot.IS_PATH_ON_FLOOR([80, 80, 81, 80, 82, 81], floorCells), false);
        assert.strictEqual(CecotecCongaRobot.IS_PATH_ON_FLOOR([80, 80, 81, 80], undefined), true);
    });
});
