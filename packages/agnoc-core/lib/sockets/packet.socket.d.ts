/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { AddressInfo, Socket, SocketConnectOpts } from 'net';
import { Duplex } from 'stream';
import { OPDecoderLiteral } from '../constants/opcodes.constant';
import { Packet } from '../value-objects/packet.value-object';
interface PacketSocketProps {
    socket?: Socket;
}
type Callback = (error?: Error | null) => void;
interface PacketSocketEvents {
    data: (packet: Packet<OPDecoderLiteral>) => void;
    connect: () => void;
    close: (hasError: boolean) => void;
    drain: () => void;
    end: () => void;
    error: (err: Error) => void;
    lookup: (err: Error | null, address: string, family: string | number, host: string) => void;
    ready: () => void;
    timeout: () => void;
    readable: () => void;
}
export declare interface PacketSocket extends Duplex {
    emit<U extends keyof PacketSocketEvents>(event: U, ...args: Parameters<PacketSocketEvents[U]>): boolean;
    on<U extends keyof PacketSocketEvents>(event: U, listener: PacketSocketEvents[U]): this;
    once<U extends keyof PacketSocketEvents>(event: U, listener: PacketSocketEvents[U]): this;
    write(packet: Packet<OPDecoderLiteral>, encoding?: BufferEncoding, cb?: (error: Error | null | undefined) => void): boolean;
    write(packet: Packet<OPDecoderLiteral>, cb?: (error: Error | null | undefined) => void): boolean;
    end(cb?: () => void): this;
    end(packet: Packet<OPDecoderLiteral>, cb?: () => void): this;
}
export declare class PacketSocket extends Duplex {
    private socket?;
    private readingPaused;
    constructor();
    constructor(props: PacketSocketProps);
    connect(port: number): Promise<void>;
    connect(port: number, host: string): Promise<void>;
    connect(path: string): Promise<void>;
    connect(options: SocketConnectOpts): Promise<void>;
    get localAddress(): string | undefined;
    get localPort(): number | undefined;
    get remoteAddress(): string | undefined;
    get remotePort(): number | undefined;
    address(): AddressInfo | Record<string, never>;
    get connecting(): boolean;
    private wrapSocket;
    private onReadable;
    _read(): void;
    _write(packet: Packet<OPDecoderLiteral>, _: BufferEncoding, done: Callback): void;
    _final(done: Callback): void;
}
export {};
