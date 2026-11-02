const assert = require("node:assert");
const path = require("path");
const { before, describe, it } = require("node:test");
const { pathToFileURL } = require("url");

const multiply = (m, n) => {
    return {
        a: m.a * n.a + m.c * n.b,
        b: m.b * n.a + m.d * n.b,
        c: m.a * n.c + m.c * n.d,
        d: m.b * n.c + m.d * n.d,
        e: m.a * n.e + m.c * n.f + m.e,
        f: m.b * n.e + m.d * n.f + m.f,
    };
};

const translation = (x, y) => {
    return {a: 1, b: 0, c: 0, d: 1, e: x, f: y};
};

const apply = (m, { x, y }) => {
    return {x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f};
};

const invert = (m) => {
    const det = m.a * m.d - m.b * m.c;

    return {
        a: m.d / det,
        b: -m.b / det,
        c: -m.c / det,
        d: m.a / det,
        e: (m.c * m.f - m.d * m.e) / det,
        f: (m.b * m.e - m.a * m.f) / det,
    };
};

describe("Mota: giro de la vista del mapa", () => {
    let rotation;

    // Misma composición que BaseMap.fitMapToView()
    const buildView = (angle, scale, center) => {
        const { a, b, c, d } = rotation.getMapRotationMatrix(angle);

        return [
            translation(500, 300),
            {a: a, b: b, c: c, d: d, e: 0, f: 0},
            {a: scale, b: 0, c: 0, d: scale, e: 0, f: 0},
            translation(-center.x, -center.y),
        ].reduce(multiply);
    };

    before(async () => {
        rotation = await import(pathToFileURL(path.join(__dirname, "../../../../../frontend/src/map/utils/mapRotation.ts")).href);
    });

    it("solo acepta cuartos de vuelta; lo demás es sin giro", () => {
        assert.strictEqual(rotation.normalizeMapRotation(90), 90);
        assert.strictEqual(rotation.normalizeMapRotation(undefined), 0);
        assert.strictEqual(rotation.normalizeMapRotation(45), 0);
    });

    it("gira en los dos sentidos y da la vuelta completa", () => {
        assert.strictEqual(rotation.addMapRotation(0, 90), 90);
        assert.strictEqual(rotation.addMapRotation(270, 90), 0);
        assert.strictEqual(rotation.addMapRotation(0, -90), 270);
    });

    it("90 grados es en el sentido de las agujas del reloj", () => {
        const view = buildView(90, 1, {x: 0, y: 0});
        const right = apply(view, {x: 10, y: 0});

        // Lo que estaba a la derecha del centro queda debajo (la y de la pantalla crece hacia abajo)
        assert.deepStrictEqual(right, {x: 500, y: 310});
    });

    it("cualquier punto tocado vuelve a su coordenada real con cualquier giro", () => {
        const points = [{x: 405, y: 401}, {x: 340, y: 460}, {x: 12, y: 790}];

        for (const angle of [0, 90, 180, 270]) {
            const view = buildView(angle, 3.5, {x: 400, y: 420});
            const inverse = invert(view);

            for (const point of points) {
                const back = apply(inverse, apply(view, point));

                assert.ok(Math.abs(back.x - point.x) < 1e-9, `x con ${angle} grados`);
                assert.ok(Math.abs(back.y - point.y) < 1e-9, `y con ${angle} grados`);
            }
        }
    });

    it("girar deja un rectángulo del mapa alineado con la pantalla", () => {
        for (const angle of [0, 90, 180, 270]) {
            const view = buildView(angle, 2, {x: 0, y: 0});

            assert.strictEqual(Math.abs(view.a) === 2 || Math.abs(view.b) === 2, true);
            assert.strictEqual(view.a === 0 || view.b === 0, true);
        }
    });

    it("el centro del mapa queda en el centro de la pantalla con cualquier giro", () => {
        for (const angle of [0, 90, 180, 270]) {
            assert.deepStrictEqual(apply(buildView(angle, 2, {x: 40, y: 80}), {x: 40, y: 80}), {x: 500, y: 300});
        }
    });

    it("a 90 y 270 grados se intercambian ancho y alto", () => {
        assert.deepStrictEqual(rotation.getRotatedSize(300, 200, 90), {width: 200, height: 300});
        assert.deepStrictEqual(rotation.getRotatedSize(300, 200, 180), {width: 300, height: 200});
    });
});
