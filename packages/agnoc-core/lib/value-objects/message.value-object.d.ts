import { ValueObject } from '../base-classes/value-object.base';
import { OPDecoderLiteral, OPDecoders } from '../constants/opcodes.constant';
import { Connection } from '../emitters/connection.emitter';
import { Packet } from './packet.value-object';
interface MessageProps<Name extends OPDecoderLiteral> {
    connection: Connection;
    packet: Packet<Name>;
}
export type MessageHandler<Name extends OPDecoderLiteral> = (message: Message<Name>) => void;
export type MessageHandlers = Partial<{
    [Name in OPDecoderLiteral]: MessageHandler<Name>;
}>;
export declare class Message<Name extends OPDecoderLiteral> extends ValueObject<MessageProps<Name>> {
    constructor(props: MessageProps<Name>);
    get connection(): Connection;
    get packet(): Packet<Name>;
    get opname(): Name;
    respond<RName extends OPDecoderLiteral>(opname: RName, object: OPDecoders[RName]): boolean;
    toString(): string;
    protected validate(props: MessageProps<Name>): void;
}
export {};
