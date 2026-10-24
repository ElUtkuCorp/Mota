import { Entity } from '../base-classes/entity.base';
import { Coordinate } from '../value-objects/coordinate.value-object';
import { ID } from '../value-objects/id.value-object';
export interface ZoneProps {
    id: ID;
    coordinates: Coordinate[];
}
export declare class Zone extends Entity<ZoneProps> {
    constructor(props: ZoneProps);
    get id(): ID;
    get coordinates(): Coordinate[];
    private validate;
}
