const assert = require("node:assert");
const CecotecCongaRobot = require("../../../../lib/robots/cecotec/CecotecCongaRobot");
const CecotecMapRetouch = require("../../../../lib/robots/cecotec/CecotecMapRetouch");
const CecotecMapVersions = require("../../../../lib/robots/cecotec/CecotecMapVersions");
const CecotecVirtualRooms = require("../../../../lib/robots/cecotec/CecotecVirtualRooms");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it } = require("node:test");
const { ValetudoMap, MapLayer } = require("../../../../lib/entities/map");

const WIDTH = 40;
const HEIGHT = 30;

const cell = (x, y) => {
    return y * WIDTH + x;
};

const rect = (x0, y0, x1, y1) => {
    const pixels = [];

    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            pixels.push(x, y);
        }
    }

    return pixels;
};

const toCells = (pixels) => {
    const cells = [];

    for (let i = 0; i < pixels.length; i += 2) {
        cells.push(cell(pixels[i], pixels[i + 1]));
    }

    return cells;
};

// Casa de 2..15 x 2..15 con su pared, base junto al suelo, e isla de suelo y pared en 25..28 x 20..23
const buildContext = (props) => {
    return Object.assign({
        width: WIDTH,
        height: HEIGHT,
        floor: [...rect(3, 3, 14, 14), ...rect(26, 21, 27, 22)],
        walls: [...rect(2, 2, 15, 2), ...rect(2, 15, 15, 15), ...rect(25, 20, 28, 20), ...rect(25, 23, 28, 23)],
        rooms: [],
        anchors: [{x: 3, y: 3}],
        stale: false,
    }, props);
};

const pairs = (pixels) => {
    const result = new Set();

    for (let i = 0; i < pixels.length; i += 2) {
        result.add(`${pixels[i]},${pixels[i + 1]}`);
    }

    return result;
};

describe("Mota: islas del mapa", () => {
    it("el trozo suelto es una isla, con sus paredes; la zona principal no", () => {
        const islands = CecotecMapRetouch.FIND_ISLANDS(buildContext());

        assert.strictEqual(islands.length, 1);
        assert.strictEqual(islands[0].floorCells, 4);
        assert.strictEqual(islands[0].cells.length, 12);
        assert.ok(!islands[0].cells.includes(cell(3, 3)));
    });

    it("una pared suelta sin suelo también es una isla", () => {
        const islands = CecotecMapRetouch.FIND_ISLANDS(buildContext({
            floor: rect(3, 3, 14, 14),
            walls: [...rect(2, 2, 15, 2), ...rect(33, 25, 35, 25)],
        }));

        assert.strictEqual(islands.length, 1);
        assert.strictEqual(islands[0].floorCells, 0);
    });

    it("no son islas los trozos con habitación ni los que están junto a la base o el robot", () => {
        const room = {id: 1, pixels: [cell(26, 21)]};

        assert.strictEqual(CecotecMapRetouch.FIND_ISLANDS(buildContext({rooms: [room]})).length, 0);
        assert.strictEqual(CecotecMapRetouch.FIND_ISLANDS(buildContext({anchors: [{x: 24, y: 19}]})).length, 0);
    });

    it("una pared pegada a la casa no es una isla aunque el suelo no llegue a tocarla", () => {
        const islands = CecotecMapRetouch.FIND_ISLANDS(buildContext({
            floor: rect(3, 3, 14, 14),
            walls: rect(16, 3, 16, 14),
        }));

        assert.strictEqual(islands.length, 0);
    });

    it("sin suelo no hay nada que comparar", () => {
        assert.deepStrictEqual(CecotecMapRetouch.FIND_ISLANDS(buildContext({floor: [], walls: []})), []);
    });

    it("ocultar una isla la quita de las capas y deshacer la devuelve", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();
        const id = retouch.getStatus(context).islands[0].id;

        retouch.hideIslands(context, [id]);

        const hidden = retouch.apply(context);

        assert.strictEqual(pairs(hidden.floor).has("26,21"), false);
        assert.strictEqual(pairs(hidden.walls).has("25,20"), false);
        assert.strictEqual(pairs(hidden.floor).has("3,3"), true);
        assert.strictEqual(retouch.getStatus(context).hidden.length, 1);
        assert.strictEqual(retouch.getStatus(context).islands.length, 0);

        retouch.undo();

        assert.deepStrictEqual(retouch.apply(context).floor, context.floor);
        assert.strictEqual(retouch.canUndo(), false);
    });

    it("ocultar todas y mostrar una a una", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext({floor: [...rect(3, 3, 14, 14), ...rect(26, 21, 27, 22), ...rect(33, 25, 34, 26)], walls: []});

        retouch.hideIslands(context);
        assert.strictEqual(retouch.getStatus(context).hidden.length, 2);

        const id = retouch.getStatus(context).hidden[0].id;

        retouch.showIslands(context, [id]);
        assert.strictEqual(retouch.getStatus(context).hidden.length, 1);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("26,21"), true);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("33,25"), false);
    });

    it("sin islas que ocultar da un error claro", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext({floor: rect(3, 3, 14, 14), walls: []});

        assert.throws(() => {
            retouch.hideIslands(context);
        }, /No hay ninguna isla/);
        assert.throws(() => {
            retouch.undo();
        }, /nada que deshacer/);
    });

    it("si el firmware vuelve a detectar la isla, suelta, sigue oculta aunque crezca", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();

        retouch.hideIslands(context);

        const shown = retouch.apply(buildContext({floor: [...context.floor, ...rect(28, 21, 30, 22)]}));

        assert.strictEqual(pairs(shown.floor).has("26,21"), false);
        assert.strictEqual(pairs(shown.floor).has("30,22"), false);
    });

    it("si la isla se une a la casa reaparece y, si se separa, se oculta otra vez", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();

        retouch.hideIslands(context);

        const joined = buildContext({floor: [...context.floor, ...rect(15, 14, 25, 21)]});

        assert.strictEqual(pairs(retouch.apply(joined).floor).has("26,21"), true);
        assert.strictEqual(retouch.getStatus(joined).hidden.length, 0);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("26,21"), false);
    });

    it("si el robot entra en la isla, reaparece", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();

        retouch.hideIslands(context);

        assert.strictEqual(pairs(retouch.apply(buildContext({anchors: [{x: 26, y: 21}]})).floor).has("26,21"), true);
    });
});

