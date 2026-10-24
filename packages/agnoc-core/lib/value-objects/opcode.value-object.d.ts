import { DomainPrimitive, ValueObject } from '../base-classes/value-object.base';
import { OPNameLiteral, OPNAMES, OPCodeLiteral } from '../constants/opcodes.constant';
export declare class OPCode<Name extends (typeof OPNAMES)[Code], Code extends OPCodeLiteral> extends ValueObject<number> {
    constructor(value: Code);
    get value(): Code;
    get code(): string;
    get name(): Name;
    toString(): string;
    toJSON(): Name;
    protected validate({ value }: DomainPrimitive<number>): void;
    static fromCode<Name extends (typeof OPNAMES)[Code], Code extends OPCodeLiteral>(code: Code | string): OPCode<Name, Code>;
    static fromName<Name extends (typeof OPNAMES)[Code], Code extends OPCodeLiteral>(name: OPNameLiteral): OPCode<Name, Code>;
}
