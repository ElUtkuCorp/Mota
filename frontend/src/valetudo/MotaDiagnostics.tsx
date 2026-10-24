import React from "react";
import {
    Box,
    Chip,
    Grid2,
    List,
    ListItem,
    ListItemText,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {MotaDiagnostics as MotaDiagnosticsData, MotaDiskSpaceInfo, useMotaDiagnosticsQuery} from "../api";
import ReloadableCard from "../components/ReloadableCard";
import RatioBar from "../components/RatioBar";
import {useValetudoColorsInverse} from "../hooks/useValetudoColors";
import {convertBytesToHumans, convertSecondsToHumans} from "../utils";
import {DISPLAY_LOCALE, formatNumber} from "../i18n";

const isNumber = (value: unknown): value is number => {
    return typeof value === "number" && isFinite(value);
};

// Mota: el backend lee /sys/class/thermal/thermal_zone0/temp tal cual. Según el kernel ese valor viene
// en grados o en milésimas de grado, así que cualquier valor por encima de 200 se trata como miligrados.
const normalizeTemperature = (value: number): number => {
    return Math.abs(value) > 200 ? value / 1000 : value;
};

const InfoItem: React.FunctionComponent<{ label: string, children: React.ReactNode }> = ({
    label,
    children
}): React.ReactElement => {
    return (
        <Grid2>
            <Typography variant="caption" color="textSecondary">
                {label}
            </Typography>
            <Typography variant="body2" component="div">{children}</Typography>
        </Grid2>
    );
};

const Section: React.FunctionComponent<{ title: string, children: React.ReactNode }> = ({
    title,
    children
}): React.ReactElement => {
    return (
        <Box>
            <Typography variant="subtitle2" sx={{mb: 1}}>
                {title}
            </Typography>
            {children}
        </Box>
    );
};

const DiskSpaceBar: React.FunctionComponent<{ label: string, info: MotaDiskSpaceInfo | null | undefined }> = ({
    label,
    info
}): React.ReactElement => {
    const {t} = useTranslation();
    const palette = useValetudoColorsInverse();

    if (!info || !isNumber(info.total) || !isNumber(info.free) || info.total <= 0) {
        return (
            <InfoItem label={label}>{t("diagnostics.notAvailable")}</InfoItem>
        );
    }

    const used = Math.max(0, info.total - info.free);
    const usedRatio = used / info.total;
    let color = palette.green;

    if (usedRatio >= 0.9) {
        color = palette.red;
    } else if (usedRatio >= 0.75) {
        color = palette.yellow;
    }

    return (
        <Grid2 size={{xs: 12, sm: 6}}>
            <Typography variant="caption" color="textSecondary">
                {label}
            </Typography>
            <Typography variant="body2">
                {t("diagnostics.storage.freeOfTotal", {
                    free: convertBytesToHumans(info.free),
                    total: convertBytesToHumans(info.total)
                })}
            </Typography>
            <RatioBar
                style={{marginTop: "4px"}}
                total={info.total}
                totalLabel={convertBytesToHumans(info.total)}
                partitions={[
                    {
                        label: t("diagnostics.storage.used"),
                        value: used,
                        valueLabel: convertBytesToHumans(used),
                        color: color
                    }
                ]}
                noneLegendLabel={t("diagnostics.storage.free")}
            />
        </Grid2>
    );
};

const DiagnosticsView: React.FunctionComponent<{ diagnostics: MotaDiagnosticsData }> = ({
    diagnostics
}): React.ReactElement => {
    const {t} = useTranslation();
    const na = t("diagnostics.notAvailable");

    const {system, storage, wifi, firewall, robot} = diagnostics;

    const fmt = (value: number | null | undefined, key: string, options?: Intl.NumberFormatOptions): string => {
        return isNumber(value) ? t(key, {value: formatNumber(value, options)}) : na;
    };

    const yesNo = (value: boolean | null | undefined, yesKey: string, noKey: string): React.ReactNode => {
        if (typeof value !== "boolean") {
            return na;
        }

        return (
            <Chip
                size="small"
                variant="outlined"
                color={value ? "success" : "error"}
                label={t(value ? yesKey : noKey)}
            />
        );
    };

    const uptimeSeconds = system?.uptimeSeconds;
    const socTemperature = system?.socTemperatureCelsius;
    const vendorLogBytes = storage?.vendorLogBytes;
    const load = system?.load;
    const loadText = Array.isArray(load) && load.length > 0 && load.every(isNumber) ?
        load.map(l => {
            return formatNumber(l, {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }).join(" · ") :
        na;

    const robotState = robot?.state ?
        t(`robot.status.${robot.state}`, {defaultValue: robot.state}) :
        na;
    const robotMode = robot?.mode ?
        t(`diagnostics.robot.modes.${robot.mode}`, {defaultValue: robot.mode}) :
        na;
    const robotError = robot?.error ?
        (robot.error === "none" ? t("diagnostics.robot.noError") : robot.error) :
        na;

    const recentBlocks = firewall?.recentBlocks ?? [];

    const timestamp = new Date(diagnostics.timestamp);

    return (
        <Stack spacing={3}>
            <Section title={t("diagnostics.wifi.title")}>
                {
                    wifi ?
                        <Grid2 container spacing={2}>
                            <InfoItem label={t("diagnostics.wifi.ssid")}>{wifi.ssid ?? na}</InfoItem>
                            <InfoItem label={t("diagnostics.wifi.signal")}>{fmt(wifi.signalDbm, "diagnostics.units.dbm")}</InfoItem>
                            <InfoItem label={t("diagnostics.wifi.quality")}>{fmt(wifi.linkQuality, "diagnostics.units.percent")}</InfoItem>
                            <InfoItem label={t("diagnostics.wifi.bitRate")}>{fmt(wifi.bitRateMbps, "diagnostics.units.mbps")}</InfoItem>
                            <InfoItem label={t("diagnostics.wifi.txPower")}>{fmt(wifi.txPowerDbm, "diagnostics.units.dbm")}</InfoItem>
                            <InfoItem label={t("diagnostics.wifi.frequency")}>{fmt(wifi.frequencyGhz, "diagnostics.units.ghz", {maximumFractionDigits: 3})}</InfoItem>
                        </Grid2> :
                        <Typography variant="body2" color="text.secondary">{na}</Typography>
                }
            </Section>

            <Section title={t("diagnostics.robot.title")}>
                <Grid2 container spacing={2}>
                    <InfoItem label={t("diagnostics.robot.connection")}>
                        {yesNo(robot?.connected, "diagnostics.robot.connected", "diagnostics.robot.disconnected")}
                    </InfoItem>
                    <InfoItem label={t("diagnostics.robot.battery")}>{fmt(robot?.battery, "diagnostics.units.percent")}</InfoItem>
                    <InfoItem label={t("diagnostics.robot.state")}>{robotState}</InfoItem>
                    <InfoItem label={t("diagnostics.robot.mode")}>{robotMode}</InfoItem>
                    <InfoItem label={t("diagnostics.robot.error")}>{robotError}</InfoItem>
                </Grid2>
            </Section>

            <Section title={t("diagnostics.system.title")}>
                <Grid2 container spacing={2}>
                    <InfoItem label={t("diagnostics.system.uptime")}>
                        {isNumber(uptimeSeconds) ? convertSecondsToHumans(uptimeSeconds) : na}
                    </InfoItem>
                    <InfoItem label={t("diagnostics.system.load")}>{loadText}</InfoItem>
                    <InfoItem label={t("diagnostics.system.socTemperature")}>
                        {
                            isNumber(socTemperature) ?
                                t("diagnostics.units.celsius", {
                                    value: formatNumber(normalizeTemperature(socTemperature), {maximumFractionDigits: 1})
                                }) :
                                na
                        }
                    </InfoItem>
                    <InfoItem label={t("diagnostics.system.timezone")}>{system?.timezone ?? na}</InfoItem>
                </Grid2>
            </Section>

            <Section title={t("diagnostics.storage.title")}>
                <Grid2 container spacing={2}>
                    <DiskSpaceBar label={t("diagnostics.storage.udisk")} info={storage?.udisk}/>
                    <DiskSpaceBar label={t("diagnostics.storage.overlay")} info={storage?.overlay}/>
                    <InfoItem label={t("diagnostics.storage.vendorLog")}>
                        {isNumber(vendorLogBytes) ? convertBytesToHumans(vendorLogBytes) : na}
                    </InfoItem>
                </Grid2>
            </Section>

            <Section title={t("diagnostics.firewall.title")}>
                {
                    firewall ?
                        <Stack spacing={1}>
                            <Grid2 container spacing={2}>
                                <InfoItem label={t("diagnostics.firewall.status")}>
                                    {yesNo(firewall.active, "diagnostics.firewall.active", "diagnostics.firewall.inactive")}
                                </InfoItem>
                                <InfoItem label={t("diagnostics.firewall.blockedPackets")}>
                                    {isNumber(firewall.blockedPackets) ? formatNumber(firewall.blockedPackets) : na}
                                </InfoItem>
                            </Grid2>
                            <Box>
                                <Typography variant="caption" color="textSecondary">
                                    {t("diagnostics.firewall.recentBlocks")}
                                </Typography>
                                {
                                    recentBlocks.length > 0 ?
                                        <List dense disablePadding>
                                            {recentBlocks.map((block, i) => {
                                                const destination = block.destination ?? na;
                                                const port = isNumber(block.port) ? `:${block.port}` : "";
                                                const protocol = block.protocol ? `/${block.protocol}` : "";

                                                return (
                                                    <ListItem key={`block_${i}`} disableGutters sx={{py: 0}}>
                                                        <ListItemText
                                                            primary={`${destination}${port}${protocol}`}
                                                            slotProps={{
                                                                primary: {
                                                                    variant: "body2",
                                                                    sx: {fontFamily: "\"JetBrains Mono\", monospace"}
                                                                }
                                                            }}
                                                        />
                                                    </ListItem>
                                                );
                                            })}
                                        </List> :
                                        <Typography variant="body2">{t("diagnostics.firewall.noRecentBlocks")}</Typography>
                                }
                            </Box>
                        </Stack> :
                        <Typography variant="body2" color="text.secondary">{na}</Typography>
                }
            </Section>

            {
                !isNaN(timestamp.getTime()) &&
                <Typography variant="caption" color="text.secondary">
                    {t("diagnostics.updatedAt", {time: timestamp.toLocaleTimeString(DISPLAY_LOCALE)})}
                </Typography>
            }
        </Stack>
    );
};

/**
 * Mota: sección de diagnóstico de la página de información del sistema.
 * Si la API propia no responde (por ejemplo, en un robot que no es el de Mota), no se muestra.
 */
const MotaDiagnostics = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const {
        data: diagnostics,
        isPending,
        isError,
        isFetching,
        refetch
    } = useMotaDiagnosticsQuery();

    if (isError && !diagnostics) {
        return null;
    }

    return (
        <Grid2 size={{xs: 12}}>
            <ReloadableCard
                title={t("diagnostics.title")}
                loading={isFetching}
                onReload={() => {
                    return refetch();
                }}
                boxShadow={3}
            >
                {
                    isPending || !diagnostics ?
                        <Skeleton height={"12rem"}/> :
                        <DiagnosticsView diagnostics={diagnostics}/>
                }
            </ReloadableCard>
        </Grid2>
    );
};

export default MotaDiagnostics;
