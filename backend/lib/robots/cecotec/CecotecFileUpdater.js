const crypto = require("crypto");
const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");
const Tools = require("../../utils/Tools");
const {pipeline} = require("stream/promises");
const {spawn} = require("child_process");
const {StatusStateAttribute} = require("../../entities/state/attributes");
const {Transform} = require("stream");

/**
 * Mota: actualizar desde archivo (F19), con las garantías de scripts/desplegar.sh.
 *
 * 1. El navegador sube el binario. Se escribe en /tmp (RAM) por trozos, calculando md5 y SHA256 sin cargarlo entero
 *    en memoria, y se comprueba que es un ELF de 32 bits para ARM.
 * 2. El usuario confirma el SHA256. Con el robot en la base y espacio en UDISK, Mota lanza un script de shell
 *    independiente (sesión propia) que sigue vivo cuando Mota se reinicia:
 *    - copia a valetudo.new y comprueba el md5;
 *    - guarda la versión en uso como valetudo.prev con un enlace duro y la sustituye con un rename, así que en todo
 *      momento existe un binario completo (también si se corta la luz);
 *    - guarda la configuración en valetudo_config.json.prev (copia temporal + rename);
 *    - reinicia el servicio y, si la web no responde en WAIT_SECONDS, vuelve a la versión y la configuración
 *      anteriores.
 * 3. "Volver a la versión anterior" intercambia binario y configuración con los .prev por el mismo camino.
 *
 * El resultado se deja en /tmp para que la versión que arranque lo muestre.
 */
class CecotecFileUpdater {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     * @param {string} options.binaryPath binario en uso (/mnt/UDISK/valetudo/valetudo)
     * @param {string} options.configPath valetudo_config.json
     * @param {number} options.port puerto de la web, para comprobar que responde
     * @param {string} [options.tmpDirectory] RAM
     * @param {string} [options.initScript]
     * @param {(args: Array<string>, onError: (e: Error) => void) => void} [options.launch] lanza el script (los tests lo sustituyen)
     */
    constructor(options) {
        this.robot = options.robot;
        this.binaryPath = options.binaryPath;
        this.configPath = options.configPath;
        this.port = options.port;
        this.tmpDirectory = options.tmpDirectory ?? "/tmp";
        this.initScript = options.initScript ?? "/etc/init.d/valetudo";
        this.launch = options.launch ?? CecotecFileUpdater.LAUNCH;

        this.uploadPath = path.join(this.tmpDirectory, "mota-actualizacion.bin");
        this.statePath = path.join(this.tmpDirectory, "mota-actualizacion.json");
        this.scriptPath = path.join(this.tmpDirectory, "mota-actualizacion.sh");
        this.logPath = path.join(this.tmpDirectory, "mota-actualizacion.log");
        this.prevInfoPath = `${this.binaryPath}.prev.json`;

        /** @type {{size: number, md5: string, sha256: string, uploadedAt: string} | undefined} */
        this.uploaded = undefined;
        this.uploading = false;
        /** Se ha lanzado el script desde este proceso */
        this.launched = false;

        if (!this.isRunning()) {
            this.removeLeftovers();
        }
    }

    /**
     * Restos de una operación cortada (reinicio de Mota o corte de luz). Sin borrarlos, el espacio libre no bastaría
     * para la siguiente actualización.
     *
     * @private
     */
    removeLeftovers() {
        // Un archivo subido antes de reiniciar Mota ya no tiene sus sumas: se libera la RAM
        for (const file of [
            this.uploadPath,
            `${this.uploadPath}.part`,
            `${this.binaryPath}.new`,
            `${this.configPath}.tmp`,
            `${this.configPath}.prev.tmp`,
            `${this.configPath}.prev.new`,
            `${this.configPath}.prev.new.tmp`,
            `${this.prevInfoPath}.new`,
            `${this.prevInfoPath}.new.tmp`
        ]) {
            fs.rmSync(file, {force: true});
        }

        // Corte entre los pasos del intercambio: el .swap es la versión que faltaría como anterior
        const swap = `${this.binaryPath}.swap`;
        if (fs.existsSync(swap)) {
            if (fs.existsSync(`${this.binaryPath}.prev`)) {
                fs.rmSync(swap, {force: true});
            } else {
                fs.renameSync(swap, `${this.binaryPath}.prev`);
            }
        }
    }

