/// <reference types="node" />
import { CleanPlan, CleanPlanInfo, CleanRoom, MapHeadInfo, MapPlanInfo } from '../interfaces/map.interface';
interface Unk1 {
    unk1: number;
    unk2: number;
}
interface AreaListInfo {
    count: number;
    mapHeadId?: number;
    unk2?: Unk1[];
    mapHeadInfo?: MapHeadInfo;
    mapGrid?: Buffer;
    cleanPlanInfo?: CleanPlanInfo;
    mapInfoList?: MapPlanInfo[];
    currentPlanId?: number;
    cleanRoomList?: CleanRoom[];
    cleanPlanList?: CleanPlan[];
}
export declare function decodeArea(payload: Buffer): AreaListInfo;
export {};
