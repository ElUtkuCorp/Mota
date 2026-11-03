const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it, mock } = require("node:test");

const CecotecCleanHistory = require("../../../../lib/robots/cecotec/CecotecCleanHistory");
const CecotecCongaRobot = require("../../../../lib/robots/cecotec/CecotecCongaRobot");
const CecotecMapRecovery = require("../../../../lib/robots/cecotec/CecotecMapRecovery");
const CecotecMapVersions = require("../../../../lib/robots/cecotec/CecotecMapVersions");
const CecotecVirtualRooms = require("../../../../lib/robots/cecotec/CecotecVirtualRooms");
const { BatteryStateAttribute, StatusStateAttribute } = require("../../../../lib/entities/state/attributes");
const { DeviceError } = require("@agnoc/core/lib/value-objects/device-error.value-object");
const { DeviceMode, DeviceState } = require("@agnoc/core");
const { DeviceStateMapper } = require("@agnoc/core/lib/mappers/device-state.mapper");
const { Robot } = require("@agnoc/core/lib/emitters/robot.emitter");

const { VALUE: STATUS } = StatusStateAttribute;

/**
 * @param {object} [options]
 * @param {boolean} [options.stale] mapa temporal: las habitaciones no encajan
 * @param {boolean} [options.goodMapLoaded]
 * @param {string} [options.status]
 * @param {number} [options.code] último código del firmware
 */
function buildRobot(options = {}) {
    const orders = [];
    const device = { motaRawFaultCode: options.code ?? 2105, battery: { value: 100 } };
    const robot = {
        status: options.status ?? STATUS.DOCKED,
        temporary: options.stale ?? true,
        goodMapLoaded: options.goodMapLoaded ?? false,
        state: {
            getFirstMatchingAttributeByConstructor: () => {
                return { value: robot.status };
            }
        },
        robot: {
            device: device,
            startAutoClean: async () => {
                orders.push("start");
            },
            home: async () => {
                orders.push("home");
            },
            updateMap: async () => {
                orders.push("updateMap");
            }
        },
        hasTemporaryFirmwareMap: () => {
            return robot.temporary;
        },
        isGoodMapLoaded: () => {
            return robot.goodMapLoaded;
        }
    };
    const recovery = new CecotecMapRecovery({ robot: robot });
    const update = (code, status) => {
        device.motaRawFaultCode = code;
        robot.status = status ?? robot.status;
        recovery.onDeviceUpdate();
    };

    return { robot: robot, recovery: recovery, orders: orders, update: update };
}

const settle = async () => {
    for (let i = 0; i < 5; i++) {
        await Promise.resolve();
    }
};