    /**
     * @returns {object}
     */
    getStatus() {
        const current = CecotecFileUpdater.STAT(this.binaryPath);
        const previous = CecotecFileUpdater.STAT(`${this.binaryPath}.prev`);
        const freeBytes = this.getFreeBytes(path.dirname(this.binaryPath));
        const neededBytes = this.uploaded ? this.uploaded.size : undefined;
        // Si la anterior es un enlace duro al binario en uso, borrarla no libera nada
        const previousFreed = previous && previous.ino !== current?.ino ? previous.size : 0;

        return {
            current: {
                release: Tools.GET_VALETUDO_VERSION(),
                commit: Tools.GET_COMMIT_ID(),
                size: current?.size ?? null
            },
            previous: previous ? Object.assign({size: previous.size}, this.readPrevInfo()) : null,
            uploaded: this.uploaded ?? null,
            uploading: this.uploading,
            running: this.isRunning(),
            last: this.readState(),
            space: {
                freeBytes: freeBytes,
                reserveBytes: CecotecFileUpdater.RESERVE_BYTES,
                // Al actualizar se libera la .prev antigua y se ocupa el binario nuevo
                afterBytes: neededBytes !== undefined && freeBytes !== null ?
                    freeBytes + previousFreed - neededBytes :
                    null
            },
            docked: this.isDocked(),
            waitSeconds: CecotecFileUpdater.WAIT_SECONDS
        };
    }

    /**
     * Guarda el binario que llega en la petición. No se carga entero en memoria.
     *
     * @param {import("stream").Readable} stream
     * @param {number|undefined} declaredSize Content-Length
     * @returns {Promise<object>}
     */
    async receive(stream, declaredSize) {
        if (this.uploading) {
            throw CecotecFileUpdater.ERROR(409, "Ya se está subiendo otro archivo");
        }
        if (this.isRunning()) {
            throw CecotecFileUpdater.ERROR(409, "Hay una actualización en curso");
        }
        if (declaredSize !== undefined && (declaredSize <= 0 || declaredSize > CecotecFileUpdater.MAX_BYTES)) {
            throw CecotecFileUpdater.ERROR(400, "El tamaño del archivo no es válido");
        }

        const tmpFree = this.getFreeBytes(this.tmpDirectory);
        const expected = declaredSize ?? CecotecFileUpdater.MAX_BYTES;
        if (tmpFree !== null && tmpFree - expected < CecotecFileUpdater.TMP_RESERVE_BYTES) {
            throw CecotecFileUpdater.ERROR(409, "No hay memoria libre suficiente para recibir el archivo");
        }

        this.uploading = true;
        this.uploaded = undefined;
        const partPath = `${this.uploadPath}.part`;
        fs.rmSync(this.uploadPath, {force: true});

        const md5 = crypto.createHash("md5");
        const sha256 = crypto.createHash("sha256");
        let size = 0;
        let header = Buffer.alloc(0);

        const hasher = new Transform({
            transform: (chunk, encoding, callback) => {
                size += chunk.length;
                if (size > CecotecFileUpdater.MAX_BYTES) {
                    callback(CecotecFileUpdater.ERROR(400, "El archivo es demasiado grande"));

                    return;
                }
                if (header.length < 20) {
                    header = Buffer.concat([header, chunk.subarray(0, 20 - header.length)]);
                }
                md5.update(chunk);
                sha256.update(chunk);
                callback(null, chunk);
            }
        });

        try {
            await pipeline(stream, hasher, fs.createWriteStream(partPath, {mode: 0o600}));

            if (declaredSize !== undefined && size !== declaredSize) {
                throw CecotecFileUpdater.ERROR(400, "El archivo ha llegado incompleto");
            }
            if (!CecotecFileUpdater.IS_ARM_ELF(header)) {
                throw CecotecFileUpdater.ERROR(400, "No es un binario para este robot (ELF de 32 bits para ARM)");
            }

            fs.renameSync(partPath, this.uploadPath);
            this.uploaded = {
                size: size,
                md5: md5.digest("hex"),
                sha256: sha256.digest("hex"),
                uploadedAt: new Date().toISOString()
            };
            Logger.info(`File update: received ${size} bytes, sha256 ${this.uploaded.sha256}`);

            return this.uploaded;
        } catch (e) {
            fs.rmSync(partPath, {force: true});

            throw e;
        } finally {
            this.uploading = false;
        }
    }

    /**
     * Descarta el archivo subido
     */
    discard() {
        if (this.uploading || this.isRunning()) {
            throw CecotecFileUpdater.ERROR(409, "Hay una subida o una actualización en curso");
        }

        this.uploaded = undefined;
        fs.rmSync(this.uploadPath, {force: true});
    }

