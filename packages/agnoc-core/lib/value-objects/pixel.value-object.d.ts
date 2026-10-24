import { ValueObject } from '../base-classes/value-object.base';
export interface PixelProps {
    x: number;
    y: number;
}
export declare class Pixel extends ValueObject<PixelProps> {
    get x(): number;
    get y(): number;
    protected validate(props: PixelProps): void;
}
