/// <reference types="node" />
import { Entity } from '../base-classes/entity.base';
import { Coordinate } from '../value-objects/coordinate.value-object';
import { ID } from '../value-objects/id.value-object';
import { Pixel } from '../value-objects/pixel.value-object';
import { Position } from '../value-objects/position.value-object';
import { Room } from './room.entity';
import { Zone } from './zone.entity';
export interface DeviceMapProps {
    id: ID;
    size: Pixel;
    min: Coordinate;
    max: Coordinate;
    resolution: number;
    grid: Buffer;
    robot?: Position;
    charger?: Position;
    currentSpot?: Position;
    rooms: Room[];
    restrictedZones: Zone[];
    robotPath: Coordinate[];
}
export declare class DeviceMap extends Entity<DeviceMapProps> {
    constructor(props: DeviceMapProps);
    get id(): ID;
    get size(): Pixel;
    get min(): Coordinate;
    get max(): Coordinate;
    get resolution(): number;
    get grid(): Buffer;
    get robot(): Position | undefined;
    get charger(): Position | undefined;
    get rooms(): Room[];
    get restrictedZones(): Zone[];
    get currentSpot(): Position | undefined;
    get robotPath(): Coordinate[];
    updateRobot(robot: Position): void;
    updateCharger(charger: Position): void;
    updateRestrictedZones(restrictedZones: Zone[]): void;
    updateRooms(rooms: Room[]): void;
    updateCurrentSpot(currentSpot: Position): void;
    updateRobotPath(robotPath: Coordinate[]): void;
    toPixel(pos: Coordinate): Pixel;
    toCoordinate(pos: Pixel): Coordinate;
    private validate;
}