    /**
     * @param {string} sha256 el que ha confirmado el usuario
     * @returns {{waitSeconds: number}}
     */
    apply(sha256) {
        const uploaded = this.uploaded;

        if (!uploaded || !fs.existsSync(this.uploadPath)) {
            throw CecotecFileUpdater.ERROR(409, "No hay ningún archivo subido");
        }
        if (typeof sha256 !== "string" || sha256.toLowerCase() !== uploaded.sha256) {
            throw CecotecFileUpdater.ERROR(400, "El SHA256 confirmado no coincide con el del archivo");
        }
        this.checkCanRun();

        const status = this.getStatus();
        if (status.space.afterBytes === null || status.space.afterBytes < CecotecFileUpdater.RESERVE_BYTES) {
            throw CecotecFileUpdater.ERROR(409, "No hay espacio suficiente en la memoria del robot");
        }

        // Con sitio para las dos, la anterior se conserva hasta que la nueva esté copiada y comprobada
        const prevFirst = status.space.freeBytes - uploaded.size < CecotecFileUpdater.RESERVE_BYTES;
        // La configuración se copia desde aquí: Mota la reescribe sin rename y el script podría copiarla a medias
        CecotecFileUpdater.WRITE_ATOMIC(`${this.configPath}.prev.new`, fs.readFileSync(this.configPath));
        this.writePrevInfo();
        this.start("apply", uploaded.md5, prevFirst);
        this.uploaded = undefined;

        return {waitSeconds: CecotecFileUpdater.WAIT_SECONDS};
    }

    /**
     * Vuelve a la versión anterior. La actual queda como anterior.
     *
     * @returns {{waitSeconds: number}}
     */
    rollback() {
        if (!fs.existsSync(`${this.binaryPath}.prev`)) {
            throw CecotecFileUpdater.ERROR(409, "No hay ninguna versión anterior");
        }
        this.checkCanRun();

        this.writePrevInfo();
        this.start("rollback", "", false);

        return {waitSeconds: CecotecFileUpdater.WAIT_SECONDS};
    }

    /**
     * @private
     */
    checkCanRun() {
        if (this.uploading || this.isRunning()) {
            throw CecotecFileUpdater.ERROR(409, "Hay una subida o una actualización en curso");
        }
        if (!this.isDocked()) {
            throw CecotecFileUpdater.ERROR(409, "El robot tiene que estar en la base");
        }
        // La restauración de una copia del mapa reinicia el robot y cortaría la copia del binario
        if (this.robot.firmwareMapBackups?.restoring) {
            throw CecotecFileUpdater.ERROR(409, "Se está restaurando una copia del mapa");
        }
    }

    /**
     * @private
     * @param {"apply"|"rollback"} mode
     * @param {string} md5
     * @param {boolean} prevFirst liberar la versión anterior antes de copiar la nueva (no hay sitio para las dos)
     */
    start(mode, md5, prevFirst) {
        const startedAt = Math.floor(Date.now() / 1000);

        // El script no puede escribir el estado inicial a tiempo: lo deja Mota para bloquear otra operación
        CecotecFileUpdater.WRITE_ATOMIC(this.statePath, JSON.stringify({
            action: mode,
            result: "running",
            at: startedAt,
            startedAt: startedAt
        }));
        fs.writeFileSync(this.scriptPath, CecotecFileUpdater.SCRIPT, {mode: 0o700});
        this.launched = true;

        Logger.info(`File update: starting ${mode}, the service will restart`);
        this.launch([
            this.scriptPath,
            mode,
            this.binaryPath,
            this.configPath,
            this.uploadPath,
            md5,
            this.statePath,
            `http://127.0.0.1:${this.port}/api/v2/valetudo/version`,
            String(CecotecFileUpdater.WAIT_SECONDS),
            this.initScript,
            String(startedAt),
            this.logPath,
            prevFirst ? "1" : "0"
        ], e => {
            Logger.error("File update: unable to start the update script", e);
            CecotecFileUpdater.WRITE_ATOMIC(this.statePath, JSON.stringify({
                action: mode,
                result: "failed",
                message: "launch",
                at: Math.floor(Date.now() / 1000),
                startedAt: startedAt
            }));
        });
    }

