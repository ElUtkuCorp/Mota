/// <reference types="node" />
import { ValueObject } from '../base-classes/value-object.base';
import { OPDecoderLiteral } from '../constants/opcodes.constant';
import { BigNumber, BigNumberSerialized } from './big-number.value-object';
import { ID, IDSerialized } from './id.value-object';
import { Payload, PayloadSerialized } from './payload.value-object';
export interface PacketProps<Name extends OPDecoderLiteral> {
    ctype: number;
    flow: number;
    deviceId: ID;
    userId: ID;
    sequence: BigNumber;
    payload: Payload<Name>;
}
export interface PacketSerialized<Name extends OPDecoderLiteral> {
    ctype: number;
    flow: number;
    deviceId: IDSerialized;
    userId: IDSerialized;
    sequence: BigNumberSerialized;
    payload: PayloadSerialized<Name>;
}
export declare function unpack<Name extends OPDecoderLiteral>(data: Buffer): PacketProps<Name>;
export declare function pack<Name extends OPDecoderLiteral>(packet: PacketProps<Name>): Buffer;
export declare class Packet<Name extends OPDecoderLiteral> extends ValueObject<PacketProps<Name>> {
    get ctype(): number;
    get flow(): number;
    get userId(): ID;
    get deviceId(): ID;
    get sequence(): BigNumber;
    get payload(): Payload<Name>;
    toBuffer(): Buffer;
    toString(): string;
    toJSON(): PacketSerialized<Name>;
    protected validate(props: PacketProps<Name>): void;
    static fromBuffer<Name extends OPDecoderLiteral>(buffer: Buffer): Packet<Name>;
    static fromJSON<Name extends OPDecoderLiteral>(serialized: PacketSerialized<Name>): Packet<Name>;
}
