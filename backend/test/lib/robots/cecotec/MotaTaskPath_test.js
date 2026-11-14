const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { afterEach, beforeEach, describe, it } = require("node:test");

const CecotecCongaRobot = require("../../../../lib/robots/cecotec/CecotecCongaRobot");
const CecotecTaskPath = require("../../../../lib/robots/cecotec/CecotecTaskPath");
const Logger = require("../../../../lib/Logger");
const { decodeMap } = require("@agnoc/core/lib/decoders/map.decoder");
const { StatusStateAttribute } = require("../../../../lib/entities/state/attributes");

// Historial como el de agnoc: Float32Array plano de n puntos a partir de `from`
const history = (from, n) => {
    const xy = new Float32Array(n * 2);

    for (let i = 0; i < n; i++) {
        xy[2 * i] = (from + i) * 0.05;
        xy[2 * i + 1] = (from + i) * -0.05;
    }

    return xy;
};
const pointsOf = (taskPath) => {
    return Array.from(taskPath.getPoints());
};

describe("Mota: recorrido de la limpieza en curso", () => {
    let dir;
    let originals;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-recorrido-"));
        originals = {info: Logger.info, warn: Logger.warn};
        Logger.info = () => {};
        Logger.warn = () => {};
    });

    afterEach(() => {
        Object.assign(Logger, originals);
        fs.rmSync(dir, { recursive: true, force: true });
    });

    const waitForFiles = async () => {
        // removeFile es asíncrono y sin espera
        await new Promise(resolve => {
            setTimeout(resolve, 20);
        });
    };

    it("sustituye el historial cuando el firmware lo alarga y conserva lo anterior cuando lo reinicia", () => {
        const taskPath = new CecotecTaskPath();

        assert.strictEqual(taskPath.update(1, history(0, 3)), true);
        assert.strictEqual(taskPath.update(1, history(0, 5)), true);
        assert.deepStrictEqual(pointsOf(taskPath), Array.from(history(0, 5)));
        // El mismo historial otra vez no cambia nada
        assert.strictEqual(taskPath.update(1, history(0, 5)), false);

        // El firmware empieza de nuevo (p. ej. tras reanudar): lo anterior queda delante
        taskPath.update(1, history(100, 2));
        assert.deepStrictEqual(pointsOf(taskPath), [...history(0, 5), ...history(100, 2)]);
        assert.strictEqual(taskPath.length, 7);

        // Un historial que solo pierde el principio (ventana) no duplica nada
        taskPath.update(1, history(101, 3));
        assert.deepStrictEqual(pointsOf(taskPath), [...history(0, 5), ...history(100, 4)]);

        // El historial vacío del final no borra nada
        taskPath.update(1, new Float32Array(0));
        assert.strictEqual(taskPath.length, 9);

        // Otro mapa es otra limpieza
        taskPath.update(2, history(0, 2));
        assert.deepStrictEqual(pointsOf(taskPath), Array.from(history(0, 2)));
    });

    it("acepta también Coordinates", () => {
        const taskPath = new CecotecTaskPath();

        taskPath.update(1, [{x: 1, y: 2}, {x: 3, y: 4}]);
        assert.deepStrictEqual(pointsOf(taskPath), [1, 2, 3, 4]);
    });

    it("se guarda en un archivo y se recupera tras un reinicio si sigue la misma limpieza", async () => {
        const before = new CecotecTaskPath({directory: dir});

        before.update(7, history(0, 50));
        before.setStartedAt(1000);
        await before.save();

        const file = path.join(dir, CecotecTaskPath.FILE_NAME);
        assert.ok(fs.existsSync(file));
        assert.strictEqual(fs.existsSync(`${file}.tmp`), false);

        // Mota vuelve: el firmware ya no manda lo de antes, solo lo que ha recorrido desde que se reanudó
        const after = new CecotecTaskPath({directory: dir});
        after.load();
        after.update(7, history(500, 10), () => {
            return true;
        });

        assert.deepStrictEqual(pointsOf(after), [...history(0, 50), ...history(500, 10)]);
        assert.strictEqual(after.startedAt, 1000);

        // Y si el firmware sí lo mandara entero, no se duplica
        const again = new CecotecTaskPath({directory: dir});
        again.load();
        again.update(7, history(0, 60), () => {
            return true;
        });
        assert.deepStrictEqual(pointsOf(again), Array.from(history(0, 60)));
    });

    it("no recupera el recorrido de otra limpieza ni si el robot ya no está con ella, y lo borra", async () => {
        const file = path.join(dir, CecotecTaskPath.FILE_NAME);
        const save = async () => {
            const taskPath = new CecotecTaskPath({directory: dir});

            taskPath.update(7, history(0, 5));
            await taskPath.save();
            assert.ok(fs.existsSync(file));
        };

        await save();
        const otherMap = new CecotecTaskPath({directory: dir});
        otherMap.load();
        otherMap.update(8, history(0, 2));
        assert.deepStrictEqual(pointsOf(otherMap), Array.from(history(0, 2)));
        await waitForFiles();
        assert.strictEqual(fs.existsSync(file), false);

        await save();
        const finished = new CecotecTaskPath({directory: dir});
        finished.load();
        finished.update(7, history(0, 2), () => {
            return false;
        });
        assert.deepStrictEqual(pointsOf(finished), Array.from(history(0, 2)));
        await waitForFiles();
        assert.strictEqual(fs.existsSync(file), false);
    });

    it("al terminar la limpieza borra el archivo y deja de guardarlo, pero sigue enseñando el recorrido", async () => {
        const file = path.join(dir, CecotecTaskPath.FILE_NAME);
        const taskPath = new CecotecTaskPath({directory: dir});

        taskPath.update(7, history(0, 5));
        await taskPath.save();
        taskPath.finish();
        taskPath.update(7, history(0, 6));
        await taskPath.save();
        await waitForFiles();

        assert.strictEqual(fs.existsSync(file), false);
        assert.strictEqual(taskPath.length, 6);
    });

    it("un archivo dañado se descarta", async () => {
        const file = path.join(dir, CecotecTaskPath.FILE_NAME);
        fs.writeFileSync(file, "{\"version\":1,\"base\":");

        const taskPath = new CecotecTaskPath({directory: dir});
        taskPath.load();
        await waitForFiles();

        assert.strictEqual(taskPath.pending, undefined);
        assert.strictEqual(fs.existsSync(file), false);
    });

    describe("en el robot", () => {
        const buildMap = (robotPath, id = 7) => {
            return {
                id: { value: id },
                size: { x: 200, y: 200 },
                min: { x: -5, y: -5 },
                max: { x: 5, y: 5 },
                robotPath: robotPath,
                toPixel: () => {
                    throw new Error("no debería crear un Pixel por punto");
                }
            };
        };
        const buildRobot = (status) => {
            const robot = Object.create(CecotecCongaRobot.prototype);

            robot.pathPoints = [];
            robot.livePathTail = [];
            robot.lastPathPoints = [];
            robot.taskPath = new CecotecTaskPath({directory: dir});
            Object.defineProperty(robot, "state", { value: {
                getFirstMatchingAttributeByConstructor: () => {
                    return status;
                }
            } });

            return robot;
        };

        it("tras un reinicio de Mota a mitad de la limpieza, el recorrido y el informe siguen teniendo lo anterior", async () => {
            const before = buildRobot(new StatusStateAttribute({value: StatusStateAttribute.VALUE.CLEANING}));
            const firstPart = before.getPathPoints(buildMap(history(0, 40)));
            before.cleanStartedAt = 1000;
            before.taskPath.setStartedAt(1000);
            await before.taskPath.save();

            const after = buildRobot(new StatusStateAttribute({
                value: StatusStateAttribute.VALUE.DOCKED,
                flag: StatusStateAttribute.FLAG.RESUMABLE
            }));
            after.taskPath.load();
            const points = after.getPathPoints(buildMap(history(300, 5)));

            assert.deepStrictEqual(points.slice(0, firstPart.length), firstPart);
            assert.strictEqual(points.length, firstPart.length + 10);
            // El inicio de la limpieza también se recupera, para el informe de una limpieza interrumpida
            assert.strictEqual(after.cleanStartedAt, 1000);

            const entities = after.getPathEntities(buildMap(history(300, 5)));
            const drawn = entities.reduce((sum, entity) => {
                return sum + entity.points.length;
            }, 0);
            assert.strictEqual(drawn, points.length);
        });

        it("si el robot ya está en reposo, no lo recupera", async () => {
            const before = buildRobot(new StatusStateAttribute({value: StatusStateAttribute.VALUE.CLEANING}));
            before.getPathPoints(buildMap(history(0, 40)));
            await before.taskPath.save();

            const after = buildRobot(new StatusStateAttribute({value: StatusStateAttribute.VALUE.IDLE}));
            after.taskPath.load();

            assert.strictEqual(after.getPathPoints(buildMap(history(300, 5))).length, 10);
        });

        it("convierte a píxeles igual que DeviceMap.toPixel", () => {
            const { Coordinate } = require("@agnoc/core/lib/value-objects/coordinate.value-object");
            const { DeviceMap } = require("@agnoc/core/lib/entities/device-map.entity");
            const { ID } = require("@agnoc/core/lib/value-objects/id.value-object");
            const { Pixel } = require("@agnoc/core/lib/value-objects/pixel.value-object");
            const map = new DeviceMap({
                id: new ID(1),
                size: new Pixel({x: 800, y: 800}),
                min: new Coordinate({x: -20.3, y: -19.7}),
                max: new Coordinate({x: 19.7, y: 20.3}),
                resolution: 0.05,
                grid: Buffer.alloc(0),
                rooms: [],
                restrictedZones: [],
                robotPath: []
            });
            const xy = new Float32Array(2000);

            for (let i = 0; i < xy.length; i++) {
                xy[i] = Math.fround(Math.sin(i) * 15);
            }

            const expected = [];
            for (let i = 0; i < xy.length; i += 2) {
                const pixel = map.toPixel(new Coordinate({x: xy[i], y: xy[i + 1]}));

                expected.push(pixel.x, 800 - pixel.y);
            }

            assert.deepStrictEqual(CecotecCongaRobot.PATH_TO_PIXELS(map, xy), expected);
        });
    });

    it("agnoc decodifica el historial a un Float32Array sin un objeto por punto", () => {
        const n = 4;
        const buffer = Buffer.alloc(16 + n * 9);
        let offset = 0;

        buffer.writeUInt32LE(0x4, offset);
        buffer.writeUInt32LE(7, offset + 4);
        buffer.writeUInt32LE(1, offset + 8);
        buffer.writeUInt32LE(n, offset + 12);
        offset = 16;
        for (let i = 0; i < n; i++) {
            buffer[offset] = 1;
            buffer.writeFloatLE(i + 0.25, offset + 1);
            buffer.writeFloatLE(-i - 0.5, offset + 5);
            offset += 9;
        }

        const { historyHeadInfo } = decodeMap(zlib.deflateSync(buffer));

        assert.ok(historyHeadInfo.points instanceof Float32Array);
        assert.deepStrictEqual(Array.from(historyHeadInfo.points), [0.25, -0.5, 1.25, -1.5, 2.25, -2.5, 3.25, -3.5]);
        assert.deepStrictEqual(historyHeadInfo.pointList[1], {flag: 1, x: 1.25, y: -1.5});
    });
});
