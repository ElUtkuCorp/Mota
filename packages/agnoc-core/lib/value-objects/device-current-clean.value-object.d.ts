import { ValueObject } from '../base-classes/value-object.base';
export interface DeviceCurrentCleanProps {
    size: number;
    time: number;
}
export declare class DeviceCurrentClean extends ValueObject<DeviceCurrentCleanProps> {
    get size(): number;
    get time(): number;
    protected validate(props: DeviceCurrentCleanProps): void;
}
