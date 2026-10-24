import { ValueObject } from '../base-classes/value-object.base';
export declare const CONSUMABLE_TYPE: {
    readonly MAIN_BRUSH: "mainBrush";
    readonly SIDE_BRUSH: "sideBrush";
    readonly FILTER: "filter";
    readonly DISHCLOTH: "dishcloth";
};
export type ConsumableType = (typeof CONSUMABLE_TYPE)[keyof typeof CONSUMABLE_TYPE];
export interface DeviceConsumableProps {
    type: ConsumableType;
    used: number;
}
export declare class DeviceConsumable extends ValueObject<DeviceConsumableProps> {
    get type(): ConsumableType;
    get used(): number;
    protected validate(props: DeviceConsumableProps): void;
}
