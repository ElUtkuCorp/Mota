const assert = require("node:assert");
const express = require("express");
const { after, before, describe, it } = require("node:test");

const CecotecMotaRouter = require("../../../../lib/robots/cecotec/CecotecMotaRouter");

describe("Mota: rutas de la API propia", () => {
    let server;
    let base;
    const calls = [];
    const robot = {
        firmwareOrders: {
            list: async () => {
                return [];
            },
            delete: async (id) => {
                calls.push(["delete", id]);
                if (id === 7) {
                    throw Object.assign(new Error("No existe"), { status: 404 });
                }

                return { removed: true, orders: [] };
            }
        },
        fileUpdater: {
            isRunning: () => {
                return robot.updating === true;
            },
            receive: async (stream, size) => {
                let received = 0;

                for await (const chunk of stream) {
                    received += chunk.length;
                }
                calls.push(["receive", size, received]);

                return { size: received };
            },
            apply: (sha256) => {
                throw Object.assign(new Error(`SHA256 ${sha256}`), { status: 400 });
            }
        },
        firmwareMapBackups: {
            restore: () => {
                return { rebootInSeconds: 3 };
            }
        }
    };

    before(async () => {
        const app = express();

        app.use(express.json());
        app.use("/api/v2/mota/", new CecotecMotaRouter({ robot: robot }).getRouter());
        await new Promise(resolve => {
            server = app.listen(0, "127.0.0.1", resolve);
        });
        base = `http://127.0.0.1:${server.address().port}/api/v2/mota`;
    });

    after(() => {
        server.close();
    });

    it("borra una programación por su id numérico y valida el id", async () => {
        assert.strictEqual((await fetch(`${base}/firmware-orders/1571392659`, { method: "DELETE" })).status, 200);
        assert.strictEqual((await fetch(`${base}/firmware-orders/7`, { method: "DELETE" })).status, 404);
        assert.strictEqual((await fetch(`${base}/firmware-orders/abc`, { method: "DELETE" })).status, 400);
        assert.strictEqual((await fetch(`${base}/firmware-orders/12345678901`, { method: "DELETE" })).status, 400);
        assert.deepStrictEqual(calls.filter(c => {
            return c[0] === "delete";
        }), [["delete", 1571392659], ["delete", 7]]);
    });

    it("recibe el binario como cuerpo sin pasar por el body parser", async () => {
        const body = Buffer.alloc(200000, 1);
        const response = await fetch(`${base}/update/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: body
        });

        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(calls.find(c => {
            return c[0] === "receive";
        }), ["receive", 200000, 200000]);
    });

    it("devuelve el código del error del actualizador", async () => {
        const response = await fetch(`${base}/update/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sha256: "x" })
        });

        assert.strictEqual(response.status, 400);
        assert.strictEqual(await response.json(), "SHA256 x");
    });

    it("rechaza las peticiones que escriben lanzadas desde otra web", async () => {
        const crossSite = { "Sec-Fetch-Site": "cross-site" };

        assert.strictEqual((await fetch(`${base}/firmware-orders/5`, { method: "DELETE", headers: crossSite })).status, 403);
        assert.strictEqual((await fetch(`${base}/system/reboot`, { method: "POST", headers: crossSite })).status, 403);
        assert.strictEqual((await fetch(`${base}/firmware-orders`, { headers: crossSite })).status, 200);
        assert.strictEqual((await fetch(`${base}/firmware-orders/5`, {
            method: "DELETE",
            headers: { "Sec-Fetch-Site": "same-origin" }
        })).status, 200);
    });

    it("no restaura ni reinicia con una actualización en marcha", async () => {
        robot.updating = true;
        try {
            assert.strictEqual((await fetch(`${base}/firmware-map-backups/20261104-0320/restore`, { method: "POST" })).status, 409);
            assert.strictEqual((await fetch(`${base}/system/reboot`, { method: "POST" })).status, 409);
        } finally {
            robot.updating = false;
        }
        assert.strictEqual((await fetch(`${base}/firmware-map-backups/20261104-0320/restore`, { method: "POST" })).status, 202);
    });
});
