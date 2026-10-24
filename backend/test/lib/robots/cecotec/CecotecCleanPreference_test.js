const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecCleanRouteControlCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecCleanRouteControlCapability");
const CecotecQuirkFactory = require("../../../../lib/robots/cecotec/CecotecQuirkFactory");

/**
 * Robot de agnoc falso: registra lo enviado y guarda la configuración como hace DeviceConfig
 */
function buildFakeAgnocRobot() {
    return {
        sent: [],
        device: {
            config: {
                props: { isRepeatCleanEnabled: false, isBrokenCleanEnabled: true },
                get isRepeatCleanEnabled() {
                    return this.props.isRepeatCleanEnabled;
                },
                get isBrokenCleanEnabled() {
                    return this.props.isBrokenCleanEnabled;
                }
            }
        },
        sendRecv: async function(req, rsp, payload) {
            this.sent.push({ req: req, payload: payload });
        }
    };
}

describe("Cecotec clean preferences", () => {
    it("maps the x2 cleaning (repeatClean) to the intensive route", async () => {
        const agnocRobot = buildFakeAgnocRobot();
        const capability = Object.create(CecotecCleanRouteControlCapability.prototype);
        capability.robot = { robot: agnocRobot };

        assert.strictEqual(await capability.getRoute(), "normal");

        await capability.setRoute("intensive");

        assert.deepStrictEqual(agnocRobot.sent, [{ req: "USER_SET_DEVICE_CLEANPREFERENCE_REQ", payload: { repeatClean: true } }]);
        assert.strictEqual(await capability.getRoute(), "intensive");
        await assert.rejects(capability.setRoute("deep"));
    });

    it("exposes resume after charging (cleanBroken) as a quirk", async () => {
        const agnocRobot = buildFakeAgnocRobot();
        const quirk = new CecotecQuirkFactory({ robot: /** @type {any} */ ({ robot: agnocRobot }) })
            .getQuirk(CecotecQuirkFactory.KNOWN_QUIRKS.RESUME_AFTER_CHARGE);

        assert.strictEqual((await quirk.serialize()).value, "on");

        await quirk.setter("off");

        assert.deepStrictEqual(agnocRobot.sent, [{ req: "USER_SET_DEVICE_CLEANPREFERENCE_REQ", payload: { cleanBroken: false } }]);
        assert.strictEqual((await quirk.serialize()).value, "off");
    });
});
