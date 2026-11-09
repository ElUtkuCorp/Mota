const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { afterEach, beforeEach, describe, it } = require("node:test");

const CecotecCleanHistory = require("../../../../lib/robots/cecotec/CecotecCleanHistory");
const CecotecCongaRobot = require("../../../../lib/robots/cecotec/CecotecCongaRobot");
const CecotecFiles = require("../../../../lib/robots/cecotec/CecotecFiles");
const CecotecMapRetouch = require("../../../../lib/robots/cecotec/CecotecMapRetouch");
const CecotecMapVersions = require("../../../../lib/robots/cecotec/CecotecMapVersions");
const CecotecVirtualRooms = require("../../../../lib/robots/cecotec/CecotecVirtualRooms");

describe("Mota: archivos dañados por un corte de luz", () => {
    let dir;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-files-"));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("escribe con un temporal y aparta el JSON dañado o con otra forma", () => {
        const file = path.join(dir, "a.json");

        CecotecFiles.WRITE_ATOMIC(file, "{\"x\":1}");
        assert.deepStrictEqual(fs.readdirSync(dir), ["a.json"]);
        assert.deepStrictEqual(CecotecFiles.READ_JSON(file), { x: 1 });
        assert.strictEqual(CecotecFiles.READ_JSON(path.join(dir, "no.json")), undefined);

        fs.writeFileSync(file, "{\"x\":");
        assert.strictEqual(CecotecFiles.READ_JSON(file), undefined);
        assert.deepStrictEqual(fs.readdirSync(dir), ["a.json.corrupt"]);

        fs.writeFileSync(file, "null");
        assert.strictEqual(CecotecFiles.READ_JSON(file, v => {
            return v !== null;
        }), undefined);
        assert.strictEqual(fs.existsSync(file), false);
    });

    it("una entrada dañada del historial no lo vacía ni impide la poda", () => {
        const max = CecotecCleanHistory.MAX_ENTRIES;

        for (let id = 1000; id < 1000 + max; id++) {
            fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ cleanId: id, durationSeconds: 600, area: 5 }));
        }
        fs.writeFileSync(path.join(dir, "999.json"), "");
        fs.writeFileSync(path.join(dir, "totales.json"), "{\"count\":");

        const history = new CecotecCleanHistory({ directory: dir });

        assert.strictEqual(history.list().length, max);
        assert.ok(fs.existsSync(path.join(dir, "999.json.corrupt")));
        // Los totales dañados se apartan en lugar de sobrescribirse sin avisar
        assert.deepStrictEqual(history.getTotals(), { count: 0, timeSeconds: 0, areaCm2: 0 });
        assert.ok(fs.existsSync(path.join(dir, "totales.json.corrupt")));

        history.store({ cleanId: 5000, task: { startTime: 5000, endTime: 5600 } }, { area: 500 }, null);
        assert.strictEqual(history.list().length, max);
        assert.strictEqual(history.list()[0].cleanId, 5000);
    });

    it("una versión dañada no deja sin versiones", () => {
        fs.writeFileSync(path.join(dir, "1.meta.json"), JSON.stringify({ id: 1 }));
        fs.writeFileSync(path.join(dir, "2.meta.json"), "{\"id\":");

        const versions = new CecotecMapVersions({ robot: {}, directory: dir });

        assert.deepStrictEqual(versions.list().map(v => {
            return v.id;
        }), [1]);
    });

    it("habitaciones y retoques dañados se apartan y no rompen la carga", () => {
        const roomsPath = path.join(dir, "habitaciones.json");
        const retouchPath = path.join(dir, "retoques.json");

        fs.writeFileSync(roomsPath, "{\"width\":10,\"rooms\":[{\"id\":1,");
        fs.writeFileSync(retouchPath, "{}");

        const rooms = new CecotecVirtualRooms({ path: roomsPath });
        const retouch = new CecotecMapRetouch({ path: retouchPath });

        assert.deepStrictEqual(rooms.getRooms(), []);
        assert.ok(fs.existsSync(`${roomsPath}.corrupt`));
        assert.deepStrictEqual(retouch.data.edits, []);
        assert.ok(fs.existsSync(`${retouchPath}.corrupt`));
    });
});

describe("Mota: habitaciones", () => {
    const floor = () => {
        const cells = [];

        for (let y = 10; y < 70; y++) {
            for (let x = 10; x < 171; x++) {
                if (x !== 90 || (y >= 32 && y < 48)) {
                    cells.push(x, y);
                }
            }
        }

        return cells;
    };

    it("no une una habitación consigo misma", () => {
        const rooms = new CecotecVirtualRooms({});

        rooms.segment(floor(), 200, 100, 0.05);
        assert.throws(() => {
            rooms.join(1, 1);
        }, /consigo misma/);
        assert.strictEqual(rooms.getRooms().length, 2);
    });

    it("una división que no corta la habitación no la cambia", () => {
        const rooms = new CecotecVirtualRooms({});

        rooms.segment(floor(), 200, 100, 0.05);
        // La división parte de las celdas ajustadas al suelo actual
        rooms.fitted = new Map([[1, [210, 211, 212]]]);
        const before = JSON.stringify(rooms.exportData());

        assert.throws(() => {
            rooms.split(1, { x: 0, y: 0 }, { x: 1, y: 0 });
        });
        assert.strictEqual(JSON.stringify(rooms.exportData()), before);
    });
});

describe("Mota: eventos del robot", () => {
    it("un error en un manejador se registra y no sale del emisor", async () => {
        const calls = [];

        CecotecCongaRobot.GUARD("sync", () => {
            calls.push("sync");
            throw new Error("disco lleno");
        })();
        CecotecCongaRobot.GUARD("async", async () => {
            calls.push("async");
            throw new Error("disco lleno");
        })();
        await new Promise(resolve => {
            setImmediate(resolve);
        });

        assert.deepStrictEqual(calls, ["sync", "async"]);
    });
});

describe("Mota: informes de limpieza en agnoc", () => {
    it("los resúmenes sin mapa no se acumulan para siempre", () => {
        const { Robot } = require("@agnoc/core/lib/emitters/robot.emitter");
        const emitter = Object.create(Robot.prototype);

        for (let cleanId = 1; cleanId <= 8; cleanId++) {
            emitter.handleReportCleantask({
                packet: { payload: { object: { cleanId: cleanId } } },
                respond: () => {}
            });
        }

        assert.deepStrictEqual([...emitter.motaCleanTasks.keys()], [4, 5, 6, 7, 8]);
    });
});