describe("Mota: recuperar el mapa", () => {
    it("manda a casa en cuanto llega el 2108 y da por recuperado el mapa si las habitaciones encajan", async () => {
        const { robot, recovery, orders, update } = buildRobot();

        await recovery.start();
        assert.deepStrictEqual(orders, ["start"]);
        assert.strictEqual(recovery.getStatus().state, "starting");

        update(2110, STATUS.CLEANING);
        assert.deepStrictEqual(orders, ["start"]);

        robot.temporary = false;
        robot.goodMapLoaded = true;
        update(2108);
        await settle();

        assert.deepStrictEqual(orders, ["start", "home"]);
        assert.strictEqual(recovery.getStatus().state, "idle");
        assert.strictEqual(recovery.getStatus().result, "recovered");
    });

    it("no se fía de un 2108 anterior a la orden", async () => {
        const { recovery, orders, update } = buildRobot({ code: 2108 });

        await recovery.start();
        update(2108, STATUS.CLEANING);
        await settle();
        assert.deepStrictEqual(orders, ["start"]);

        update(2110);
        update(2108);
        await settle();
        assert.strictEqual(orders[1], "home");
        recovery.shutdown();
    });

    it("sin 2108 a tiempo manda a casa e informa de que no se recuperó", async () => {
        mock.timers.enable({ apis: ["setTimeout"] });
        try {
            const { recovery, orders, update } = buildRobot();

            await recovery.start();
            update(2110, STATUS.CLEANING);
            mock.timers.tick(CecotecMapRecovery.RELOCALIZE_TIMEOUT_MS);
            await settle();

            assert.deepStrictEqual(orders, ["start", "home"]);
            assert.strictEqual(recovery.getStatus().result, "not_recovered");
        } finally {
            mock.timers.reset();
        }
    });

    it("con 2108 pero sin mapa bueno espera un mapa y, si no llega, informa de que no se recuperó", async () => {
        mock.timers.enable({ apis: ["setTimeout"] });
        try {
            const { recovery, orders, update } = buildRobot();

            await recovery.start();
            update(2108, STATUS.CLEANING);
            await settle();

            assert.deepStrictEqual(orders, ["start", "home", "updateMap"]);
            assert.strictEqual(recovery.getStatus().state, "returning");

            recovery.onMapUpdate();
            assert.strictEqual(recovery.getStatus().state, "returning");

            mock.timers.tick(CecotecMapRecovery.VERIFY_TIMEOUT_MS);
            assert.strictEqual(recovery.getStatus().result, "not_recovered");
        } finally {
            mock.timers.reset();
        }
    });

    it("el mapa bueno puede llegar justo después del 2108", async () => {
        const { robot, recovery, update } = buildRobot();

        await recovery.start();
        update(2108, STATUS.CLEANING);
        await settle();

        robot.goodMapLoaded = true;
        recovery.onMapUpdate();

        assert.strictEqual(recovery.getStatus().result, "recovered");
    });

    it("con un fallo durante la recuperación manda a casa", async () => {
        const { recovery, orders, update } = buildRobot();

        await recovery.start();
        update(501, STATUS.ERROR);
        await settle();

        assert.deepStrictEqual(orders, ["start", "home"]);
        assert.strictEqual(recovery.getStatus().result, "not_recovered");
    });

    it("si el robot no acepta la limpieza no intenta mandarlo a casa y falla", async () => {
        const { robot, recovery, orders } = buildRobot();

        robot.robot.startAutoClean = async () => {
            throw new Error("timeout");
        };

        await assert.rejects(() => {
            return recovery.start();
        }, /no ha aceptado/);
        assert.deepStrictEqual(orders, []);
        assert.strictEqual(recovery.getStatus().state, "idle");
    });

    it("avisa si no consigue mandarlo a casa", async () => {
        const { robot, recovery, update } = buildRobot();

        robot.robot.home = async () => {
            throw new Error("timeout");
        };
        await recovery.start();
        update(2108, STATUS.CLEANING);
        await new Promise(resolve => {
            return setImmediate(resolve);
        });

        assert.strictEqual(recovery.getStatus().result, "home_failed");
    });

    it("solo arranca con el robot en la base y con un mapa temporal", async () => {
        await assert.rejects(() => {
            return buildRobot({ status: STATUS.IDLE }).recovery.start();
        }, /en la base/);
        await assert.rejects(() => {
            return buildRobot({ stale: false }).recovery.start();
        }, /no es temporal/);

        const { recovery, orders } = buildRobot();

        await recovery.start();
        await assert.rejects(() => {
            return recovery.start();
        }, /ya está en marcha/);
        assert.deepStrictEqual(orders, ["start"]);
        recovery.shutdown();
    });

    it("distingue el mapa temporal: no durante bordes o espiral, sí al acabar", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        let status = STATUS.CLEANING;

        Object.defineProperty(robot, "robot", { value: { device: { mode: { value: DeviceMode.VALUE.EDGE } } } });
        Object.defineProperty(robot, "state", {
            value: {
                getFirstMatchingAttributeByConstructor: () => {
                    return { value: status };
                }
            }
        });
        robot.virtualRooms = { stale: true };
        robot.mapResetPending = false;

        assert.strictEqual(robot.hasTemporaryFirmwareMap(), false);

        status = STATUS.DOCKED;
        assert.strictEqual(robot.hasTemporaryFirmwareMap(), true);

        robot.mapResetPending = true;
        assert.strictEqual(robot.hasTemporaryFirmwareMap(), false);
    });

    it("un mapa temporal pequeño que cae dentro de las habitaciones no cuenta como recuperado", () => {
        const rooms = new CecotecVirtualRooms({});
        const WIDTH = 100;
        const pairs = (x0, y0, x1, y1) => {
            const result = [];

            for (let x = x0; x <= x1; x++) {
                for (let y = y0; y <= y1; y++) {
                    result.push(x, y);
                }
            }

            return result;
        };
        const cells = [];
        const room = pairs(10, 10, 49, 49);

        for (let i = 0; i < room.length; i += 2) {
            cells.push(room[i + 1] * WIDTH + room[i]);
        }
        rooms.importData({ width: WIDTH, rooms: [{ id: 1, name: "Salón", pixels: cells }] });

        const small = pairs(10, 10, 19, 19);

        assert.strictEqual(CecotecVirtualRooms.MATCHES_FLOOR(rooms.exportData(), small, WIDTH), true);
        assert.ok(rooms.getCoverage(small, WIDTH) < 0.8);
        assert.strictEqual(rooms.getCoverage(room, WIDTH), 1);
    });
});

