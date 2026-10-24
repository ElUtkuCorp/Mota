import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
export type IDSerialized = number;
export declare class ID extends ValueObject<number> {
    constructor(value: number);
    get value(): number;
    protected validate({ value }: DomainPrimitive<number>): void;
    static generate(): ID;
    static fromJSON(value: IDSerialized): ID;
}
