const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecBatteryGuard = require("../../../../lib/robots/cecotec/CecotecBatteryGuard");

function buildRobot(settings) {
    const robotConfig = { implementation: "CecotecCongaRobot", implementationSpecificConfig: { motaBattery: settings } };
    const calls = [];

    return {
        calls: calls,
        lastCleaningRequest: { type: "mode", mode: "edge" },
        config: {
            get: () => {
                return robotConfig;
            },
            set: (key, value) => {
                Object.assign(robotConfig, value);
            }
        },
        robot: {
            home: async () => {
                calls.push("home");
            }
        },
        isInDoNotDisturb: () => {
            return false;
        },
        repeatCleaningRequest: async (request) => {
            calls.push(["resume", request]);
        }
    };
}

describe("CecotecBatteryGuard", () => {
    it("returns to the dock at the configured level and resumes the same cleanup when charged", () => {
        const robot = buildRobot({ returnAt: 30, resumeAt: 90 });
        const guard = new CecotecBatteryGuard({ robot: /** @type {any} */ (robot) });

        guard.onStateUpdate(45, "cleaning");
        guard.onStateUpdate(30, "cleaning");
        guard.onStateUpdate(29, "cleaning");
        guard.onStateUpdate(28, "returning");
        guard.onStateUpdate(60, "docked");
        guard.onStateUpdate(90, "docked");
        guard.onStateUpdate(91, "docked");

        assert.deepStrictEqual(robot.calls, ["home", ["resume", { type: "mode", mode: "edge" }]]);
    });

    it("does nothing when disabled and persists new settings", () => {
        const robot = buildRobot({ returnAt: 0, resumeAt: 0 });
        const guard = new CecotecBatteryGuard({ robot: /** @type {any} */ (robot) });

        guard.onStateUpdate(5, "cleaning");
        assert.deepStrictEqual(robot.calls, []);

        guard.setSettings({ returnAt: 40 });
        assert.deepStrictEqual(guard.getSettings(), { returnAt: 40, resumeAt: 0 });
    });
});
