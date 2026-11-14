const capabilities = require("./capabilities");
const CecotecCleanHistory = require("./CecotecCleanHistory");
const CecotecEscapeReturn = require("./CecotecEscapeReturn");
const CecotecFileUpdater = require("./CecotecFileUpdater");
const CecotecFirmwareMapBackups = require("./CecotecFirmwareMapBackups");
const CecotecFirmwareOrders = require("./CecotecFirmwareOrders");
const CecotecMapRecovery = require("./CecotecMapRecovery");
const CecotecMapRetouch = require("./CecotecMapRetouch");
const CecotecMapVersions = require("./CecotecMapVersions");
const CecotecMotaRouter = require("./CecotecMotaRouter");
const CecotecQuirkFactory = require("./CecotecQuirkFactory");
const CecotecStorage = require("./CecotecStorage");
const CecotecTaskPath = require("./CecotecTaskPath");
const CecotecVirtualRooms = require("./CecotecVirtualRooms");
const fs = require("fs");
const Logger = require("../../Logger");
const os = require("os");
const path = require("path");
const PendingMapChangeValetudoEvent = require("../../valetudo_events/events/PendingMapChangeValetudoEvent");
const QuirksCapability = require("../../core/capabilities/QuirksCapability");
const SelectionPreset = require("../../entities/core/ValetudoSelectionPreset");
const ValetudoRobot = require("../../core/ValetudoRobot");
const ValetudoRobotError = require("../../entities/core/ValetudoRobotError");
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

// Mota: evento del firmware "vuelvo a la base por batería baja" (pushFaultEvent2Server). No es un fallo: al cargar reanuda
const LOW_BATTERY_RETURN_EVENT = 2100;
// Mota: modo del firmware durante esa vuelta y la carga en la base, hasta que reanuda (GLOBAL_BROKEN)
const LOW_BATTERY_RETURN_MODE = 11;
// Mota: una limpieza nueva empieza al pasar de uno de estos estados a limpiando (desde pausa es reanudar)
const CLEANING_START_FROM_STATES = [StatusStateAttribute.VALUE.DOCKED, StatusStateAttribute.VALUE.IDLE, StatusStateAttribute.VALUE.ERROR];
const CLEANING_STATES = [StatusStateAttribute.VALUE.CLEANING, StatusStateAttribute.VALUE.MOVING];
// Mota: desde error puede ser reanudar la misma limpieza; desde la base o parado es una nueva
const NEW_CLEAN_FROM_STATES = [StatusStateAttribute.VALUE.DOCKED, StatusStateAttribute.VALUE.IDLE];
// Mota: dos posiciones seguidas del recorrido más separadas que esto son un salto (no se dibuja la recta)
const PATH_MAX_GAP_METERS = 0.5;
// Mota: un tramo del recorrido se dibuja solo si la mayor parte cae sobre el suelo del mapa actual. Si no, es de otro
// mapa del firmware (lo reinicia al volver a la base o al empezar) y saldría desplazado o fuera de la casa
const PATH_MIN_ON_FLOOR = 0.5;
const PATH_FLOOR_TOLERANCE_PIXELS = 3;
// Mota: el mapa guardado ha vuelto si el suelo cubre casi todas las celdas de las habitaciones; que encajen no basta,
// porque un mapa temporal recién empezado es tan pequeño que puede caer dentro de ellas
const GOOD_MAP_MIN_ROOM_COVERAGE = 0.8;