describe("Mota: posición fuera del mapa", () => {
    const pose = (x, y) => {
        return {
            degrees: 90,
            toCoordinates: () => {
                return { x: x, y: y };
            }
        };
    };
    const buildMap = (props) => {
        return Object.assign({
            size: { x: 800, y: 800 },
            toPixel: ({ x, y }) => {
                return { x: Math.floor((x + 20) * 20), y: Math.floor((y + 20) * 20) };
            }
        }, props);
    };
    const buildRobotWith = (status, mode) => {
        const robot = Object.create(CecotecCongaRobot.prototype);

        Object.defineProperty(robot, "robot", { value: { device: { mode: { value: mode } } } });
        Object.defineProperty(robot, "state", {
            value: {
                getFirstMatchingAttributeByConstructor: () => {
                    return { value: status };
                }
            }
        });

        return robot;
    };

    it("(1100, 1100) es el valor sin posición: en píxeles sale (22400, -21600)", () => {
        const map = buildMap({});

        assert.deepStrictEqual(map.toPixel({ x: 1100, y: 1100 }), { x: 22400, y: 22400 });
        assert.strictEqual(CecotecCongaRobot.IS_POSE_ON_MAP(map, pose(1100, 1100)), false);
        assert.strictEqual(CecotecCongaRobot.IS_POSE_ON_MAP(map, pose(0.5, -0.5)), true);
        assert.strictEqual(CecotecCongaRobot.IS_POSE_ON_MAP(map, undefined), false);
    });

    it("no publica el robot fuera del mapa, ni aunque esté limpiando", () => {
        const robot = buildRobotWith(STATUS.CLEANING, DeviceMode.VALUE.NONE);

        assert.strictEqual(robot.getRobotEntity(buildMap({ robot: pose(1100, 1100) })), undefined);
        assert.ok(robot.getRobotEntity(buildMap({ robot: pose(1, 1) })));
    });

    it("en la base el robot se dibuja sobre ella aunque la posición sea el valor sin posición", () => {
        const robot = buildRobotWith(STATUS.DOCKED, DeviceMode.VALUE.NONE);
        const entity = robot.getRobotEntity(buildMap({ robot: pose(1100, 1100), charger: pose(0, 0) }));

        assert.deepStrictEqual(entity.points, [400, 400]);
    });

    it("solo publica go_to_target con un destino real", () => {
        const going = buildRobotWith(STATUS.MOVING, DeviceMode.VALUE.SPOT);
        const idle = buildRobotWith(STATUS.DOCKED, DeviceMode.VALUE.NONE);

        assert.strictEqual(going.getGoToTarget(buildMap({ currentSpot: pose(1100, 1100) })), undefined);
        assert.strictEqual(idle.getGoToTarget(buildMap({ currentSpot: pose(1, 1) })), undefined);
        assert.ok(going.getGoToTarget(buildMap({ currentSpot: pose(1, 1) })));
    });
});

