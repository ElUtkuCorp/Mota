import { ValueObject } from '../base-classes/value-object.base';
export interface DeviceTimeProps {
    hour: number;
    minute: number;
}
export declare class DeviceTime extends ValueObject<DeviceTimeProps> {
    get hour(): number;
    get minute(): number;
    toMinutes(): number;
    static fromMinutes(minutes: number): DeviceTime;
    protected validate(props: DeviceTimeProps): void;
}
