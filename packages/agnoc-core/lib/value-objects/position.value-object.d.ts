import { ValueObject } from '../base-classes/value-object.base';
import { Coordinate } from './coordinate.value-object';
export interface PositionProps {
    x: number;
    y: number;
    phi: number;
}
export declare class Position extends ValueObject<PositionProps> {
    get x(): number;
    get y(): number;
    get phi(): number;
    get degrees(): number;
    toCoordinates(): Coordinate;
    protected validate(props: PositionProps): void;
}
