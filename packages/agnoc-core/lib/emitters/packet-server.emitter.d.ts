/// <reference types="node" />
import { AddressInfo, ListenOptions } from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import { PacketSocket } from '../sockets/packet.socket';
interface PacketServerEvents {
    connection: (socket: PacketSocket) => void;
    error: (err: Error) => void;
    listening: () => void;
    close: () => void;
}
export declare class PacketServer extends TypedEmitter<PacketServerEvents> {
    private server;
    constructor();
    get isListening(): boolean;
    get address(): AddressInfo | null;
    listen(port?: number): Promise<void>;
    listen(port?: number, hostname?: string): Promise<void>;
    listen(options: ListenOptions): Promise<void>;
    close(): Promise<void>;
    private onConnection;
    private addListeners;
}
export {};
