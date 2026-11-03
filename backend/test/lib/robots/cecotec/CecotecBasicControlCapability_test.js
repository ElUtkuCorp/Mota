const assert = require("node:assert");
const { describe, it, mock } = require("node:test");
const { EventEmitter } = require("events");

const CecotecBasicControlCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecBasicControlCapability");
const { StatusStateAttribute } = require("../../../../lib/entities/state/attributes");

const { VALUE: STATUS } = StatusStateAttribute;

/**
 * Robot falso: el firmware cambia de estado y de evento cuando el test lo dice
 *
 * @param {string} status
 */
function build(status) {
    const orders = [];
    const agnoc = new EventEmitter();
    let current = status;

    agnoc.device = { motaRawFaultCode: 2105, battery: { value: 60 } };
    for (const name of ["start", "home", "pause", "stop"]) {
        agnoc[name] = async () => {
            orders.push(name);
        };
    }

    const events = [];
    const robot = {
        robot: agnoc,
        valetudoEventStore: {
            raise: (event) => {
                events.push(event.id);
            }
        },
        state: {
            getFirstMatchingAttributeByConstructor: () => {
                return { value: current };
            }
        }
    };
    const capability = new CecotecBasicControlCapability({ robot: robot });
    const firmware = (code, newStatus) => {
        agnoc.device.motaRawFaultCode = code;
        current = newStatus ?? current;
        agnoc.emit("updateDevice");
    };

    return { capability: capability, orders: orders, events: events, firmware: firmware };
}

// Avanza el reloj en pasos de un segundo, como el comprobador
const wait = (ms) => {
    for (let i = 0; i < ms; i += 1000) {
        mock.timers.tick(1000);
    }
};

const withTimers = async (fn) => {
    mock.timers.enable({ apis: ["setTimeout", "Date"] });
    try {
        await fn();
    } finally {
        mock.timers.reset();
    }
};

describe("Mota: vuelta segura desde pausa", () => {
    it("reanuda, espera 30 s tras el 2108 y entonces manda a casa", async () => {
        await withTimers(async () => {
            const { capability, orders, firmware } = build(STATUS.PAUSED);

            await capability.home();
            assert.deepStrictEqual(orders, ["start"]);

            wait(3000);
            firmware(2108, STATUS.CLEANING);
            wait(29000);
            assert.deepStrictEqual(orders, ["start"]);

            wait(2000);
            assert.deepStrictEqual(orders, ["start", "home"]);
            assert.strictEqual(capability.safeReturn, undefined);
        });
    });

    it("no se fía de un 2108 anterior a la orden", async () => {
        await withTimers(async () => {
            const { capability, orders, firmware } = build(STATUS.PAUSED);

            firmware(2108);
            await capability.home();
            firmware(2108, STATUS.CLEANING);
            wait(5000);
            firmware(2105);
            firmware(2108);
            wait(29000);
            assert.deepStrictEqual(orders, ["start"]);

            wait(2000);
            assert.deepStrictEqual(orders, ["start", "home"]);
        });
    });

    it("sin 2108 a tiempo no lo manda a casa: lo vuelve a pausar y avisa", async () => {
        await withTimers(async () => {
            const { capability, orders, events, firmware } = build(STATUS.PAUSED);

            await capability.home();
            firmware(2105, STATUS.CLEANING);
            wait(19000);
            assert.deepStrictEqual(orders, ["start"]);

            wait(2000);
            assert.deepStrictEqual(orders, ["start", "pause"]);
            assert.deepStrictEqual(events, ["mota_safe_return"]);

            wait(60000);
            assert.deepStrictEqual(orders, ["start", "pause"]);
            assert.strictEqual(capability.safeReturn, undefined);
        });
    });

    it("no manda a casa si el robot falla o vuelve a pausa", async () => {
        await withTimers(async () => {
            for (const status of [STATUS.ERROR, STATUS.PAUSED]) {
                const { capability, orders, firmware } = build(STATUS.PAUSED);

                await capability.home();
                firmware(2108, STATUS.CLEANING);
                wait(12000);
                firmware(501, status);
                wait(40000);

                assert.deepStrictEqual(orders, ["start"], status);
                assert.strictEqual(capability.safeReturn, undefined);
            }
        });
    });

    it("pausar o parar durante la espera la cancela", async () => {
        await withTimers(async () => {
            const { capability, orders, firmware } = build(STATUS.PAUSED);

            await capability.home();
            firmware(2108, STATUS.CLEANING);
            await capability.pause();
            wait(60000);

            assert.deepStrictEqual(orders, ["start", "pause"]);
        });
    });

    it("pulsar otra vez volver a la base no reanuda dos veces", async () => {
        await withTimers(async () => {
            const { capability, orders } = build(STATUS.PAUSED);

            await capability.home();
            await capability.home();

            assert.deepStrictEqual(orders, ["start"]);
            capability.cancelSafeReturn("test");
        });
    });

    it("limpiando o parado manda a casa directamente", async () => {
        for (const status of [STATUS.CLEANING, STATUS.IDLE, STATUS.MOVING]) {
            const { capability, orders } = build(status);

            await capability.home();
            assert.deepStrictEqual(orders, ["home"], status);
        }
    });

    it("si el robot no acepta reanudar, falla y no queda nada pendiente", async () => {
        const { capability } = build(STATUS.PAUSED);

        capability.robot.robot.start = async () => {
            throw new Error("timeout");
        };

        await assert.rejects(capability.home(), /timeout/);
        assert.strictEqual(capability.safeReturn, undefined);
        assert.strictEqual(capability.robot.robot.listenerCount("updateDevice"), 0);
    });
});
