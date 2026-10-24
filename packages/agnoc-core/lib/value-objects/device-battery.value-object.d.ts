import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
export declare class DeviceBattery extends ValueObject<number> {
    get value(): number;
    protected validate(props: DomainPrimitive<number>): void;
    static MIN_VALUE: number;
    static MAX_VALUE: number;
}
