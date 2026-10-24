import { ValueObject } from '../base-classes/value-object.base';
export interface DeviceVoiceProps {
    isEnabled: boolean;
    volume: number;
}
export declare class DeviceVoice extends ValueObject<DeviceVoiceProps> {
    get isEnabled(): boolean;
    get volume(): number;
    protected validate(props: DeviceVoiceProps): void;
    static MIN_VOLUME: number;
    static MAX_VOLUME: number;
}