    /**
     * Hay un script de actualización en marcha (también uno lanzado antes de reiniciar Mota)
     *
     * @returns {boolean}
     */
    isRunning() {
        const state = this.readState();

        if (state?.result !== "running") {
            return false;
        }
        // El script deja su PID al empezar
        if (Number.isInteger(state.pid) && fs.existsSync("/proc/self") && !fs.existsSync(`/proc/${state.pid}`)) {
            return false;
        }

        // Un script que no ha terminado en su tiempo se da por muerto (p. ej. un reinicio del robot a mitad)
        return Date.now() / 1000 - (state.startedAt ?? state.at ?? 0) < CecotecFileUpdater.RUNNING_TIMEOUT_SECONDS;
    }

    /**
     * @private
     * @returns {boolean}
     */
    isDocked() {
        const status = this.robot.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);

        return status?.value === StatusStateAttribute.VALUE.DOCKED && status.flag !== StatusStateAttribute.FLAG.RESUMABLE;
    }

    /**
     * @private
     * @returns {any}
     */
    readState() {
        try {
            const state = JSON.parse(fs.readFileSync(this.statePath, "utf8"));

            return state && typeof state === "object" ? state : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * @private
     * @returns {object}
     */
    readPrevInfo() {
        try {
            const info = JSON.parse(fs.readFileSync(this.prevInfoPath, "utf8"));

            return {
                release: typeof info?.release === "string" ? info.release : null,
                commit: typeof info?.commit === "string" ? info.commit : null
            };
        } catch (e) {
            return {release: null, commit: null};
        }
    }

    /**
     * Versión en uso, que pasará a ser la anterior. El script la coloca solo si el cambio sale bien.
     *
     * @private
     */
    writePrevInfo() {
        CecotecFileUpdater.WRITE_ATOMIC(`${this.prevInfoPath}.new`, JSON.stringify({
            release: Tools.GET_VALETUDO_VERSION(),
            commit: Tools.GET_COMMIT_ID()
        }));
    }

    /**
     * @private
     * @param {string} directory
     * @returns {number|null}
     */
    getFreeBytes(directory) {
        try {
            const stats = fs.statfsSync(directory);

            return stats.bavail * stats.bsize;
        } catch (e) {
            return null;
        }
    }

    /**
     * @param {Buffer} header los 20 primeros bytes
     * @returns {boolean}
     */
    static IS_ARM_ELF(header) {
        return header.length >= 20 &&
            header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46 &&
            header[4] === 1 && // 32 bits
            header[5] === 1 && // little endian
            header.readUInt16LE(18) === 0x28; // EM_ARM
    }

    /**
     * @param {string} file
     * @returns {fs.Stats|undefined}
     */
    static STAT(file) {
        try {
            return fs.statSync(file);
        } catch (e) {
            return undefined;
        }
    }

    /**
     * @param {string} file
     * @param {string|Buffer} data
     */
    static WRITE_ATOMIC(file, data) {
        const tmp = `${file}.tmp`;

        fs.writeFileSync(tmp, data, {flush: true});
        fs.renameSync(tmp, file);
    }

    /**
     * Sesión propia: el script sigue vivo cuando el servicio mata a Mota
     *
     * @param {Array<string>} args
     * @param {(e: Error) => void} onError
     */
    static LAUNCH(args, onError) {
        const child = spawn("/bin/sh", args, {detached: true, stdio: "ignore"});

        child.on("error", onError);
        child.unref();
    }
}

/**
 * @param {number} status código HTTP
 * @param {string} message
 * @returns {Error & {status: number}}
 */
CecotecFileUpdater.ERROR = (status, message) => {
    return Object.assign(new Error(message), {status: status});
};

CecotecFileUpdater.MAX_BYTES = 64 * 1024 * 1024;
// Espacio libre mínimo en UDISK después de actualizar (como desplegar.sh)
CecotecFileUpdater.RESERVE_BYTES = 10 * 1024 * 1024;
// RAM que debe quedar libre en /tmp tras recibir el archivo
CecotecFileUpdater.TMP_RESERVE_BYTES = 32 * 1024 * 1024;
CecotecFileUpdater.WAIT_SECONDS = 60;
CecotecFileUpdater.RUNNING_TIMEOUT_SECONDS = 10 * 60;

/*
 * Argumentos: modo, binario, configuración, archivo subido, md5, estado, url, espera, servicio, inicio, log y si hay
 * que liberar la versión anterior antes de copiar. BusyBox ash.
 * En el robot, wget es uclient-fetch: ante un error HTTP (p. ej. un 401 con contraseña en la web) no escribe nada y
 * sale con 8. Cualquier respuesta HTTP cuenta como que la web responde.
 */
CecotecFileUpdater.SCRIPT = `#!/bin/sh
MODE=$1; BIN=$2; CONFIG=$3; UPLOAD=$4; MD5=$5; STATE=$6; URL=$7; WAIT=$8; SERVICE=$9; shift 9
STARTED=$1; LOG=$2; PREV_FIRST=$3
# Los tests acortan las esperas
SETTLE=\${MOTA_UPDATE_SETTLE:-5}; STEP=\${MOTA_UPDATE_STEP:-3}

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }
state() {
    echo "{\\"action\\":\\"$MODE\\",\\"result\\":\\"$1\\",\\"message\\":\\"$2\\",\\"at\\":$(date +%s),\\"startedAt\\":$STARTED,\\"pid\\":$$}" > "$STATE.tmp"
    mv "$STATE.tmp" "$STATE"
    log "$MODE: $1 $2"
}
web_ok() {
    sleep "$SETTLE"
    END=$(($(date +%s) + WAIT))
    while :; do
        OUT=$(wget -q -T 3 -O - "$URL" 2>&1)
        RC=$?
        case "$OUT" in *'"release"'*|*'401'*) return 0 ;; esac
        [ "$RC" -eq 8 ] && return 0
        [ "$(date +%s)" -ge "$END" ] && return 1
        sleep "$STEP"
    done
}
# Intercambia un archivo con su .prev sin que falte nunca el original
swap() {
    ln -f "$1" "$1.swap" && mv -f "$1.prev" "$1" && mv -f "$1.swap" "$1.prev"
}
copy_atomic() {
    cp -p "$1" "$2.tmp" && mv -f "$2.tmp" "$2"
}

log "$MODE: start"
state running ""

if [ "$MODE" = apply ]; then
    rm -f "$BIN.new"
    [ "$PREV_FIRST" = 1 ] && rm -f "$BIN.prev" "$BIN.prev.json"
    if ! cp "$UPLOAD" "$BIN.new" || [ "$(md5sum "$BIN.new" | cut -d' ' -f1)" != "$MD5" ]; then
        rm -f "$BIN.new" "$UPLOAD" "$CONFIG.prev.new"
        state failed "copy"
        exit 1
    fi
    rm -f "$UPLOAD"
    chmod +x "$BIN.new"
    sync
    ln -f "$BIN" "$BIN.prev" && mv -f "$CONFIG.prev.new" "$CONFIG.prev" && mv -f "$BIN.new" "$BIN"
    RC=$?
    sync
    if [ "$RC" -ne 0 ]; then
        rm -f "$BIN.new" "$UPLOAD" "$CONFIG.prev.new"
        state failed "install"
        exit 1
    fi
    mv -f "$BIN.prev.json.new" "$BIN.prev.json" 2>/dev/null
    sync
    "$SERVICE" restart
    if web_ok; then
        state ok ""
        exit 0
    fi
    log "apply: no answer, going back"
    "$SERVICE" stop
    mv -f "$BIN.prev" "$BIN" && copy_atomic "$CONFIG.prev" "$CONFIG"
    rm -f "$BIN.prev.json"
    sync
    "$SERVICE" start
    if web_ok; then
        state rolled_back ""
    else
        state failed "rollback"
    fi
    exit 1
fi

if [ "$MODE" = rollback ]; then
    "$SERVICE" stop
    if ! swap "$BIN"; then
        # Si falló el último paso, el .swap es la versión que estaba en uso
        [ -f "$BIN.prev" ] || mv -f "$BIN.swap" "$BIN.prev"
        rm -f "$BIN.swap"
        sync
        "$SERVICE" start
        state failed "swap"
        exit 1
    fi
    [ -f "$CONFIG.prev" ] && swap "$CONFIG"
    mv -f "$BIN.prev.json.new" "$BIN.prev.json" 2>/dev/null
    sync
    "$SERVICE" start
    if web_ok; then
        state ok ""
        exit 0
    fi
    log "rollback: no answer, going back"
    "$SERVICE" stop
    swap "$BIN"
    [ -f "$CONFIG.prev" ] && swap "$CONFIG"
    rm -f "$BIN.prev.json"
    sync
    "$SERVICE" start
    if web_ok; then
        state rolled_back ""
    else
        state failed "rollback"
    fi
    exit 1
fi

state failed "mode"
exit 1
`;

module.exports = CecotecFileUpdater;
