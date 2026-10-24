import { ValueObject } from '../base-classes/value-object.base';
export interface CoordinateProps {
    x: number;
    y: number;
}
export declare class Coordinate extends ValueObject<CoordinateProps> {
    get x(): number;
    get y(): number;
    protected validate(props: CoordinateProps): void;
}
