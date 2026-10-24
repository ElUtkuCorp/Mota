import { TypedEmitter } from 'tiny-typed-emitter';
import { OPDecoderLiteral, OPDecoders } from '../constants/opcodes.constant';
import { ID } from '../value-objects/id.value-object';
import { Packet } from '../value-objects/packet.value-object';
import { Connection } from './connection.emitter';
type MultiplexerEvents<Name extends OPDecoderLiteral> = {
    [key in Name]: (packet: Packet<Name>) => void;
} & {
    data: (packet: Packet<OPDecoderLiteral>) => void;
    error: (err: Error) => void;
};
interface MultiplexerSendProps<Name extends OPDecoderLiteral> {
    opname: Name;
    userId: ID;
    deviceId: ID;
    object: OPDecoders[Name];
}
export declare class Multiplexer extends TypedEmitter<MultiplexerEvents<OPDecoderLiteral>> {
    private connections;
    private debug;
    get hasConnections(): boolean;
    get connectionCount(): number;
    addConnection(connection: Connection): boolean;
    send(props: MultiplexerSendProps<OPDecoderLiteral>): boolean;
    close(): void;
    private handlePacket;
    private handleError;
    private handleClose;
}
export {};
