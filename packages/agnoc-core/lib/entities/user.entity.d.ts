import { Entity } from '../base-classes/entity.base';
import { ID } from '../value-objects/id.value-object';
export type UserProps = {
    id: ID;
};
export declare class User extends Entity<UserProps> {
}
