const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecDoNotDisturbCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecDoNotDisturbCapability");
const ValetudoDNDConfiguration = require("../../../../lib/entities/core/ValetudoDNDConfiguration");
const {DeviceQuietHours, DeviceTime} = require("@agnoc/core");

/**
 * Robot falso que guarda las "quiet hours" tal y como las recibiría el firmware (UTC + sync_time_diff, 2 h por defecto)
 */
function buildCapability() {
    const fakeAgnocRobot = {
        quietHours: undefined,
        setQuietHours: async function(quietHours) {
            this.quietHours = quietHours;
        },
        getQuietHours: async function() {
            return this.quietHours;
        }
    };

    const capability = Object.create(CecotecDoNotDisturbCapability.prototype);
    capability.robot = { robot: fakeAgnocRobot };

    return { capability: capability, fakeAgnocRobot: fakeAgnocRobot };
}

/**
 * Comprobación del firmware (CQuietHourControl::isNowTimeInQuietHours)
 * @param {number} begin
 * @param {number} end
 * @param {number} now
 * @returns {boolean}
 */
function isQuiet(begin, end, now) {
    return now <= end - 0.5 || (end - 0.5 < 1440 && now >= begin - 0.5);
}

describe("CecotecDoNotDisturbCapability", () => {
    it("converts the UTC configuration to the firmware's time and back", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        // 19:30–06:00 UTC equivale a 20:30–07:00 en España (invierno)
        await capability.setDndConfiguration(new ValetudoDNDConfiguration({
            enabled: true,
            start: { hour: 19, minute: 30 },
            end: { hour: 6, minute: 0 }
        }));

        assert.strictEqual(fakeAgnocRobot.quietHours.begin.toMinutes(), 1290);
        assert.strictEqual(fakeAgnocRobot.quietHours.end.toMinutes(), 480);

        const roundTrip = await capability.getDndConfiguration();

        assert.deepStrictEqual(roundTrip.start, { hour: 19, minute: 30 });
        assert.deepStrictEqual(roundTrip.end, { hour: 6, minute: 0 });
        assert.strictEqual(roundTrip.enabled, true);
    });

    it("leaves the firmware out of do not disturb outside the period", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        await capability.setDndConfiguration(new ValetudoDNDConfiguration({
            enabled: true,
            start: { hour: 19, minute: 30 },
            end: { hour: 6, minute: 0 }
        }));

        const begin = fakeAgnocRobot.quietHours.begin.toMinutes();
        const end = fakeAgnocRobot.quietHours.end.toMinutes();

        assert.strictEqual(isQuiet(begin, end, 12 * 60), false);
        assert.strictEqual(isQuiet(begin, end, 23 * 60), true);
        assert.strictEqual(isQuiet(begin, end, 3 * 60), true);
        // Lo que guardaba Mota antes: 03:30–14:00 deja el firmware siempre en "no molestar"
        assert.strictEqual([0, 300, 720, 1000, 1439].every(now => isQuiet(210, 840, now)), true);
    });

    it("rejects periods the firmware cannot evaluate", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        for (const [start, end] of [[8, 12], [20, 20], [10, 22]]) {
            await assert.rejects(capability.setDndConfiguration(new ValetudoDNDConfiguration({
                enabled: true,
                start: { hour: start, minute: 0 },
                end: { hour: end, minute: 0 }
            })));
        }

        assert.strictEqual(fakeAgnocRobot.quietHours, undefined);
    });

    it("accepts any period while it is disabled", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        await capability.setDndConfiguration(new ValetudoDNDConfiguration({
            enabled: false,
            start: { hour: 8, minute: 0 },
            end: { hour: 12, minute: 0 }
        }));

        assert.strictEqual(fakeAgnocRobot.quietHours.isEnabled, false);
    });

    it("wraps around midnight when reading the robot's configuration", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        fakeAgnocRobot.quietHours = new DeviceQuietHours({
            isEnabled: false,
            begin: new DeviceTime({ hour: 1, minute: 15 }),
            end: new DeviceTime({ hour: 7, minute: 0 })
        });

        const config = await capability.getDndConfiguration();

        assert.deepStrictEqual(config.start, { hour: 23, minute: 15 });
        assert.deepStrictEqual(config.end, { hour: 5, minute: 0 });
        assert.strictEqual(config.enabled, false);
    });
});
