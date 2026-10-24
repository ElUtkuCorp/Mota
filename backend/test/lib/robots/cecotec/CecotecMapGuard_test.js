const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it } = require("node:test");

const CecotecMapGuard = require("../../../../lib/robots/cecotec/CecotecMapGuard");

function square(width, x0, y0, size) {
    const floor = [];

    for (let y = y0; y < y0 + size; y++) {
        for (let x = x0; x < x0 + size; x++) {
            floor.push(y * width + x);
        }
    }

    return { width: width, floor: floor };
}

describe("CecotecMapGuard", () => {
    it("computes the similarity as intersection over union", () => {
        assert.strictEqual(CecotecMapGuard.SIMILARITY(square(100, 0, 0, 10), square(100, 0, 0, 10)), 100);
        assert.strictEqual(CecotecMapGuard.SIMILARITY(square(100, 0, 0, 10), square(100, 5, 0, 10)), 33);
    });

    it("stores the first reference, warns on big changes and accepts the new map on request", () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-mapguard-"));
        const robotConfig = { implementationSpecificConfig: { motaMapGuard: { threshold: 80 } } };
        const raised = [];
        const guard = new CecotecMapGuard({
            robot: /** @type {any} */ ({
                config: { get: () => {
                    return robotConfig;
                } },
                valetudoEventStore: { raise: (event) => {
                    raised.push(event);
                } }
            }),
            referencePath: path.join(directory, "ref.json")
        });

        try {
            guard.check(square(100, 0, 0, 10));
            guard.check(square(100, 1, 0, 10));
            assert.strictEqual(raised.length, 0);

            guard.check(square(100, 5, 0, 10));
            assert.strictEqual(raised.length, 1);
            assert.strictEqual(raised[0].metaData.similarity, 33);

            guard.resolve(true);
            guard.check(square(100, 5, 0, 10));
            assert.strictEqual(raised.length, 1);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});
