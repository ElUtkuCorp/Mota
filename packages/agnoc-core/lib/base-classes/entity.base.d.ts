import { ID } from '../value-objects/id.value-object';
export interface BaseEntityProps {
    id: ID;
}
export declare abstract class Entity<EntityProps extends BaseEntityProps> {
    constructor(props: EntityProps);
    protected readonly props: EntityProps;
    get id(): ID;
    static isEntity(entity: unknown): entity is Entity<BaseEntityProps>;
    equals(object?: Entity<EntityProps>): boolean;
    clone<C extends Entity<EntityProps>>(this: C, props: Partial<EntityProps>): C;
    toJSON(): unknown;
    toString(): string;
    private validateProps;
}
