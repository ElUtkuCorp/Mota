import { BufferWriter } from '../streams/buffer-writer.stream';
declare module 'mocha' {
    interface Context {
        writer: BufferWriter;
    }
}
