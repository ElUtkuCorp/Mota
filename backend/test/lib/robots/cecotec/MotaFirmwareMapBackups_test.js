const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { afterEach, beforeEach, describe, it } = require("node:test");

const CecotecFirmwareMapBackups = require("../../../../lib/robots/cecotec/CecotecFirmwareMapBackups");
const CecotecMapRecovery = require("../../../../lib/robots/cecotec/CecotecMapRecovery");
const CecotecMapVersions = require("../../../../lib/robots/cecotec/CecotecMapVersions");
const { StatusStateAttribute } = require("../../../../lib/entities/state/attributes");

const { VALUE: STATUS, FLAG } = StatusStateAttribute;
const DOCKED = { value: STATUS.DOCKED, flag: FLAG.NONE };
const ROOMS = [{ id: 1, name: "Salón", pixels: [1, 2, 3] }];

const wait = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

/**
 * @param {string} vendor
 * @param {string} carto
 * @param {string} resume
 * @param {number} [ageMs] hace cuánto lo escribió el firmware
 */
function writePair(vendor, carto, resume, ageMs = 5 * 60000) {
    const when = new Date(Date.now() - ageMs);

    fs.writeFileSync(path.join(vendor, "carto_slam.data"), Buffer.from(carto.repeat(1000)));
    fs.writeFileSync(path.join(vendor, "resume_data.info"), Buffer.from(resume.repeat(1000)));
    fs.utimesSync(path.join(vendor, "carto_slam.data"), when, when);
    fs.utimesSync(path.join(vendor, "resume_data.info"), when, when);
}

/**
 * @param {string} vendor
 * @returns {{carto: string, resume: string}}
 */
function readPair(vendor) {
    return {
        carto: fs.readFileSync(path.join(vendor, "carto_slam.data")).toString().slice(0, 20),
        resume: fs.readFileSync(path.join(vendor, "resume_data.info")).toString().slice(0, 20),
    };
}

function build(dir, options = {}) {
    const vendor = path.join(dir, "log");
    const reboots = [];
    const imported = [];

    fs.mkdirSync(vendor, { recursive: true });
    writePair(vendor, "bueno-1;", "resume-1;");

    const robot = {
        status: DOCKED,
        rooms: ROOMS,
        floor: new Array(4000).fill(0).map((_, i) => {
            return i;
        }),
        goodMap: true,
        temporaryMode: false,
        mapResetPending: false,
        cleanStartedAt: undefined,
        mapRecovery: { state: "idle" },
        state: {
            getFirstMatchingAttributeByConstructor: () => {
                return robot.status;
            }
        },
        robot: { device: { map: {} } },
        virtualRooms: {
            stale: false,
            hasRooms: () => {
                return robot.rooms.length > 0;
            },
            importData: (data) => {
                imported.push(data);
            }
        },
        mapRetouch: { importEdits: () => {} },
        isGoodMapLoaded: () => {
            return robot.goodMap;
        },
        isTemporaryMapMode: () => {
            return robot.temporaryMode;
        },
        getMapResolution: () => {
            return 0.05;
        },
        getFloorSnapshot: () => {
            return { width: 100, floor: robot.floor };
        },
        getMapSnapshot: () => {
            return { createdAt: Date.now(), width: 100, floor: robot.floor, map: null, rooms: { width: 100, rooms: robot.rooms }, retouch: undefined };
        },
    };
    robot.mapVersions = new CecotecMapVersions({ robot: robot, directory: path.join(dir, "versiones") });

    const backups = new CecotecFirmwareMapBackups({
        robot: robot,
        directory: path.join(dir, "copias-mapa"),
        vendorDirectory: vendor,
        reboot: () => {
            reboots.push(Date.now());
        },
        sync: options.sync ?? (() => {}),
    });

    return { robot: robot, backups: backups, vendor: vendor, reboots: reboots, imported: imported };
}

