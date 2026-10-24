/// <reference types="node" />
import { ValueObject } from '../base-classes/value-object.base';
import { OPCodeLiteral, OPDecoderLiteral, OPDecoders } from '../constants/opcodes.constant';
import { OPCode } from './opcode.value-object';
export interface PayloadProps<Name extends OPDecoderLiteral> {
    opcode: OPCode<Name, OPCodeLiteral>;
    buffer: Buffer;
    object: OPDecoders[Name];
}
export interface PayloadSerialized<Name extends OPDecoderLiteral> {
    opcode: Name;
    object: OPDecoders[Name];
}
export declare class Payload<Name extends OPDecoderLiteral> extends ValueObject<PayloadProps<Name>> {
    constructor({ opcode, buffer, object }: PayloadProps<Name>);
    get opcode(): OPCode<Name, OPCodeLiteral>;
    get buffer(): Buffer;
    get object(): OPDecoders[Name];
    toString(): string;
    toJSON(): PayloadSerialized<Name>;
    protected validate(props: PayloadProps<Name>): void;
    static fromJSON<Name extends OPDecoderLiteral>(obj: PayloadSerialized<Name>): Payload<Name>;
    static fromBuffer<Name extends OPDecoderLiteral>(opcode: OPCode<Name, OPCodeLiteral>, buffer: Buffer): Payload<Name>;
    static fromObject<Name extends OPDecoderLiteral>(opcode: OPCode<Name, OPCodeLiteral>, object: OPDecoders[Name]): Payload<Name>;
}
