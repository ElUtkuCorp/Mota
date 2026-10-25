import React from "react";
import {
    Box,
    Button,
    ButtonBase,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Skeleton,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import {
    ChevronRight as OpenIcon,
    History as HistoryIcon,
} from "@mui/icons-material";
import {useTranslation} from "react-i18next";
import {
    Capability,
    getMotaCleanHistoryMapUrl,
    MotaCleanHistoryEntry,
    PresetValue,
    useMotaCleanHistoryQuery,
    useMotaCleanHistoryTotalsQuery,
} from "../api";
import {useIsMobileView} from "../hooks";
import {DISPLAY_LOCALE, formatNumber} from "../i18n";
import {getPresetFriendlyName} from "../presetUtils";
import {TITLE_FONT_FAMILY} from "../theme";

const THUMBNAIL_SIZE = 64;

const oneDecimal = {minimumFractionDigits: 1, maximumFractionDigits: 1};

const KNOWN_MODES: Array<PresetValue> = ["vacuum", "mop", "vacuum_and_mop", "vacuum_then_mop", "edge", "spiral"];

/**
 * Mota: muestra una duración como "X h Y min" (o "Y min", o "Z s" si no llega al minuto)
 */
const useFormatDuration = (): ((seconds: number | undefined | null) => string) => {
    const {t} = useTranslation();

    return React.useCallback((seconds) => {
        if (typeof seconds !== "number" || !isFinite(seconds) || seconds < 0) {
            return t("history.notAvailable");
        }

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return t("history.durationHoursMinutes", {hours: formatNumber(hours), minutes: minutes});
        } else if (minutes > 0) {
            return t("history.durationMinutes", {minutes: minutes});
        } else {
            return t("history.durationSeconds", {seconds: Math.round(seconds)});
        }
    }, [t]);
};

const useFormatArea = (): ((areaCm2: number | undefined | null) => string) => {
    const {t} = useTranslation();

    return React.useCallback((areaCm2) => {
        if (typeof areaCm2 !== "number" || !isFinite(areaCm2)) {
            return t("history.notAvailable");
        }

        return t("history.areaSquareMeters", {value: formatNumber(areaCm2 / 10000, oneDecimal)});
    }, [t]);
};

const formatStartTime = (startTime: string | undefined): string | null => {
    if (!startTime) {
        return null;
    }

    const date = new Date(startTime);

    if (isNaN(date.getTime())) {
        return null;
    }

    const formatted = date.toLocaleString(DISPLAY_LOCALE, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    // "vie, 24 oct 2026, 10:30" -> "Vie, 24 oct 2026, 10:30"
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * Mota: modo de la limpieza, si el backend lo indica
 *
 * @param {MotaCleanHistoryEntry} entry
 * @returns {string | null}
 */
const getEntryMode = (entry: MotaCleanHistoryEntry): string | null => {
    if (typeof entry.mode === "string" && KNOWN_MODES.includes(entry.mode as PresetValue)) {
        return getPresetFriendlyName(Capability.OperationModeControl, entry.mode as PresetValue);
    }

    return null;
};

const TotalCard: React.FunctionComponent<{ label: string, value: string | null, loading: boolean }> = ({
    label,
    value,
    loading
}): React.ReactElement => {
    return (
        <Paper elevation={1} sx={{p: {xs: 1.5, sm: 2.5}, minWidth: 0}}>
            {
                loading ?
                    <Skeleton height={"2.25rem"}/> :
                    <Typography
                        component="div"
                        noWrap
                        sx={{
                            fontFamily: TITLE_FONT_FAMILY,
                            fontWeight: 800,
                            fontSize: {xs: "1.35rem", sm: "1.9rem"},
                            lineHeight: 1.15,
                            letterSpacing: "-0.01em",
                        }}
                    >
                        {value}
                    </Typography>
            }
            <Typography variant="body2" color="text.secondary" sx={{mt: 0.5, fontSize: {xs: "0.78rem", sm: "0.875rem"}}}>
                {label}
            </Typography>
        </Paper>
    );
};

const HistoryTotals = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: totals, isPending} = useMotaCleanHistoryTotalsQuery();

    // Formatos cortos para que las tres tarjetas quepan en una fila en el móvil
    let time: string = t("history.notAvailable");
    let area: string = t("history.notAvailable");

    if (totals) {
        const hours = totals.timeSeconds / 3600;
        time = hours >= 1 ?
            t("history.totals.hoursShort", {value: formatNumber(hours, {maximumFractionDigits: hours >= 100 ? 0 : 1})}) :
            t("history.durationMinutes", {minutes: Math.round(totals.timeSeconds / 60)});

        const squareMeters = totals.areaCm2 / 10000;
        area = t("history.areaSquareMeters", {
            value: formatNumber(squareMeters, {maximumFractionDigits: squareMeters >= 100 ? 0 : 1})
        });
    }

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: {xs: 1, sm: 2},
            }}
        >
            <TotalCard
                label={t("history.totals.count")}
                value={totals ? formatNumber(totals.count) : t("history.notAvailable")}
                loading={isPending}
            />
            <TotalCard
                label={t("history.totals.time")}
                value={time}
                loading={isPending}
            />
            <TotalCard
                label={t("history.totals.area")}
                value={area}
                loading={isPending}
            />
        </Box>
    );
};

