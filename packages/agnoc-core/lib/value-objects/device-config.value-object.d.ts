import { ValueObject } from '../base-classes/value-object.base';
import { DeviceQuietHours } from './device-quiet-hours.value-object';
import { DeviceVoice } from './device-voice.value-object';
export interface DeviceConfigProps {
    voice: DeviceVoice;
    quietHours: DeviceQuietHours;
    isEcoModeEnabled: boolean;
    isRepeatCleanEnabled: boolean;
    isBrokenCleanEnabled: boolean;
    isCarpetModeEnabled: boolean;
    isHistoryMapEnabled: boolean;
}
export declare class DeviceConfig extends ValueObject<DeviceConfigProps> {
    get voice(): DeviceVoice;
    get quietHours(): DeviceQuietHours;
    get isEcoModeEnabled(): boolean;
    get isRepeatCleanEnabled(): boolean;
    get isBrokenCleanEnabled(): boolean;
    get isCarpetModeEnabled(): boolean;
    get isHistoryMapEnabled(): boolean;
    updateVoice(voice: DeviceVoice): void;
    updateCarpetMode(enable: boolean): void;
    updateQuietHours(quietHours: DeviceQuietHours): void;
    updateHistoryMap(enable: boolean): void;
    protected validate(props: DeviceConfigProps): void;
}
