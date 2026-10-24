import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
import { ValueOf } from '../types/value-of.type';
declare const VALUE: {
    readonly ERROR: "error";
    readonly DOCKED: "docked";
    readonly IDLE: "idle";
    readonly RETURNING: "returning";
    readonly CLEANING: "cleaning";
    readonly PAUSED: "paused";
    readonly MANUAL_CONTROL: "manual_control";
    readonly MOVING: "moving";
};
type Value = ValueOf<typeof VALUE>;
export declare class DeviceState extends ValueObject<Value> {
    get value(): Value;
    protected validate(props: DomainPrimitive<Value>): void;
    static VALUE: {
        readonly ERROR: "error";
        readonly DOCKED: "docked";
        readonly IDLE: "idle";
        readonly RETURNING: "returning";
        readonly CLEANING: "cleaning";
        readonly PAUSED: "paused";
        readonly MANUAL_CONTROL: "manual_control";
        readonly MOVING: "moving";
    };
}
export {};
