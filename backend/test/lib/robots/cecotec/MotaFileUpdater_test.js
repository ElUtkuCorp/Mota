const assert = require("node:assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { afterEach, beforeEach, describe, it } = require("node:test");
const { Readable } = require("stream");
const { spawnSync } = require("child_process");

const CecotecFileUpdater = require("../../../../lib/robots/cecotec/CecotecFileUpdater");
const { StatusStateAttribute } = require("../../../../lib/entities/state/attributes");

const { VALUE: STATUS, FLAG } = StatusStateAttribute;

/**
 * Cabecera ELF de 32 bits, little endian, para ARM
 *
 * @param {number} size
 * @param {string} [tag]
 */
function armBinary(size, tag = "nuevo") {
    const data = Buffer.alloc(size, 0x55);

    Buffer.from([0x7f, 0x45, 0x4c, 0x46, 1, 1, 1]).copy(data, 0);
    data.writeUInt16LE(0x28, 18);
    Buffer.from(tag).copy(data, 32);

    return data;
}

/**
 * El cuerpo llega en trozos, como en una petición
 *
 * @param {Buffer} data
 */
function chunks(data) {
    const parts = [];

    for (let i = 0; i < data.length; i += 1000) {
        parts.push(data.subarray(i, i + 1000));
    }

    return Readable.from(parts);
}

describe("Mota: actualizar desde archivo", () => {
    let dir;
    let tmp;
    let status;
    let launches;
    let updater;

    const build = () => {
        return new CecotecFileUpdater({
            robot: {
                state: {
                    getFirstMatchingAttributeByConstructor: () => {
                        return status;
                    }
                }
            },
            binaryPath: path.join(dir, "valetudo"),
            configPath: path.join(dir, "valetudo_config.json"),
            port: 80,
            tmpDirectory: tmp,
            initScript: path.join(dir, "servicio"),
            launch: (args) => {
                launches.push(args);
            }
        });
    };

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-update-"));
        tmp = path.join(dir, "tmp");
        fs.mkdirSync(tmp);
        fs.writeFileSync(path.join(dir, "valetudo"), "actual");
        fs.writeFileSync(path.join(dir, "valetudo_config.json"), "{\"v\":1}");
        status = new StatusStateAttribute({ value: STATUS.DOCKED, flag: FLAG.NONE });
        launches = [];
        updater = build();
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("recibe el binario por trozos con md5 y SHA256", async () => {
        const data = armBinary(5000);
        const result = await updater.receive(chunks(data), data.length);

        assert.strictEqual(result.size, 5000);
        assert.strictEqual(result.md5, crypto.createHash("md5").update(data).digest("hex"));
        assert.strictEqual(result.sha256, crypto.createHash("sha256").update(data).digest("hex"));
        assert.deepStrictEqual(fs.readFileSync(path.join(tmp, "mota-actualizacion.bin")), data);
        assert.strictEqual(fs.existsSync(path.join(tmp, "mota-actualizacion.bin.part")), false);
        assert.strictEqual(updater.getStatus().uploaded.sha256, result.sha256);
    });

    it("rechaza lo que no es un ELF para ARM, lo incompleto y lo demasiado grande", async () => {
        const notElf = Buffer.alloc(3000, 1);
        const x86 = armBinary(3000);
        x86.writeUInt16LE(0x03, 18);

        await assert.rejects(updater.receive(chunks(notElf), notElf.length), { status: 400 });
        await assert.rejects(updater.receive(chunks(x86), x86.length), { status: 400 });
        await assert.rejects(updater.receive(chunks(armBinary(3000)), 4000), /incompleto/);
        await assert.rejects(updater.receive(chunks(armBinary(100)), CecotecFileUpdater.MAX_BYTES + 1), /tamaño/);

        const max = CecotecFileUpdater.MAX_BYTES;
        CecotecFileUpdater.MAX_BYTES = 2000;
        try {
            await assert.rejects(updater.receive(chunks(armBinary(3000)), undefined), /demasiado grande/);
        } finally {
            CecotecFileUpdater.MAX_BYTES = max;
        }

        assert.deepStrictEqual(fs.readdirSync(tmp), []);
        assert.strictEqual(updater.getStatus().uploaded, null);
        assert.strictEqual(updater.uploading, false);
    });

    it("no admite dos subidas a la vez", async () => {
        const data = armBinary(5000);
        const first = updater.receive(chunks(data), data.length);

        await assert.rejects(updater.receive(chunks(data), data.length), { status: 409 });
        await first;
    });

    it("aplica solo con el SHA256 confirmado, en la base y con espacio", async () => {
        const data = armBinary(5000);
        const { sha256 } = await updater.receive(chunks(data), data.length);

        assert.throws(() => {
            updater.apply("0".repeat(64));
        }, { status: 400 });

        status = new StatusStateAttribute({ value: STATUS.DOCKED, flag: FLAG.RESUMABLE });
        assert.throws(() => {
            updater.apply(sha256);
        }, /en la base/);
        status = new StatusStateAttribute({ value: STATUS.CLEANING, flag: FLAG.NONE });
        assert.throws(() => {
            updater.apply(sha256);
        }, /en la base/);
        status = new StatusStateAttribute({ value: STATUS.DOCKED, flag: FLAG.NONE });

        const reserve = CecotecFileUpdater.RESERVE_BYTES;
        CecotecFileUpdater.RESERVE_BYTES = Number.MAX_SAFE_INTEGER;
        try {
            assert.throws(() => {
                updater.apply(sha256);
            }, /espacio/);
        } finally {
            CecotecFileUpdater.RESERVE_BYTES = reserve;
        }
        assert.strictEqual(launches.length, 0);

        assert.deepStrictEqual(updater.apply(sha256.toUpperCase()), { waitSeconds: CecotecFileUpdater.WAIT_SECONDS });
        assert.strictEqual(launches.length, 1);
        assert.strictEqual(launches[0][1], "apply");
        assert.strictEqual(launches[0][5], crypto.createHash("md5").update(data).digest("hex"));
        assert.strictEqual(updater.getStatus().running, true);
        assert.ok(fs.existsSync(path.join(dir, "valetudo.prev.json.new")));

        // Con una actualización en marcha no se puede subir ni volver atrás
        await assert.rejects(updater.receive(chunks(data), data.length), { status: 409 });
        fs.writeFileSync(path.join(dir, "valetudo.prev"), "anterior");
        assert.throws(() => {
            updater.rollback();
        }, { status: 409 });

        // Tras reiniciar Mota se sigue viendo en marcha, y un script colgado caduca
        assert.strictEqual(build().getStatus().running, true);
        const state = JSON.parse(fs.readFileSync(path.join(tmp, "mota-actualizacion.json"), "utf8"));
        state.startedAt -= CecotecFileUpdater.RUNNING_TIMEOUT_SECONDS + 1;
        fs.writeFileSync(path.join(tmp, "mota-actualizacion.json"), JSON.stringify(state));
        assert.strictEqual(build().getStatus().running, false);
    });

    it("si el script no arranca, lo deja como fallido", async () => {
        const data = armBinary(5000);
        const { sha256 } = await updater.receive(chunks(data), data.length);

        updater.launch = (args, onError) => {
            onError(new Error("spawn"));
        };
        updater.apply(sha256);

        assert.strictEqual(updater.getStatus().running, false);
        assert.strictEqual(updater.getStatus().last.result, "failed");
    });

    it("volver atrás necesita una versión anterior", () => {
        assert.throws(() => {
            updater.rollback();
        }, /anterior/);

        fs.writeFileSync(path.join(dir, "valetudo.prev"), "anterior");
        // Sin la ficha de versión (instalada con el script de despliegue) se da al menos la fecha del archivo
        const previous = updater.getStatus().previous;
        assert.strictEqual(previous.release, null);
        assert.strictEqual(previous.size, 8);
        assert.ok(!Number.isNaN(Date.parse(previous.modifiedAt)));
        updater.rollback();
        assert.strictEqual(launches[0][1], "rollback");
    });

    it("al arrancar borra los restos de una operación cortada", () => {
        fs.writeFileSync(path.join(tmp, "mota-actualizacion.bin"), "x");
        fs.writeFileSync(path.join(tmp, "mota-actualizacion.bin.part"), "x");
        fs.writeFileSync(path.join(dir, "valetudo.new"), "a medias");
        fs.writeFileSync(path.join(dir, "valetudo_config.json.prev.new"), "x");
        // Corte entre los pasos del intercambio: falta la anterior y queda el .swap
        fs.writeFileSync(path.join(dir, "valetudo.swap"), "la de antes");

        build();

        assert.deepStrictEqual(fs.readdirSync(tmp), []);
        assert.deepStrictEqual(fs.readdirSync(dir).sort(), ["tmp", "valetudo", "valetudo.prev", "valetudo_config.json"]);
        assert.strictEqual(fs.readFileSync(path.join(dir, "valetudo.prev"), "utf8"), "la de antes");

        fs.writeFileSync(path.join(dir, "valetudo.swap"), "x");
        build();
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo.swap")), false);
        assert.strictEqual(fs.readFileSync(path.join(dir, "valetudo.prev"), "utf8"), "la de antes");
    });

    it("una anterior que es el mismo archivo no cuenta como espacio que se libera", async () => {
        const data = armBinary(5000);
        await updater.receive(chunks(data), data.length);
        updater.getFreeBytes = () => {
            return 1000000;
        };

        fs.writeFileSync(path.join(dir, "valetudo.prev"), Buffer.alloc(3000));
        assert.strictEqual(updater.getStatus().space.afterBytes, 1000000 + 3000 - 5000);

        fs.rmSync(path.join(dir, "valetudo.prev"));
        fs.linkSync(path.join(dir, "valetudo"), path.join(dir, "valetudo.prev"));
        assert.strictEqual(updater.getStatus().space.afterBytes, 1000000 - 5000);
    });

    it("no actualiza mientras se restaura una copia del mapa", async () => {
        const data = armBinary(5000);
        const { sha256 } = await updater.receive(chunks(data), data.length);

        updater.robot.firmwareMapBackups = { restoring: true };
        assert.throws(() => {
            updater.apply(sha256);
        }, /restaurando/);
        assert.strictEqual(launches.length, 0);
    });
});

/*
 * El script de verdad, con sh, un servicio falso y un wget falso que responde según el binario instalado
 */
const SH = spawnSync("sh", ["-c", "command -v ln md5sum"], { encoding: "utf8" });

describe("Mota: script de actualización", { skip: SH.status !== 0 && "sin sh" }, () => {
    let dir;
    let tmp;
    let fake;

    const write = (file, data) => {
        fs.writeFileSync(path.join(dir, file), data);
    };
    const read = (file) => {
        return fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), "utf8") : null;
    };
    const run = (mode, md5 = "", prevFirst = "0") => {
        const script = path.join(tmp, "mota-actualizacion.sh");

        fs.writeFileSync(script, CecotecFileUpdater.SCRIPT);
        // En Windows, md5sum escapa las rutas con barras invertidas
        const result = spawnSync("sh", [
            script, mode,
            path.join(dir, "valetudo"),
            path.join(dir, "valetudo_config.json"),
            path.join(tmp, "mota-actualizacion.bin"),
            md5,
            path.join(tmp, "estado.json"),
            "http://127.0.0.1:80/api/v2/valetudo/version",
            "2",
            path.join(fake, "servicio"),
            "1",
            path.join(tmp, "log"),
            prevFirst
        ].map(arg => {
            return arg.replace(/\\/g, "/");
        }), {
            encoding: "utf8",
            env: Object.assign({}, process.env, {
                PATH: `${fake}${path.delimiter}${process.env.PATH}`,
                MOTA_FAKE_DIR: dir,
                MOTA_UPDATE_SETTLE: "0",
                MOTA_UPDATE_STEP: "1"
            })
        });

        return {
            code: result.status,
            state: JSON.parse(fs.readFileSync(path.join(tmp, "estado.json"), "utf8")),
            service: read("servicio.log")
        };
    };

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "mota-update-sh-"));
        tmp = path.join(dir, "tmp");
        fake = path.join(dir, "falsos");
        fs.mkdirSync(tmp);
        fs.mkdirSync(fake);
        // La web responde salvo que el binario instalado sea "roto"
        fs.writeFileSync(path.join(fake, "wget"),
            "#!/bin/sh\ncase \"$(cat \"$MOTA_FAKE_DIR/valetudo\")\" in *roto*) echo 'wget: can not connect' >&2; exit 1 ;; esac\necho '{\"release\":\"x\"}'\n");
        fs.writeFileSync(path.join(fake, "servicio"), "#!/bin/sh\necho \"$1\" >> \"$MOTA_FAKE_DIR/servicio.log\"\n");
        fs.chmodSync(path.join(fake, "wget"), 0o755);
        fs.chmodSync(path.join(fake, "servicio"), 0o755);

        write("valetudo", "actual");
        write("valetudo.prev", "muy antiguo");
        write("valetudo_config.json", "config actual");
        write("valetudo.prev.json.new", "{\"release\":\"actual\"}");
        // La copia de la configuración la deja Mota antes de lanzar el script
        write("valetudo_config.json.prev.new", "config actual");
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    const upload = (data) => {
        fs.writeFileSync(path.join(tmp, "mota-actualizacion.bin"), data);

        return crypto.createHash("md5").update(data).digest("hex");
    };

    it("instala la versión nueva y guarda la anterior", () => {
        const result = run("apply", upload("nuevo"));

        assert.strictEqual(result.state.result, "ok");
        assert.strictEqual(read("valetudo"), "nuevo");
        assert.strictEqual(read("valetudo.prev"), "actual");
        assert.strictEqual(read("valetudo_config.json.prev"), "config actual");
        assert.strictEqual(read("valetudo.prev.json"), "{\"release\":\"actual\"}");
        assert.strictEqual(fs.existsSync(path.join(tmp, "mota-actualizacion.bin")), false);
        assert.strictEqual(result.service, "restart\n");
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo_config.json.prev.new")), false);
    });

    it("con un md5 distinto no toca nada y, si había sitio, conserva la anterior", () => {
        upload("nuevo");
        const result = run("apply", "0".repeat(32));

        assert.strictEqual(result.state.result, "failed");
        assert.strictEqual(read("valetudo"), "actual");
        assert.strictEqual(read("valetudo.prev"), "muy antiguo");
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo_config.json.prev.new")), false);
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo.new")), false);
        assert.strictEqual(fs.existsSync(path.join(tmp, "mota-actualizacion.bin")), false);
        assert.strictEqual(result.service, null);
    });

    it("sin sitio para las dos, libera la anterior antes de copiar", () => {
        upload("nuevo");
        const result = run("apply", "0".repeat(32), "1");

        assert.strictEqual(result.state.result, "failed");
        assert.strictEqual(read("valetudo"), "actual");
        assert.strictEqual(read("valetudo.prev"), null);
    });

    it("con contraseña en la web, wget sale con 8 y cuenta como que responde", () => {
        fs.writeFileSync(path.join(fake, "wget"), "#!/bin/sh\nexit 8\n");
        const result = run("apply", upload("nuevo"));

        assert.strictEqual(result.state.result, "ok");
        assert.strictEqual(read("valetudo"), "nuevo");
    });

    it("si la versión nueva no responde, vuelve a la anterior con su configuración", () => {
        const md5 = upload("roto");
        // La versión nueva migraría la configuración
        fs.writeFileSync(path.join(fake, "servicio"),
            "#!/bin/sh\necho \"$1\" >> \"$MOTA_FAKE_DIR/servicio.log\"\n[ \"$1\" = restart ] && echo migrada > \"$MOTA_FAKE_DIR/valetudo_config.json\"\nexit 0\n");
        const result = run("apply", md5);

        assert.strictEqual(result.state.result, "rolled_back");
        assert.strictEqual(read("valetudo"), "actual");
        assert.strictEqual(read("valetudo_config.json"), "config actual");
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo.prev")), false);
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo.prev.json")), false);
        assert.strictEqual(result.service, "restart\nstop\nstart\n");
    });

    it("volver a la versión anterior intercambia binario y configuración", () => {
        write("valetudo_config.json.prev", "config antigua");
        const result = run("rollback");

        assert.strictEqual(result.state.result, "ok");
        assert.strictEqual(read("valetudo"), "muy antiguo");
        assert.strictEqual(read("valetudo.prev"), "actual");
        assert.strictEqual(read("valetudo_config.json"), "config antigua");
        assert.strictEqual(read("valetudo_config.json.prev"), "config actual");
        assert.strictEqual(fs.existsSync(path.join(dir, "valetudo.swap")), false);
        assert.strictEqual(result.service, "stop\nstart\n");
    });

    it("si la anterior no responde, vuelve a la que había", () => {
        write("valetudo.prev", "roto");
        const result = run("rollback");

        assert.strictEqual(result.state.result, "rolled_back");
        assert.strictEqual(read("valetudo"), "actual");
        assert.strictEqual(read("valetudo.prev"), "roto");
        assert.strictEqual(result.service, "stop\nstart\nstop\nstart\n");
    });
});
