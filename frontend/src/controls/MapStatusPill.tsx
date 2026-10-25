import {alpha, Box, Typography, useTheme} from "@mui/material";
import React from "react";
import {useTranslation} from "react-i18next";
import {
    Capability,
    RobotAttributeClass,
    StatusState,
    useCurrentStatisticsQuery,
    useRobotAttributeQuery,
    useRobotStatusQuery,
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {getPresetFriendlyName} from "../presetUtils";
import {formatNumber} from "../i18n";

const ACTIVE_STATES: Array<StatusState["value"]> = ["cleaning", "paused", "returning", "moving"];

/**
 * Mota: duración de la limpieza en curso, en "X h Y min" o "Y min"
 */
export const useFormatShortDuration = (): ((seconds: number) => string) => {
    const {t} = useTranslation();

    return React.useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return t("history.durationHoursMinutes", {hours: formatNumber(hours), minutes: minutes});
        }

        return t("history.durationMinutes", {minutes: minutes});
    }, [t]);
};

const CurrentCleaningStatistics = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const {data: statistics} = useCurrentStatisticsQuery();
    const formatDuration = useFormatShortDuration();

    if (!Array.isArray(statistics)) {
        return null;
    }

    const parts: Array<string> = [];
    const time = statistics.find(s => {
        return s.type === "time";
    });
    const area = statistics.find(s => {
        return s.type === "area";
    });

    if (time !== undefined) {
        parts.push(formatDuration(time.value));
    }
    if (area !== undefined) {
        parts.push(t("history.areaSquareMeters", {
            value: formatNumber(area.value / 10000, {minimumFractionDigits: 1, maximumFractionDigits: 1})
        }));
    }

    if (parts.length === 0) {
        return null;
    }

    return (
        <Typography component="span" sx={{fontSize: "0.8rem", fontWeight: 500, color: "text.secondary", whiteSpace: "nowrap"}}>
            {parts.join(" · ")}
        </Typography>
    );
};

/**
 * Mota: píldora de estado encima del mapa en vivo: "Limpiando · <habitación o modo>" y, durante la
 * limpieza, el tiempo y los m² de la limpieza actual
 */
const MapStatusPill = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const theme = useTheme();
    const {data: status} = useRobotStatusQuery();
    const [currentStatisticsSupported] = useCapabilitiesSupported(Capability.CurrentStatistics);
    const {data: operationMode} = useRobotAttributeQuery(
        RobotAttributeClass.PresetSelectionState,
        (attributes) => {
            return attributes.filter((attribute) => {
                return attribute.type === "operation_mode";
            })[0];
        }
    );

    if (status === undefined) {
        return null;
    }

    const active = ACTIVE_STATES.includes(status.value);
    let detail = "";

    if (status.flag !== "none" && status.flag !== "resumable") {
        detail = t(`robot.statusFlag.${status.flag}`, {defaultValue: status.flag});
    } else if (status.value === "cleaning" && operationMode?.value) {
        detail = getPresetFriendlyName(Capability.OperationModeControl, operationMode.value);
    } else if (status.flag === "resumable") {
        detail = t("robot.statusFlag.resumable");
    }

    const label = t(`robot.status.${status.value}`, {defaultValue: status.value});

    let dotColor = theme.palette.text.secondary;
    switch (status.value) {
        case "cleaning":
        case "moving":
            dotColor = theme.palette.primary.main;
            break;
        case "returning":
        case "paused":
            dotColor = theme.palette.warning.main;
            break;
        case "error":
            dotColor = theme.palette.error.main;
            break;
        case "docked":
            dotColor = theme.palette.success.main;
            break;
    }

    return (
        <Box
            role="status"
            aria-live="polite"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 1,
                rowGap: 0.25,
                minHeight: 36,
                maxWidth: "100%",
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                backgroundColor: alpha(theme.palette.background.paper, 0.92),
                backdropFilter: "blur(6px)",
                boxShadow: theme.shadows[2],
                pointerEvents: "auto",
                userSelect: "none",
            }}
        >
            <Box sx={{display: "inline-flex", alignItems: "center", gap: 1, minWidth: 0}}>
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: dotColor,
                        flexShrink: 0,
                    }}
                />
                <Typography component="span" sx={{fontSize: "0.85rem", fontWeight: 600}} noWrap>
                    {detail !== "" ? t("home.status.withDetail", {status: label, detail: detail}) : label}
                </Typography>
            </Box>
            {active && currentStatisticsSupported && <CurrentCleaningStatistics/>}
        </Box>
    );
};

export default MapStatusPill;
