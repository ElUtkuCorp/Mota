const assert = require("node:assert");
const { describe, it, before, after } = require("node:test");

const CecotecDoNotDisturbCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecDoNotDisturbCapability");
const ValetudoDNDConfiguration = require("../../../../lib/entities/core/ValetudoDNDConfiguration");
const {DeviceQuietHours, DeviceTime} = require("@agnoc/core");

/**
 * Robot falso que guarda las "quiet hours" tal y como las recibiría el firmware (hora local del robot)
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

describe("CecotecDoNotDisturbCapability", () => {
    let originalTZ;

    before(() => {
        originalTZ = process.env.TZ;
        // UTC+8 sin horario de verano, como el CST-8 fijo de la 3090 (nombre IANA: el formato POSIX no se
        // reconoce en todas las plataformas donde corren los tests)
        process.env.TZ = "Asia/Shanghai";
    });

    after(() => {
        if (originalTZ === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = originalTZ;
        }
    });

    it("converts the UTC configuration to the robot's local time and back", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        // 18:00–05:00 UTC equivale a 20:00–07:00 en España (verano)
        await capability.setDndConfiguration(new ValetudoDNDConfiguration({
            enabled: true,
            start: { hour: 18, minute: 0 },
            end: { hour: 5, minute: 30 }
        }));

        assert.strictEqual(fakeAgnocRobot.quietHours.begin.hour, 2);
        assert.strictEqual(fakeAgnocRobot.quietHours.begin.minute, 0);
        assert.strictEqual(fakeAgnocRobot.quietHours.end.hour, 13);
        assert.strictEqual(fakeAgnocRobot.quietHours.end.minute, 30);

        const roundTrip = await capability.getDndConfiguration();

        assert.deepStrictEqual(roundTrip.start, { hour: 18, minute: 0 });
        assert.deepStrictEqual(roundTrip.end, { hour: 5, minute: 30 });
        assert.strictEqual(roundTrip.enabled, true);
    });

    it("wraps around midnight when reading the robot's configuration", async () => {
        const { capability, fakeAgnocRobot } = buildCapability();

        fakeAgnocRobot.quietHours = new DeviceQuietHours({
            isEnabled: false,
            begin: new DeviceTime({ hour: 3, minute: 15 }),
            end: new DeviceTime({ hour: 7, minute: 0 })
        });

        const config = await capability.getDndConfiguration();

        assert.deepStrictEqual(config.start, { hour: 19, minute: 15 });
        assert.deepStrictEqual(config.end, { hour: 23, minute: 0 });
        assert.strictEqual(config.enabled, false);
    });
});
