//Adapted from https://stackoverflow.com/a/34270811/10951033
import {ConsumableSubType, ConsumableType, ValetudoDataPoint} from "./api";
import {useCallback, useLayoutEffect, useRef} from "react";
import i18n, {DISPLAY_LOCALE, formatNumber} from "./i18n";

export function convertSecondsToHumans(seconds: number, showSeconds = true, showDays = true): string {
    let levels;

    if (showDays) {
        levels = [
            {
                value: Math.floor(seconds / 86400),
                label: i18n.t("units.daysShort")
            },
            {
                value: Math.floor((seconds % 86400) / 3600).toString().padStart(2, "0"),
                label: i18n.t("units.hoursShort")
            },
            {
                value: Math.floor(((seconds % 86400) % 3600) / 60).toString().padStart(2, "0"),
                label: i18n.t("units.minutesShort")
            }
        ];


        if (showSeconds) {
            levels.push(
                {
                    value: (((seconds % 86400) % 3600) % 60).toString().padStart(2, "0"),
                    label: i18n.t("units.secondsShort")
                }
            );
        }
    } else {
        levels = [
            {
                value: Math.floor(seconds / 3600).toString().padStart(2, "0"),
                label: i18n.t("units.hoursShort")
            },
            {
                value: Math.floor((seconds % 3600) / 60).toString().padStart(2, "0"),
                label: i18n.t("units.minutesShort")
            }
        ];


        if (showSeconds) {
            levels.push(
                {
                    value: ((seconds % 3600) % 60).toString().padStart(2, "0"),
                    label: i18n.t("units.secondsShort")
                }
            );
        }
    }


    let humanReadableTimespan = "";

    levels.forEach((lvl) => {
        humanReadableTimespan += lvl.value + lvl.label + " ";
    });

    return humanReadableTimespan.trim();
}

export function convertBytesToHumans(bytes: number): string {
    const twoDecimals = {minimumFractionDigits: 2, maximumFractionDigits: 2};

    if (bytes >= 1024*1024*1024) {
        return `${formatNumber(((bytes/1024)/1024)/1024, twoDecimals)} GiB`;
    } else if (bytes >= 1024*1024) {
        return `${formatNumber((bytes/1024)/1024, twoDecimals)} MiB`;
    } else if (bytes >= 1024) {
        return `${formatNumber(bytes/1024, twoDecimals)} KiB`;
    } else {
        return i18n.t("units.bytes", {count: bytes, value: formatNumber(bytes)});
    }
}

//Adapted from https://stackoverflow.com/a/41358305
export function convertNumberToRoman(num: number): string {
    const symbols: Record<string, number> = {
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1
    };
    let str = "";

    for (const i of Object.keys(symbols)) {
        const quantity = Math.floor(num / symbols[i]);

        num -= quantity * symbols[i];
        str += i.repeat(quantity);
    }

    return str;
}

// Adapted from https://gist.github.com/erikvullings/ada7af09925082cbb89f40ed962d475e
export const deepCopy = <T>(target: T): T => {
    if (target === null) {
        return target;
    }
    if (target instanceof Date) {
        return new Date(target.getTime()) as any;
    }
    if (target instanceof Array) {
        const cp = [] as any[];
        (target as any[]).forEach((v) => {
            cp.push(v);
        });
        return cp.map((n: any) => {
            return deepCopy<any>(n);
        }) as any;
    }
    if (typeof target === "object" && Object.keys(target).length !== 0) {
        const cp = {...(target as { [key: string]: any })} as { [key: string]: any };
        Object.keys(cp).forEach(k => {
            cp[k] = deepCopy<any>(cp[k]);
        });
        return cp as T;
    }
    return target;
};

const consumableTypes: Array<ConsumableType> = ["brush", "filter", "cleaning", "mop", "detergent", "bin"];
const consumableSubTypes: Array<ConsumableSubType> = ["main", "secondary", "side_right", "side_left", "all", "none", "dock", "sensor", "wheel"];