const MapThumbnail: React.FunctionComponent<{ entry: MotaCleanHistoryEntry, alt: string }> = ({
    entry,
    alt
}): React.ReactElement => {
    const theme = useTheme();
    const [failed, setFailed] = React.useState(false);

    return (
        <Box
            sx={{
                width: THUMBNAIL_SIZE,
                height: THUMBNAIL_SIZE,
                flexShrink: 0,
                borderRadius: "16px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.palette.mota.mapBackground,
            }}
        >
            {
                entry.hasMap && !failed ?
                    <img
                        src={getMotaCleanHistoryMapUrl(entry.cleanId)}
                        alt={alt}
                        loading="lazy"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain"
                        }}
                        onError={() => {
                            setFailed(true);
                        }}
                    /> :
                    <HistoryIcon sx={{color: "text.disabled"}}/>
            }
        </Box>
    );
};

const ResultPill: React.FunctionComponent<{ result: NonNullable<MotaCleanHistoryEntry["result"]> }> = ({
    result
}): React.ReactElement => {
    const {t} = useTranslation();
    const tokens = useTheme().palette.mota;

    let backgroundColor = tokens.successSoft;
    let color = tokens.successSoftText;
    if (result === "interrupted") {
        backgroundColor = tokens.warnSoft;
        color = tokens.warnSoftText;
    } else if (result === "error") {
        backgroundColor = tokens.errorSoft;
        color = tokens.errorSoftText;
    }

    return (
        <Box
            component="span"
            sx={{
                display: "inline-flex",
                alignItems: "center",
                height: 26,
                px: 1.25,
                borderRadius: 999,
                backgroundColor: backgroundColor,
                color: color,
                fontSize: "0.75rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
                flexShrink: 0,
            }}
        >
            {t(`history.result.${result}`)}
        </Box>
    );
};

const HistoryEntryRow: React.FunctionComponent<{
    entry: MotaCleanHistoryEntry,
    onOpenMap: (entry: MotaCleanHistoryEntry) => void
}> = ({
    entry,
    onOpenMap
}): React.ReactElement => {
    const {t} = useTranslation();
    const formatDuration = useFormatDuration();
    const formatArea = useFormatArea();

    const startTime = formatStartTime(entry.startTime);
    const title = startTime ?? t("history.cleanNumber", {id: entry.cleanId});
    const mode = getEntryMode(entry);
    const summary = [
        mode,
        formatDuration(entry.durationSeconds),
        formatArea(entry.area)
    ].filter((part): part is string => {
        return part !== null;
    }).join(" · ");

    const content = (
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{p: 1.5, width: "100%", textAlign: "left"}}>
            <MapThumbnail entry={entry} alt={t("history.mapAlt", {title: title})}/>
            <Box sx={{minWidth: 0, flexGrow: 1}}>
                <Typography sx={{fontWeight: 600}} noWrap>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{mt: 0.25}}>
                    {summary}
                </Typography>
            </Box>
            {entry.result && <ResultPill result={entry.result}/>}
            {entry.hasMap && <OpenIcon sx={{color: "text.secondary", flexShrink: 0}} titleAccess={t("history.openMap")}/>}
        </Stack>
    );

    return (
        <Paper elevation={1} sx={{overflow: "hidden"}}>
            {
                entry.hasMap ?
                    <ButtonBase
                        sx={{width: "100%", display: "block"}}
                        onClick={() => {
                            onOpenMap(entry);
                        }}
                        aria-label={`${title}. ${t("history.openMap")}`}
                    >
                        {content}
                    </ButtonBase> :
                    content
            }
        </Paper>
    );
};

