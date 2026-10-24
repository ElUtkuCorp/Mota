import { TypedEmitter } from 'tiny-typed-emitter';
import { OPDecoderLiteral, OPDecoders } from '../constants/opcodes.constant';
import { DeviceOrder } from '../entities/device-order.entity';
import { Device } from '../entities/device.entity';
import { Room } from '../entities/room.entity';
import { User } from '../entities/user.entity';
import { Coordinate } from '../value-objects/coordinate.value-object';
import { ConsumableType, DeviceConsumable } from '../value-objects/device-consumable.value-object';
import { DeviceFanSpeed } from '../value-objects/device-fan-speed.value-object';
import { DeviceMode } from '../value-objects/device-mode.value-object';
import { DeviceQuietHours } from '../value-objects/device-quiet-hours.value-object';
import { DeviceVoice } from '../value-objects/device-voice.value-object';
import { DeviceWaterLevel } from '../value-objects/device-water-level.value-object';
import { DeviceWlan } from '../value-objects/device-wlan.value-object';
import { Message } from '../value-objects/message.value-object';
import { Packet } from '../value-objects/packet.value-object';
import { Position } from '../value-objects/position.value-object';
import { Connection } from './connection.emitter';
import { Multiplexer } from './multiplexer.emitter';
export interface RobotProps {
    device: Device;
    user: User;
    multiplexer: Multiplexer;
}
interface DeviceTimestamp {
    timestamp: number;
    offset: number;
}
interface RobotEvents {
    updateDevice: () => void;
    updateMap: () => void;
    updateRobotPosition: () => void;
    updateChargerPosition: () => void;
    cleanReport: (report: { cleanId: number; task?: Record<string, unknown>; mapdata?: Uint8Array }) => void;
}
export declare enum MANUAL_MODE {
    'forward' = 1,
    'left' = 2,
    'right' = 3,
    'backward' = 4,
    'stop' = 5,
    'init' = 10
}
export type ManualMode = (typeof MANUAL_MODE)[keyof typeof MANUAL_MODE];
export declare class Robot extends TypedEmitter<RobotEvents> {
    readonly device: Device;
    readonly user: User;
    private readonly multiplexer;
    private debug;
    private handlers;
    constructor({ device, user, multiplexer }: RobotProps);
    get isConnected(): boolean;
    start(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    home(): Promise<void>;
    locate(): Promise<void>;
    setMode(mode: DeviceMode): Promise<void>;
    setFanSpeed(fanSpeed: DeviceFanSpeed): Promise<void>;
    setWaterLevel(waterLevel: DeviceWaterLevel): Promise<void>;
    getTime(): Promise<DeviceTimestamp>;
    getConsumables(): Promise<DeviceConsumable[]>;
    resetConsumable(consumable: ConsumableType): Promise<void>;
    updateMap(): Promise<void>;
    getWlan(): Promise<DeviceWlan>;
    enterManualMode(): Promise<void>;
    leaveManualMode(): Promise<void>;
    setManualMode(command: ManualMode): Promise<void>;
    getOrders(): Promise<DeviceOrder[]>;
    setOrder(order: DeviceOrder): Promise<void>;
    deleteOrder(order: DeviceOrder): Promise<void>;
    cleanPosition(position: Position): Promise<void>;
    /**
     * A ┌───┐ D
     *   │   │
     * B └───┘ C
     */
    cleanAreas(areas: Coordinate[][]): Promise<void>;
    /**
     * A ┌───┐ D
     *   │   │
     * B └───┘ C
     */
    setRestrictedZones(areas: Coordinate[][]): Promise<void>;
    getQuietHours(): Promise<DeviceQuietHours>;
    setQuietHours(quietHours: DeviceQuietHours): Promise<void>;
    setCarpetMode(enable: boolean): Promise<void>;
    setHistoryMap(enable: boolean): Promise<void>;
    setVoice(voice: DeviceVoice): Promise<void>;
    saveWaitingMap(save: boolean): Promise<void>;
    updateRoom(room: Room): Promise<void>;
    joinRooms(rooms: Room[]): Promise<void>;
    splitRoom(room: Room, pointA: Coordinate, pointB: Coordinate): Promise<void>;
    cleanRooms(rooms: Room[]): Promise<void>;
    setIdleMode(mode: number): Promise<void>;
    startAutoClean(): Promise<void>;
    startEdgeClean(): Promise<void>;
    startSpiralClean(): Promise<void>;
    startMopClean(): Promise<void>;
    resetMap(): Promise<void>;
    controlLock(): Promise<void>;
    handshake(): Promise<void>;
    handleDeviceVersionInfoUpdate(message: Message<'DEVICE_VERSION_INFO_UPDATE_REQ'>): void;
    handleDeviceAgentSetting(message: Message<'PUSH_DEVICE_AGENT_SETTING_REQ'>): void;
    handleClientHeartbeat(message: Message<'CLIENT_HEARTBEAT_REQ'>): void;
    handleDevicePackageUpgrade(message: Message<'PUSH_DEVICE_PACKAGE_UPGRADE_INFO_REQ'>): void;
    handleDeviceStatus(message: Message<'DEVICE_MAPID_WORK_STATUS_PUSH_REQ'>): void;
    handleMapUpdate(message: Message<'DEVICE_MAPID_PUSH_MAP_INFO' | 'DEVICE_MAPID_GET_GLOBAL_INFO_RSP'>): void;
    handleUpdateRobotPosition(message: Message<'DEVICE_MAPID_PUSH_POSITION_INFO'>): void;
    handleUpdateChargePosition(message: Message<'DEVICE_MAPID_PUSH_CHARGE_POSITION_INFO'>): void;
    handleDeviceBatteryInfo(message: Message<'PUSH_DEVICE_BATTERY_INFO_REQ'>): void;
    handleWaitingMap(): void;
    handleWorkstatusReport(message: Message<'DEVICE_WORKSTATUS_REPORT_REQ'>): void;
    handleReportCleantask(message: Message<'DEVICE_EVENT_REPORT_CLEANTASK'>): void;
    handleReportCleanmap(message: Message<'DEVICE_EVENT_REPORT_CLEANMAP'>): void;
    handleBinDataReport(message: Message<'DEVICE_CLEANMAP_BINDATA_REPORT_REQ'>): void;
    handleEventReport(message: Message<'DEVICE_EVENT_REPORT_REQ'>): void;
    handleSetTime(message: Message<'DEVICE_SETTIME_REQ'>): void;
    addConnection(connection: Connection): void;
    handleMessage<Name extends OPDecoderLiteral>(message: Message<Name>): void;
    toString(): string;
    disconnect(): void;
    send<Name extends OPDecoderLiteral>(opname: Name, object: OPDecoders[Name]): void;
    recv<Name extends OPDecoderLiteral>(opname: Name): Promise<Packet<Name>>;
    sendRecv<SendName extends OPDecoderLiteral, RecvName extends OPDecoderLiteral>(sendOPName: SendName, recvOPName: RecvName, sendObject: OPDecoders[SendName]): Promise<Packet<RecvName>>;
}
export {};
