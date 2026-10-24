import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
import { ValueOf } from '../types/value-of.type';
declare const VALUE: {
    readonly NONE: "none";
    readonly SPOT: "spot";
    readonly ZONE: "zone";
    readonly MOP: "mop";
    readonly EDGE: "edge";
    readonly SPIRAL: "spiral";
};
type Value = ValueOf<typeof VALUE>;
export declare class DeviceMode extends ValueObject<Value> {
    get value(): Value;
    protected validate(props: DomainPrimitive<Value>): void;
    static VALUE: {
        readonly NONE: "none";
        readonly SPOT: "spot";
        readonly ZONE: "zone";
        readonly MOP: "mop";
        readonly EDGE: "edge";
        readonly SPIRAL: "spiral";
    };
}
export {};
