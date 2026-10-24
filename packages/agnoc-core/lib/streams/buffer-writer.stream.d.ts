/// <reference types="node" />
/// <reference types="node" />
import { Writable } from 'stream';
type Callback = (error?: Error | null) => void;
export declare class BufferWriter extends Writable {
    buffer: Buffer;
    constructor(buffer?: Buffer);
    _write(chunk: Buffer, _: BufferEncoding, done: Callback): void;
}
export {};
