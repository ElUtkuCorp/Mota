const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecBatteryGuard = require("../../../../lib/robots/cecotec/CecotecBatteryGuard");

function buildRobot(settings) {
    const robotConfig = { implementation: "CecotecCongaRobot", implementationSpecificConfig: { motaBattery: settings } };
    const calls = [];

    const robotState = {
        calls: calls,
        temporaryMap: false,
        roomsUsable: true,
        isTemporaryMapMode: function() {
            return this.temporaryMap;
        },
        getRemainingCleaningRequest: () => {
            return { type: "segments", segments: [{ id: "2" }] };
        },
        virtualRooms: {
            isUsable: function() {
                return robotState.roomsUsable;
            }
        },
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

    return robotState;
}

describe("CecotecBatteryGuard", () => {
    it("returns to the dock at the configured level and resumes what is left when charged", () => {
        const robot = buildRobot({ returnAt: 30, resumeAt: 90 });
        const guard = new CecotecBatteryGuard({ robot: /** @type {any} */ (robot) });

        guard.onStateUpdate(45, "cleaning");
        guard.onStateUpdate(30, "cleaning");
        guard.onStateUpdate(29, "cleaning");
        guard.onStateUpdate(28, "returning");
        guard.onStateUpdate(60, "docked");
        guard.onStateUpdate(90, "docked");
        guard.onStateUpdate(91, "docked");

        assert.deepStrictEqual(robot.calls, ["home", ["resume", { type: "segments", segments: [{ id: "2" }] }]]);
    });

    it("does not send the robot home in edge or spiral: it would reset the map and get lost", () => {
        const robot = buildRobot({ returnAt: 30, resumeAt: 90 });
        const guard = new CecotecBatteryGuard({ robot: /** @type {any} */ (robot) });

        robot.temporaryMap = true;
        guard.onStateUpdate(20, "cleaning");
        assert.deepStrictEqual(robot.calls, []);
    });

    it("does not resume rooms that belong to another map", () => {
        const robot = buildRobot({ returnAt: 30, resumeAt: 90 });
        const guard = new CecotecBatteryGuard({ robot: /** @type {any} */ (robot) });

        guard.onStateUpdate(29, "cleaning");
        robot.roomsUsable = false;
        guard.onStateUpdate(95, "docked");
        assert.deepStrictEqual(robot.calls, ["home"]);
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
