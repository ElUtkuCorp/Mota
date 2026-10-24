import { ValueObject } from '../base-classes/value-object.base';
import { ValueOf } from '../types/value-of.type';
export interface DeviceSystemProps {
    deviceSerialNumber: string;
    deviceMac: string;
    deviceType: number;
    customerFirmwareId: number;
    ctrlVersion: string;
}
export declare const DEVICE_MODEL: {
    readonly C3090: "C3090";
    readonly C3490: "C3490";
    readonly UNKNOWN: "unknown";
};
export type DeviceModel = (typeof DEVICE_MODEL)[keyof typeof DEVICE_MODEL];
export declare const DEVICE_TYPE: {
    readonly 3: "C3090";
    readonly 9: "C3490";
};
export type DeviceType = keyof typeof DEVICE_TYPE;
export declare const DEVICE_CAPABILITY: {
    readonly MAP_PLANS: 1;
    readonly WATER_SENSOR: 2;
    readonly CONSUMABLES: 4;
};
export type DeviceCapability = ValueOf<typeof DEVICE_CAPABILITY>;
export declare const MODEL_CAPABILITY: {
    readonly C3090: 0;
    readonly C3490: number;
    readonly unknown: number;
};
export declare class DeviceSystem extends ValueObject<DeviceSystemProps> {
    get model(): DeviceModel;
    get capabilities(): number;
    supports(capability: DeviceCapability): boolean;
    protected validate(props: DeviceSystemProps): void;
}