describe("Mota: repintar el mapa", () => {
    it("el pincel cubre el trazo sin huecos y no se sale del mapa", () => {
        const cells = CecotecMapRetouch.RASTERIZE([0, 0, 10, 0], 1, WIDTH, HEIGHT);

        assert.strictEqual(new Set(cells).size, cells.length);
        assert.strictEqual(cells.length, 12 * 2);
        assert.ok(cells.includes(cell(5, 1)));
        assert.deepStrictEqual(CecotecMapRetouch.RASTERIZE([100, 100], 0, WIDTH, HEIGHT), []);
    });

    it("pinta suelo, pared y vacío, en orden", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();

        retouch.paint(context, "wall", 0, [20, 5]);
        retouch.paint(context, "floor", 0, [20, 6]);
        retouch.paint(context, "void", 0, [5, 5]);
        retouch.paint(context, "wall", 0, [20, 7]);
        retouch.paint(context, "void", 0, [20, 7]);

        const { floor, walls } = retouch.apply(context);

        assert.strictEqual(pairs(walls).has("20,5"), true);
        assert.strictEqual(pairs(floor).has("20,6"), true);
        assert.strictEqual(pairs(floor).has("5,5"), false);
        assert.strictEqual(pairs(walls).has("20,7"), false);
    });

    it("lo pintado manda sobre lo que detecte después el firmware", () => {
        const retouch = new CecotecMapRetouch({});

        retouch.paint(buildContext(), "void", 0, [20, 5]);

        const shown = retouch.apply(buildContext({floor: rect(3, 3, 25, 14)}));

        assert.strictEqual(pairs(shown.floor).has("20,5"), false);
        assert.strictEqual(pairs(shown.floor).has("21,5"), true);
    });

    it("el suelo pintado junto a una habitación se ve de esa habitación y las celdas reales no cambian", () => {
        const retouch = new CecotecMapRetouch({});
        const pixels = toCells(rect(3, 3, 14, 14));
        const context = buildContext({rooms: [{id: 4, pixels: pixels}]});

        retouch.paint(context, "floor", 0, [15, 5, 18, 5]);
        retouch.paint(context, "void", 0, [5, 5]);

        const shown = retouch.apply(context).rooms.get(4);

        assert.ok(shown.includes(cell(18, 5)));
        assert.ok(!shown.includes(cell(5, 5)));
        assert.strictEqual(pixels.length, 144);
        assert.ok(pixels.includes(cell(5, 5)));
    });

    it("el suelo pintado lejos de una habitación no entra en ella", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext({rooms: [{id: 4, pixels: toCells(rect(3, 3, 14, 14))}]});

        retouch.paint(context, "floor", 0, [30, 5]);

        assert.ok(!retouch.apply(context).rooms.get(4).includes(cell(30, 5)));
    });

    it("un trazo rechaza los valores desconocidos y el límite de retoques", () => {
        const retouch = new CecotecMapRetouch({});

        assert.throws(() => {
            retouch.paint(buildContext(), "lava", 0, [1, 1]);
        }, /Invalid value/);

        retouch.data.edits = new Array(CecotecMapRetouch.MAX_EDITS).fill({type: "paint", value: "void", cells: []});
        assert.throws(() => {
            retouch.paint(buildContext(), "void", 0, [1, 1]);
        }, /demasiados/);
    });
});