/** @type {Set<string>} */
const NON_BLOCKING_DEVICE_ERRORS = new Set([
    DeviceError.VALUE.BROKEN_GO_HOME,
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
    [DeviceError.VALUE.BROKEN_GO_HOME]: "Low battery: returning to the dock to recharge.",
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
        // Mota: posiciones desde el último mapa (píxeles), cuadrícula de suelo actual y último id de mapa
        this.livePathTail = [];
        /** Mota: último recorrido del firmware, que deja de enviarlo al acabar la limpieza */
        this.lastPathPoints = [];
        /** Mota: inicio de la limpieza en curso (segundos), hasta que llega su informe */
        this.cleanStartedAt = undefined;
        this.floorCells = undefined;
        this.lastMapId = undefined;
        /** Mota: modo de la próxima limpieza (ver CecotecOperationModeControlCapability) */
        this.selectedOperationMode = PresetSelectionStateAttribute.MODE.VACUUM;
        /** Mota: mapa borrado por el usuario; el firmware lo aplica en la siguiente limpieza */
        this.mapResetPending = false;
        this.mapRecovery = new CecotecMapRecovery({robot: this});
        // Mota: programaciones del firmware (FW10) y vuelta a la base tras un atasco (FW4)
        this.firmwareOrders = new CecotecFirmwareOrders({robot: this});
        this.escapeReturn = new CecotecEscapeReturn({robot: this});
        this.virtualRooms = new CecotecVirtualRooms({
            path: this.config.get("embedded") === true ? path.join(path.dirname(this.config.location), "habitaciones.json") : undefined
        });
        this.mapRetouch = new CecotecMapRetouch({
            path: this.config.get("embedded") === true ? path.join(path.dirname(this.config.location), "retoques.json") : undefined
        });
        // Mota: recorrido de la limpieza en curso, que se recupera si Mota se reinicia a mitad (en /tmp: memoria, no
        // la flash)
        this.taskPath = new CecotecTaskPath({
            directory: this.config.get("embedded") === true ? os.tmpdir() : undefined
        });
        this.taskPath.load();
        this.taskPath.startSaving();
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
                quirkFactory.getQuirk(CecotecQuirkFactory.KNOWN_QUIRKS.RESUME_AFTER_CHARGE)
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
            this.mapVersions = new CecotecMapVersions({
                robot: this,
                directory: path.join(path.dirname(this.config.location), "versiones")
            });
            // Mota: copias del par del mapa del firmware y espacio en UDISK
            this.firmwareMapBackups = new CecotecFirmwareMapBackups({
                robot: this,
                directory: path.join(path.dirname(this.config.location), "copias-mapa")
            });
            // Mota: actualizar desde archivo (F19)
            this.fileUpdater = new CecotecFileUpdater({
                robot: this,
                binaryPath: process.argv0,
                configPath: this.config.location,
                port: this.config.get("webserver").port
            });
            this.storage = new CecotecStorage({
                motaDirectory: path.dirname(this.config.location),
                backupsDirectory: path.join(path.dirname(this.config.location), "copias-mapa")
            });
            // Mota: el guardián del mapa se sustituyó por las versiones; su referencia ya no se usa
            fs.rmSync(path.join(path.dirname(this.config.location), "mapa-referencia.json"), { force: true });
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
     * Mota: antes de borrar el mapa del firmware, que no se puede deshacer, se guarda como versión con sus habitaciones.
     * Si no se puede guardar lanza un error y el mapa no se borra.
     */
    saveMapBeforeReset() {
        const map = this.robot?.device.map;

        if (this.mapVersions && map) {
            this.mapVersions.saveBeforeReset(this.getMapSnapshot(map));
        }
    }

    /**
     * Mota: el usuario ha borrado el mapa. Se borran las habitaciones virtuales y las zonas de espejo, que eran de ese
     * mapa. Un reinicio de mapa del propio firmware no pasa por aquí: ese no borra nada de Mota.
     */
    onUserMapReset() {
        this.virtualRooms.clear();
        this.mapRetouch.forgetMap();
        this.setMirrorZones([]);
        this.mapResetPending = true;
        this.pathPoints = [];
        this.livePathTail = [];
        this.lastPathPoints = [];
        this.getTaskPath().reset();
        Logger.info("Map reset by the user: rooms, retouches and mirror zones cleared");
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
     * Mota: datos del mapa real con los que trabajan los retoques
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @param {{floor: Array<number>, walls: Array<number>}} [pixels] las capas reales, si ya se tienen
     * @returns {import("./CecotecMapRetouch").RetouchContext}
     */
    getRetouchContext(map, pixels) {
        const { floor, walls } = pixels ?? this.getMapPixels(map);
        const anchors = [this.getHomePixel(map)];

        if (CecotecCongaRobot.IS_POSE_ON_MAP(map, map.robot)) {
            const { x, y } = map.toPixel(map.robot.toCoordinates());

            anchors.push({ x: Math.round(x), y: Math.round(map.size.y - y) });
        }

        return {
            width: map.size.x,
            height: map.size.y,
            floor: floor,
            walls: walls,
            rooms: this.virtualRooms.getRooms(),
            anchors: anchors.filter(Boolean),
            stale: this.virtualRooms.stale,
        };
    }

    /**
     * Mota: ejecuta un cambio en los retoques y actualiza el mapa
     *
     * @param {(context: import("./CecotecMapRetouch").RetouchContext) => void} change
     * @returns {import("./CecotecMapRetouch").RetouchStatus}
     */
    changeMapRetouch(change) {
        const map = this.robot?.device.map;

        if (!map) {
            throw new Error("There is no map in connected robot");
        }

        change(this.getRetouchContext(map));
        this.refreshMap();

        return this.mapRetouch.getStatus(this.getRetouchContext(map));
    }

    /**
     * Mota: el giro es de la vista. Llega en los metadatos del mapa y no cambia ninguna coordenada
     *
     * @param {number} rotation
     */
    setMapRotation(rotation) {
        this.mapRetouch.setRotation(rotation);

        if (this.state.map) {
            this.state.map.metaData.motaRotation = rotation;
            this.bumpEntitiesNonce();
            this.emitMapUpdated();
        }
    }

    /**
     * Mota: los mapas guardados se ven con el giro actual, que es de la vista y no de cada foto
     *
     * @param {any} map
     * @returns {any}
     */
    withMapRotation(map) {
        return Object.assign({}, map, {metaData: Object.assign({}, map.metaData, {motaRotation: this.mapRetouch.getRotation()})});
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
        this.mapRecovery.shutdown();
        this.firmwareMapBackups?.shutdown();
        this.escapeReturn?.shutdown();
        this.taskPath?.stopSaving();
        await this.taskPath?.save();
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

        // Mota: agnoc emite desde el socket; una excepción aquí llegaría a uncaughtException y apagaría Mota
        robot.on("updateDevice", CecotecCongaRobot.GUARD("updateDevice", () => {
            return this.onUpdateDevice(robot);
        }));
        robot.on("updateMap", CecotecCongaRobot.GUARD("updateMap", () => {
            return this.onUpdateMap(robot);
        }));
        robot.on("updateRobotPosition", CecotecCongaRobot.GUARD("updateRobotPosition", () => {
            return this.onUpdateRobotPosition(robot);
        }));
        robot.on("updateChargerPosition", CecotecCongaRobot.GUARD("updateChargerPosition", () => {
            return this.onUpdateChargerPosition(robot);
        }));
        robot.on("cleanReport", (report) => {
            const { map } = robot.device;
            const temporaryMap = this.isTemporaryMapMode(robot);

            // Mota: cada paso por separado, para que un fallo (p. ej. disco lleno) no impida la copia del mapa
            CecotecCongaRobot.GUARD("cleanReport (history)", () => {
                this.cleanHistory?.store(report, this.lastCleanStatistics, this.state.map);
            })();
            this.lastCleanStatistics = undefined;
            this.cleanStartedAt = undefined;
            // Mota: el informe ya lleva el recorrido; no hace falta recuperarlo si Mota se reinicia
            this.getTaskPath().finish();

            // Mota: bordes y espiral trabajan con un mapa temporal; no cuentan para las versiones
            CecotecCongaRobot.GUARD("cleanReport (map versions)", () => {
                if (this.mapVersions && map && !temporaryMap) {
                    this.mapVersions.onCleaningFinished(this.getFloorSnapshot(map));
                }
            })();
            // Mota: el firmware escribe el par del mapa al terminar; la copia se hace después
            CecotecCongaRobot.GUARD("cleanReport (map backup)", () => {
                this.firmwareMapBackups?.onCleanReport(temporaryMap);
            })();
        });
    }

    /**
     * @param {import("@agnoc/core").Robot} robot
     */
    onUpdateDevice(robot) {
        const oldStatus =
      this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        const newStatus = this.getStatusState(robot);

        // Mota: foto del mapa al empezar una limpieza nueva (no al reanudar), para las versiones del mapa
        if (
            this.mapVersions &&
            oldStatus &&
            CLEANING_START_FROM_STATES.includes(oldStatus.value) &&
            oldStatus.flag !== StatusStateAttribute.FLAG.RESUMABLE &&
            CLEANING_STATES.includes(newStatus.value) &&
            !this.isTemporaryMapMode(robot) &&
            robot.device.map
        ) {
            try {
                // Mota: un mapa temporal del firmware no es una versión de la casa
                if (this.virtualRooms.stale) {
                    this.mapVersions.discardPending();
                } else {
                    this.mapVersions.onCleaningStarted(this.getMapSnapshot(robot.device.map));
                }
            } catch (e) {
                Logger.warn("Map versions: unable to take the snapshot", e);
            }
        }

        // Mota: copia del par del mapa antes de una limpieza nueva o después de una correcta (aún con el estado anterior)
        try {
            this.firmwareMapBackups?.onDeviceUpdate(oldStatus, newStatus);
        } catch (e) {
            Logger.warn("Firmware map backups: error while handling the robot state", e);
        }

        // Reset path points when robot goes from docked to another state.
        // Mota: salvo al reanudar tras cargar, que sigue con la misma limpieza
        if (
            oldStatus &&
      oldStatus.value !== newStatus.value &&
      oldStatus.value === StatusStateAttribute.VALUE.DOCKED &&
      oldStatus.flag !== StatusStateAttribute.FLAG.RESUMABLE
        ) {
            this.pathPoints = [];
            this.livePathTail = [];
            this.getTaskPath().reset();
        }

        // Mota: la limpieza nueva ya trabaja sobre el mapa nuevo
        if (this.mapResetPending && CLEANING_STATES.includes(newStatus.value)) {
            this.mapResetPending = false;
        }

        this.state.upsertFirstMatchingAttribute(this.getBatteryState(robot));

        // Mota: últimos valores de la limpieza en curso, para el historial
        const currentClean = robot.device.currentClean;
        if (currentClean && currentClean.time > 0) {
            this.lastCleanStatistics = { time: currentClean.time * 60, area: currentClean.size * 100 };
        }
        if (
            oldStatus &&
            NEW_CLEAN_FROM_STATES.includes(oldStatus.value) &&
            oldStatus.flag !== StatusStateAttribute.FLAG.RESUMABLE &&
            CLEANING_STATES.includes(newStatus.value)
        ) {
            this.cleanStartedAt = undefined;
            this.lastCleanStatistics = undefined;
            this.getTaskPath().reset();
        }
        this.trackInterruptedClean(oldStatus, newStatus);
        this.getTaskPath().setStartedAt(this.cleanStartedAt);
        this.state.upsertFirstMatchingAttribute(newStatus);
        this.mapRecovery.onDeviceUpdate();
        this.escapeReturn?.onDeviceUpdate(newStatus);

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
        // Mota: en la base el firmware deja de enviar la posición y el mapa mostraba la última
        // conocida. Si está en la base y sabemos dónde está, el robot se dibuja sobre ella.
        const status = this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        const pose = status?.value === StatusStateAttribute.VALUE.DOCKED && map.charger ? map.charger : map.robot;

        if (!CecotecCongaRobot.IS_POSE_ON_MAP(map, pose)) {
            return;
        }

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
        // Mota: el firmware envía siempre un destino; sin ir a ninguna parte es el valor "sin posición"
        if (this.robot?.device.mode?.value !== DeviceMode.VALUE.SPOT || !CecotecCongaRobot.IS_POSE_ON_MAP(map, map.currentSpot)) {
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
     * Mota: sin posición conocida (al reiniciar su mapa, o sin destino) el firmware envía un valor fijo muy lejos del
     * mapa: (1100, 1100) metros, que en píxeles es (22400, -21600). No es una posición.
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @param {{toCoordinates: () => any}|undefined} pose
     * @returns {boolean}
     */
    static IS_POSE_ON_MAP(map, pose) {
        if (!pose) {
            return false;
        }

        const { x, y } = map.toPixel(pose.toCoordinates());

        return x >= 0 && y >= 0 && x < map.size.x && y < map.size.y;
    }

    /**
     * Mota: con un fallo como el atasco (514) el firmware se para y no envía informe, así que la limpieza se perdería
     *
     * @param {import("../../entities/state/attributes/StatusStateAttribute")|undefined} oldStatus
     * @param {import("../../entities/state/attributes/StatusStateAttribute")} newStatus
     */
    trackInterruptedClean(oldStatus, newStatus) {
        if (newStatus.value === StatusStateAttribute.VALUE.CLEANING && this.cleanStartedAt === undefined) {
            this.cleanStartedAt = Math.floor(Date.now() / 1000);
        }

        if (
            newStatus.value === StatusStateAttribute.VALUE.ERROR &&
            oldStatus?.value !== StatusStateAttribute.VALUE.ERROR &&
            this.cleanStartedAt !== undefined
        ) {
            this.cleanHistory?.storeInterrupted(this.cleanStartedAt, this.lastCleanStatistics, this.state.map);
        }
    }

    /**
     * @param {import("@agnoc/core").DeviceMap} map
     * @param {import("@agnoc/core").Robot} [robot]
     */
    updatePathPoints(map, robot) {
        if (robot?.device.motaPoseDrawn === false) {
            return;
        }

        if (!CecotecCongaRobot.IS_POSE_ON_MAP(map, map.robot) || map.robotPath.length > 0 || this.lastPathPoints.length > 0) {
            return;
        }

        const offset = map.size.y;
        const { x, y } = map.toPixel(map.robot.toCoordinates());

        this.pathPoints.push(x, offset - y);
    }

    /**
     * Recorrido completo como lista plana [x, y, x, y, ...] en píxeles del mapa
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {Array<number>}
     */
    getPathPoints(map) {
        const taskPath = this.getTaskPath();

        // Mota: el historial del firmware pasa por el recorrido de la tarea, que conserva lo anterior si el firmware lo
        // reinicia y lo recupera si Mota se ha reiniciado a mitad de la limpieza
        taskPath.update(map.id?.value, map.robotPath, () => {
            return this.isTaskInProgress();
        });
        if (taskPath.startedAt !== undefined && (this.cleanStartedAt === undefined || taskPath.startedAt < this.cleanStartedAt)) {
            this.cleanStartedAt = taskPath.startedAt;
        }

        if (taskPath.length > 0) {
            // Mota: el recorrido solo cambia cuando llega un mapa (cada 10 s), pero esto se llama con cada posición. Se
            // convierte una vez por mapa y sin un array [x, y] por punto
            const cache = this.pathPointsCache;

            if (!cache || cache.map !== map || cache.version !== taskPath.version) {
                const points = CecotecCongaRobot.PATH_TO_PIXELS(map, taskPath.getPoints());

                this.lastPathPoints = points;
                this.pathPointsCache = {map: map, version: taskPath.version, points: points};
            }

            return this.pathPointsCache.points;
        }

        // Mota: al acabar la limpieza el historial llega vacío. El recorrido se mantiene hasta que empiece otro
        return this.lastPathPoints.length > 0 ? this.lastPathPoints : this.pathPoints;
    }

    /**
     * @returns {CecotecTaskPath}
     */
    getTaskPath() {
        // Mota: los tests crean el robot sin constructor
        if (!this.taskPath) {
            this.taskPath = new CecotecTaskPath();
        }

        return this.taskPath;
    }

    /**
     * Mota: si el robot sigue con una limpieza (limpiando, volviendo, en pausa o cargando para reanudar). Sin estado
     * aún, se da por buena: el mapa ya es el mismo
     *
     * @returns {boolean}
     */
    isTaskInProgress() {
        const status = this.state?.getFirstMatchingAttributeByConstructor(StatusStateAttribute);

        if (!status) {
            return true;
        }

        return !(
            status.value === StatusStateAttribute.VALUE.IDLE ||
            (status.value === StatusStateAttribute.VALUE.DOCKED && status.flag !== StatusStateAttribute.FLAG.RESUMABLE)
        );
    }

    /**
     * Mota: [x, y, ...] en metros del firmware a píxeles del mapa (y invertida), con la misma cuenta que
     * DeviceMap.toPixel pero sin crear un objeto por punto
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @param {Float32Array} xy
     * @returns {Array<number>}
     */
    static PATH_TO_PIXELS(map, xy) {
        const points = new Array(xy.length);
        const offset = map.size.y;

        if (map.min && map.max) {
            const minX = map.min.x;
            const minY = map.min.y;
            const rangeX = map.max.x - minX;
            const rangeY = map.max.y - minY;

            for (let i = 0; i < xy.length; i += 2) {
                points[i] = Math.floor((xy[i] - minX) * map.size.x / rangeX);
                points[i + 1] = offset - Math.floor((xy[i + 1] - minY) * map.size.y / rangeY);
            }
        } else {
            for (let i = 0; i < xy.length; i += 2) {
                const { x, y } = map.toPixel(/** @type {any} */ ({ x: xy[i], y: xy[i + 1] }));

                points[i] = x;
                points[i + 1] = offset - y;
            }
        }

        return points;
    }

    /**
     * Mota: el firmware solo guarda las posiciones mientras limpia. Lo que recorre sin limpiar (de la base a la
     * zona, la vuelta a casa, o un salto al relocalizarse) llega como un salto entre dos puntos lejanos, y se dibujaba
     * como una recta que atraviesa paredes. El recorrido se parte en tramos en cada salto y los saltos no se dibujan.
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {Array<PathMapEntity>}
     */
    getPathEntities(map) {
        // Mota: sin mapa debajo no hay recorrido que enseñar. Tras borrarlo, el firmware sigue mandando el historial
        // anterior hasta la siguiente limpieza
        if (this.mapResetPending || this.floorCells?.size === 0) {
            return [];
        }

        const maxGap = PATH_MAX_GAP_METERS / this.getMapResolution(map);
        const points = this.getPathPoints(map);
        // Mota: los tramos del historial no cambian entre posiciones; solo la cola en vivo. Se reutilizan mientras
        // no cambien el historial, su longitud (pathPoints crece) ni el suelo
        let cache = this.pathSegmentsCache;

        if (
            !cache || cache.points !== points || cache.length !== points.length ||
            cache.floorCells !== this.floorCells || cache.maxGap !== maxGap
        ) {
            cache = {
                points: points,
                length: points.length,
                floorCells: this.floorCells,
                maxGap: maxGap,
                segments: CecotecCongaRobot.SPLIT_PATH(points, maxGap).filter(segment => {
                    return CecotecCongaRobot.IS_PATH_ON_FLOOR(segment, this.floorCells);
                })
            };
            this.pathSegmentsCache = cache;
        }

        const segments = cache.segments.slice();

        // Mota: lo recorrido desde el último mapa (llega cada 10 s) se añade al final para que la línea siga al robot
        if (this.livePathTail.length >= 2) {
            segments.push(...CecotecCongaRobot.SPLIT_PATH([...(segments.pop() ?? []), ...this.livePathTail], maxGap));
        }

        return segments.map(segment => {
            return new PathMapEntity({
                type: PathMapEntity.TYPE.PATH,
                points: segment,
            });
        });
    }

    /**
     * @param {Array<number>} segment pares x, y planos
     * @param {Set<number>|undefined} floorCells celdas de suelo como (y << 16) | x; sin ellas no se descarta nada
     * @returns {boolean}
     */
    static IS_PATH_ON_FLOOR(segment, floorCells) {
        if (!floorCells || floorCells.size === 0) {
            return true;
        }

        const step = Math.max(1, Math.floor(segment.length / 2 / 100)) * 2; // como mucho unos 100 puntos de muestra
        let sampled = 0;
        let onFloor = 0;

        for (let i = 0; i < segment.length - 1; i += step) {
            const x = Math.round(segment[i]);
            const y = Math.round(segment[i + 1]);
            let found = false;

            sampled++;
            for (let dx = -PATH_FLOOR_TOLERANCE_PIXELS; dx <= PATH_FLOOR_TOLERANCE_PIXELS && !found; dx++) {
                for (let dy = -PATH_FLOOR_TOLERANCE_PIXELS; dy <= PATH_FLOOR_TOLERANCE_PIXELS && !found; dy++) {
                    found = floorCells.has(((y + dy) << 16) | ((x + dx) & 0xffff));
                }
            }

            if (found) {
                onFloor++;
            }
        }

        return sampled === 0 || onFloor / sampled >= PATH_MIN_ON_FLOOR;
    }

    /**
     * @param {Array<number>} points lista plana [x, y, x, y, ...]
     * @param {number} maxGap distancia máxima entre dos puntos seguidos del mismo tramo, en píxeles
     * @returns {Array<Array<number>>} tramos con al menos dos puntos
     */
    static SPLIT_PATH(points, maxGap) {
        const segments = [];
        let current = [];

        for (let i = 0; i < points.length - 1; i += 2) {
            const x = points[i];
            const y = points[i + 1];

            if (current.length >= 2 && Math.hypot(x - current[current.length - 2], y - current[current.length - 1]) > maxGap) {
                segments.push(current);
                current = [];
            }

            current.push(x, y);
        }

        segments.push(current);

        return segments.filter(segment => {
            return segment.length >= 4;
        });
    }

    /**
     * Mota: celdas de suelo del mapa como índices y * width + x
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {{width: number, floor: Array<number>}}
     */
    getFloorSnapshot(map) {
        const { floor } = this.getMapPixels(map);
        const indices = [];

        for (let i = 0; i < floor.length; i += 2) {
            indices.push(floor[i + 1] * map.size.x + floor[i]);
        }

        return { width: map.size.x, floor: indices };
    }

    /**
     * Mota: bordes y espiral trabajan en un mapa temporal del firmware, que lo reinicia al empezar y al terminar:
     * no cuentan para las versiones ni para volver y reanudar por batería
     *
     * @param {import("@agnoc/core").Robot} [robot]
     * @returns {boolean}
     */
    isTemporaryMapMode(robot = this.robot) {
        const mode = robot?.device.mode?.value;

        return mode === DeviceMode.VALUE.SPIRAL || mode === DeviceMode.VALUE.EDGE;
    }

    /**
     * Mota: el firmware ha sustituido el mapa por uno temporal: las habitaciones, que son del mapa bueno, no encajan.
     * Mientras limpia en bordes o espiral es lo normal; al acabar ya no.
     *
     * @returns {boolean}
     */
    hasTemporaryFirmwareMap() {
        const status = this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute)?.value;
        const working = this.isTemporaryMapMode() && status !== StatusStateAttribute.VALUE.DOCKED && status !== StatusStateAttribute.VALUE.IDLE;

        return this.robot !== undefined && this.virtualRooms.stale && !this.mapResetPending && !working;
    }

    /**
     * @returns {boolean} si el mapa actual es aquel en que se crearon las habitaciones
     */
    isGoodMapLoaded() {
        const map = this.robot?.device.map;

        if (!map || !this.virtualRooms.isUsable()) {
            return false;
        }

        return this.virtualRooms.getCoverage(this.getMapPixels(map).floor, map.size.x) >= GOOD_MAP_MIN_ROOM_COVERAGE;
    }

    /**
     * Mota: foto del mapa actual para las versiones del mapa
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {import("./CecotecMapVersions").Snapshot}
     */
    getMapSnapshot(map) {
        return Object.assign(this.getFloorSnapshot(map), {
            createdAt: Date.now(),
            map: this.getMapWithoutPath(),
            rooms: this.virtualRooms.exportData(),
            retouch: this.mapRetouch.exportEdits(),
        });
    }

    /**
     * Mota: el recorrido es de una limpieza y puede ser de otro mapa del firmware: no se guarda en las versiones
     *
     * @private
     * @returns {any}
     */
    getMapWithoutPath() {
        if (!this.state.map) {
            return null;
        }

        const map = JSON.parse(JSON.stringify(this.state.map));

        map.entities = map.entities.filter(entity => {
            return entity.type !== PathMapEntity.TYPE.PATH;
        });

        return map;
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
        // (si las habitaciones son de otro mapa, las zonas de espejo también: se ignoran)
        const mirrorZones = this.virtualRooms?.stale ? [] : this.getMirrorZones();
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

            return CecotecCongaRobot.HIDE_BEHIND_MIRRORS(outside(floor), outside(walls), mirrorZones, this.getHomePixel(map));
        }

        return { floor: floor, walls: walls };
    }

    /**
     * Mota: posición de la base en píxeles de las capas, si se conoce
     *
     * @param {import("@agnoc/core").DeviceMap} map
     * @returns {{x: number, y: number} | undefined}
     */
    getHomePixel(map) {
        const pose = map.charger ?? map.robot;

        if (!CecotecCongaRobot.IS_POSE_ON_MAP(map, pose)) {
            return undefined;
        }

        const { x, y } = map.toPixel(pose.toCoordinates());

        return { x: Math.round(x), y: Math.round(map.size.y - y) };
    }

    /**
     * Mota: el láser ve a través del espejo una "habitación" reflejada, más grande que la zona marcada. La zona de
     * espejo hace de pared: el suelo que solo se alcanza desde la base cruzando una zona de espejo es reflejo y se
     * oculta (con sus paredes). Si no se sabe dónde está la base, solo se quita lo que hay dentro de las zonas.
     *
     * @param {Array<number>} floor pares x, y planos, ya sin lo que hay dentro de las zonas
     * @param {Array<number>} walls pares x, y planos, ya sin lo que hay dentro de las zonas
     * @param {Array<{x0: number, y0: number, x1: number, y1: number}>} mirrorZones
     * @param {{x: number, y: number} | undefined} home
     * @returns {{floor: Array<number>, walls: Array<number>}}
     */
    static HIDE_BEHIND_MIRRORS(floor, walls, mirrorZones, home) {
        if (!home || floor.length === 0) {
            return { floor: floor, walls: walls };
        }

        const key = (x, y) => {
            return (y << 16) | (x & 0xffff);
        };
        const floorSet = new Set();
        for (let i = 0; i < floor.length; i += 2) {
            floorSet.add(key(floor[i], floor[i + 1]));
        }

        // La base está junto al suelo, no sobre él: se busca el suelo más cercano en un radio pequeño
        let seed;
        for (let r = 0; r <= 6 && seed === undefined; r++) {
            for (let dx = -r; dx <= r && seed === undefined; dx++) {
                for (let dy = -r; dy <= r && seed === undefined; dy++) {
                    if (floorSet.has(key(home.x + dx, home.y + dy))) {
                        seed = [home.x + dx, home.y + dy];
                    }
                }
            }
        }
        if (seed === undefined) {
            return { floor: floor, walls: walls };
        }

        const reached = new Set([key(seed[0], seed[1])]);
        const queue = [seed];
        while (queue.length > 0) {
            const [x, y] = queue.pop();

            for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                const k = key(nx, ny);

                if (floorSet.has(k) && !reached.has(k)) {
                    reached.add(k);
                    queue.push([nx, ny]);
                }
            }
        }

        // Solo se oculta lo que queda pegado a una zona de espejo; las islas sueltas (p. ej. bajo un mueble)
        // no tienen que ver con los espejos y se dejan como estaban
        const nearMirror = (x, y) => {
            return mirrorZones.some(z => {
                return x >= z.x0 - 2 && x <= z.x1 + 2 && y >= z.y0 - 2 && y <= z.y1 + 2;
            });
        };
        const hidden = new Set();
        const visited = new Set();
        for (let i = 0; i < floor.length; i += 2) {
            const start = key(floor[i], floor[i + 1]);

            if (reached.has(start) || visited.has(start)) {
                continue;
            }

            const component = [];
            let touchesMirror = false;
            const stack = [[floor[i], floor[i + 1]]];
            visited.add(start);
            while (stack.length > 0) {
                const [x, y] = stack.pop();
                component.push(key(x, y));
                touchesMirror = touchesMirror || nearMirror(x, y);

                for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                    const k = key(nx, ny);

                    if (floorSet.has(k) && !visited.has(k) && !reached.has(k)) {
                        visited.add(k);
                        stack.push([nx, ny]);
                    }
                }
            }

            if (touchesMirror) {
                component.forEach(k => {
                    hidden.add(k);
                });
            }
        }

        if (hidden.size === 0) {
            return { floor: floor, walls: walls };
        }

        const keptFloor = [];
        for (let i = 0; i < floor.length; i += 2) {
            if (!hidden.has(key(floor[i], floor[i + 1]))) {
                keptFloor.push(floor[i], floor[i + 1]);
            }
        }

        // Una pared se quita si toca suelo oculto y ningún suelo visible
        const keptWalls = [];
        for (let i = 0; i < walls.length; i += 2) {
            const x = walls[i];
            const y = walls[i + 1];
            let touchesHidden = false;
            let touchesVisible = false;

            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const k = key(x + dx, y + dy);

                    touchesHidden = touchesHidden || hidden.has(k);
                    touchesVisible = touchesVisible || (floorSet.has(k) && !hidden.has(k));
                }
            }

            if (!touchesHidden || touchesVisible) {
                keptWalls.push(x, y);
            }
        }

        return { floor: keptFloor, walls: keptWalls };
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

        // Mota: ordenar claves numéricas en un array tipado en vez de un array [x, y] por píxel. Con el suelo y las
        // paredes son decenas de miles de arrays pequeños en cada mapa, y el heap (42 MB) no da para tanto
        const sorted = CecotecCongaRobot.SORT_PIXELS(pixels);
        if (sorted) {
            return new MapLayer({
                type: type,
                pixels: sorted,
                metaData: metaData
            });
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

    /**
     * Mota: píxeles ordenados por y y luego por x, con una clave numérica por píxel en un array tipado (fuera del heap)
     *
     * @param {Array<number>} pixels pares x, y planos
     * @returns {Array<number>|null} null si algún valor no cabe en la clave (entonces se ordena como antes)
     */
    static SORT_PIXELS(pixels) {
        const count = pixels.length >> 1;
        const keys = new Float64Array(count);

        for (let i = 0; i < count; i++) {
            const x = pixels[2 * i];
            const y = pixels[2 * i + 1];

            if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 0xffff || y > 0xffff) {
                return null;
            }
            keys[i] = y * 65536 + x;
        }

        keys.sort();

        const sorted = new Array(count * 2);

        for (let i = 0; i < count; i++) {
            const key = keys[i];
            const y = Math.floor(key / 65536);

            sorted[2 * i] = key - y * 65536;
            sorted[2 * i + 1] = y;
        }

        return sorted;
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
     * @param {Array<Array<number|string>> | (() => Array<Array<number|string>>)} fullMap Mota: o una función que la
     *        construye, para no crearla (una matriz del tamaño del mapa) cuando hay habitaciones virtuales
     * @param {Map<number, Array<number>>} [retouchedRooms] Mota: celdas que se muestran de cada habitación
     * @returns {Array<import("../../entities/map/MapLayer")>}
     */
    getSegmentEntities(map, fullMap, retouchedRooms) {
        // Mota: habitaciones virtuales (la 3090 no informa de habitaciones)
        if (this.virtualRooms?.hasRooms()) {
            const width = this.virtualRooms.getWidth();

            return this.virtualRooms.getRooms().map(room => {
                const pixels = [];
                const shown = retouchedRooms?.get(room.id);

                // Una habitación borrada del dibujo sigue siendo una habitación: se puede limpiar
                (shown?.length > 0 ? shown : room.pixels).forEach(i => {
                    pixels.push(i % width, Math.floor(i / width));
                });

                return this.buildMapLayer(MapLayer.TYPE.SEGMENT, pixels, {
                    segmentId: String(room.id),
                    active: false,
                    name: room.name,
                    // Mota: color elegido por el usuario (si no hay, el frontend asigna uno)
                    ...(room.color ? {color: room.color} : {}),
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

        const matrix = segments.length > 0 ? (typeof fullMap === "function" ? fullMap() : fullMap) : [];

        if (segments.length > 0 && matrix.length !== 0) {
            // first, dump the segment layers to the map
            segments.forEach(s => {
                this.dumpSegmentLayer(matrix, s);
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
                            // Mota: redondeado, como float un píxel exacto puede quedar justo por debajo
                            const x = Math.round((coordinate.x - map.min.x) * map.size.x / (map.max.x - map.min.x));
                            const y = Math.round((coordinate.y - map.min.y) * map.size.y / (map.max.y - map.min.y));

                            return x < 0 || y < 0 ? null : [x, offset - y];
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

        // Mota: cambio de mapa del firmware. Lo acumulado en píxeles era del mapa anterior
        const mapId = map.id?.value;
        if (mapId !== this.lastMapId) {
            Logger.info(`Firmware map changed: id ${this.lastMapId} -> ${mapId}, ${floor.length / 2} floor cells`);
            this.lastMapId = mapId;
            this.pathPoints = [];
            this.lastPathPoints = [];
        }

        // Mota: lo recorrido desde el mapa anterior ya viene en el historial de este
        this.livePathTail = [];
        this.floorCells = new Set();
        for (let i = 0; i < floor.length; i += 2) {
            this.floorCells.add((floor[i + 1] << 16) | floor[i]);
        }

        // Mota: primera división automática en habitaciones virtuales, con el robot en la base
        // (mapa completo, no a media limpieza mientras carga) y suficiente suelo (unos 4 m²)
        const status = this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        const resolution = this.getMapResolution(map);
        if (
            this.virtualRooms && !this.virtualRooms.hasRooms() && !this.mapResetPending &&
            status?.value === StatusStateAttribute.VALUE.DOCKED &&
            status.flag !== StatusStateAttribute.FLAG.RESUMABLE &&
            floor.length / 2 > 4 / (resolution * resolution)
        ) {
            try {
                this.virtualRooms.segment(floor, map.size.x, map.size.y, resolution);
            } catch (e) {
                Logger.warn("Virtual rooms: automatic segmentation failed", e);
            }
        }
        this.virtualRooms?.fitToFloor(floor, map.size.x, map.size.y);

        this.updatePathPoints(map, robot);

        // Mota: lo de arriba usa el mapa real; solo lo que se muestra lleva los retoques
        const retouched = this.mapRetouch.apply(this.getRetouchContext(map, { floor: floor, walls: walls }));

        this.state.map = new ValetudoMap({
            pixelSize: 1, // ?
            entities: [
                this.getChargerEntity(map),
                this.getRobotEntity(map),
                this.getGoToTarget(map),
                ...this.getPathEntities(map),
                ...this.getRestrictedZoneEntities(map),
            ].filter(Boolean),
            layers: [
                this.buildMapLayer(MapLayer.TYPE.FLOOR, retouched.floor),
                this.buildMapLayer(MapLayer.TYPE.WALL, retouched.walls),
                ...this.getSegmentEntities(map, () => {
                    return this.mapArrayToMatrix(walls, floor);
                }, retouched.rooms),
            ].filter(Boolean),
            metaData: {motaRotation: this.mapRetouch.getRotation()},
            size: {
                x: map.size.x,
                y: map.size.y,
            },
        });

        this.mapRecovery.onMapUpdate();
        this.firmwareMapBackups?.onMapUpdate();
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
        ].filter(Boolean);
        this.bumpEntitiesNonce();

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

        this.updatePathPoints(map, robot);

        if (robot.device.motaPoseMapHeadId !== undefined && robot.device.motaPoseMapHeadId !== this.lastPoseMapId) {
            Logger.info(`Firmware position map id ${robot.device.motaPoseMapHeadId} (grid map id ${map.id?.value})`);
            this.lastPoseMapId = robot.device.motaPoseMapHeadId;
        }

        const status = this.state.getFirstMatchingAttributeByConstructor(StatusStateAttribute);
        if (
            robot.device.motaPoseDrawn !== false &&
            CecotecCongaRobot.IS_POSE_ON_MAP(map, map.robot) &&
            status?.value === StatusStateAttribute.VALUE.CLEANING
        ) {
            const { x, y } = map.toPixel(map.robot.toCoordinates());

            this.livePathTail.push(x, map.size.y - y);
        }

        const robotEntity = this.getRobotEntity(map);

        this.state.map.entities = [
            ...this.state.map.entities.filter((entity) => {
                return entity.type !== PointMapEntity.TYPE.ROBOT_POSITION && entity.type !== PathMapEntity.TYPE.PATH;
            }),
            ...(robotEntity ? [robotEntity] : []),
            ...this.getPathEntities(map),
        ];
        this.bumpEntitiesNonce();

        this.emitMapUpdated();
    }

    /**
     * Mota: el frontend solo redibuja si cambia el nonce del mapa, que nace con cada ValetudoMap (el mapa llega cada
     * 10 s) y sirve para no repintar las capas. Este contador marca los cambios de entidades (robot, recorrido, base)
     * que llegan entre medias; sin él, el robot solo se movía en pantalla cada 10 s.
     *
     * @private
     */
    bumpEntitiesNonce() {
        this.entitiesNonce = (this.entitiesNonce ?? 0) + 1;
        this.state.map.metaData.motaEntitiesNonce = this.entitiesNonce;
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
        // Mota: en la base cargando para seguir la limpieza que dejó a medias
        const isChargingToResume = robot.device.motaRawWorkMode === LOW_BATTERY_RETURN_MODE && state?.value === DeviceState.VALUE.DOCKED;
        const flag = isChargingToResume ?
            StatusStateAttribute.FLAG.RESUMABLE :
            DEVICE_MODE_TO_STATUS_STATE_FLAG[mode?.value] || StatusStateAttribute.FLAG.NONE;
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
        // Mota: el evento puede llegar antes que el modo 11, con el firmware aún en un modo de limpieza
        const currentStateValue = rawFaultCode === LOW_BATTERY_RETURN_EVENT && state?.value === DeviceState.VALUE.CLEANING ?
            StatusStateAttribute.VALUE.RETURNING :
            (state ? state.value : StatusStateAttribute.VALUE.DOCKED);
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
            // Mota: sin este objeto, MQTT fallaba al publicar el error ("reading 'severity'") en cada refresco
            error: value === StatusStateAttribute.VALUE.ERROR ? new ValetudoRobotError({
                severity: {
                    kind: ValetudoRobotError.SEVERITY_KIND.UNKNOWN,
                    level: ValetudoRobotError.SEVERITY_LEVEL.ERROR,
                },
                subsystem: ValetudoRobotError.SUBSYSTEM.UNKNOWN,
                message: errorDescription ?? "",
                vendorErrorCode: String(robot.device.motaRawFaultCode ?? errorValue ?? ""),
            }) : undefined,
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

    /**
     * Mota: manejador de eventos de agnoc que registra los errores (también de promesas) en vez de propagarlos
     *
     * @param {string} name
     * @param {(...args: Array<any>) => any} fn
     * @returns {(...args: Array<any>) => void}
     */
    static GUARD(name, fn) {
        return (...args) => {
            try {
                const result = fn(...args);

                if (result && typeof result.catch === "function") {
                    result.catch(e => {
                        Logger.error(`Robot event ${name} failed`, e);
                    });
                }
            } catch (e) {
                Logger.error(`Robot event ${name} failed`, e);
            }
        };
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