describe("Mota: vuelta por batería", () => {
    const buildDevice = (props) => {
        return Object.assign({ device: {} }, { device: props });
    };
    const statusOf = (device) => {
        const robot = Object.create(CecotecCongaRobot.prototype);

        return robot.getStatusState(buildDevice(device));
    };

    it("el 2100 no es un error: el robot está volviendo", () => {
        const status = statusOf({
            state: { value: DeviceState.VALUE.CLEANING },
            error: { value: DeviceError.VALUE.BROKEN_GO_HOME },
            motaRawFaultCode: 2100
        });

        assert.strictEqual(status.value, STATUS.RETURNING);
        assert.strictEqual(status.error, undefined);
    });

    it("no crea una limpieza interrumpida al volver por batería, y sí con un fallo real", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const interrupted = [];

        robot.cleanStartedAt = undefined;
        robot.cleanHistory = {
            storeInterrupted: (id) => {
                interrupted.push(id);
            }
        };
        Object.defineProperty(robot, "state", { value: { map: null } });

        const cleaning = statusOf({ state: { value: DeviceState.VALUE.CLEANING } });
        const returning = statusOf({
            state: { value: DeviceState.VALUE.CLEANING },
            error: { value: DeviceError.VALUE.BROKEN_GO_HOME },
            motaRawFaultCode: 2100
        });
        const failed = statusOf({
            state: { value: DeviceState.VALUE.PAUSED },
            error: { value: DeviceError.VALUE.ESCAPE_FAILED },
            motaRawFaultCode: 514
        });

        robot.trackInterruptedClean(undefined, cleaning);
        robot.trackInterruptedClean(cleaning, returning);
        assert.strictEqual(interrupted.length, 0);

        robot.trackInterruptedClean(returning, failed);
        assert.strictEqual(interrupted.length, 1);
    });
});

