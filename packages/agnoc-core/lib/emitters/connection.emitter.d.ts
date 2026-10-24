import { TypedEmitter } from 'tiny-typed-emitter';
import { OPDecoderLiteral, OPDecoders } from '../constants/opcodes.constant';
import { PacketSocket } from '../sockets/packet.socket';
import { ID } from '../value-objects/id.value-object';
import { Packet } from '../value-objects/packet.value-object';
interface ConnectionSendProps<Name extends OPDecoderLiteral> {
    opname: Name;
    userId: ID;
    deviceId: ID;
    object: OPDecoders[Name];
}
interface ConnectionRespondProps<Name extends OPDecoderLiteral> {
    packet: Packet<OPDecoderLiteral>;
    opname: Name;
    object: OPDecoders[Name];
}
type ConnectionEvents<Name extends OPDecoderLiteral> = {
    [key in Name]: (packet: Packet<Name>) => void;
} & {
    data: (packet: Packet<OPDecoderLiteral>) => void;
    close: () => void;
    error: (err: Error) => void;
};
export declare class Connection extends TypedEmitter<ConnectionEvents<OPDecoderLiteral>> {
    private socket;
    private debug;
    constructor(socket: PacketSocket);
    private addListeners;
    send<Name extends OPDecoderLiteral>({ opname, userId, deviceId, object }: ConnectionSendProps<Name>): boolean;
    respond<Name extends OPDecoderLiteral>({ packet, opname, object }: ConnectionRespondProps<Name>): boolean;
    private write;
    close(): void;
    private handlePacket;
    private handleError;
    private handleClose;
    toString(): string;
    protected validatePacket(packet: Packet<OPDecoderLiteral>): void;
    protected validate(socket: PacketSocket): void;
}
export {};
