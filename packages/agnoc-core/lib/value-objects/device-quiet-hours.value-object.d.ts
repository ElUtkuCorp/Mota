import { ValueObject } from '../base-classes/value-object.base';
import { DeviceTime } from './device-time.value-object';
export interface DeviceQuietHoursProps {
    isEnabled: boolean;
    begin: DeviceTime;
    end: DeviceTime;
}
export declare class DeviceQuietHours extends ValueObject<DeviceQuietHoursProps> {
    get isEnabled(): boolean;
    get begin(): DeviceTime;
    get end(): DeviceTime;
    protected validate(props: DeviceQuietHoursProps): void;
}
