const assert = require("node:assert");
const { describe, it } = require("node:test");

const { Robot } = require("@agnoc/core/lib/emitters/robot.emitter");

/*
 * Mota: la petición del mapa con 0x400 hace que el firmware de la 3090 guarde el mapa y cierre la tarea en curso. Al
 * reconectar con el robot limpiando o esperando a terminar de cargar para seguir (modo 11), el robot pasaba a reposo.
 */
describe("Mota: máscara de la petición del mapa según el modo del robot", () => {
    const FULL = 0xff | 0x400;
    const LIVE = 0xff;

    const build = (workMode) => {
        const emitter = Object.create(Robot.prototype);
        const masks = [];

        emitter.device = {
            motaRawWorkMode: workMode,
            system: { supports: () => {
                return false;
            } }
        };
        emitter.sendRecv = async (request, response, object) => {
            if (request === "DEVICE_MAPID_GET_GLOBAL_INFO_REQ") {
                masks.push(object.mask);
            }
        };

        return { emitter: emitter, masks: masks };
    };
    const tick = () => {
        return new Promise(resolve => {
            setImmediate(resolve);
        });
    };

    it("en reposo pide el mapa completo", async () => {
        const { emitter, masks } = build(0);

        await emitter.updateMap();
        assert.deepStrictEqual(masks, [FULL]);
        assert.strictEqual(emitter.motaFreshMapPending, false);
    });

    for (const mode of [1, 11, 35, 4]) {
        it(`en modo ${mode} no pide 0x400 y lo deja para cuando pase a reposo`, async () => {
            const { emitter, masks } = build(mode);

            await emitter.updateMap();
            assert.deepStrictEqual(masks, [LIVE]);

            // Mientras siga la tarea no se repite
            emitter.motaRefreshMapWhenIdle();
            await tick();
            assert.deepStrictEqual(masks, [LIVE]);

            emitter.device.motaRawWorkMode = 0;
            emitter.motaRefreshMapWhenIdle();
            await tick();
            assert.deepStrictEqual(masks, [LIVE, FULL]);

            // Y solo una vez
            emitter.motaRefreshMapWhenIdle();
            await tick();
            assert.deepStrictEqual(masks, [LIVE, FULL]);
        });
    }

    it("al conectar, sin saber aún el modo, nunca pide 0x400", async () => {
        for (const mode of [undefined, 0, 11]) {
            const { emitter, masks } = build(mode);

            await emitter.updateMap({ connecting: true });
            assert.deepStrictEqual(masks, [LIVE]);
            assert.strictEqual(emitter.motaFreshMapPending, true);
        }
    });

    it("guardar zonas prohibidas sigue pidiendo 0x400 (sin él no se borrarían las últimas)", async () => {
        const { emitter, masks } = build(11);
        emitter.device.map = { id: { value: 1 }, restrictedZones: [] };

        await emitter.setRestrictedZones([]);
        assert.deepStrictEqual(masks, [FULL]);
    });

    it("si falla la petición pendiente, se vuelve a intentar en el siguiente estado", async () => {
        const { emitter, masks } = build(11);
        await emitter.updateMap();

        emitter.device.motaRawWorkMode = 0;
        let fail = true;
        emitter.sendRecv = async (request, response, object) => {
            masks.push(object.mask);
            if (fail) {
                fail = false;
                throw new Error("timeout");
            }
        };
        emitter.motaRefreshMapWhenIdle();
        await tick();
        emitter.motaRefreshMapWhenIdle();
        await tick();
        assert.deepStrictEqual(masks, [LIVE, FULL, FULL]);
        assert.strictEqual(emitter.motaFreshMapPending, false);
    });

    it("con planos de mapa (otros modelos) no cambia nada", async () => {
        const { emitter, masks } = build(1);
        emitter.device.system.supports = () => {
            return true;
        };

        await emitter.updateMap();
        assert.deepStrictEqual(masks, [0x78ff]);
    });
});
