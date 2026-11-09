const assert = require("node:assert");
const { describe, it } = require("node:test");

const CecotecFirmwareOrders = require("../../../../lib/robots/cecotec/CecotecFirmwareOrders");

// La programación que tenía el robot: martes y jueves (weekday 20) a las 10:30 de la hora del firmware
const OLD_ORDER = {
    orderId: 1571392659,
    enable: true,
    repeat: true,
    weekDay: 20,
    dayTime: 630,
    cleanInfo: { mapHeadId: 1, planId: 2, cleanMode: 1, windPower: 2, twiceClean: false }
};

/**
 * @param {Array<object>} orderList
 */
function build(orderList) {
    const sent = [];
    const agnoc = {
        sendRecv: async (request, response, object) => {
            sent.push(request);
            if (request === "DEVICE_ORDERLIST_GETTING_REQ") {
                return { payload: { object: { orderList: orderList.slice() } } };
            }
            if (request === "DEVICE_ORDERLIST_DELETE_REQ") {
                const index = orderList.findIndex(order => {
                    return order.orderId === object.orderId;
                });

                if (index >= 0 && agnoc.deletes) {
                    orderList.splice(index, 1);
                }
            }

            return { payload: { object: {} } };
        },
        deletes: true
    };
    const orders = new CecotecFirmwareOrders({
        robot: { robot: agnoc },
        getOffsetMinutes: () => {
            return 120;
        }
    });

    return { orders: orders, agnoc: agnoc, sent: sent };
}

describe("Mota: programaciones del firmware", () => {
    it("pasa la hora del firmware a UTC: martes y jueves a las 08:30 UTC", async () => {
        const { orders } = build([OLD_ORDER]);
        const list = await orders.list();

        assert.strictEqual(list.length, 1);
        assert.deepStrictEqual(list[0].firmwareTime, { hour: 10, minute: 30 });
        assert.deepStrictEqual(list[0].utc, [
            { dow: 2, hour: 8, minute: 30 },
            { dow: 4, hour: 8, minute: 30 }
        ]);
        assert.strictEqual(list[0].enabled, true);
        assert.strictEqual(list[0].repeat, true);
    });

    it("al pasar a UTC puede cambiar de día", () => {
        const order = CecotecFirmwareOrders.TO_ORDER(Object.assign({}, OLD_ORDER, { dayTime: 60, weekDay: 1 | 64 }), 120);

        // Domingo y sábado a la 01:00 del firmware = sábado y viernes a las 23:00 UTC
        assert.deepStrictEqual(order.utc, [
            { dow: 6, hour: 23, minute: 0 },
            { dow: 5, hour: 23, minute: 0 }
        ]);
        assert.deepStrictEqual(
            CecotecFirmwareOrders.TO_ORDER(Object.assign({}, OLD_ORDER, { dayTime: 1380, weekDay: 64 }), -120).utc,
            [{ dow: 0, hour: 1, minute: 0 }]
        );
    });

    it("ignora entradas incompletas sin fallar", async () => {
        const { orders } = build([{ orderId: 5 }, null, Object.assign({}, OLD_ORDER, { cleanInfo: undefined })]);
        const list = await orders.list();

        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].cleanMode, null);
    });

    it("borra y comprueba que ya no está", async () => {
        const { orders, sent } = build([OLD_ORDER]);
        const result = await orders.delete(OLD_ORDER.orderId);

        assert.deepStrictEqual(result, { removed: true, orders: [] });
        assert.deepStrictEqual(sent, ["DEVICE_ORDERLIST_GETTING_REQ", "DEVICE_ORDERLIST_DELETE_REQ", "DEVICE_ORDERLIST_GETTING_REQ"]);
    });

    it("dice si el firmware la sigue listando", async () => {
        const { orders, agnoc } = build([OLD_ORDER]);

        agnoc.deletes = false;
        const result = await orders.delete(OLD_ORDER.orderId);

        assert.strictEqual(result.removed, false);
        assert.strictEqual(result.orders.length, 1);
    });

    it("no manda borrar una programación que no existe", async () => {
        const { orders, sent } = build([OLD_ORDER]);

        await assert.rejects(orders.delete(123), { status: 404 });
        assert.deepStrictEqual(sent, ["DEVICE_ORDERLIST_GETTING_REQ"]);
    });

    it("manda las órdenes de una en una y sigue tras un error", async () => {
        const { orders, agnoc } = build([OLD_ORDER]);
        const order = [];
        const original = agnoc.sendRecv;
        let fail = true;

        agnoc.sendRecv = async (...args) => {
            order.push(`start ${args[0]}`);
            await new Promise(resolve => {
                setImmediate(resolve);
            });
            order.push(`end ${args[0]}`);
            if (fail) {
                fail = false;
                throw new Error("timeout");
            }

            return original(...args);
        };

        const results = await Promise.allSettled([orders.list(), orders.list()]);

        assert.strictEqual(results[0].status, "rejected");
        assert.strictEqual(results[1].status, "fulfilled");
        assert.deepStrictEqual(order, [
            "start DEVICE_ORDERLIST_GETTING_REQ", "end DEVICE_ORDERLIST_GETTING_REQ",
            "start DEVICE_ORDERLIST_GETTING_REQ", "end DEVICE_ORDERLIST_GETTING_REQ"
        ]);
    });
});
