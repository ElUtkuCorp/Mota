const CecotecFirmwareMapBackups = require("./CecotecFirmwareMapBackups");
const CecotecStorage = require("./CecotecStorage");
const express = require("express");
const fs = require("fs");
const LinuxTools = require("../../utils/LinuxTools");
const Logger = require("../../Logger");
const os = require("os");
const {exec, execSync} = require("child_process");

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

        this.router.get("/history/:cleanId/map.json", (req, res) => {
            try {
                const map = this.robot.cleanHistory?.getMotaMap(Number(req.params.cleanId));

                if (map) {
                    res.json(this.robot.withMapRotation(map));
                } else {
                    res.sendStatus(404);
                }
            } catch (e) {
                res.status(500).json(e.message);
            }
        });

        this.router.get("/map-versions", (req, res) => {
            if (!this.robot.mapVersions) {
                res.sendStatus(404);

                return;
            }

            res.json({
                threshold: this.robot.mapVersions.getThreshold(),
                versions: this.robot.mapVersions.list(),
            });
        });

        this.router.put("/map-versions/threshold", express.json(), (req, res) => {
            const threshold = req.body?.threshold;

            if (!this.robot.mapVersions || typeof threshold !== "number" || !Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
                res.sendStatus(400);

                return;
            }

            this.robot.mapVersions.setThreshold(threshold);
            res.sendStatus(200);
        });

        this.router.post("/map-versions", (req, res) => {
            try {
                const map = this.robot.robot?.device.map;

                if (!this.robot.mapVersions || !map) {
                    res.status(400).json("There is no map");

                    return;
                }

                res.json(this.robot.mapVersions.saveManual(this.robot.getMapSnapshot(map)));
            } catch (e) {
                res.status(400).json(e.message);
            }
        });

        this.router.get("/map-versions/:id/map.json", (req, res) => {
            try {
                const version = this.robot.mapVersions?.get(Number(req.params.id));

                if (version?.map) {
                    res.json(this.robot.withMapRotation(version.map));
                } else {
                    res.sendStatus(404);
                }
            } catch (e) {
                res.status(500).json(e.message);
            }
        });

        this.router.post("/map-versions/:id/restore-rooms", (req, res) => {
            try {
                this.robot.mapVersions.restoreRooms(Number(req.params.id));
                this.robot.refreshMap();
                res.sendStatus(200);
            } catch (e) {
                res.status(400).json(e.message);
            }
        });

        this.router.delete("/map-versions/:id", (req, res) => {
            try {
                this.robot.mapVersions.delete(Number(req.params.id));
                res.sendStatus(200);
            } catch (e) {
                res.status(400).json(e.message);
            }
        });

        this.router.get("/map-recovery", (req, res) => {
            res.json(this.robot.mapRecovery.getStatus());
        });

        this.router.post("/map-recovery", async (req, res) => {
            try {
                await this.robot.mapRecovery.start();
                res.json(this.robot.mapRecovery.getStatus());
            } catch (e) {
                res.status(409).json(e.message);
            }
        });

        // Mota: copias del par del mapa del firmware (solo en el robot)
        this.router.get("/firmware-map-backups", (req, res) => {
            if (!this.robot.firmwareMapBackups) {
                res.sendStatus(404);

                return;
            }

            res.json(this.robot.firmwareMapBackups.getStatus());
        });

        this.router.put("/firmware-map-backups/auto", express.json(), (req, res) => {
            const enabled = req.body?.enabled;

            if (!this.robot.firmwareMapBackups || typeof enabled !== "boolean") {
                res.sendStatus(this.robot.firmwareMapBackups ? 400 : 404);

                return;
            }

            try {
                this.robot.firmwareMapBackups.setAutoEnabled(enabled);
                res.json(this.robot.firmwareMapBackups.getStatus());
            } catch (e) {
                res.status(500).json(e.message);
            }
        });

        this.router.post("/firmware-map-backups", async (req, res) => {
            if (!this.robot.firmwareMapBackups) {
                res.sendStatus(404);

                return;
            }

            try {
                await this.robot.firmwareMapBackups.backup("manual");
                res.json(this.robot.firmwareMapBackups.getStatus());
            } catch (e) {
                res.status(409).json(e.message);
            }
        });

        this.router.post("/firmware-map-backups/:id/restore", (req, res) => {
            if (!this.robot.firmwareMapBackups) {
                res.sendStatus(404);

                return;
            }
            if (!CecotecFirmwareMapBackups.IS_VALID_ID(req.params.id)) {
                res.sendStatus(400);

                return;
            }

            try {
                res.status(202).json(this.robot.firmwareMapBackups.restore(req.params.id));
            } catch (e) {
                res.status(409).json(e.message);
            }
        });

        this.router.get("/firmware-map-backups/:id/download", (req, res) => {
            const id = req.params.id;

            if (!this.robot.firmwareMapBackups || !CecotecFirmwareMapBackups.IS_VALID_ID(id) || !this.robot.firmwareMapBackups.get(id)) {
                res.sendStatus(404);

                return;
            }

            try {
                const archive = this.robot.firmwareMapBackups.getArchive(id);

                res.type("application/gzip");
                res.setHeader("Content-Disposition", `attachment; filename="mota-mapa-robot-${id}.tar.gz"`);
                res.send(archive);
            } catch (e) {
                res.status(500).json(e.message);
            }
        });

        this.router.delete("/firmware-map-backups/:id", (req, res) => {
            if (!this.robot.firmwareMapBackups) {
                res.sendStatus(404);

                return;
            }
            if (!CecotecFirmwareMapBackups.IS_VALID_ID(req.params.id)) {
                res.sendStatus(400);

                return;
            }

            try {
                this.robot.firmwareMapBackups.delete(req.params.id);
                res.json(this.robot.firmwareMapBackups.getStatus());
            } catch (e) {
                res.status(409).json(e.message);
            }
        });

        // Mota: espacio en UDISK y limpieza de logs rotados del fabricante (solo en el robot)
        this.router.get("/storage", (req, res) => {
            if (!this.robot.storage) {
                res.sendStatus(404);

                return;
            }

            const keep = req.query.keep === undefined ? CecotecStorage.DEFAULT_KEEP : Number(req.query.keep);

            try {
                CecotecStorage.ASSERT_KEEP(keep);
            } catch (e) {
                res.status(400).json(e.message);

                return;
            }

            try {
                res.json(this.robot.storage.getStatus(keep));
            } catch (e) {
                res.status(500).json(e.message);
            }
        });

        this.router.post("/storage/cleanup", express.json(), (req, res) => {
            if (!this.robot.storage) {
                res.sendStatus(404);

                return;
            }

            const keep = req.body?.keep ?? CecotecStorage.DEFAULT_KEEP;

            try {
                CecotecStorage.ASSERT_KEEP(keep);
            } catch (e) {
                res.status(400).json(e.message);

                return;
            }

            try {
                res.json(this.robot.storage.cleanup(keep));
            } catch (e) {
                res.status(500).json(e.message);
            }
        });

        // Reinicia el sistema del robot (botón de Información del sistema). Se responde antes de reiniciar.
        this.router.post("/system/reboot", (req, res) => {
            Logger.info("Rebooting the robot on request");
            res.sendStatus(200);

            setTimeout(() => {
                exec("reboot", (err) => {
                    if (err) {
                        Logger.error("Unable to reboot", err);
                    }
                });
            }, 1000);
        });

        this.router.get("/rooms", (req, res) => {
            res.json(this.robot.virtualRooms.getRooms().map(room => {
                return {id: room.id, name: room.name, color: room.color ?? null, cells: room.pixels.length};
            }));
        });

        this.router.put("/rooms/:id/color", express.json(), (req, res) => {
            try {
                const color = req.body?.color;

                this.robot.virtualRooms.setColor(Number(req.params.id), typeof color === "string" && color.length > 0 ? color : undefined);
                this.robot.refreshMap();
                res.sendStatus(200);
            } catch (e) {
                res.status(400).json(e.message);
            }
        });

        this.router.post("/rooms/resegment", (req, res) => {
            try {
                this.robot.resegmentRooms();
                res.sendStatus(200);
            } catch (e) {
                res.status(400).json(e.message);
            }
        });

        this.router.get("/mirrors", (req, res) => {
            res.json(this.robot.getMirrorZones());
        });

        this.router.put("/mirrors", express.json(), (req, res) => {
            const zones = req.body;
            const isValid = Array.isArray(zones) && zones.length <= 20 && zones.every(z => {
                return ["x0", "y0", "x1", "y1"].every(k => {
                    return typeof z?.[k] === "number" && Number.isFinite(z[k]);
                });
            });

            if (!isValid) {
                res.sendStatus(400);

                return;
            }

            this.robot.setMirrorZones(zones);
            res.sendStatus(200);
        });

        this.router.get("/map-retouch", (req, res) => {
            const map = this.robot.robot?.device.map;

            if (map) {
                res.json(this.robot.mapRetouch.getStatus(this.robot.getRetouchContext(map)));
            } else {
                res.status(400).json("There is no map");
            }
        });

        this.router.put("/map-retouch/rotation", express.json(), (req, res) => {
            try {
                this.robot.setMapRotation(req.body?.rotation);
                res.sendStatus(200);
            } catch (e) {
                res.status(400).json(e.message);
            }
        });

        const retouchRoute = (route, getChange) => {
            this.router.post(route, express.json(), (req, res) => {
                try {
                    res.json(this.robot.changeMapRetouch(getChange(req.body ?? {})));
                } catch (e) {
                    res.status(400).json(e.message);
                }
            });
        };

        retouchRoute("/map-retouch/islands/hide", ({ids}) => {
            return (context) => {
                this.robot.mapRetouch.hideIslands(context, CecotecMotaRouter.PARSE_ISLAND_IDS(ids));
            };
        });
        retouchRoute("/map-retouch/islands/show", ({ids}) => {
            return (context) => {
                this.robot.mapRetouch.showIslands(context, CecotecMotaRouter.PARSE_ISLAND_IDS(ids));
            };
        });
        retouchRoute("/map-retouch/paint", ({value, radius, points}) => {
            return (context) => {
                if (
                    !Number.isInteger(radius) || radius < 0 || radius > CecotecMotaRouter.MAX_BRUSH_RADIUS ||
                    !Array.isArray(points) || points.length < 2 || points.length % 2 !== 0 ||
                    points.length > CecotecMotaRouter.MAX_STROKE_COORDINATES || !points.every(Number.isInteger)
                ) {
                    throw new Error("Invalid stroke");
                }

                this.robot.mapRetouch.paint(context, value, radius, points);
            };
        });
        retouchRoute("/map-retouch/undo", () => {
            return () => {
                this.robot.mapRetouch.undo();
            };
        });
        retouchRoute("/map-retouch/clear", () => {
            return () => {
                this.robot.mapRetouch.clear();
            };
        });

        this.router.get("/diagnostics", (req, res) => {
            res.json(CecotecMotaRouter.COLLECT_DIAGNOSTICS(this.robot));
        });
    }

    getRouter() {
        return this.router;
    }

    /**
     * @param {unknown} ids
     * @returns {Array<number>|undefined} sin ids, todas las islas
     */
    static PARSE_ISLAND_IDS(ids) {
        if (ids !== undefined && !(Array.isArray(ids) && ids.every(Number.isInteger))) {
            throw new Error("Invalid island ids");
        }

        return ids;
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

CecotecMotaRouter.MAX_BRUSH_RADIUS = 10;
CecotecMotaRouter.MAX_STROKE_COORDINATES = 10000;

module.exports = CecotecMotaRouter;
