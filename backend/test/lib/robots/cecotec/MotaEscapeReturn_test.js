const assert = require("node:assert");
const { describe, it, mock } = require("node:test");

const BasicControlCapability = require("../../../../lib/core/capabilities/BasicControlCapability");
const CecotecEscapeReturn = require("../../../../lib/robots/cecotec/CecotecEscapeReturn");
const { StatusStateAttribute } = require("../../../../lib/entities/state/attributes");

const { VALUE: STATUS } = StatusStateAttribute;

/**
 * @param {number} battery
 */
function build(battery = 60) {
    const homes = [];
    const events = [];
    let status = new StatusStateAttribute({ value: STATUS.CLEANING });
    const agnoc = { device: { motaRawFaultCode: 0, battery: { value: battery } } };
    const robot = {
        robot: agnoc,
        valetudoEventStore: {
            raise: (event) => {
                events.push(event.metaData);
            }
        },
        state: {
            getFirstMatchingAttributeByConstructor: () => {
                return status;
            }
        },
        capabilities: {
            [BasicControlCapability.TYPE]: {
                home: async () => {
                    homes.push(status.value);
                }
            }
        }
    };
    const escape = new CecotecEscapeReturn({ robot: robot });
    const firmware = (code, value) => {
        agnoc.device.motaRawFaultCode = code;
        status = new StatusStateAttribute({ value: value });
        escape.onDeviceUpdate(status);
    };

    return { escape: escape, homes: homes, events: events, firmware: firmware, agnoc: agnoc };
}

const settle = async () => {
    mock.timers.tick(CecotecEscapeReturn.SETTLE_MS);
    await new Promise(resolve => {
        setImmediate(resolve);
    });
};

const withTimers = async (fn) => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
        await fn();
    } finally {
        mock.timers.reset();
    }
};

describe("Mota: volver a la base tras el atasco (514)", () => {
    it("con batería lo manda volver una vez y avisa", async () => {
        await withTimers(async () => {
            const { homes, events, firmware } = build(60);

            firmware(514, STATUS.ERROR);
            firmware(514, STATUS.ERROR);
            assert.deepStrictEqual(homes, []);

            await settle();
            assert.deepStrictEqual(homes, [STATUS.ERROR]);
            assert.deepStrictEqual(events, [{ sent: true, battery: 60 }]);
        });
    });

    it("sin bucles: si vuelve a atascarse antes de llegar a la base, solo avisa", async () => {
        await withTimers(async () => {
            const { homes, events, firmware } = build(60);

            firmware(514, STATUS.ERROR);
            await settle();
            firmware(0, STATUS.RETURNING);
            firmware(514, STATUS.ERROR);
            await settle();

            assert.strictEqual(homes.length, 1);
            assert.deepStrictEqual(events[1], { sent: false, reason: "already_tried", battery: 60 });

            // En la base se rearma
            firmware(0, STATUS.DOCKED);
            firmware(0, STATUS.CLEANING);
            firmware(514, STATUS.ERROR);
            await settle();
            assert.strictEqual(homes.length, 2);
        });
    });

    it("con poca batería no lo manda", async () => {
        await withTimers(async () => {
            const { homes, events, firmware } = build(CecotecEscapeReturn.MIN_BATTERY - 1);

            firmware(514, STATUS.ERROR);
            await settle();

            assert.deepStrictEqual(homes, []);
            assert.strictEqual(events[0].reason, "low_battery");
        });
    });

    it("no hace nada si el fallo se ha ido o ya vuelve", async () => {
        await withTimers(async () => {
            const { homes, events, firmware } = build(60);

            firmware(514, STATUS.ERROR);
            firmware(0, STATUS.IDLE);
            await settle();
            firmware(514, STATUS.RETURNING);
            await settle();

            assert.deepStrictEqual(homes, []);
            assert.deepStrictEqual(events, []);
        });
    });

    it("al apagar Mota no queda nada pendiente", async () => {
        await withTimers(async () => {
            const { escape, homes, firmware } = build(60);

            firmware(514, STATUS.ERROR);
            escape.shutdown();
            await settle();

            assert.deepStrictEqual(homes, []);
        });
    });

    it("un fallo al mandar volver no rompe nada", async () => {
        await withTimers(async () => {
            const { escape, firmware } = build(60);

            escape.robot.capabilities[BasicControlCapability.TYPE].home = async () => {
                throw new Error("timeout");
            };
            firmware(514, STATUS.ERROR);
            await settle();

            assert.strictEqual(escape.used, true);
        });
    });
});
