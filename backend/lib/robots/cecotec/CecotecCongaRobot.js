const capabilities = require("./capabilities");
const CecotecBatteryGuard = require("./CecotecBatteryGuard");
const CecotecCleanHistory = require("./CecotecCleanHistory");
const CecotecMapGuard = require("./CecotecMapGuard");
const CecotecMotaRouter = require("./CecotecMotaRouter");
const CecotecQuirkFactory = require("./CecotecQuirkFactory");
const CecotecVirtualRooms = require("./CecotecVirtualRooms");
const fs = require("fs");
const Logger = require("../../Logger");
const path = require("path");
const PendingMapChangeValetudoEvent = require("../../valetudo_events/events/PendingMapChangeValetudoEvent");
const QuirksCapability = require("../../core/capabilities/QuirksCapability");
const SelectionPreset = require("../../entities/core/ValetudoSelectionPreset");
const ValetudoRobot = require("../../core/ValetudoRobot");
const {
    BatteryStateAttribute,
    StatusStateAttribute,
    PresetSelectionStateAttribute,
} = require("../../entities/state/attributes");
const {
    CloudServer,
    DeviceFanSpeed,
    DeviceState,
} = require("@agnoc/core");
const {
    ValetudoMap,
    PointMapEntity,
    PathMapEntity,
    MapLayer,
    PolygonMapEntity,
    LineMapEntity,
} = require("../../entities/map");
const { DeviceError } = require("@agnoc/core/lib/value-objects/device-error.value-object");
const { DeviceMode } = require("@agnoc/core");

const DEVICE_MODE_TO_STATUS_STATE_FLAG = {
    [DeviceMode.VALUE.NONE]: StatusStateAttribute.FLAG.NONE,
    [DeviceMode.VALUE.SPOT]: StatusStateAttribute.FLAG.SPOT,
    [DeviceMode.VALUE.ZONE]: StatusStateAttribute.FLAG.ZONE,
};

// Mota: evento del firmware "vuelvo a la base por batería baja" (pushFaultEvent2Server)
const FIRMWARE_EVENT_LOW_BATTERY_RETURN = 2100;

/** @type {Set<string>} */
const NON_BLOCKING_DEVICE_ERRORS = new Set([
    DeviceError.VALUE.GLOBAL_APPOINT_CLEAN,
    DeviceError.VALUE.ROBOT_CHANGING_FINISH,
    DeviceError.VALUE.ROBOT_RELOCALITION_ING,
    DeviceError.VALUE.ROBOT_REPEAT_CLEANING,
    DeviceError.VALUE.ROBOT_SELF_CHECKING,
    DeviceError.VALUE.SYSTEM_UPGRADE,
    DeviceError.VALUE.WAIT_CHARGE_FINISH,
]);

const DEVICE_ERROR_TO_DESCRIPTION = {
    [DeviceError.VALUE.BATTERY_TEMPERATURE]: "Battery temperature is out of range.",
    [DeviceError.VALUE.BROKEN_CHARGING]: "Charging error. Please check the dock and contacts.",
    [DeviceError.VALUE.BROKEN_CHARGING_WAIT]: "Charging error. Waiting to retry.",
    [DeviceError.VALUE.BROKEN_GO_HOME]: "Unable to return to the dock.",
    [DeviceError.VALUE.BUMPER_STRUCT]: "Bumper is stuck or blocked.",
    [DeviceError.VALUE.CHECK_NET_AVAILABLE]: "Network unavailable. Please check your connection.",
    [DeviceError.VALUE.CLIFF_IR_STRUCT]: "Cliff sensor is blocked or dirty.",
    [DeviceError.VALUE.DISHCLOTH_DIRTY]: "Mop cloth is dirty. Please clean or replace it.",
    [DeviceError.VALUE.DOCK_CLIP_EXCEPTION]: "Dock sensor error. Please check the dock.",
    [DeviceError.VALUE.DUSTBOX_NOT_EXIST]: "Dust bin missing. Please insert it.",
    [DeviceError.VALUE.DUST_BOX_FULL]: "The dust bin is full. Please empty it.",
    [DeviceError.VALUE.ESCAPE_FAILED]: "Robot is stuck and cannot escape.",
    [DeviceError.VALUE.FOLLOWE_IR_EXCEPTION]: "Follow IR sensor error.",
    [DeviceError.VALUE.GEOMAGETISM_STRUCT]: "Magnetic sensor error.",
    [DeviceError.VALUE.GIVE_BACK]: "Robot needs to be returned to the dock.",
    [DeviceError.VALUE.GLOBAL_APPOINT_CLEAN]: "Scheduled cleaning in progress.",
    [DeviceError.VALUE.GO_DOCK_FAILED]: "Failed to dock. Please place the robot on the dock.",
    [DeviceError.VALUE.HANDPPEN_DUST_BOX_FULL]: "The dust bin is full. Please empty it.",
    [DeviceError.VALUE.HUICHENGHE_FULL]: "The dust bin is full. Please empty it.",
    [DeviceError.VALUE.LIDAR_TIME_OUT]: "Lidar timeout. Please check the lidar sensor.",
    [DeviceError.VALUE.LOW_POWER_PLAN_DIS]: "Low power. Please charge the robot.",
    [DeviceError.VALUE.LOW_START_BATTERY]: "Battery too low to start.",
    [DeviceError.VALUE.MOPPING_NOT_EXIST]: "Mop attachment missing.",
    [DeviceError.VALUE.NONE]: "No error.",
    [DeviceError.VALUE.PUT_MACHINE_DOCK]: "Place the robot on the dock.",
    [DeviceError.VALUE.RELOCALIZATION_FAILED]: "Relocalization failed. Please move the robot to an open area.",
    [DeviceError.VALUE.ROBOT_CHANGING_FINISH]: "Charging complete.",
    [DeviceError.VALUE.ROBOT_RELOCALITION_ING]: "Relocalizing. Please wait.",
    [DeviceError.VALUE.ROBOT_REPEAT_CLEANING]: "Repeat cleaning in progress.",
    [DeviceError.VALUE.ROBOT_SELF_CHECKING]: "Robot self-checking. Please wait.",
    [DeviceError.VALUE.ROLL_BRUSH_STALL]: "Main brush is stuck. Please clean it.",
    [DeviceError.VALUE.SIDE_BRUSH_STALL]: "Side brush is stuck. Please clean it.",
    [DeviceError.VALUE.SLOPE_START_FAILED]: "Unable to start on a slope. Move the robot to a flat area.",
    [DeviceError.VALUE.START_DOCK_FAILED]: "Failed to start docking.",
    [DeviceError.VALUE.SYSTEM_UPGRADE]: "System upgrade in progress.",
    [DeviceError.VALUE.WAIT_CHARGE_FINISH]: "Waiting for charging to finish.",
    [DeviceError.VALUE.WATER_BOX_NOT_EXIST]: "Water tank missing.",
    [DeviceError.VALUE.WATER_TRUNK_EMPTY]: "Water tank empty.",
    [DeviceError.VALUE.WHEEL_UP]: "Wheel lifted. Place the robot on the floor.",
};