const MapDialog: React.FunctionComponent<{
    entry: MotaCleanHistoryEntry | null,
    onClose: () => void
}> = ({
    entry,
    onClose
}): React.ReactElement => {
    const {t} = useTranslation();
    const mobileView = useIsMobileView();
    const formatDuration = useFormatDuration();
    const formatArea = useFormatArea();
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        setFailed(false);
    }, [entry]);

    const startTime = entry ? formatStartTime(entry.startTime) : null;
    const title = entry ? (startTime ?? t("history.cleanNumber", {id: entry.cleanId})) : "";

    return (
        <Dialog
            open={entry !== null}
            onClose={onClose}
            fullScreen={mobileView}
            maxWidth="lg"
        >
            <DialogTitle>
                {title}
            </DialogTitle>
            <DialogContent dividers>
                {
                    entry &&
                    <Stack spacing={2} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                            {t("history.dialogSummary", {
                                duration: formatDuration(entry.durationSeconds),
                                area: formatArea(entry.area)
                            })}
                        </Typography>
                        {
                            failed ?
                                <Typography color="error">{t("history.mapLoadError")}</Typography> :
                                <img
                                    src={getMotaCleanHistoryMapUrl(entry.cleanId)}
                                    alt={t("history.mapAlt", {title: title})}
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: mobileView ? "none" : "75vh",
                                        objectFit: "contain",
                                        borderRadius: 16
                                    }}
                                    onError={() => {
                                        setFailed(true);
                                    }}
                                />
                        }
                    </Stack>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("common.close")}</Button>
            </DialogActions>
        </Dialog>
    );
};

const History = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: history,
        isPending,
        isError
    } = useMotaCleanHistoryQuery({refetchInterval: 60_000});
    const [selectedEntry, setSelectedEntry] = React.useState<MotaCleanHistoryEntry | null>(null);

    const list = React.useMemo(() => {
        if (isPending) {
            return (
                <Stack spacing={1}>
                    <Skeleton variant="rounded" height={THUMBNAIL_SIZE + 24}/>
                    <Skeleton variant="rounded" height={THUMBNAIL_SIZE + 24}/>
                </Stack>
            );
        }

        if (isError || !history) {
            return <Typography color="error">{t("history.loadError")}</Typography>;
        }

        if (history.length === 0) {
            return (
                <Paper elevation={1}>
                    <Stack alignItems="center" spacing={1} sx={{py: 5, px: 2}}>
                        <HistoryIcon color="disabled" sx={{fontSize: 48}}/>
                        <Typography color="text.secondary" align="center">
                            {t("history.empty")}
                        </Typography>
                    </Stack>
                </Paper>
            );
        }

        return (
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))"},
                    gap: 1.25,
                }}
            >
                {history.map(entry => {
                    return (
                        <HistoryEntryRow
                            key={entry.cleanId}
                            entry={entry}
                            onOpenMap={setSelectedEntry}
                        />
                    );
                })}
            </Box>
        );
    }, [history, isPending, isError, t]);

    return (
        <Container maxWidth="lg" sx={{py: {xs: 1.5, sm: 3}, px: {xs: 1.5, sm: 3}}}>
            <Stack spacing={3}>
                <HistoryTotals/>
                <Box>
                    <Typography variant="h6" component="h2" sx={{mb: 1.25}}>
                        {t("history.listTitle")}
                    </Typography>
                    {list}
                </Box>
            </Stack>
            <MapDialog
                entry={selectedEntry}
                onClose={() => {
                    setSelectedEntry(null);
                }}
            />
        </Container>
    );
};

export default History;
