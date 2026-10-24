const express = require("express");
const fs = require("fs");
const LinuxTools = require("../../utils/LinuxTools");
const Logger = require("../../Logger");
const os = require("os");
const {execSync} = require("child_process");

/**
 * Mota: API propia en /api/v2/mota/ con el historial de limpiezas y el diagnóstico del robot.
 */
class CecotecMotaRouter {
    /**
     * @param {object} options
     * @param {import("./CecotecCongaRobot")} options.robot
     */
    constructor(options) {
        this.robot = options.robot;
        this.router = express.Router({mergeParams: true});

        this.initRoutes();
    }

    /**
     * @private
     */
    initRoutes() {
        this.router.get("/history", (req, res) => {
            res.json(this.robot.cleanHistory?.list() ?? []);
        });

        this.router.get("/history/totals", (req, res) => {
            res.json(this.robot.cleanHistory?.getTotals() ?? {count: 0, timeSeconds: 0, areaCm2: 0});
        });

        this.router.get("/history/:cleanId/map.png", (req, res) => {
            const mapPath = this.robot.cleanHistory?.getMapPath(Number(req.params.cleanId));

            if (mapPath) {
                res.type("image/png");
                res.send(fs.readFileSync(mapPath));
            } else {
                res.sendStatus(404);
            }
        });

        this.router.get("/diagnostics", (req, res) => {
            res.json(CecotecMotaRouter.COLLECT_DIAGNOSTICS(this.robot));
        });
    }

    getRouter() {
        return this.router;
    }

    /**
     * Cada dato se lee por separado: si uno falla, el resto se devuelve igualmente.
     *
     * @param {import("./CecotecCongaRobot")} robot
     * @returns {object}
     */
    static COLLECT_DIAGNOSTICS(robot) {
        const read = (fn) => {
            try {
                return fn();
            } catch (e) {
                Logger.debug("Diagnostics: unable to read value", e);

                return null;
            }
        };
        const agnocDevice = robot.robot?.device;

        return {
            timestamp: new Date().toISOString(),
            system: {
                uptimeSeconds: Math.round(os.uptime()),
                load: os.loadavg(),
                memory: {total: os.totalmem(), free: os.freemem()},
                socTemperatureCelsius: read(() => {
                    return Number(fs.readFileSync("/sys/class/thermal/thermal_zone0/temp").toString().trim());
                }),
                timezone: read(() => {
                    return fs.readFileSync("/etc/TZ").toString().trim();
                }),
            },
            storage: {
                udisk: read(() => {
                    return LinuxTools.GET_DISK_SPACE_INFO("/mnt/UDISK");
                }),
                overlay: read(() => {
                    return LinuxTools.GET_DISK_SPACE_INFO("/overlay");
                }),
                vendorLogBytes: read(() => {
                    return fs.statSync("/mnt/UDISK/log/app_logfile.temp").size;
                }),
            },
            wifi: read(() => {
                return CecotecMotaRouter.PARSE_IWCONFIG(execSync("iwconfig wlan0 2>/dev/null").toString());
            }),
            firewall: read(() => {
                return CecotecMotaRouter.PARSE_FIREWALL(
                    execSync("iptables -L LANONLY -v -n -x 2>/dev/null").toString(),
                    execSync("dmesg 2>/dev/null | grep LANONLY-block | tail -n 10").toString()
                );
            }),
            robot: {
                connected: robot.robot !== undefined,
                battery: agnocDevice?.battery?.value ?? null,
                state: agnocDevice?.state?.value ?? null,
                mode: agnocDevice?.mode?.value ?? null,
                error: agnocDevice?.error?.value ?? null,
            },
        };
    }

    /**
     * @param {string} output salida de `iwconfig wlan0`
     */
    static PARSE_IWCONFIG(output) {
        const match = (regex) => {
            const m = output.match(regex);

            return m ? m[1] : null;
        };
        const quality = output.match(/Link Quality=(\d+)\/(\d+)/);

        return {
            ssid: match(/ESSID:"([^"]*)"/),
            frequencyGhz: match(/Frequency:([\d.]+) GHz/) !== null ? Number(match(/Frequency:([\d.]+) GHz/)) : null,
            bitRateMbps: match(/Bit Rate=([\d.]+) Mb\/s/) !== null ? Number(match(/Bit Rate=([\d.]+) Mb\/s/)) : null,
            txPowerDbm: match(/Tx-Power=(-?\d+) dBm/) !== null ? Number(match(/Tx-Power=(-?\d+) dBm/)) : null,
            signalDbm: match(/Signal level=(-?\d+) dBm/) !== null ? Number(match(/Signal level=(-?\d+) dBm/)) : null,
            linkQuality: quality ? Math.round(Number(quality[1]) / Number(quality[2]) * 100) : null,
        };
    }

    /**
     * @param {string} chain salida de `iptables -L LANONLY -v -n -x`
     * @param {string} dmesgLines últimas líneas "LANONLY-block" de dmesg
     */
    static PARSE_FIREWALL(chain, dmesgLines) {
        const rejectLine = chain.split("\n").find(l => {
            return /\bREJECT\b/.test(l);
        });

        return {
            active: chain.includes("Chain LANONLY"),
            blockedPackets: rejectLine ? Number(rejectLine.trim().split(/\s+/)[0]) : 0,
            recentBlocks: dmesgLines.split("\n").filter(Boolean).map(l => {
                const dst = l.match(/DST=([\d.]+)/);
                const proto = l.match(/PROTO=(\w+)/);
                const port = l.match(/DPT=(\d+)/);

                return {destination: dst ? dst[1] : null, protocol: proto ? proto[1] : null, port: port ? Number(port[1]) : null};
            }),
        };
    }
}

module.exports = CecotecMotaRouter;
