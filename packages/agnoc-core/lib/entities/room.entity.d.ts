import { Entity } from '../base-classes/entity.base';
import { Coordinate } from '../value-objects/coordinate.value-object';
import { ID } from '../value-objects/id.value-object';
import { Pixel } from '../value-objects/pixel.value-object';
export interface RoomProps {
    id: ID;
    name: string;
    isEnabled: boolean;
    center: Coordinate;
    pixels: Pixel[];
}
export declare class Room extends Entity<RoomProps> {
    constructor(props: RoomProps);
    get id(): ID;
    get name(): string;
    get isEnabled(): boolean;
    get center(): Coordinate;
    get pixels(): Pixel[];
    private validate;
}
