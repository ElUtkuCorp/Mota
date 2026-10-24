import {ValetudoDataPointType} from "../../api";
import i18n from "../../i18n";

export interface StatisticsAchievement {
    value: number;
    title: string;
    description: string;
}

/*
 * Title and description are looked up lazily from
 * "statistics.achievements.<type>.<id>.title" and ".description"
 */
const achievement = (type: ValetudoDataPointType, id: string, value: number): StatisticsAchievement => {
    return {
        value: value,
        get title() {
            return i18n.t(`statistics.achievements.${type}.${id}.title`);
        },
        get description() {
            return i18n.t(`statistics.achievements.${type}.${id}.description`);
        }
    };
};

// units are cm², seconds and.. count.
export const statisticsAchievements: Record<ValetudoDataPointType, Array<StatisticsAchievement>> = {
    "area": [
        achievement("area", "saarland", 25_690_000_000_000),
        achievement("area", "sourceMap", Math.pow(32768 * 2.54,2)), // 32768 units per axis with 1 unit being 1 inch
        achievement("area", "leipzigerMesse", 500_000_000),
        achievement("area", "goldSrcMap", Math.pow(8192 * 2.54,2)), // 8192 units per axis with 1 unit being 1 inch
        achievement("area", "cchAgain", 360_000_000),
        achievement("area", "cch", 240_000_000),
        achievement("area", "bcc", 100_000_000),
        achievement("area", "sports", 1_620_000),
        achievement("area", "breathe", 700_000),
        achievement("area", "metric", 10_000),
    ],
    "time": [
        achievement("time", "protonDecay", 1.67 * Math.pow(10,34) * 365.25 * 24 * 60 * 60),
        achievement("time", "subscription", 30 * 24 * 60 * 60),
        achievement("time", "week", 7 * 24 * 60 * 60),
        achievement("time", "desolation", (new Date("1969-07-21T02:56:00Z").getTime() - new Date("1969-07-16T13:32:00Z").getTime())/1000),
        achievement("time", "day", 24 * 60 * 60),
        achievement("time", "hour", 60 * 60),
    ],
    "count": [
        achievement("count", "mole", 6.02214076 * Math.pow(10,23)),
        achievement("count", "leet", 1_337),
        achievement("count", "kibi", 1_024),
        achievement("count", "kilo", 1000),
        achievement("count", "block", 512),
        achievement("count", "dailyDriver", 365),
        achievement("count", "byte", 256),
        achievement("count", "y2k38", 64),
        achievement("count", "babySteps", 10),
    ],
};