describe("Mota: los retoques y el mapa", () => {
    it("con habitaciones de otro mapa no se aplican ni se pueden editar, y vuelven con su mapa", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();

        retouch.paint(context, "void", 0, [5, 5]);

        const stale = buildContext({stale: true});

        assert.deepStrictEqual(retouch.apply(stale).floor, stale.floor);
        assert.strictEqual(retouch.getStatus(stale).usable, false);
        assert.throws(() => {
            retouch.paint(stale, "void", 0, [6, 6]);
        }, /otro mapa/);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("5,5"), false);
    });

    it("un mapa de otro tamaño no los usa", () => {
        const retouch = new CecotecMapRetouch({});

        retouch.paint(buildContext(), "void", 0, [5, 5]);

        assert.strictEqual(retouch.getStatus(buildContext({width: 80})).usable, false);
    });

    it("quitar todos conserva el giro y se puede deshacer", () => {
        const retouch = new CecotecMapRetouch({});
        const context = buildContext();

        retouch.setRotation(90);
        retouch.paint(context, "void", 0, [5, 5]);
        retouch.clear();

        assert.strictEqual(retouch.getRotation(), 90);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("5,5"), true);
        assert.strictEqual(retouch.canUndo(), true);

        retouch.undo();

        assert.strictEqual(pairs(retouch.apply(context).floor).has("5,5"), false);
    });

    it("el giro solo admite cuartos de vuelta", () => {
        const retouch = new CecotecMapRetouch({});

        assert.throws(() => {
            retouch.setRotation(45);
        }, /Invalid rotation/);
    });

    it("sobreviven a un reinicio", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-retoques-"));
        const file = path.join(directory, "retoques.json");
        const context = buildContext();
        const retouch = new CecotecMapRetouch({path: file});

        retouch.setRotation(270);
        retouch.paint(context, "void", 0, [5, 5]);

        const reloaded = new CecotecMapRetouch({path: file});

        assert.strictEqual(reloaded.getRotation(), 270);
        assert.strictEqual(pairs(reloaded.apply(context).floor).has("5,5"), false);
        fs.rmSync(directory, {recursive: true});
    });

    it("restaurar una versión recupera sus retoques, se puede deshacer y no toca el giro", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-versiones-"));
        const context = buildContext();
        const retouch = new CecotecMapRetouch({});
        const robot = {
            config: {get: () => {
                return {};
            }},
            mapRetouch: retouch,
            virtualRooms: new CecotecVirtualRooms({}),
        };
        const versions = new CecotecMapVersions({robot: robot, directory: directory});

        retouch.paint(context, "void", 0, [5, 5]);

        const info = versions.saveManual({
            createdAt: Date.now(),
            width: WIDTH,
            floor: [1],
            map: {},
            rooms: {width: WIDTH, rooms: []},
            retouch: retouch.exportEdits(),
        });

        retouch.undo();
        retouch.paint(context, "void", 0, [6, 6]);
        retouch.setRotation(180);
        versions.restoreRooms(info.id);

        assert.strictEqual(pairs(retouch.apply(context).floor).has("5,5"), false);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("6,6"), true);
        assert.strictEqual(retouch.getRotation(), 180);

        retouch.undo();

        assert.strictEqual(pairs(retouch.apply(context).floor).has("5,5"), true);
        assert.strictEqual(pairs(retouch.apply(context).floor).has("6,6"), false);
        fs.rmSync(directory, {recursive: true});
    });

    it("una versión anterior a los retoques deja los actuales", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-versiones-"));
        const context = buildContext();
        const retouch = new CecotecMapRetouch({});
        const versions = new CecotecMapVersions({
            robot: {
                config: {get: () => {
                    return {};
                }},
                mapRetouch: retouch,
                virtualRooms: new CecotecVirtualRooms({}),
            },
            directory: directory,
        });
        const info = versions.saveManual({
            createdAt: Date.now(),
            width: WIDTH,
            floor: [1],
            map: {},
            rooms: {width: WIDTH, rooms: []},
        });

        retouch.paint(context, "void", 0, [5, 5]);
        versions.restoreRooms(info.id);

        assert.strictEqual(pairs(retouch.apply(context).floor).has("5,5"), false);
        fs.rmSync(directory, {recursive: true});
    });
});

