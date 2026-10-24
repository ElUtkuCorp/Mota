import { ValueObject, DomainPrimitive } from '../base-classes/value-object.base';
export type BigNumberSerialized = string;
export declare class BigNumber extends ValueObject<bigint> {
    constructor(value: bigint);
    get value(): bigint;
    toString(): string;
    toJSON(): BigNumberSerialized;
    protected validate(props: DomainPrimitive<bigint>): void;
    static generate(): BigNumber;
    static fromJSON(str: BigNumberSerialized): BigNumber;
    static fromString(str: string): BigNumber;
}
