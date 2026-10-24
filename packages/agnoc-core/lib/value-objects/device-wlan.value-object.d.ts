import { ValueObject } from '../base-classes/value-object.base';
export interface DeviceWlanProps {
    ipv4: string;
    ssid: string;
    port: number;
    mask: string;
    mac: string;
}
export declare class DeviceWlan extends ValueObject<DeviceWlanProps> {
    get ipv4(): string;
    get ssid(): string;
    get port(): number;
    get mask(): string;
    get mac(): string;
    protected validate(props: DeviceWlanProps): void;
}
