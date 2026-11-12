const assert = require("node:assert");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { afterEach, beforeEach, describe, it } = require("node:test");

const Logger = require("../../lib/Logger");
const MotaCrashTrace = require("../../lib/MotaCrashTrace");

describe("Mota: rastro de las caídas", () => {
    let dir;
    let logged;
    let originals;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-caida-"));
        logged = [];
        originals = {error: Logger.error, warn: Logger.warn, info: Logger.info};
        for (const level of ["error", "warn", "info"]) {
            Logger[level] = (...args) => {
                logged.push([level, args.join(" ")]);
            };
        }
    });

    afterEach(() => {
        Object.assign(Logger, originals);
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("una caída por falta de heap deja un informe que se resume en el log al arrancar", () => {
        const script = `
            const MotaCrashTrace = require(${JSON.stringify(path.join(__dirname, "../../lib/MotaCrashTrace"))});
            new MotaCrashTrace({directory: ${JSON.stringify(dir)}}).setup();
            const keep = [];
            for (;;) { keep.push(new Array(1000).fill({a: 1})); }
        `;
        const result = childProcess.spawnSync(process.execPath, ["--max-old-space-size=16", "-e", script], {encoding: "utf8"});

        assert.notStrictEqual(result.status, 0);
        assert.ok(fs.existsSync(path.join(dir, MotaCrashTrace.REPORT_NAME)), result.stderr);

        new MotaCrashTrace({directory: dir}).setup();

        const errors = logged.filter(([level]) => {
            return level === "error";
        });
        assert.strictEqual(errors.length, 1);
        assert.match(errors[0][1], /fatal error/);
        assert.match(errors[0][1], /heap/i);
        assert.match(errors[0][1], /JavaScript heap [\d.]+ of [\d.]+ MiB/);
        // Se aparta para no volver a resumirlo en el siguiente arranque
        assert.strictEqual(fs.existsSync(path.join(dir, MotaCrashTrace.REPORT_NAME)), false);
        assert.ok(fs.existsSync(path.join(dir, MotaCrashTrace.PREVIOUS_NAME)));

        logged.length = 0;
        new MotaCrashTrace({directory: dir}).setup();
        assert.deepStrictEqual(logged, []);
    });

    it("un informe ilegible también se avisa", () => {
        fs.writeFileSync(path.join(dir, MotaCrashTrace.REPORT_NAME), "{\"header\":");
        new MotaCrashTrace({directory: dir}).setup();

        assert.match(logged.find(([level]) => {
            return level === "error";
        })[1], /unreadable report/);
    });

    it("avisa si el heap se acerca al límite, sin repetirlo cada vez, y resume el pico cada hora", () => {
        let now = 0;
        let used = 10;
        const trace = new MotaCrashTrace({
            directory: dir,
            getHeap: () => {
                return {used: used * 1048576, limit: 42 * 1048576};
            },
            now: () => {
                return now;
            }
        });

        trace.sample();
        used = 37;
        now = 1000;
        trace.sample();
        now = 2000;
        trace.sample();
        assert.deepStrictEqual(logged.map(([level, text]) => {
            return [level, text];
        }), [["warn", "Memory: the JavaScript heap is at 37.0 of 42.0 MiB"]]);

        used = 12;
        now = MotaCrashTrace.SUMMARY_EVERY_MS;
        trace.sample();
        assert.match(logged[1][1], /^Memory: JavaScript heap peak 37\.0 of 42\.0 MiB in the last 60 min/);
    });
});