describe("Mota: vuelta por batería y carga para reanudar", () => {
    const pose = (x, y) => {
        return {
            degrees: 90,
            toCoordinates: () => {
                return { x: x, y: y };
            }
        };
    };
    const buildMap = (props) => {
        return Object.assign({
            size: { x: 800, y: 800 },
            min: { x: -20, y: -20 },
            max: { x: 20, y: 20 },
            robotPath: [],
            toPixel: ({ x, y }) => {
                return { x: Math.floor((x + 20) * 20), y: Math.floor((y + 20) * 20) };
            }
        }, props);
    };
    const buildDevice = (props) => {
        return { device: Object.assign({ motaRawFaultCode: 0, battery: { value: 40 } }, props) };
    };
    const emitterWith = (map) => {
        const emitter = Object.create(Robot.prototype);
        const events = [];

        emitter.device = { map: map };
        emitter.emit = (name) => {
            return events.push(name);
        };

        return { emitter: emitter, events: events };
    };
    const positionFrame = (update, x, y) => {
        return { packet: { payload: { object: { mapHeadId: 0, poseId: 1, update: update, poseX: x, poseY: y, posePhi: 0 } } } };
    };
    const buildConnected = (options = {}) => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const agnoc = {
            isConnected: true,
            device: Object.assign({
                map: buildMap({ robot: pose(1, 1), charger: pose(0, 0) }),
                mode: { value: DeviceMode.VALUE.NONE }
            }, options.device)
        };
        let status = options.status ?? new StatusStateAttribute({ value: STATUS.CLEANING });

        robot.server = {
            getRobots: () => {
                return [agnoc];
            }
        };
        robot.pathPoints = [];
        robot.livePathTail = [];
        robot.lastPathPoints = [];
        robot.emitMapUpdated = () => {};
        Object.defineProperty(robot, "state", {
            value: {
                map: { entities: [], metaData: {} },
                getFirstMatchingAttributeByConstructor: () => {
                    return status;
                },
                upsertFirstMatchingAttribute: (attribute) => {
                    if (attribute instanceof StatusStateAttribute) {
                        status = attribute;
                    }
                }
            }
        });

        return { robot: robot, agnoc: agnoc };
    };

    it("el modo 11 es volver a la base y, con la carga puesta, estar en ella", () => {
        assert.strictEqual(DeviceStateMapper.toDomain({ type: 3, workMode: 11, chargeStatus: false }).value, "returning");
        assert.strictEqual(DeviceStateMapper.toDomain({ type: 3, workMode: 11, chargeStatus: true }).value, "docked");
        assert.strictEqual(DeviceStateMapper.toDomain({ type: 3, workMode: 1, chargeStatus: true }).value, "cleaning");
    });

    it("cargando en modo 11 está en la base, cargando y con la limpieza por reanudar", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const device = buildDevice({
            state: { value: DeviceState.VALUE.DOCKED },
            motaRawWorkMode: 11,
            motaRawFaultCode: 2101
        });
        const status = robot.getStatusState(device);

        assert.strictEqual(status.value, STATUS.DOCKED);
        assert.strictEqual(status.flag, StatusStateAttribute.FLAG.RESUMABLE);
        assert.strictEqual(robot.getBatteryState(device).flag, BatteryStateAttribute.FLAG.CHARGING);
    });

    it("los pares 2100/2101 durante la carga no lo sacan de la base", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);

        for (const code of [2100, 2101]) {
            const status = robot.getStatusState(buildDevice({
                state: { value: DeviceState.VALUE.DOCKED },
                error: { value: code === 2100 ? DeviceError.VALUE.BROKEN_GO_HOME : DeviceError.VALUE.NONE },
                motaRawWorkMode: 11,
                motaRawFaultCode: code
            }));

            assert.strictEqual(status.value, STATUS.DOCKED);
            assert.strictEqual(status.error, undefined);
        }
    });

    it("en la base sin nada por reanudar no marca reanudar", () => {
        const robot = Object.create(CecotecCongaRobot.prototype);
        const status = robot.getStatusState(buildDevice({ state: { value: DeviceState.VALUE.DOCKED }, motaRawWorkMode: 0 }));

        assert.strictEqual(status.flag, StatusStateAttribute.FLAG.NONE);
    });

    it("una posición con update 0 mueve el robot: update solo dice si va al recorrido", () => {
        const positions = [];
        const { emitter, events } = emitterWith(buildMap({
            updateRobot: (position) => {
                positions.push(position.toCoordinates().x);
            }
        }));

        emitter.handleUpdateRobotPosition(positionFrame(0, 1.5, -2));
        assert.deepStrictEqual(events, ["updateRobotPosition"]);
        assert.strictEqual(emitter.device.motaPoseDrawn, false);

        emitter.handleUpdateRobotPosition(positionFrame(1, 2, -2));
        assert.strictEqual(emitter.device.motaPoseDrawn, true);
        assert.deepStrictEqual(positions, [1.5, 2]);
    });

    it("con update 0 no toma el valor sin posición como posición", () => {
        const { emitter, events } = emitterWith(buildMap({
            updateRobot: () => {
                assert.fail("no debe cambiar la posición");
            }
        }));

        emitter.handleUpdateRobotPosition(positionFrame(0, 1100, 1100));

        assert.deepStrictEqual(events, []);
    });

    it("la vuelta mueve el robot en el mapa pero no se añade al recorrido", () => {
        const { robot, agnoc } = buildConnected({ device: { motaPoseDrawn: false } });

        robot.onUpdateRobotPosition(agnoc);

        const entity = robot.state.map.entities.find(e => {
            return e.type === "robot_position";
        });

        assert.deepStrictEqual(entity.points, [420, 380]);
        assert.deepStrictEqual(robot.livePathTail, []);
        assert.deepStrictEqual(robot.pathPoints, []);
    });

    it("limpiando, la posición sí se añade al recorrido", () => {
        const { robot, agnoc } = buildConnected({ device: { motaPoseDrawn: true } });

        robot.onUpdateRobotPosition(agnoc);

        assert.deepStrictEqual(robot.livePathTail, [420, 380]);
    });

    it("al reanudar tras cargar conserva la foto del mapa; una limpieza nueva toma otra", () => {
        const snapshotsFrom = (flag) => {
            const { robot, agnoc } = buildConnected({
                status: new StatusStateAttribute({ value: STATUS.DOCKED, flag: flag }),
                device: { state: { value: DeviceState.VALUE.CLEANING }, motaRawWorkMode: 1 }
            });
            let snapshots = 0;

            robot.getMapSnapshot = () => {
                return {};
            };
            robot.virtualRooms = { stale: false };
            robot.mapVersions = {
                onCleaningStarted: () => {
                    snapshots++;
                }
            };
            robot.mapRecovery = { onDeviceUpdate: () => {} };
            robot.emitStateAttributesUpdated = () => {};
            robot.onUpdateDevice(agnoc);

            return snapshots;
        };

        assert.strictEqual(snapshotsFrom(StatusStateAttribute.FLAG.RESUMABLE), 0);
        assert.strictEqual(snapshotsFrom(StatusStateAttribute.FLAG.NONE), 1);
    });

    it("al reanudar tras cargar conserva el recorrido; una limpieza nueva lo empieza de cero", () => {
        const { robot, agnoc } = buildConnected({ status: new StatusStateAttribute({ value: STATUS.DOCKED }) });
        const step = (device) => {
            Object.assign(agnoc.device, { motaRawFaultCode: 0, error: undefined }, device);
            robot.onUpdateDevice(agnoc);
        };

        robot.virtualRooms = { stale: false };
        robot.mapRecovery = { onDeviceUpdate: () => {} };
        robot.emitStateAttributesUpdated = () => {};

        step({ state: { value: DeviceState.VALUE.CLEANING }, motaRawWorkMode: 1, motaPoseDrawn: true });
        robot.pathPoints = [1, 1, 2, 2];
        robot.livePathTail = [3, 3];

        // Limpieza programada del 3/11: vuelta por batería (2100), carga en modo 11 (2101) y reanudación
        step({
            state: { value: DeviceState.VALUE.RETURNING },
            error: { value: DeviceError.VALUE.BROKEN_GO_HOME },
            motaRawWorkMode: 11,
            motaPoseDrawn: false,
            motaRawFaultCode: 2100
        });
        step({ state: { value: DeviceState.VALUE.DOCKED }, motaRawWorkMode: 11, motaRawFaultCode: 2101, motaPoseDrawn: false });
        assert.strictEqual(robot.state.getFirstMatchingAttributeByConstructor().flag, StatusStateAttribute.FLAG.RESUMABLE);

        step({ state: { value: DeviceState.VALUE.CLEANING }, motaRawWorkMode: 1, motaRawFaultCode: 2110, motaPoseDrawn: true });
        assert.deepStrictEqual(robot.pathPoints, [1, 1, 2, 2]);
        assert.deepStrictEqual(robot.livePathTail, [3, 3]);

        // Al terminar vuelve a la base sin nada por reanudar; la siguiente limpieza es otra
        step({ state: { value: DeviceState.VALUE.DOCKED }, motaRawWorkMode: 0 });
        step({ state: { value: DeviceState.VALUE.CLEANING }, motaRawWorkMode: 1, motaPoseDrawn: true });
        assert.deepStrictEqual(robot.pathPoints, []);
        assert.deepStrictEqual(robot.livePathTail, []);
    });

    it("no recupera el mapa mientras carga para reanudar", async () => {
        const { robot, recovery, orders } = buildRobot();

        robot.state.getFirstMatchingAttributeByConstructor = () => {
            return { value: STATUS.DOCKED, flag: StatusStateAttribute.FLAG.RESUMABLE };
        };

        assert.strictEqual(recovery.getStatus().docked, false);
        await assert.rejects(recovery.start());
        assert.deepStrictEqual(orders, []);
    });
});

