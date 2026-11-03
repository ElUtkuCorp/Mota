const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { afterEach, beforeEach, describe, it } = require("node:test");

const CecotecStorage = require("../../../../lib/robots/cecotec/CecotecStorage");

// De más antiguo a más reciente dentro de cada familia
const ROTATED = [
    "1780_20261030-101010_app_logfile.txt.gz",
    "1783_20261101-212049_app_logfile.txt.gz",
    "1791_20261103-030024_app_logfile.txt.gz",
    "1780_0_20261030-101010_logfile.txt.gz",
    "1784_0_E20261102-201653_logfile.txt.gz",
    "1791_0_20261102-225046_logfile.txt.gz",
    "1780_0_client_file.log.gz",
    "1784_0_Eclient_file.log.gz",
    "1789_1_client_file.log.gz",
    "20261020-080000_wifimanager.txt.gz",
    "20261028-071938_wifimanager.txt.gz",
    "2026113-102636_wifimanager.txt.gz",
    "550_20190101-000000_upgrade.txt",
    "557_20190304-235416_upgrade.txt",
];
// Nada de esto se borra nunca
const PROTECTED = [
    "app_logfile.temp",
    "1792_0_20261103-100000_logfile.temp",
    "client_file.temp",
    "carto_slam.data",
    "resume_data.info",
    "map.png",
    "1790_dock_record.txt.gz",
    "1790_unfinished_map.txt.gz",
    "1790_20261101-000000_resume_app_logfile.txt.gz",
    "log_config.ini",
    "1790_20261101-000000_otro.txt",
    "558_20190304-235416_upgrade.temp",
    "desconocido.gz",
];

describe("Mota: espacio en UDISK", () => {
    let dir;
    let storage;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-udisk-"));
        const log = path.join(dir, "log");
        const mota = path.join(dir, "valetudo");

        fs.mkdirSync(log);
        fs.mkdirSync(path.join(mota, "copias-mapa", "20261103-2019"), { recursive: true });
        fs.writeFileSync(path.join(mota, "valetudo"), Buffer.alloc(1000));
        fs.writeFileSync(path.join(mota, "valetudo.prev"), Buffer.alloc(500));
        fs.writeFileSync(path.join(mota, "valetudo_config.json"), Buffer.alloc(30));
        fs.writeFileSync(path.join(mota, "copias-mapa", "20261103-2019", "carto_slam.data.gz"), Buffer.alloc(70));

        ROTATED.forEach((name, i) => {
            const when = new Date(Date.UTC(2026, 9, 1) + i * 60000);

            fs.writeFileSync(path.join(log, name), Buffer.alloc(100));
            fs.utimesSync(path.join(log, name), when, when);
        });
        PROTECTED.forEach(name => {
            fs.writeFileSync(path.join(log, name), Buffer.alloc(name === "carto_slam.data" ? 400 : 10));
        });

        storage = new CecotecStorage({ udiskPath: dir, motaDirectory: mota, vendorLogDirectory: log });
    });
    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("clasifica los nombres reales por familias y no reconoce nada protegido", () => {
        assert.deepStrictEqual(ROTATED.map(CecotecStorage.GET_FAMILY), [
            "app_logfile", "app_logfile", "app_logfile",
            "logfile", "logfile", "logfile",
            "client_file", "client_file", "client_file",
            "wifimanager", "wifimanager", "wifimanager",
            "upgrade", "upgrade",
        ]);
        PROTECTED.forEach(name => {
            assert.strictEqual(CecotecStorage.GET_FAMILY(name), undefined, name);
        });
    });

    it("suma las partes del espacio y propone los logs que sobran", () => {
        const status = storage.getStatus();

        assert.ok(status.totalBytes > 0 && status.freeBytes > 0);
        assert.strictEqual(status.reserveBytes, 10 * 1024 * 1024);
        assert.deepStrictEqual(status.parts, {
            motaBinaries: 1500,
            motaData: 30,
            mapBackups: 70,
            vendorLogs: ROTATED.length * 100 + 10 * 7,
            vendorMap: 400 + 10 * 5,
        });
        assert.strictEqual(status.cleanup.keep, 2);
        assert.deepStrictEqual(status.cleanup.files.map(f => {
            return f.name;
        }), [
            "1780_0_20261030-101010_logfile.txt.gz",
            "1780_0_client_file.log.gz",
            "1780_20261030-101010_app_logfile.txt.gz",
            "20261020-080000_wifimanager.txt.gz",
        ]);
        assert.strictEqual(status.cleanup.bytes, 400);
    });

    it("borra solo los rotados que sobran y deja todo lo protegido", () => {
        const result = storage.cleanup(1);
        const left = fs.readdirSync(path.join(dir, "log"));

        assert.strictEqual(result.deleted.length, 9);
        assert.strictEqual(result.freedBytes, 900);
        PROTECTED.forEach(name => {
            assert.ok(left.includes(name), name);
        });
        ["1791_20261103-030024_app_logfile.txt.gz", "1791_0_20261102-225046_logfile.txt.gz", "1789_1_client_file.log.gz",
            "2026113-102636_wifimanager.txt.gz", "557_20190304-235416_upgrade.txt"].forEach(name => {
            assert.ok(left.includes(name), name);
        });
        assert.deepStrictEqual(storage.cleanup(1), { deleted: [], freedBytes: 0 });
    });

    it("valida keep", () => {
        [0, 11, 1.5, "2", undefined, null].forEach(keep => {
            assert.throws(() => {
                CecotecStorage.ASSERT_KEEP(keep);
            }, /entre 1 y 10/);
        });
        CecotecStorage.ASSERT_KEEP(10);
    });
});
