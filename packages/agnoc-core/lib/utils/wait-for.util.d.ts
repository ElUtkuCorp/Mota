export type WaitForCallback = () => boolean;
export interface WaitForOptions {
    timeout: number;
    interval: number;
}
export declare function waitFor(callback: WaitForCallback, options?: Partial<WaitForOptions>): Promise<void>;