describe("Mota: copias del par del mapa del firmware", () => {
    let dir;
    const saved = {
        delay: CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS,
        reboot: CecotecFirmwareMapBackups.REBOOT_DELAY_MS,
        afterClean: CecotecFirmwareMapBackups.AFTER_CLEAN_DELAY_MS,
    };

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-copias-"));
        CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS = 0;
        CecotecFirmwareMapBackups.REBOOT_DELAY_MS = 0;
        CecotecFirmwareMapBackups.AFTER_CLEAN_DELAY_MS = 5;
    });
    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
        CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS = saved.delay;
        CecotecFirmwareMapBackups.REBOOT_DELAY_MS = saved.reboot;
        CecotecFirmwareMapBackups.AFTER_CLEAN_DELAY_MS = saved.afterClean;
    });

    it("solo copia en la base, sin limpieza por reanudar y con el mapa bueno", () => {
        const { robot, backups, vendor } = build(dir);
        const reason = () => {
            return backups.getStatus().canBackup.reason;
        };

        assert.deepStrictEqual(backups.getStatus().canBackup, { ok: true });

        robot.status = { value: STATUS.CLEANING, flag: FLAG.NONE };
        assert.match(reason(), /en la base/);
        robot.status = { value: STATUS.DOCKED, flag: FLAG.RESUMABLE };
        assert.match(reason(), /por reanudar/);
        robot.status = DOCKED;

        robot.virtualRooms.stale = true;
        assert.match(reason(), /no es el de las habitaciones/);
        robot.virtualRooms.stale = false;
        robot.goodMap = false;
        assert.match(reason(), /no es el de las habitaciones/);
        robot.goodMap = true;

        robot.temporaryMode = true;
        assert.match(reason(), /mapa temporal/);
        robot.temporaryMode = false;
        robot.mapRecovery.state = "starting";
        assert.match(reason(), /recuperación/);
        robot.mapRecovery.state = "idle";

        // Sin habitaciones: más de 4 m² de suelo y sin borrado pendiente
        robot.rooms = [];
        robot.floor = new Array(1600).fill(0);
        assert.match(reason(), /poco suelo/);
        robot.floor = new Array(1700).fill(0);
        assert.strictEqual(reason(), undefined);
        robot.mapResetPending = true;
        assert.match(reason(), /borrado/);
        robot.mapResetPending = false;

        // Par recién escrito o sin informe de la limpieza
        writePair(vendor, "bueno-1;", "resume-1;", 10000);
        assert.match(reason(), /menos de un minuto/);
        writePair(vendor, "bueno-1;", "resume-1;", 5 * 60000);
        robot.cleanStartedAt = 123;
        assert.match(reason(), /informe/);
        robot.cleanStartedAt = undefined;

        fs.rmSync(path.join(vendor, "resume_data.info"));
        assert.match(reason(), /No se pueden leer/);
    });

    it("guarda la copia comprimida con su meta.json y su versión de Mota, y no repite una igual", async () => {
        const { backups, vendor } = build(dir);
        const copy = await backups.backup();
        const copyDir = path.join(dir, "copias-mapa", copy.id);

        assert.match(copy.id, /^\d{8}-\d{4}$/);
        assert.strictEqual(copy.reason, "manual");
        assert.strictEqual(copy.cartoMd5, CecotecFirmwareMapBackups.MD5(fs.readFileSync(path.join(vendor, "carto_slam.data"))));
        assert.deepStrictEqual(zlib.gunzipSync(fs.readFileSync(path.join(copyDir, "resume_data.info.gz"))), fs.readFileSync(path.join(vendor, "resume_data.info")));
        assert.strictEqual(copy.floorCells, 4000);
        assert.strictEqual(copy.roomCount, 1);
        assert.strictEqual(typeof copy.mapVersionId, "number");
        assert.strictEqual(JSON.parse(fs.readFileSync(path.join(copyDir, "meta.json")).toString()).mapVersionId, copy.mapVersionId);

        const status = backups.getStatus();
        assert.strictEqual(status.copies.length, 1);
        assert.strictEqual(status.copies[0].isActive, true);
        assert.match(status.canBackup.reason, /igual/);
        await assert.rejects(() => {
            return backups.backup();
        }, /igual/);

        // Otro par con las mismas habitaciones: se enlaza con la misma versión
        writePair(vendor, "bueno-2;", "resume-2;");
        const second = await backups.backup();
        assert.strictEqual(second.mapVersionId, copy.mapVersionId);
        assert.strictEqual(backups.robot.mapVersions.list().length, 1);
        assert.strictEqual(backups.robot.mapVersions.list()[0].reason, "firmware_backup");
    });

    it("no copia un par que cambia entre las dos lecturas", async () => {
        const { backups, vendor } = build(dir);

        CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS = 40;
        setTimeout(() => {
            writePair(vendor, "escribiendo;", "resume-x;");
        }, 5);

        await assert.rejects(() => {
            return backups.backup();
        }, (e) => {
            return e.retry === true;
        });
        assert.strictEqual(backups.list().length, 0);
    });

    it("guarda como mucho 3 copias normales, las más recientes", async () => {
        const { backups, vendor } = build(dir);
        const ids = [];

        for (let i = 1; i <= 5; i++) {
            writePair(vendor, `mapa-${i};`, `resume-${i};`);
            ids.push((await backups.backup()).id);
        }

        assert.deepStrictEqual(backups.list().map(c => {
            return c.id;
        }), ids.slice(2).reverse());
    });

    it("restaura: guarda el par activo como before_restore, sustituye el par, recupera las habitaciones y reinicia", async () => {
        const { robot, backups, vendor, reboots, imported } = build(dir);
        const good = await backups.backup();

        writePair(vendor, "temporal;", "resume-t;");
        robot.rooms = [{ id: 1, name: "Otra", pixels: [9] }];
        assert.strictEqual(backups.getRestorableId(), good.id);

        assert.deepStrictEqual(backups.restore(good.id), { rebootInSeconds: 0 });
        assert.deepStrictEqual(readPair(vendor), { carto: "bueno-1;".repeat(3).slice(0, 20), resume: "resume-1;".repeat(3).slice(0, 20) });
        assert.deepStrictEqual(fs.readdirSync(vendor).sort(), ["carto_slam.data", "resume_data.info"]);
        assert.strictEqual(imported.length, 1);
        assert.deepStrictEqual(imported[0].rooms, ROOMS);

        const before = backups.list().find(c => {
            return c.reason === "before_restore";
        });
        assert.ok(before);
        assert.strictEqual(zlib.gunzipSync(fs.readFileSync(path.join(dir, "copias-mapa", before.id, "carto_slam.data.gz"))).toString().slice(0, 9), "temporal;");
        assert.strictEqual(backups.getStatus().restoring, true);
        assert.match(backups.getStatus().canRestore.reason, /restaurando/);

        await wait(10);
        assert.strictEqual(reboots.length, 1);
    });

    it("solo queda una copia before_restore y no cuenta para el máximo", async () => {
        const { backups, vendor } = build(dir);
        const a = await backups.backup();

        writePair(vendor, "mapa-b;", "resume-b;");
        const b = await backups.backup();
        writePair(vendor, "mapa-c;", "resume-c;");
        await backups.backup();

        backups.restore(a.id);
        backups.restoring = false;
        backups.restore(b.id);
        backups.restoring = false;

        const copies = backups.list();
        assert.strictEqual(copies.filter(c => {
            return c.reason === "before_restore";
        }).length, 1);
        assert.strictEqual(copies.filter(c => {
            return c.reason !== "before_restore";
        }).length, 3);
        backups.shutdown();
    });

    it("si falla antes del rename no toca el par ni deja temporales", async () => {
        const syncCalls = [];
        const { backups, vendor, reboots } = build(dir, {
            sync: () => {
                syncCalls.push(1);
                throw new Error("sync ha fallado");
            }
        });
        const good = await backups.backup();

        writePair(vendor, "temporal;", "resume-t;");
        assert.throws(() => {
            backups.restore(good.id);
        }, /sync ha fallado.*no se ha tocado/);

        assert.strictEqual(readPair(vendor).carto.slice(0, 9), "temporal;");
        assert.deepStrictEqual(fs.readdirSync(vendor).sort(), ["carto_slam.data", "resume_data.info"]);
        assert.strictEqual(backups.list().length, 1);
        assert.strictEqual(backups.restoring, false);
        await wait(10);
        assert.strictEqual(reboots.length, 0);
    });

    it("rechaza una copia cuyo contenido no coincide con el md5 guardado", async () => {
        const { backups, vendor, reboots } = build(dir);
        const good = await backups.backup();

        fs.writeFileSync(path.join(dir, "copias-mapa", good.id, "carto_slam.data.gz"), zlib.gzipSync(Buffer.from("otra cosa")));
        writePair(vendor, "temporal;", "resume-t;");

        assert.throws(() => {
            backups.restore(good.id);
        }, /dañada/);
        assert.strictEqual(readPair(vendor).carto.slice(0, 9), "temporal;");
        assert.deepStrictEqual(fs.readdirSync(vendor).sort(), ["carto_slam.data", "resume_data.info"]);
        await wait(10);
        assert.strictEqual(reboots.length, 0);
    });

    it("solo restaura en la base, parado y sin recuperación en marcha", async () => {
        const { robot, backups, vendor } = build(dir);
        const good = await backups.backup();

        writePair(vendor, "temporal;", "resume-t;");
        robot.status = { value: STATUS.CLEANING, flag: FLAG.NONE };
        assert.throws(() => {
            backups.restore(good.id);
        }, /en la base/);
        robot.status = { value: STATUS.DOCKED, flag: FLAG.RESUMABLE };
        assert.throws(() => {
            backups.restore(good.id);
        }, /por reanudar/);
        robot.status = DOCKED;
        robot.mapRecovery.state = "returning";
        assert.throws(() => {
            backups.restore(good.id);
        }, /recuperación/);
        robot.mapRecovery.state = "idle";

        writePair(vendor, "bueno-1;", "resume-1;");
        assert.throws(() => {
            backups.restore(good.id);
        }, /ya es el mapa activo/);
        assert.throws(() => {
            backups.restore("../log");
        }, /No existe/);
    });

    it("la descarga es un tar.gz con los dos archivos sin comprimir y meta.json", async () => {
        const { backups, vendor } = build(dir);
        const copy = await backups.backup();
        const tar = zlib.gunzipSync(backups.getArchive(copy.id));
        const entries = [];

        for (let offset = 0; offset + 512 <= tar.length;) {
            const header = tar.subarray(offset, offset + 512);

            if (header.every(b => {
                return b === 0;
            })) {
                break;
            }

            const field = (start, length) => {
                return header.subarray(start, start + length).toString("ascii").replace(/\0.*$/s, "").trim();
            };
            let checksum = 0;
            for (let i = 0; i < 512; i++) {
                checksum += i >= 148 && i < 156 ? 32 : header[i];
            }
            assert.strictEqual(parseInt(field(148, 8), 8), checksum);
            assert.strictEqual(field(257, 6), "ustar");
            assert.strictEqual(field(156, 1), "0");

            const size = parseInt(field(124, 12), 8);
            entries.push({ name: field(0, 100), data: tar.subarray(offset + 512, offset + 512 + size) });
            offset += 512 + Math.ceil(size / 512) * 512;
        }

        assert.deepStrictEqual(entries.map(e => {
            return e.name;
        }), ["carto_slam.data", "resume_data.info", "meta.json"]);
        assert.deepStrictEqual(entries[0].data, fs.readFileSync(path.join(vendor, "carto_slam.data")));
        assert.deepStrictEqual(entries[1].data, fs.readFileSync(path.join(vendor, "resume_data.info")));
        assert.strictEqual(JSON.parse(entries[2].data.toString()).id, copy.id);
        assert.strictEqual(tar.length % 512, 0);
    });

    it("borra una copia", async () => {
        const { backups } = build(dir);
        const copy = await backups.backup();

        backups.delete(copy.id);
        assert.strictEqual(backups.list().length, 0);
        assert.throws(() => {
            backups.delete("../../x");
        }, /no válido/);
    });

    it("automáticas: desactivadas por defecto; con ellas, copia antes de una limpieza nueva con el par ya verificado en la base", () => {
        const { backups } = build(dir);
        const cleaning = { value: STATUS.CLEANING, flag: FLAG.NONE };

        CecotecFirmwareMapBackups.DOUBLE_READ_DELAY_MS = 10000;

        backups.onDeviceUpdate(DOCKED, DOCKED);
        backups.onDeviceUpdate(DOCKED, cleaning);
        assert.strictEqual(backups.list().length, 0);

        backups.setAutoEnabled(true);
        assert.strictEqual(backups.getStatus().autoEnabled, true);

        // Recién leído en la base: falta la segunda lectura separada
        backups.onDeviceUpdate(DOCKED, DOCKED);
        backups.onDeviceUpdate(DOCKED, cleaning);
        assert.strictEqual(backups.list().length, 0);

        backups.dockedCheck.at -= 20000;
        backups.onDeviceUpdate({ value: STATUS.DOCKED, flag: FLAG.RESUMABLE }, cleaning);
        assert.strictEqual(backups.list().length, 0);

        backups.onDeviceUpdate(DOCKED, cleaning);
        assert.deepStrictEqual(backups.list().map(c => {
            return c.reason;
        }), ["before_clean"]);
    });

    it("automáticas: copia tras una limpieza correcta en la base, nunca con una limpieza por reanudar", async () => {
        const { robot, backups, vendor } = build(dir);

        backups.setAutoEnabled(true);
        robot.status = { value: STATUS.DOCKED, flag: FLAG.RESUMABLE };
        backups.onCleanReport(false);
        await wait(30);
        assert.strictEqual(backups.list().length, 0);

        // Empieza una limpieza nueva: lo pendiente se descarta
        backups.onDeviceUpdate(DOCKED, { value: STATUS.CLEANING, flag: FLAG.NONE });
        assert.strictEqual(backups.afterClean.pending, false);

        writePair(vendor, "final;", "resume-f;");
        robot.status = DOCKED;
        backups.onCleanReport(false);
        await wait(30);
        assert.deepStrictEqual(backups.list().map(c => {
            return c.reason;
        }), ["after_clean"]);

        // Bordes o espiral: no
        writePair(vendor, "bordes;", "resume-b;");
        backups.onCleanReport(true);
        await wait(30);
        assert.strictEqual(backups.list().length, 1);
        backups.shutdown();
    });

    it("el aviso de mapa temporal dice si hay una copia restaurable", async () => {
        const { robot, backups, vendor } = build(dir);
        const copy = await backups.backup();

        robot.hasTemporaryFirmwareMap = () => {
            return true;
        };
        robot.firmwareMapBackups = backups;
        const recovery = new CecotecMapRecovery({ robot: robot });

        // El par activo es el de la copia: restaurarla no cambiaría nada
        assert.strictEqual(recovery.getStatus().backupAvailable, null);
        writePair(vendor, "temporal;", "resume-t;");
        assert.strictEqual(recovery.getStatus().backupAvailable, copy.id);
        robot.hasTemporaryFirmwareMap = () => {
            return false;
        };
        assert.strictEqual(recovery.getStatus().backupAvailable, null);
    });
});
