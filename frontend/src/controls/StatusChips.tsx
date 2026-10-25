import {Box, Tooltip, Typography, useTheme} from "@mui/material";
import {
    Battery20 as Battery20Icon,
    Battery50 as Battery50Icon,
    Battery80 as Battery80Icon,
    BatteryChargingFull as BatteryChargingIcon,
    BatteryFull as BatteryFullIcon,
    SignalWifi0Bar as Wifi0BarIcon,
    SignalWifi1Bar as Wifi1BarIcon,
    SignalWifi2Bar as Wifi2BarIcon,
    SignalWifi3Bar as Wifi3BarIcon,
    SignalWifi4Bar as Wifi4BarIcon,
    SignalWifiOff as WifiOffIcon,
    SvgIconComponent,
} from "@mui/icons-material";
import React from "react";
import {Capability, RobotAttributeClass, useRobotAttributeQuery, useWifiSignalQuery} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {useTranslation} from "react-i18next";

type ChipTone = "neutral" | "warn" | "error";

// Mota: píldora compacta de la cabecera (icono + valor). Altura 32 px; el objetivo táctil no hace falta
// porque solo informa (el detalle va en el tooltip)
export const StatusChip: React.FunctionComponent<{
    icon: SvgIconComponent,
    label: string,
    tooltip: string,
    tone?: ChipTone
}> = ({
    icon: Icon,
    label,
    tooltip,
    tone = "neutral"
}): React.ReactElement => {
    const theme = useTheme();
    const tokens = theme.palette.mota;

    let backgroundColor = theme.palette.background.paper;
    let color = theme.palette.text.primary;
    if (tone === "warn") {
        backgroundColor = tokens.warnSoft;
        color = tokens.warnSoftText;
    } else if (tone === "error") {
        backgroundColor = tokens.errorSoft;
        color = tokens.errorSoftText;
    }

    return (
        <Tooltip title={tooltip}>
            <Box
                tabIndex={0}
                aria-label={tooltip}
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    height: 32,
                    px: 1.25,
                    borderRadius: 999,
                    backgroundColor: backgroundColor,
                    color: color,
                    border: tone === "neutral" ? `1px solid ${theme.palette.divider}` : "1px solid transparent",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                }}
            >
                <Icon sx={{fontSize: 18}}/>
                <Typography component="span" sx={{fontSize: "0.8rem", fontWeight: 600, lineHeight: 1}}>
                    {label}
                </Typography>
            </Box>
        </Tooltip>
    );
};

// Mismos umbrales que la página de wifi
const getWifiIcon = (signal: number | undefined): SvgIconComponent => {
    if (signal === undefined || signal >= -55) {
        return Wifi4BarIcon;
    } else if (signal >= -66) {
        return Wifi3BarIcon;
    } else if (signal >= -77) {
        return Wifi2BarIcon;
    } else if (signal >= -88) {
        return Wifi1BarIcon;
    }

    return Wifi0BarIcon;
};

export const WifiChip = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const [wifiSupported] = useCapabilitiesSupported(Capability.WifiConfiguration);
    const {data: wifiStatus} = useWifiSignalQuery(wifiSupported);

    if (!wifiSupported || wifiStatus === undefined) {
        return null;
    }

    if (wifiStatus.state !== "connected") {
        return (
            <StatusChip
                icon={WifiOffIcon}
                label={t("home.chips.wifiOff")}
                tooltip={t("controls.robotStatus.wifiDisconnected")}
                tone="error"
            />
        );
    }

    const signal = wifiStatus.details.signal;

    return (
        <StatusChip
            icon={getWifiIcon(signal)}
            label={signal !== undefined ? t("options.wifi.signal", {signal: signal}) : t("home.chips.wifiOn")}
            tooltip={
                signal !== undefined ?
                    t("controls.robotStatus.wifiSignal", {ssid: wifiStatus.details.ssid ?? "", signal: signal}) :
                    t("controls.robotStatus.wifiConnected", {ssid: wifiStatus.details.ssid ?? ""})
            }
            tone={signal !== undefined && signal < -77 ? "warn" : "neutral"}
        />
    );
};

export const BatteryChips = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const {data: batteries} = useRobotAttributeQuery(RobotAttributeClass.BatteryState);

    if (batteries === undefined || batteries.length === 0) {
        return null;
    }

    return (
        <>
            {batteries.map((battery, index) => {
                const level = Math.round(battery.level);
                let icon: SvgIconComponent = BatteryFullIcon;

                if (battery.flag === "charging") {
                    icon = BatteryChargingIcon;
                } else if (level <= 20) {
                    icon = Battery20Icon;
                } else if (level <= 50) {
                    icon = Battery50Icon;
                } else if (level <= 85) {
                    icon = Battery80Icon;
                }

                const tooltip = batteries.length > 1 ?
                    t("controls.robotStatus.batteryNumbered", {number: index + 1, level: level}) :
                    t("controls.robotStatus.battery", {level: level});

                return (
                    <StatusChip
                        key={index}
                        icon={icon}
                        label={t("home.chips.battery", {level: level})}
                        tooltip={battery.flag === "charging" ? t("home.chips.batteryCharging", {battery: tooltip}) : tooltip}
                        // La batería va siempre en el tono cálido del sistema visual; baja, en el de error
                        tone={level <= 20 && battery.flag !== "charging" ? "error" : "warn"}
                    />
                );
            })}
        </>
    );
};