describe("Mota: limpiezas de unos segundos", () => {
    const withDirectory = (fn) => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-history-"));

        try {
            fn(directory);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    };

    it("no guarda ni suma el informe de 8 s sin superficie", () => {
        withDirectory(directory => {
            const history = new CecotecCleanHistory({ directory: directory });

            history.store({ cleanId: 1793619400, task: { startTime: 1793619400, endTime: 1793619408 } }, undefined, { entities: [] });

            assert.deepStrictEqual(history.list(), []);
            assert.strictEqual(history.getTotals().count, 0);
        });
    });

    it("una limpieza corta con superficie sí cuenta", () => {
        withDirectory(directory => {
            const history = new CecotecCleanHistory({ directory: directory });

            history.store({ cleanId: 1000, task: { startTime: 1000, endTime: 1040 } }, { area: 500 }, null);

            assert.strictEqual(history.list().length, 1);
            assert.strictEqual(history.getTotals().count, 1);
        });
    });

    it("quita del historial y de los totales la entrada que ya estaba guardada", () => {
        withDirectory(directory => {
            fs.writeFileSync(path.join(directory, "totales.json"), JSON.stringify({ count: 3, timeSeconds: 108, areaCm2: 7 }));
            fs.writeFileSync(path.join(directory, "1793619400.json"), JSON.stringify({ cleanId: 1793619400, durationSeconds: 8 }));
            fs.writeFileSync(path.join(directory, "1793619400.png"), "x");
            fs.writeFileSync(path.join(directory, "1000.json"), JSON.stringify({ cleanId: 1000, durationSeconds: 100, area: 7 }));

            const history = new CecotecCleanHistory({ directory: directory });

            assert.deepStrictEqual(history.list().map(e => {
                return e.cleanId;
            }), [1000]);
            assert.deepStrictEqual(history.getTotals(), { count: 2, timeSeconds: 100, areaCm2: 7 });
            assert.strictEqual(fs.existsSync(path.join(directory, "1793619400.png")), false);

            // Solo una vez
            const reopened = new CecotecCleanHistory({ directory: directory });

            assert.strictEqual(reopened.getTotals().count, 2);
        });
    });
});

