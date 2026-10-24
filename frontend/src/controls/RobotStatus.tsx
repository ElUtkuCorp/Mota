import {
    Grid2,
    LinearProgress,
    linearProgressClasses,
    styled,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    SignalWifi0Bar as Wifi0BarIcon,
    SignalWifi1Bar as Wifi1BarIcon,
    SignalWifi2Bar as Wifi2BarIcon,
    SignalWifi3Bar as Wifi3BarIcon,
    SignalWifi4Bar as Wifi4BarIcon,
    SignalWifiOff as WifiOffIcon,
} from "@mui/icons-material";
import React from "react";
import {
    Capability,
    RobotAttributeClass,
    useRobotAttributeQuery,
    useRobotStatusQuery,
    useWifiSignalQuery,
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {RobotMonochromeIcon} from "../components/CustomIcons";
import ControlsCard from "./ControlsCard";
import {useValetudoColorsInverse} from "../hooks/useValetudoColors";
import {useTranslation} from "react-i18next";

const BatteryProgress = styled(LinearProgress)(({ theme }) => {
    return {
        marginTop: -theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        [`&.${linearProgressClasses.colorPrimary}`]: {
            backgroundColor:
                theme.palette.grey[theme.palette.mode === "light" ? 200 : 700],
        },
    };
});

// Mota: señal wifi del robot en la tarjeta de estado (mismos umbrales que la página de wifi)
const WifiSignal = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const [wifiSupported] = useCapabilitiesSupported(Capability.WifiConfiguration);
    const {data: wifiStatus} = useWifiSignalQuery(wifiSupported);

    if (!wifiSupported || wifiStatus === undefined) {
        return null;
    }

    const signal = wifiStatus.details.signal;
    let Icon = WifiOffIcon;
    let label = t("controls.robotStatus.wifiDisconnected");

    if (wifiStatus.state === "connected") {
        if (signal === undefined || signal >= -55) {
            Icon = Wifi4BarIcon;
        } else if (signal >= -66) {
            Icon = Wifi3BarIcon;
        } else if (signal >= -77) {
            Icon = Wifi2BarIcon;
        } else if (signal >= -88) {
            Icon = Wifi1BarIcon;
        } else {
            Icon = Wifi0BarIcon;
        }

        label = signal !== undefined ?
            t("controls.robotStatus.wifiSignal", {ssid: wifiStatus.details.ssid ?? "", signal: signal}) :
            t("controls.robotStatus.wifiConnected", {ssid: wifiStatus.details.ssid ?? ""});
    }

    return (
        <Tooltip title={label}>
            <Grid2 container direction="row" alignItems="center" gap={0.5} sx={{marginLeft: "auto"}}>
                <Icon fontSize="small" color={wifiStatus.state === "connected" ? "inherit" : "error"}/>
                {signal !== undefined && wifiStatus.state === "connected" && (
                    <Typography variant="overline">{t("options.wifi.signal", {signal: signal})}</Typography>
                )}
            </Grid2>
        </Tooltip>
    );
};

const RobotStatus = (): React.ReactElement => {
    const {t} = useTranslation();
    const palette = useValetudoColorsInverse();
    const {
        data: status,
        isPending: isStatusPending,
        isError: isStatusError,
    } = useRobotStatusQuery();
    const {
        data: batteries,
        isPending: isBatteryPending,
        isError: isBatteryError,
    } = useRobotAttributeQuery(RobotAttributeClass.BatteryState);
    const isPending = isStatusPending || isBatteryPending;

    const stateDetails = React.useMemo(() => {
        if (isStatusError) {
            return <Typography color="error">{t("controls.robotStatus.loadError")}</Typography>;
        }

        if (status === undefined) {
            return null;
        }

        return (
            <Typography variant="overline">
                {t(`robot.status.${status.value}`, {defaultValue: status.value})}
                {status.flag !== "none" ? <> &ndash; {t(`robot.statusFlag.${status.flag}`, {defaultValue: status.flag})}</> : ""}
            </Typography>
        );
    }, [isStatusError, status, t]);

    const batteriesDetails = React.useMemo(() => {
        const getBatteryColor = (level: number) => {
            if (level > 60) {
                return palette.green;
            }
            if (level > 20) {
                return palette.yellow;
            }
            return palette.red;
        };

        if (isBatteryError) {
            return <Typography color="error">{t("controls.robotStatus.batteryLoadError")}</Typography>;
        }

        if (batteries === undefined) {
            return null;
        }

        if (batteries.length === 0) {
            return <Typography color="textSecondary">{t("controls.robotStatus.noBatteries")}</Typography>;
        }

        return batteries.map((battery, index) => {
            const batteryColor = getBatteryColor(battery.level);

            return (
                <Grid2 size="grow" container direction="column" key={index}>
                    <Grid2>
                        <Typography
                            variant="overline"
                            style={{
                                color: batteryColor,
                                fontWeight: 500
                            }}
                        >
                            {batteries.length > 1 ?
                                t("controls.robotStatus.batteryNumbered", {number: index + 1, level: Math.round(battery.level)}) :
                                t("controls.robotStatus.battery", {level: Math.round(battery.level)})
                            }
                        </Typography>
                    </Grid2>
                    <Grid2 sx={{ flexGrow: 1, minHeight: "1rem" }}>
                        <BatteryProgress
                            value={battery.level}
                            variant="determinate"
                            sx={{
                                [`& .${linearProgressClasses.bar}`]: {
                                    backgroundColor: batteryColor,
                                },
                            }}
                        />
                    </Grid2>
                </Grid2>
            );
        });
    }, [batteries, isBatteryError, palette, t]);

    return (
        <ControlsCard
            icon={RobotMonochromeIcon}
            title={t("controls.robotStatus.title")}
            isLoading={isPending}
        >
            <Grid2 size="grow" container direction="column">
                <Grid2 container direction="row" alignItems="center">
                    <Grid2>
                        {stateDetails}
                    </Grid2>
                    <WifiSignal/>
                </Grid2>
                {batteries !== undefined && batteries.length > 0 && (
                    <Grid2 size="grow" container direction="row" width="100%">
                        {batteriesDetails}
                    </Grid2>
                )}
            </Grid2>
        </ControlsCard>
    );
};

export default RobotStatus;
