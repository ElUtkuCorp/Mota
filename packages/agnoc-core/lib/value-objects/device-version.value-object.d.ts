import { ValueObject } from '../base-classes/value-object.base';
export interface DeviceVersionProps {
    software: string;
    hardware: string;
}
export declare class DeviceVersion extends ValueObject<DeviceVersionProps> {
    get software(): string;
    get hardware(): string;
    protected validate(props: DeviceVersionProps): void;
}