describe("Mota: versiones por habitaciones", () => {
    const WIDTH = 10;
    const buildVersions = (directory) => {
        return new CecotecMapVersions({
            directory: directory,
            robot: { config: { get: () => {
                return {};
            } } }
        });
    };
    const snapshot = (createdAt, rooms) => {
        return {
            createdAt: createdAt,
            width: WIDTH,
            floor: [1, 2, 3, 4],
            map: { entities: [] },
            rooms: { width: WIDTH, rooms: rooms }
        };
    };
    const SALON = { id: 1, name: "Salón", pixels: [1, 2] };
    const COCINA = { id: 2, name: "Cocina", pixels: [3, 4] };
    const withVersions = (fn) => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mota-versions-"));

        try {
            fn(buildVersions(directory), directory);
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    };
    const reasons = (versions) => {
        return versions.list().map(v => {
            return v.reason;
        });
    };

    it("guarda las habitaciones nuevas aunque el mapa no cambie, y una sola vez", () => {
        withVersions(versions => {
            versions.onCleaningStarted(snapshot(1000000, [SALON]));
            versions.onCleaningFinished({ width: WIDTH, floor: [1, 2, 3, 4] });
            assert.deepStrictEqual(reasons(versions), ["first"]);

            versions.onCleaningStarted(snapshot(2000000, [SALON, COCINA]));
            versions.onCleaningFinished({ width: WIDTH, floor: [1, 2, 3, 4] });
            assert.deepStrictEqual(reasons(versions), ["rooms", "first"]);

            versions.onCleaningStarted(snapshot(3000000, [SALON, COCINA]));
            versions.onCleaningFinished({ width: WIDTH, floor: [1, 2, 3, 4] });
            assert.strictEqual(versions.list().length, 2);
        });
    });

    it("cambiar el nombre también es otra disposición", () => {
        withVersions(versions => {
            versions.onCleaningStarted(snapshot(1000000, [SALON]));
            versions.onCleaningStarted(snapshot(2000000, [Object.assign({}, SALON, { name: "Sala" })]));

            assert.deepStrictEqual(reasons(versions), ["rooms", "first"]);
        });
    });

    it("reconoce las habitaciones de una versión antigua, sin huella guardada", () => {
        withVersions((versions, directory) => {
            versions.onCleaningStarted(snapshot(1000000, [SALON]));

            const metaPath = path.join(directory, "1000.meta.json");
            const meta = JSON.parse(fs.readFileSync(metaPath).toString());

            delete meta.roomsHash;
            fs.writeFileSync(metaPath, JSON.stringify(meta));

            versions.onCleaningStarted(snapshot(2000000, [SALON]));

            assert.strictEqual(versions.list().length, 1);
        });
    });

    it("no duplica la foto si además el mapa cambia durante esa limpieza", () => {
        withVersions(versions => {
            versions.onCleaningStarted(snapshot(1000000, [SALON]));
            versions.onCleaningStarted(snapshot(2000000, [COCINA]));
            versions.onCleaningFinished({ width: WIDTH, floor: [7, 8, 9] });

            assert.strictEqual(versions.list().length, 2);
        });
    });

    it("una limpieza descartada no guarda nada al terminar", () => {
        withVersions(versions => {
            versions.onCleaningStarted(snapshot(1000000, [SALON]));
            versions.onCleaningFinished({ width: WIDTH, floor: [1, 2, 3, 4] });
            versions.discardPending();
            versions.onCleaningFinished({ width: WIDTH, floor: [7, 8, 9] });

            assert.strictEqual(versions.list().length, 1);
        });
    });
});

