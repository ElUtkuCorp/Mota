import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
import { ValueOf } from '../types/value-of.type';
declare const VALUE: {
    readonly OFF: "off";
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
};
type Value = ValueOf<typeof VALUE>;
export declare class DeviceWaterLevel extends ValueObject<Value> {
    get value(): Value;
    protected validate(props: DomainPrimitive<Value>): void;
    static VALUE: {
        readonly OFF: "off";
        readonly LOW: "low";
        readonly MEDIUM: "medium";
        readonly HIGH: "high";
    };
}
export {};
