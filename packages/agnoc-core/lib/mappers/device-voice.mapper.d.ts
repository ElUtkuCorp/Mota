import { Mapper } from '../base-classes/mapper.base';
import { DeviceVoice } from '../value-objects/device-voice.value-object';
interface RobotVoice {
    isEnabled: boolean;
    volume: number;
}
export declare const DeviceVoiceMapper: Mapper<DeviceVoice, RobotVoice>;
export {};
