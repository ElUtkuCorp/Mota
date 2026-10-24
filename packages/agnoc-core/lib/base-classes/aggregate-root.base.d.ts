import { ListenerSignature, TypedEmitter } from 'tiny-typed-emitter';
import { BaseEntityProps, Entity } from './entity.base';
export declare class AggregateRoot<EntityProps extends BaseEntityProps, EntityEvents extends ListenerSignature<EntityEvents>> extends Entity<EntityProps> implements TypedEmitter<EntityEvents> {
    eventEmitter: TypedEmitter<EntityEvents>;
    addListener<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    prependListener<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    prependOnceListener<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    removeListener<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    removeAllListeners(event?: keyof EntityEvents): this;
    once<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    on<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    off<U extends keyof EntityEvents>(event: U, listener: EntityEvents[U]): this;
    emit<U extends keyof EntityEvents>(event: U, ...args: Parameters<EntityEvents[U]>): boolean;
    eventNames<U extends keyof EntityEvents>(): U[];
    listenerCount(type: keyof EntityEvents): number;
    listeners<U extends keyof EntityEvents>(type: U): EntityEvents[U][];
    rawListeners<U extends keyof EntityEvents>(type: U): EntityEvents[U][];
    getMaxListeners(): number;
    setMaxListeners(n: number): this;
}
