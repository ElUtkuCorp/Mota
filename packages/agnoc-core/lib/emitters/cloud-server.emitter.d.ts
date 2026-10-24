import { TypedEmitter } from 'tiny-typed-emitter';
import { OPDecoderLiteral } from '../constants/opcodes.constant';
import { Message } from '../value-objects/message.value-object';
import { Robot } from './robot.emitter';
interface CloudServerEvents {
    addRobot: (robot: Robot) => void;
    error: (err: Error) => void;
}
export declare class CloudServer extends TypedEmitter<CloudServerEvents> {
    private robots;
    private servers;
    private handlers;
    constructor();
    getRobots(): Robot[];
    listen(host?: string): Promise<void>;
    close(): Promise<void>;
    private handleClientLogin;
    private handleClientRegister;
    handleMessage<Name extends OPDecoderLiteral>(message: Message<Name>): void;
    private handleConnection;
    private handleRTPConnection;
    private addListeners;
}
export {};
