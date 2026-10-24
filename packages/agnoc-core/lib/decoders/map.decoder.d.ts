/// <reference types="node" />
/// <reference types="node" />
import { Readable } from 'stream';
import { AreaInfo, CleanPlan, CleanPlanInfo, CleanRoom, CleanRoomInfo, MapHeadInfo, MapInfo, MapPlanInfo } from '../interfaces/map.interface';
export declare function readMapHeadInfo(stream: Readable): MapHeadInfo;
export declare function readCleanPlanInfo(stream: Readable): CleanPlanInfo;
export declare function readMapInfoList(stream: Readable): MapPlanInfo[];
export declare function readCleanRoomList(stream: Readable): CleanRoom[];
export declare function readAreaInfoList(stream: Readable): AreaInfo[];
export declare function readCleanRoomInfoList(stream: Readable): CleanRoomInfo[];
export declare function readCleanPlanList(stream: Readable): CleanPlan[];
export declare const MASK: {
    STATUS: number;
    MAP: number;
    HISTORY: number;
    CHARGER: number;
    WALL_LIST: number;
    AREA_LIST: number;
    SPOT: number;
    ROBOT: number;
    AREA_MODE: number;
    SPOT_MODE: number;
    PLAN_LIST: number;
    UNK: number;
    UNK_2: number;
    ROOM_LIST: number;
};
export declare function decodeMap(payload: Buffer): MapInfo;
