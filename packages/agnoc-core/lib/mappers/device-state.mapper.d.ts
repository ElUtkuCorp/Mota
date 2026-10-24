import { Mapper } from '../base-classes/mapper.base';
import { DeviceState } from '../value-objects/device-state.value-object';
interface RobotState {
    type: number;
    workMode: number;
    chargeStatus: boolean;
}
export declare const DeviceStateMapper: Mapper<DeviceState, RobotState>;
export {};