function throttle(callback, wait = 1000, immediate = true) {
    let timeout = null;
    let initialCall = true;

    return function () {
        const callNow = immediate && initialCall;
        const next = () => {
            callback.apply(this, arguments);
            timeout = null;
        };

        if (callNow) {
            initialCall = false;
            next();
        }

        if (!timeout) {
            timeout = setTimeout(next, wait);
        }
    };
}

module.exports = class CecotecCongaRobot extends ValetudoRobot {
    constructor(options) {
        super(options);

        this.pathPoints = [];
        /** Mota: modo de la próxima limpieza (ver CecotecOperationModeControlCapability) */
        this.selectedOperationMode = PresetSelectionStateAttribute.MODE.VACUUM;
        /** Mota: última orden de limpieza ({type: "mode", mode} o {type: "zones", options}), para reanudar */
        this.lastCleaningRequest = undefined;
        this.batteryGuard = new CecotecBatteryGuard({robot: this});
        this.virtualRooms = new CecotecVirtualRooms({
            path: this.config.get("embedded") === true ? path.join(path.dirname(this.config.location), "habitaciones.json") : undefined
        });
        this.server = new CloudServer();
        this.emitStateUpdated = throttle(this.emitStateUpdated.bind(this));
        this.emitStateAttributesUpdated = throttle(
            this.emitStateAttributesUpdated.bind(this)
        );
        // Mota: el robot envía la posición cada 0,5–3 s; con 1 s de margen se perdían actualizaciones
        this.emitMapUpdated = throttle(this.emitMapUpdated.bind(this), 300);

        const quirkFactory = new CecotecQuirkFactory({
            robot: this
        });
        this.registerCapability(new QuirksCapability({
            robot: this,
            quirks: [
                quirkFactory.getQuirk(CecotecQuirkFactory.KNOWN_QUIRKS.RESUME_AFTER_CHARGE),
                quirkFactory.getQuirk(CecotecQuirkFactory.KNOWN_QUIRKS.RETURN_AT_BATTERY),
                quirkFactory.getQuirk(CecotecQuirkFactory.KNOWN_QUIRKS.RESUME_AT_BATTERY),
                quirkFactory.getQuirk(CecotecQuirkFactory.KNOWN_QUIRKS.MAP_GUARD_THRESHOLD)
            ]
        }));
        this.registerCapability(
            new capabilities.CecotecBasicControlCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecCarpetModeControlCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecCleanRouteControlCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecOperationModeControlCapability({
                robot: this,
                presets: [
                    PresetSelectionStateAttribute.MODE.VACUUM,
                    PresetSelectionStateAttribute.MODE.MOP,
                    PresetSelectionStateAttribute.MODE.EDGE,
                    PresetSelectionStateAttribute.MODE.SPIRAL,
                ].map((mode) => {
                    return new SelectionPreset({ name: mode, value: mode });
                }),
            })
        );
        this.registerCapability(
            new capabilities.CecotecCombinedVirtualRestrictionsCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecCurrentStatisticsCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecDoNotDisturbCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecFanSpeedControlCapability({
                robot: this,
                presets: Object.values(DeviceFanSpeed.VALUE)
                    .filter((k) => {
                        // Mota: el firmware de la 3090 ignora "off" (comprobado: sigue en "low")
                        return typeof k === "string" && k !== DeviceFanSpeed.VALUE.OFF;
                    })
                    .map((k) => {
                        return new SelectionPreset({ name: String(k), value: k });
                    }),
            })
        );
        this.registerCapability(
            new capabilities.CecotecGoToLocationCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecLocateCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecManualControlCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecMapResetCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecMapSegmentationCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecMapSegmentEditCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecMapSegmentRenameCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecPendingMapChangeHandlingCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecPersistentMapControlCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecSpeakerTestCapability({
                robot: this,
            })
        );
        this.registerCapability(
            new capabilities.CecotecSpeakerVolumeControlCapability({
                robot: this,
            })
        );
        // Mota: sin control de nivel de agua; la 3090 no sabe si hay depósito ni cuánta agua tiene
        if (this.config.get("embedded") === true) {
            // Mota: historial de limpiezas junto a la configuración (UDISK en la 3090)
            this.cleanHistory = new CecotecCleanHistory({
                directory: path.join(path.dirname(this.config.location), "historial")
            });
            this.mapGuard = new CecotecMapGuard({
                robot: this,
                referencePath: path.join(path.dirname(this.config.location), "mapa-referencia.json")
            });
            this.registerCapability(
                new capabilities.CecotecTotalStatisticsCapability({
                    robot: this,
                })
            );

            this.registerCapability(
                new capabilities.CecotecWifiConfigurationCapability({
                    robot: this,
                    networkInterface: "wlan0",
                })
            );
        }
        this.registerCapability(
            new capabilities.CecotecZoneCleaningCapability({
                robot: this,
            })
        );

        this.server.on("error", this.onError.bind(this));
        this.server.on("addRobot", this.onAddRobot.bind(this));

        void this.server.listen("0.0.0.0");
    }

    /**
     * @returns {string}
     */
    getManufacturer() {
        return "Cecotec";
    }

    /**
     * @returns {string}
     */
    getModelName() {
        return "Conga";
    }

    /**
     * Mota: lo que falta por limpiar de la última orden, según el recorrido hecho. Limpieza completa o
     * por habitaciones: las habitaciones virtuales que el recorrido no ha cubierto. Zonas: las mismas.
     *
     * @param {import("@agnoc/core").Robot} robot
     * @returns {any}
     */
    getRemainingCleaningRequest(robot) {
        const request = this.lastCleaningRequest;
        const map = robot.device.map;

        if (!request || !map || request.type === "zones" || !this.virtualRooms.hasRooms()) {
            return request;
        }

        if (request.type === "mode" && request.mode !== PresetSelectionStateAttribute.MODE.VACUUM && request.mode !== PresetSelectionStateAttribute.MODE.MOP) {
            return request; // bordes y espiral se repiten tal cual
        }

        const pathEntity = this.getPathEntity(map);
        const path = pathEntity?.points?.length > 0 ? pathEntity.points : this.pathPoints;
        let pending = this.virtualRooms.getUncoveredRoomIds(path, this.getMapResolution(map));

        if (request.type === "segments") {
            const requested = request.segments.map(s => {
                return Number(s.id);
            });
            pending = pending.filter(id => {
                return requested.includes(id);
            });
        }

        if (pending.length === 0) {
            return undefined;
        }

        Logger.info(`Remaining rooms to clean after charging: ${pending.join(", ")}`);

        return {type: "segments", segments: pending.map(id => {
            return {id: String(id)};
        })};
    }

    /**
     * Mota: metros por celda del mapa del firmware
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {number}
     */
    getMapResolution(map) {
        const resolution = (map.max.x - map.min.x) / map.size.x;

        return Number.isFinite(resolution) && resolution > 0 ? resolution : 0.05;
    }

    /**
     * Mota: vuelve a dividir el mapa actual en habitaciones virtuales (descarta las anteriores)
     */
    resegmentRooms() {
        const map = this.robot?.device.map;

        if (!map) {
            throw new Error("There is no map in connected robot");
        }

        this.virtualRooms.segment(this.getMapPixels(map).floor, map.size.x, map.size.y, this.getMapResolution(map));
        this.refreshMap();
    }

    /**
     * Mota: vuelve a generar el mapa de Mota (p. ej. tras editar habitaciones)
     */
    refreshMap() {
        if (this.robot) {
            this.onUpdateMap(this.robot);
        }
    }

    /**
     * Mota: repite una orden de limpieza guardada (reanudación tras cargar)
     *
     * @param {{type: "mode", mode: string} | {type: "zones", options: any} | {type: "segments", segments: any} | undefined} request
     * @returns {Promise<void>}
     */
    async repeatCleaningRequest(request) {
        if (request?.type === "segments") {
            await this.capabilities[capabilities.CecotecMapSegmentationCapability.TYPE].executeSegmentAction(request.segments);

            return;
        }

        if (request?.type === "zones") {
            await this.capabilities[capabilities.CecotecZoneCleaningCapability.TYPE].start(request.options);

            return;
        }

        if (request?.type === "mode") {
            this.selectedOperationMode = request.mode;
        }

        await this.capabilities[capabilities.CecotecBasicControlCapability.TYPE].start();
    }

    /**
     * Mota: si ahora mismo es horario de No molestar del robot (evaluado en su hora local, que
     * es la zona horaria del proceso)
     *
     * @returns {boolean}
     */
    isInDoNotDisturb() {
        const quietHours = this.robot?.device.config?.quietHours;

        if (!quietHours?.isEnabled) {
            return false;
        }

        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const begin = quietHours.begin.toMinutes();
        const end = quietHours.end.toMinutes();

        return begin <= end ? minutes >= begin && minutes < end : minutes >= begin || minutes < end;
    }

    /**
     * Mota: API propia (historial y diagnóstico) en /api/v2/mota/
     *
     * @param {any} app
     */
    initModelSpecificWebserverRoutes(app) {
        app.use("/api/v2/mota/", new CecotecMotaRouter({robot: this}).getRouter());
    }

    async shutdown() {
        await this.server.close();
    }

    /**
     * @type {import("@agnoc/core").Robot|undefined}
     */
    get robot() {
        return this.server.getRobots().find((robot) => {
            return robot.isConnected;
        });
    }

    onError(err) {
        Logger.error(err);
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    onAddRobot(robot) {
        Logger.info(`Added new robot with id '${robot.device.id}'`);

        robot.on("updateDevice", () => {
            return this.onUpdateDevice(robot);
        });
        robot.on("updateMap", () => {
            return this.onUpdateMap(robot);
        });
        robot.on("updateRobotPosition", () => {
            return this.onUpdateRobotPosition(robot);
        });
        robot.on("updateChargerPosition", () => {
            return this.onUpdateChargerPosition(robot);
        });
        robot.on("cleanReport", (report) => {
            this.cleanHistory?.store(report, this.lastCleanStatistics);
            this.lastCleanStatistics = undefined;

            // Mota: la espiral trabaja con un mapa temporal; no se compara con la referencia
            const { map, mode } = robot.device;
            if (this.mapGuard && map && mode?.value !== DeviceMode.VALUE.SPIRAL) {
                const { floor } = this.getMapPixels(map);
                const indices = [];

                for (let i = 0; i < floor.length; i += 2) {
                    indices.push(floor[i + 1] * map.size.x + floor[i]);
                }

                this.mapGuard.check({ width: map.size.x, floor: indices });
            }
        });
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    onUpdateDevice(robot) {
        const oldStatus =
      this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        const newStatus = this.getStatusState(robot);

        // Reset path points when robot goes from docked to another state.
        if (
            oldStatus &&
      oldStatus.value !== newStatus.value &&
      oldStatus.value === StatusStateAttribute.VALUE.DOCKED
        ) {
            this.pathPoints = [];
        }

        this.state.upsertFirstMatchingAttribute(this.getBatteryState(robot));

        // Mota: últimos valores de la limpieza en curso, para el historial
        const currentClean = robot.device.currentClean;
        if (currentClean && currentClean.time > 0) {
            this.lastCleanStatistics = { time: currentClean.time * 60, area: currentClean.size * 100 };
        }
        this.state.upsertFirstMatchingAttribute(newStatus);
        if (robot.device.motaRawFaultCode === FIRMWARE_EVENT_LOW_BATTERY_RETURN) {
            this.batteryGuard.onFirmwareLowBatteryReturn(this.getRemainingCleaningRequest(robot));
        }
        this.batteryGuard.onStateUpdate(robot.device.battery?.value, newStatus.value);

        // Mota: al llegar a la base, recolocar el robot sobre ella en el mapa
        if (
            oldStatus?.value !== StatusStateAttribute.VALUE.DOCKED &&
            newStatus.value === StatusStateAttribute.VALUE.DOCKED
        ) {
            this.onUpdateRobotPosition(robot);
        }
        // Mota: antes del primer estado completo agnoc no conoce la potencia y se publicaba "off",
        // que no es un valor válido en la 3090 (y MQTT lo rechazaba)
        if (robot.device.fanSpeed && robot.device.fanSpeed.value !== DeviceFanSpeed.VALUE.OFF) {
            this.state.upsertFirstMatchingAttribute(this.getIntensityState(robot));
        }

        this.state.upsertFirstMatchingAttribute(this.getOperationModeState(robot));

        // Mota: la 3090 no tiene sensores de depósito ni de mopa, y agnoc deducía "mopa puesta"
        // de un campo que este firmware no envía. No se publican accesorios ni consumibles
        // (el firmware no responde a las órdenes de consumibles).

        this.emitStateAttributesUpdated();

        if (robot.device.hasWaitingMap) {
            const event = new PendingMapChangeValetudoEvent({});

            if (!this.valetudoEventStore.getById(event.id)) {
                this.valetudoEventStore.raise(event);
            }
        }
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     */
    getRobotEntity(map) {
        if (!map.robot) {
            return;
        }

        // Mota: en la base el firmware deja de enviar la posición y el mapa mostraba la última
        // conocida. Si está en la base y sabemos dónde está, el robot se dibuja sobre ella.
        const status = this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        const pose = status?.value === StatusStateAttribute.VALUE.DOCKED && map.charger ? map.charger : map.robot;

        const offset = map.size.y;
        const { x, y } = map.toPixel(pose.toCoordinates());

        return new PointMapEntity({
            type: PointMapEntity.TYPE.ROBOT_POSITION,
            points: [x, offset - y],
            metaData: {
                angle: pose.degrees,
            },
        });
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     */
    getChargerEntity(map) {
        if (!map.charger) {
            return;
        }

        const offset = map.size.y;
        const { x, y } = map.toPixel(map.charger.toCoordinates());

        return new PointMapEntity({
            type: PointMapEntity.TYPE.CHARGER_LOCATION,
            points: [x, offset - y],
            metaData: {
                angle: map.charger.degrees,
            },
        });
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     */
    getGoToTarget(map) {
        if (!map.currentSpot) {
            return;
        }

        const offset = map.size.y;
        const { x, y } = map.toPixel(map.currentSpot.toCoordinates());

        return new PointMapEntity({
            type: PointMapEntity.TYPE.GO_TO_TARGET,
            points: [x, offset - y],
            metaData: {
                angle: map.currentSpot.degrees,
            },
        });
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     */
    updatePathPoints(map) {
        if (!map.robot || map.robotPath.length > 0) {
            return;
        }

        const offset = map.size.y;
        const { x, y } = map.toPixel(map.robot.toCoordinates());

        this.pathPoints.push(x, offset - y);
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     */
    getPathEntity(map) {
        const offset = map.size.y;
        const robotPath =
      map.robotPath &&
      map.robotPath
          .map((coordinate) => {
              const { x, y } = map.toPixel(coordinate);

              return [x, offset - y];
          })
          .flat();

        const points =
      robotPath && robotPath.length > 0 ? robotPath : this.pathPoints;

        if (points.length === 0) {
            return;
        }

        return new PathMapEntity({
            type: PathMapEntity.TYPE.PATH,
            points: points,
        });
    }

    /**
     * Returns the raw floor and wall pixels as flat [x, y, x, y, ...] arrays
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {{floor: Array<number>, walls: Array<number>}}
     */
    getMapPixels(map) {
        const { size, grid } = map;
        const offset = 5;
        const walls = [];
        const floor = [];

        // apply offset to remove fake bottom line.
        for (let x = offset; x < size.x - offset; x++) {
            for (let y = offset; y < size.y - offset; y++) {
                const coord = (size.y - y) * size.x + x;
                const point = grid[coord];

                if (point === 255) {
                    walls.push(x, y);
                } else if (point !== 0) {
                    floor.push(x, y);
                }
            }
        }

        // Mota: lo que hay dentro de las zonas de espejo es un reflejo, no casa
        const mirrorZones = this.getMirrorZones();
        if (mirrorZones.length > 0) {
            const outside = (pixels) => {
                const result = [];

                for (let i = 0; i < pixels.length; i += 2) {
                    const px = pixels[i];
                    const py = pixels[i + 1];

                    if (!mirrorZones.some(z => {
                        return px >= z.x0 && px <= z.x1 && py >= z.y0 && py <= z.y1;
                    })) {
                        result.push(px, py);
                    }
                }

                return result;
            };

            return { floor: outside(floor), walls: outside(walls) };
        }

        return { floor: floor, walls: walls };
    }

    /**
     * Mota: zonas de espejo (rectángulos en celdas del mapa de Mota)
     *
     * @returns {Array<{x0: number, y0: number, x1: number, y1: number}>}
     */
    getMirrorZones() {
        return this.config?.get("robot").implementationSpecificConfig?.motaMirrorZones ?? [];
    }

    /**
     * @param {Array<{x0: number, y0: number, x1: number, y1: number}>} zones
     */
    setMirrorZones(zones) {
        const robotConfig = this.config.get("robot");
        const implementationSpecificConfig = Object.assign({}, robotConfig.implementationSpecificConfig, {
            motaMirrorZones: zones.map(z => {
                return {
                    x0: Math.round(Math.min(z.x0, z.x1)),
                    y0: Math.round(Math.min(z.y0, z.y1)),
                    x1: Math.round(Math.max(z.x0, z.x1)),
                    y1: Math.round(Math.max(z.y0, z.y1)),
                };
            })
        });

        this.config.set("robot", Object.assign({}, robotConfig, {implementationSpecificConfig: implementationSpecificConfig}));
        this.refreshMap();
    }

    /**
     * MapLayer compresses its pixels on construction, which requires them to be sorted by y, then x
     *
     * @param {import("../../entities/map/MapLayer").MapLayerType} type
     * @param {Array<number>} pixels
     * @param {object} [metaData]
     * @returns {import("../../entities/map/MapLayer")|null}
     */
    buildMapLayer(type, pixels, metaData) {
        if (pixels.length === 0) {
            return null;
        }

        const tuples = [];

        for (let i = 0; i < pixels.length; i = i + 2) {
            tuples.push([pixels[i], pixels[i + 1]]);
        }

        tuples.sort((a, b) => {
            return a[1] - b[1] || a[0] - b[0];
        });

        return new MapLayer({
            type: type,
            pixels: tuples.flat(),
            metaData: metaData
        });
    }

    // Convert walls and floor array to matrix style
    /**
     * @param {Array<number>} walls
     * @param {Array<number>} floor
     * @returns {Array<Array<number|string>>}
     */
    mapArrayToMatrix(walls, floor) {
        // check if dimensions is null (empty map?)
        if (walls.length === 0 || floor.length === 0) {
            return [];
        }

        let maxX = 0;
        let maxY = 0;

        for (const pixels of [walls, floor]) {
            for (let i = 0; i < pixels.length; i = i + 2) {
                maxX = Math.max(maxX, pixels[i]);
                maxY = Math.max(maxY, pixels[i + 1]);
            }
        }

        // Create a map filled with [(0,0),(0,0), ...]
        const map = [];
        for (let i = 0; i <= maxX; i++) {
            map[i] = new Array(maxY + 1).fill(0);
        }
        // id 1 = walls
        // id 255 = floor
        for (let i = 0; i < floor.length; i = i + 2) {
            map[floor[i]][floor[i + 1]] = 255;
        }
        for (let i = 0; i < walls.length; i = i + 2) {
            map[walls[i]][walls[i + 1]] = 1;
        }

        return map;
    }

    // fill recursive
    /**
     * @param {number} x
     * @param {number} y
     * @param {Array<Array<number|string>>} fullMap
     * @param {{segmentId: string, pixels: Array<number>}} segment
     */
    boundaryFill8(x, y, fullMap, segment) {
        const maxX = fullMap.length - 1;
        const maxY = fullMap[0].length - 1;
        const queue = [];

        if (x < 0 || x > maxX || y < 0 || y > maxY) {
            return;
        }

        // The seed is usually not one of the reported room pixels and has to be part of the segment as well
        if (fullMap[x][y] === 255) {
            segment.pixels.push(x, y);
        }

        fullMap[x][y] = segment.segmentId;
        queue.push(x, y);

        // Read with an index instead of shift() to keep the fill linear on large maps
        for (let i = 0; i < queue.length; i = i + 2) {
            x = queue[i];
            y = queue[i + 1];

            for (const [nx, ny] of [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]]) {
                if (nx >= 0 && nx <= maxX && ny >= 0 && ny <= maxY && fullMap[nx][ny] === 255) {
                    queue.push(nx, ny);
                    fullMap[nx][ny] = segment.segmentId;
                    segment.pixels.push(nx, ny);
                }
            }
        }
    }

    /**
     * @param {Array<Array<number|string>>} fullMap
     * @param {{segmentId: string, pixels: Array<number>}} segment
     */
    dumpSegmentLayer(fullMap, segment) {
        for (let i = 0; i < segment.pixels.length; i = i + 2) {
            const x = segment.pixels[i];
            const y = segment.pixels[i + 1];

            if (fullMap[x]?.[y] === 255) {
                fullMap[x][y] = segment.segmentId;
            }
        }
    }

    // Adapted from https://stackoverflow.com/a/53660837
    /**
     * @param {Array<number>} numbers
     */
    median(numbers) { //Note that this will modify the input array
        numbers.sort((a, b) => {
            return a - b;
        });

        const middle = Math.floor(numbers.length / 2);

        if (numbers.length % 2 === 0) {
            return (numbers[middle - 1] + numbers[middle]) / 2;
        }

        return numbers[middle];
    }

    /**
     * The robot only reports a sparse outline for each room, so the rooms are flood-filled
     * over the floor pixels starting from the median of the reported pixels
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @param {Array<Array<number|string>>} fullMap
     * @returns {Array<import("../../entities/map/MapLayer")>}
     */
    getSegmentEntities(map, fullMap) {
        // Mota: habitaciones virtuales (la 3090 no informa de habitaciones)
        if (this.virtualRooms?.hasRooms()) {
            const width = this.virtualRooms.getWidth();

            return this.virtualRooms.getRooms().map(room => {
                const pixels = [];

                room.pixels.forEach(i => {
                    pixels.push(i % width, Math.floor(i / width));
                });

                return this.buildMapLayer(MapLayer.TYPE.SEGMENT, pixels, {
                    segmentId: String(room.id),
                    active: false,
                    name: room.name,
                });
            });
        }

        const offset = map.size.y; // 800 in Conga 3490
        const segments = (map.rooms ?? []).map((room) => {
            return {
                segmentId: room.id.value.toString(),
                pixels: room.pixels.flatMap(({ x, y }) => {
                    return [x, offset - y];
                }),
                metaData: {
                    segmentId: room.id.value.toString(),
                    active: room.isEnabled,
                    name: room.name,
                },
            };
        }).filter((segment) => {
            return segment.pixels.length > 0;
        });

        if (fullMap.length !== 0) {
            // first, dump the segment layers to the map
            segments.forEach(s => {
                this.dumpSegmentLayer(fullMap, s);
            });
            segments.forEach(s => {
                const x = [];
                const y = [];

                for (let i = 0; i < s.pixels.length; i = i + 2) {
                    x.push(s.pixels[i]);
                    y.push(s.pixels[i + 1]);
                }

                this.boundaryFill8(Math.round(this.median(x)), Math.round(this.median(y)), fullMap, s);
            });
        }

        return segments.map(s => {
            return this.buildMapLayer(MapLayer.TYPE.SEGMENT, s.pixels, s.metaData);
        });
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     */
    getRestrictedZoneEntities(map) {
        const offset = map.size.y;
        const { restrictedZones } = map;

        return restrictedZones
            .map((zone) => {
                const points = zone.coordinates
                    .map((coordinate) => {
                        try {
                            const { x, y } = map.toPixel(coordinate);

                            return [x, offset - y];
                        } catch (e) {
                            return null;
                        }
                    })
                    .filter(Boolean);

                if (points.length < 4) {
                    return null;
                }

                if (
                    points[0].join() === points[2].join() &&
                    points[1].join() === points[3].join()
                ) {
                    return new LineMapEntity({
                        type: LineMapEntity.TYPE.VIRTUAL_WALL,
                        points: [points[0], points[1]].flat(),
                    });
                }

                return new PolygonMapEntity({
                    type: PolygonMapEntity.TYPE.NO_GO_AREA,
                    points: [points[0], points[3], points[2], points[1]].flat(),
                });
            })
            .filter(Boolean);
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    /**
     * Mota: al arrancar la espiral el firmware borra su mapa (DEVICE_MAP_CLEAR + DEVICE_MAP_RESET_DATA)
     * y trabaja con uno temporal en otro sistema de coordenadas. Mientras dure se mantiene en pantalla
     * el último mapa completo en lugar de sustituirlo por el temporal.
     *
     * @param {import("@agnoc/core").Robot} robot
     * @returns {boolean}
     */
    isSpiralMapFrozen(robot) {
        return robot.device.mode?.value === DeviceMode.VALUE.SPIRAL && this.state.map !== undefined && this.state.map.layers.length > 0;
    }

    onUpdateMap(robot) {
        const { map } = robot.device;

        if (!map || this.isSpiralMapFrozen(robot)) {
            return;
        }

        const { floor, walls } = this.getMapPixels(map);

        // Mota: primera división automática en habitaciones virtuales, con el robot en la base
        // (mapa completo) y suficiente suelo (unos 4 m²)
        const status = this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        const resolution = this.getMapResolution(map);
        if (
            this.virtualRooms && !this.virtualRooms.hasRooms() &&
            status?.value === StatusStateAttribute.VALUE.DOCKED &&
            floor.length / 2 > 4 / (resolution * resolution)
        ) {
            try {
                this.virtualRooms.segment(floor, map.size.x, map.size.y, resolution);
            } catch (e) {
                Logger.warn("Virtual rooms: automatic segmentation failed", e);
            }
        }
        this.virtualRooms?.fitToFloor(floor, map.size.x, map.size.y);

        this.updatePathPoints(map);

        this.state.map = new ValetudoMap({
            pixelSize: 1, // ?
            entities: [
                this.getChargerEntity(map),
                this.getRobotEntity(map),
                this.getGoToTarget(map),
                this.getPathEntity(map),
                ...this.getRestrictedZoneEntities(map),
            ].filter(Boolean),
            layers: [
                this.buildMapLayer(MapLayer.TYPE.FLOOR, floor),
                this.buildMapLayer(MapLayer.TYPE.WALL, walls),
                ...this.getSegmentEntities(map, this.mapArrayToMatrix(walls, floor)),
            ].filter(Boolean),
            metaData: {},
            size: {
                x: map.size.x,
                y: map.size.y,
            },
        });

        this.emitMapUpdated();
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    onUpdateChargerPosition(robot) {
        const { map } = robot.device;

        if (this.isSpiralMapFrozen(robot)) {
            return;
        }

        if (!map || !this.state.map) {
            return;
        }

        const entity = this.getChargerEntity(map);

        this.state.map.entities = [
            ...this.state.map.entities.filter((entity) => {
                return entity.type !== PointMapEntity.TYPE.CHARGER_LOCATION;
            }),
            entity,
        ];

        this.emitMapUpdated();
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    onUpdateRobotPosition(robot) {
        const { map } = robot.device;

        if (this.isSpiralMapFrozen(robot)) {
            return;
        }

        if (!map || !this.state.map) {
            return;
        }

        this.updatePathPoints(map);

        this.state.map.entities = [
            ...this.state.map.entities.filter((entity) => {
                return entity.type !== PointMapEntity.TYPE.ROBOT_POSITION;
            }),
            this.getRobotEntity(map),
        ];

        this.emitMapUpdated();
    }

    /**
     * Mota: mientras limpia o está en pausa se muestra el modo real del robot; si no, el elegido
     *
     * @param {import("@agnoc/core").Robot} robot
     */
    getOperationModeState(robot) {
        const { state, mode } = robot.device;
        let value = this.selectedOperationMode;

        if (state && (/** @type {Array<string>} */ ([DeviceState.VALUE.CLEANING, DeviceState.VALUE.PAUSED, DeviceState.VALUE.RETURNING])).includes(state.value)) {
            switch (mode?.value) {
                case DeviceMode.VALUE.MOP:
                    value = PresetSelectionStateAttribute.MODE.MOP;
                    break;
                case DeviceMode.VALUE.EDGE:
                    value = PresetSelectionStateAttribute.MODE.EDGE;
                    break;
                case DeviceMode.VALUE.SPIRAL:
                    value = PresetSelectionStateAttribute.MODE.SPIRAL;
                    break;
                default:
                    value = PresetSelectionStateAttribute.MODE.VACUUM;
            }
        }

        return new PresetSelectionStateAttribute({
            type: PresetSelectionStateAttribute.TYPE.OPERATION_MODE,
            value: value,
        });
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    getBatteryState(robot) {
        const { state, battery } = robot.device;
        let flag = BatteryStateAttribute.FLAG.DISCHARGING;

        if (battery && state && state.value === DeviceState.VALUE.DOCKED) {
            flag =
        battery.value === 100 ?
            BatteryStateAttribute.FLAG.CHARGED :
            BatteryStateAttribute.FLAG.CHARGING;
        }

        return new BatteryStateAttribute({
            level: battery ? battery.value : 0,
            flag: flag,
        });
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    getStatusState(robot) {
        const { state, mode, error } = robot.device;
        const flag =
      DEVICE_MODE_TO_STATUS_STATE_FLAG[mode?.value] ||
      StatusStateAttribute.FLAG.NONE;
        // Mota: los códigos 2xxx desconocidos son eventos del firmware (2100 = vuelve por batería,
        // 2101 = carga para reanudar, 2103 = fin de la tarea...), no errores; solo se registran
        const rawFaultCode = robot.device.motaRawFaultCode;
        const isFirmwareEvent = error?.value === DeviceError.VALUE.UNKNOWN && typeof rawFaultCode === "number" && rawFaultCode >= 2000;
        if (typeof rawFaultCode === "number" && rawFaultCode !== this.lastLoggedFaultCode) {
            this.lastLoggedFaultCode = rawFaultCode;
            if (rawFaultCode !== 0) {
                Logger.info(`Robot fault/event code ${rawFaultCode} (${error?.value ?? "none"})`);
            }
        }
        const errorValue = error && error.value !== DeviceError.VALUE.NONE && !isFirmwareEvent ? error.value : undefined;
        const errorDescription = errorValue ? (DEVICE_ERROR_TO_DESCRIPTION[errorValue] || errorValue) : undefined;
        const hasActionableError = typeof errorValue === "string" && !NON_BLOCKING_DEVICE_ERRORS.has(errorValue);
        const deviceStateIsError = state?.value === DeviceState.VALUE.ERROR;
        const currentStateValue = state ? state.value : StatusStateAttribute.VALUE.DOCKED;
        const value =
      hasActionableError || deviceStateIsError ?
          StatusStateAttribute.VALUE.ERROR :
          currentStateValue;

        return new StatusStateAttribute({
            value: value,
            flag: flag,
            metaData: {
                error_description: errorDescription,
            },
        });
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    getIntensityState(robot) {
        const { fanSpeed } = robot.device;

        return new PresetSelectionStateAttribute({
            type: PresetSelectionStateAttribute.TYPE.FAN_SPEED,
            // TODO: this should have a mapper.
            value: fanSpeed ?
                fanSpeed.value :
                PresetSelectionStateAttribute.INTENSITY.OFF,
        });
    }

    static IMPLEMENTATION_AUTO_DETECTION_HANDLER() {
        const path = "/mnt/UDISK/config/device_config.ini";
        let deviceConf;

        Logger.trace("Trying to open device.conf at " + path);

        try {
            deviceConf = fs.readFileSync(path);
        } catch (e) {
            Logger.trace("cannot read", path, e);

            return false;
        }

        let result = {};

        if (deviceConf) {
            deviceConf
                .toString()
                .split(/\n/)
                .map((line) => {
                    return line.split(/=/, 2);
                })
                .map(([k, v]) => {
                    return (result[k] = v);
                });
        }

        Logger.trace("Software version: " + result.software_version);

        return Boolean(result.software_version);
    }
};
