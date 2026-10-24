/// <reference types="node" />
import { Readable, Writable } from 'stream';
export declare const readByte: (stream: Readable) => number;
export declare const readShort: (stream: Readable) => number;
export declare const readWord: (stream: Readable) => number;
export declare const readFloat: (stream: Readable) => number;
export declare const readLong: (stream: Readable) => bigint;
export declare const writeByte: (stream: Writable, value: number) => void;
export declare const writeShort: (stream: Writable, value: number) => void;
export declare const writeWord: (stream: Writable, value: number) => void;
export declare const writeFloat: (stream: Writable, value: number) => void;
export declare const writeLong: (stream: Writable, value: bigint) => void;
export declare function readString(stream: Readable): string;
export declare function writeString(stream: Writable, value: string): void;