describe("Mota: los retoques no llegan al robot", () => {
    const SIZE = 60;

    const toRoomCells = (pixels) => {
        const cells = [];

        for (let i = 0; i < pixels.length; i += 2) {
            cells.push(pixels[i + 1] * SIZE + pixels[i]);
        }

        return cells;
    };

    const buildRobot = () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const grid = new Uint8Array(SIZE * (SIZE + 1));
        const setCell = (x, y, value) => {
            grid[(SIZE - y) * SIZE + x] = value;
        };

        for (let y = 10; y < 30; y++) {
            for (let x = 10; x < 30; x++) {
                setCell(x, y, 1);
            }
        }
        for (let y = 15; y < 19; y++) {
            for (let x = 40; x < 44; x++) {
                setCell(x, y, 1);
            }
        }

        const map = {
            id: {value: 1},
            size: {x: SIZE, y: SIZE},
            min: {x: -1.5, y: -1.5},
            max: {x: 1.5, y: 1.5},
            grid: grid,
            robotPath: [],
            rooms: [],
            restrictedZones: [],
            toPixel: ({ x, y }) => {
                return {x: Math.floor((x + 1.5) * 20), y: Math.floor((y + 1.5) * 20)};
            },
        };

        robot.pathPoints = [];
        robot.livePathTail = [];
        robot.lastPathPoints = [];
        robot.virtualRooms = new CecotecVirtualRooms({});
        robot.mapRetouch = new CecotecMapRetouch({});
        robot.mapRecovery = {onMapUpdate: () => {}};
        robot.emitMapUpdated = () => {};
        robot.getMirrorZones = () => {
            return [];
        };
        robot.virtualRooms.importData({width: SIZE, rooms: [{id: 1, name: "Salón", pixels: toRoomCells(rect(10, 10, 29, 29))}]});

        const state = {
            map: undefined,
            getFirstMatchingAttributeByConstructor: () => {
                return undefined;
            },
        };
        const agnoc = {isConnected: true, device: {map: map, mode: {value: "none"}}};

        Object.defineProperty(robot, "state", {value: state});
        robot.server = {
            getRobots: () => {
                return [agnoc];
            }
        };

        return {robot: robot, map: map, agnoc: agnoc};
    };

    const realWorld = ({ robot, map, agnoc }) => {
        robot.onUpdateMap(agnoc);

        return JSON.stringify({
            pixels: robot.getMapPixels(map),
            snapshot: robot.getFloorSnapshot(map),
            floorCells: [...robot.floorCells],
            rooms: robot.virtualRooms.getRooms(),
            rects: robot.virtualRooms.getRooms().map(room => {
                return robot.virtualRooms.getCleaningRects(room.id, 10, 0.05);
            }),
            entities: robot.state.map.entities,
        });
    };

    const layerPixels = (map, type) => {
        return pairs(map.layers.filter(l => {
            return l.type === type;
        }).flatMap(l => {
            return MapLayer.DECOMPRESS_PIXELS(l.compressedPixels);
        }));
    };

    it("girar, ocultar o pintar no cambia nada de lo que se usa para mandar al robot", () => {
        const fixture = buildRobot();
        const before = realWorld(fixture);

        fixture.robot.mapRetouch.setRotation(90);
        fixture.robot.mapRetouch.hideIslands(fixture.robot.getRetouchContext(fixture.map));
        fixture.robot.mapRetouch.paint(fixture.robot.getRetouchContext(fixture.map), "void", 3, [15, 15]);
        fixture.robot.mapRetouch.paint(fixture.robot.getRetouchContext(fixture.map), "floor", 3, [34, 15]);
        fixture.robot.mapRetouch.paint(fixture.robot.getRetouchContext(fixture.map), "wall", 3, [20, 20]);

        assert.strictEqual(realWorld(fixture), before);
    });

    it("lo que se muestra sí lleva los retoques y el giro", () => {
        const fixture = buildRobot();

        fixture.robot.onUpdateMap(fixture.agnoc);
        assert.strictEqual(fixture.robot.state.map.metaData.motaRotation, 0);
        assert.strictEqual(layerPixels(fixture.robot.state.map, MapLayer.TYPE.FLOOR).has("41,16"), true);
        assert.strictEqual(layerPixels(fixture.robot.state.map, MapLayer.TYPE.SEGMENT).has("15,15"), true);

        fixture.robot.mapRetouch.setRotation(180);
        fixture.robot.mapRetouch.hideIslands(fixture.robot.getRetouchContext(fixture.map));
        fixture.robot.mapRetouch.paint(fixture.robot.getRetouchContext(fixture.map), "void", 0, [15, 15]);
        fixture.robot.onUpdateMap(fixture.agnoc);

        assert.ok(fixture.robot.state.map instanceof ValetudoMap);
        assert.strictEqual(fixture.robot.state.map.metaData.motaRotation, 180);
        assert.strictEqual(layerPixels(fixture.robot.state.map, MapLayer.TYPE.FLOOR).has("41,16"), false);
        assert.strictEqual(layerPixels(fixture.robot.state.map, MapLayer.TYPE.SEGMENT).has("15,15"), false);
        assert.strictEqual(layerPixels(fixture.robot.state.map, MapLayer.TYPE.SEGMENT).has("16,16"), true);
    });

    it("una habitación borrada del dibujo sigue en el mapa para poder limpiarla", () => {
        const fixture = buildRobot();
        const context = fixture.robot.getRetouchContext(fixture.map);

        fixture.robot.onUpdateMap(fixture.agnoc);
        fixture.robot.mapRetouch.paint(context, "void", 10, [15, 15, 15, 24, 24, 24, 24, 15]);
        fixture.robot.onUpdateMap(fixture.agnoc);

        assert.ok(fixture.robot.state.map.layers.some(l => {
            return l.type === MapLayer.TYPE.SEGMENT;
        }));
    });

    it("el giro también llega al mapa ya pintado, sin esperar al siguiente", () => {
        const fixture = buildRobot();

        fixture.robot.onUpdateMap(fixture.agnoc);

        const nonce = fixture.robot.state.map.metaData.nonce;

        fixture.robot.setMapRotation(270);

        assert.strictEqual(fixture.robot.state.map.metaData.motaRotation, 270);
        assert.strictEqual(fixture.robot.state.map.metaData.nonce, nonce);
        assert.ok(fixture.robot.state.map.metaData.motaEntitiesNonce > 0);
    });

    it("borrar el mapa olvida los retoques, sin deshacer, y conserva el giro", () => {
        const fixture = buildRobot();

        fixture.robot.setMirrorZones = () => {};
        fixture.robot.mapRetouch.setRotation(90);
        fixture.robot.mapRetouch.paint(fixture.robot.getRetouchContext(fixture.map), "void", 0, [15, 15]);
        fixture.robot.onUserMapReset();

        assert.strictEqual(fixture.robot.mapRetouch.canUndo(), false);
        assert.strictEqual(fixture.robot.mapRetouch.getRotation(), 90);
    });

    it("los mapas guardados se ven con el giro actual sin tocar el original", () => {
        const { robot } = buildRobot();
        const saved = {metaData: {motaRotation: 0, version: 2}, layers: []};

        robot.mapRetouch.setRotation(90);

        const view = robot.withMapRotation(saved);

        assert.strictEqual(view.metaData.motaRotation, 90);
        assert.strictEqual(view.metaData.version, 2);
        assert.strictEqual(saved.metaData.motaRotation, 0);
    });

    it("la foto de una versión lleva los retoques", () => {
        const fixture = buildRobot();

        fixture.robot.onUpdateMap(fixture.agnoc);
        fixture.robot.mapRetouch.paint(fixture.robot.getRetouchContext(fixture.map), "void", 0, [15, 15]);

        const snapshot = fixture.robot.getMapSnapshot(fixture.map);

        assert.strictEqual(snapshot.retouch.edits.length, 1);
        assert.strictEqual(snapshot.floor.length, (20 * 20) + (4 * 4));
    });

    it("la zona que se manda al robot no depende del giro", () => {
        const fixture = buildRobot();
        const zone = () => {
            return JSON.stringify(fixture.robot.virtualRooms.getCleaningRects(fixture.robot.virtualRooms.getRooms()[0].id, 10, 0.05));
        };

        fixture.robot.onUpdateMap(fixture.agnoc);

        const before = zone();

        for (const rotation of CecotecMapRetouch.ROTATIONS) {
            fixture.robot.setMapRotation(rotation);
            assert.strictEqual(zone(), before);
        }
    });
});
