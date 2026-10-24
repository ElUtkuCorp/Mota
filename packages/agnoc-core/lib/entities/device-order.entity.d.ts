import { IDEVICE_ORDERLIST_SETTING_REQ } from '../../schemas/schema';
import { Entity } from '../base-classes/entity.base';
import { DeviceFanSpeed } from '../value-objects/device-fan-speed.value-object';
import { DeviceTime } from '../value-objects/device-time.value-object';
import { DeviceWaterLevel } from '../value-objects/device-water-level.value-object';
import { ID } from '../value-objects/id.value-object';
export declare enum WeekDay {
    'sunday' = 1,
    'monday' = 2,
    'tuesday' = 4,
    'wednesday' = 8,
    'thursday' = 16,
    'friday' = 32,
    'saturday' = 64
}
export declare enum CLEAN_MODE {
    'auto' = 1,
    'border' = 3,
    'mop' = 4
}
export type CleanMode = keyof typeof CLEAN_MODE;
export interface DeviceOrderProps {
    id: ID;
    mapId: ID;
    planId: ID;
    isEnabled: boolean;
    isRepeatable: boolean;
    isDeepClean: boolean;
    weekDay: WeekDay;
    time: DeviceTime;
    cleanMode: CleanMode;
    fanSpeed: DeviceFanSpeed;
    waterLevel: DeviceWaterLevel;
}
export declare class DeviceOrder extends Entity<DeviceOrderProps> {
    constructor(props: DeviceOrderProps);
    get id(): ID;
    get mapId(): ID;
    get planId(): ID;
    get isEnabled(): boolean;
    get isRepeatable(): boolean;
    get isDeepClean(): boolean;
    get weekDay(): WeekDay;
    get time(): DeviceTime;
    get cleanMode(): CleanMode;
    get fanSpeed(): DeviceFanSpeed;
    get waterLevel(): DeviceWaterLevel;
    static fromOrderList(orderList: IDEVICE_ORDERLIST_SETTING_REQ): DeviceOrder;
    toOrderList(): IDEVICE_ORDERLIST_SETTING_REQ;
    private validate;
}