/*
 * Consumable names are composed from type and subtype (e.g. "main" + "brush").
 * Since word order differs between languages, the combined name comes from a single translation key
 * ("consumables.names.<type>_<subType>") with a generic "<subType> <type>" pattern as fallback.
 */
export const getConsumableName = (type: ConsumableType, subType?: ConsumableSubType): string => {
    const typeKnown = consumableTypes.includes(type);
    const subTypeKnown = subType !== undefined && consumableSubTypes.includes(subType);

    if (!typeKnown) {
        return i18n.t("consumables.names.unknown", {type: type, subType: subType});
    }

    const typeName = i18n.t(`consumables.types.${type}`);

    if (!subTypeKnown || subType === "all" || subType === "none") {
        return typeName;
    }

    const specificKey = `consumables.names.${type}_${subType}`;
    if (i18n.exists(specificKey)) {
        return i18n.t(specificKey);
    }

    return i18n.t("consumables.names.pattern", {
        type: typeName,
        subType: i18n.t(`consumables.subTypes.${subType}`)
    });
};

// Adapted from https://stackoverflow.com/a/53660837
export const median = (numbers: Array<number>): number => { //Note that this will modify the input array
    numbers.sort((a, b) => {
        return a - b;
    });

    const middle = Math.floor(numbers.length / 2);

    if (numbers.length % 2 === 0) {
        return (numbers[middle - 1] + numbers[middle]) / 2;
    }

    return numbers[middle];
};

export function getFriendlyStatName(stat: ValetudoDataPoint) : string {
    switch (stat.type) {
        case "area":
            return i18n.t("statistics.types.area");
        case "time":
            return i18n.t("statistics.types.time");
        case "count":
            return i18n.t("statistics.types.count");
    }
}

export function getHumanReadableStatValue(stat: ValetudoDataPoint): string {
    switch (stat.type) {
        case "area":
            return formatNumber(stat.value / 10000, {minimumFractionDigits: 2, maximumFractionDigits: 2, minimumIntegerDigits: 2}) + " m²";
        case "time":
            return convertSecondsToHumans(stat.value, true, false);
        case "count":
            return formatNumber(stat.value);
    }
}

//adapted from https://stackoverflow.com/a/60880664
export function adjustHexColorBrightness(hexInput: string, percent: number) : string {
    let hex = hexInput;

    // strip the leading # if it's there
    hex = hex.trim().replace("#","");

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, "$1$1");
    }

    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);

    const calculatedPercent = (100 + percent) / 100;

    r = Math.round(Math.min(255, Math.max(0, r * calculatedPercent)));
    g = Math.round(Math.min(255, Math.max(0, g * calculatedPercent)));
    b = Math.round(Math.min(255, Math.max(0, b * calculatedPercent)));

    let result = "#";

    result += r.toString(16).toUpperCase().padStart(2, "0");
    result += g.toString(16).toUpperCase().padStart(2, "0");
    result += b.toString(16).toUpperCase().padStart(2, "0");

    return result;
}

//adapted from https://stackoverflow.com/a/69331524
export const useGetter = <S>(value: S): (() => S) => {
    const ref = useRef(value);
    useLayoutEffect(() => {
        ref.current = value;
    });
    return useCallback(() => {
        return ref.current;
    }, [ref]);
};

export function extractHostFromUrl(value: string): string {
    return value.replace(/^[a-zA-Z]+:\/\//, "").replace(/\/.*/g, "").trim();
}

export function formatRelative(timestamp: number | string | Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) {
        return i18n.t("time.inTheFuture");
    }

    if (diffInSeconds < 60) {
        return i18n.t("time.justNow");
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return i18n.t("time.minutesAgo", {count: diffInMinutes});
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return i18n.t("time.hoursAgo", {count: diffInHours});
    }

    return formatDateTime(date);
}

/**
 * Formats date and time using the display locale (es-ES)
 *
 * @param {Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return date.toLocaleString(DISPLAY_LOCALE, options ?? {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

export function format8601Ish(date: Date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