describe("Mota: borrar el mapa del firmware", () => {
    const CecotecMapResetCapability = require("../../../../lib/robots/cecotec/capabilities/CecotecMapResetCapability");

    const buildCapability = (saveFails) => {
        const calls = [];
        const robot = {
            robot: {
                resetMap: async () => {
                    calls.push("0x1105");
                },
                updateMap: async () => {
                    calls.push("updateMap");
                }
            },
            saveMapBeforeReset: () => {
                if (saveFails) {
                    throw new Error("disco lleno");
                }
                calls.push("version");
            },
            onUserMapReset: () => {
                calls.push("cleared");
            },
            refreshMap: () => {
                calls.push("refresh");
            }
        };

        return { calls: calls, capability: new CecotecMapResetCapability({ robot: robot }) };
    };

    it("guarda la versión antes de enviar la orden y limpia Mota después", async () => {
        const { calls, capability } = buildCapability(false);

        await capability.reset();

        assert.deepStrictEqual(calls, ["version", "0x1105", "cleared", "updateMap", "refresh"]);
    });

    it("sin versión no envía la orden", async () => {
        const { calls, capability } = buildCapability(true);

        await assert.rejects(() => {
            return capability.reset();
        }, /disco lleno/);
        assert.deepStrictEqual(calls, []);
    });
});
