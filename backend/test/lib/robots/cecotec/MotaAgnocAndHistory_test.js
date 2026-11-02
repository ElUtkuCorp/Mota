const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it } = require("node:test");

const CecotecCleanHistory = require("../../../../lib/robots/cecotec/CecotecCleanHistory");
const { DeviceErrorMapper } = require("@agnoc/core/lib/mappers/device-error.mapper");
const { DeviceModeMapper } = require("@agnoc/core/lib/mappers/device-mode.mapper");
const { DeviceStateMapper } = require("@agnoc/core/lib/mappers/device-state.mapper");

describe("agnoc (Mota fork) mappers", () => {
    it("maps edge and spiral work modes and tolerates unknown codes", () => {
        assert.strictEqual(DeviceModeMapper.toDomain(25).value, "edge");
        assert.strictEqual(DeviceModeMapper.toDomain(29).value, "edge");
        assert.strictEqual(DeviceModeMapper.toDomain(20).value, "spiral");
        assert.strictEqual(DeviceModeMapper.toDomain(49).value, "none");
        assert.strictEqual(DeviceStateMapper.toDomain({ type: 0, workMode: 49, chargeStatus: false }).value, "idle");
        assert.strictEqual(DeviceErrorMapper.toDomain(9999).value, "unknown");
    });
});

describe("CecotecCleanHistory", () => {
    it("keeps interrupted cleans out of the totals and replaces them with the final report", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-history-"));
        const history = new CecotecCleanHistory({ directory: directory });

        try {
            history.storeInterrupted(1000, { time: 1200, area: 500 }, { entities: [] });
            history.storeInterrupted(1000, { time: 1500, area: 600 }, { entities: [] });
            history.storeInterrupted(9000, { time: 60, area: 10 });

            assert.strictEqual(history.list().length, 2);
            assert.strictEqual(history.list()[1].result, "interrupted");
            assert.strictEqual(history.list()[1].durationSeconds, 1500);
            assert.strictEqual(history.list()[1].hasMotaMap, true);
            assert.deepStrictEqual(history.getMotaMap(1000), { entities: [] });
            assert.strictEqual(history.getTotals().count, 0);

            history.store({ cleanId: 990, task: { startTime: 990, endTime: 3000 } }, { time: 2000, area: 700 });

            assert.deepStrictEqual(history.list().map(e => {
                return e.cleanId;
            }), [9000, 990]);
            assert.strictEqual(history.getMotaMap(1000), undefined);
            assert.strictEqual(history.getTotals().count, 1);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    it("stores reports with their map and keeps only the latest entries", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-history-"));
        const history = new CecotecCleanHistory({ directory: directory });
        const originalMax = CecotecCleanHistory.MAX_ENTRIES;
        CecotecCleanHistory.MAX_ENTRIES = 2;

        try {
            for (const id of [100, 200, 300]) {
                history.store({ cleanId: id, task: { startTime: id, endTime: id + 60 }, mapdata: Buffer.from([1, 2, 3]) }, { time: 60, area: 500 });
            }

            const entries = history.list();
            assert.deepStrictEqual(entries.map(e => {
                return e.cleanId;
            }), [300, 200]);
            assert.strictEqual(entries[0].durationSeconds, 60);
            assert.ok(fs.existsSync(path.join(directory, "300.png")));
            assert.ok(!fs.existsSync(path.join(directory, "100.png")));
        } finally {
            CecotecCleanHistory.MAX_ENTRIES = originalMax;
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});
