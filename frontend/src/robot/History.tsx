import React from "react";
import {
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid2,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import {
    AccessTime as DurationIcon,
    History as HistoryIcon,
    SquareFoot as AreaIcon,
    ZoomIn as ZoomInIcon,
} from "@mui/icons-material";
import {useTranslation} from "react-i18next";
import {
    getMotaCleanHistoryMapUrl,
    MotaCleanHistoryEntry,
    useMotaCleanHistoryQuery,
    useMotaCleanHistoryTotalsQuery,
} from "../api";
import PaperContainer from "../components/PaperContainer";
import {useIsMobileView} from "../hooks";
import {DISPLAY_LOCALE, formatNumber} from "../i18n";

const THUMBNAIL_SIZE = 96;

const oneDecimal = {minimumFractionDigits: 1, maximumFractionDigits: 1};

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

const TotalsItem: React.FunctionComponent<{ label: string, value: string | null, loading: boolean }> = ({
    label,
    value,
    loading
}): React.ReactElement => {
    return (
        <Grid2 size={{xs: 12, sm: 4}}>
            <Card sx={{height: "100%", boxShadow: 2}}>
                <CardContent>
                    <Typography sx={{fontSize: 14}} color="text.secondary" gutterBottom>
                        {label}
                    </Typography>
                    {
                        loading ?
                            <Skeleton height={"2rem"}/> :
                            <Typography variant="h5" component="div">
                                {value}
                            </Typography>
                    }
                </CardContent>
            </Card>
        </Grid2>
    );
};

const HistoryTotals = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: totals, isPending} = useMotaCleanHistoryTotalsQuery();
    const formatDuration = useFormatDuration();
    const formatArea = useFormatArea();

    return (
        <Grid2 container spacing={2}>
            <TotalsItem
                label={t("history.totals.count")}
                value={totals ? formatNumber(totals.count) : t("history.notAvailable")}
                loading={isPending}
            />
            <TotalsItem
                label={t("history.totals.time")}
                value={formatDuration(totals?.timeSeconds)}
                loading={isPending}
            />
            <TotalsItem
                label={t("history.totals.area")}
                value={formatArea(totals?.areaCm2)}
                loading={isPending}
            />
        </Grid2>
    );
};

const MapThumbnail: React.FunctionComponent<{ entry: MotaCleanHistoryEntry, alt: string }> = ({
    entry,
    alt
}): React.ReactElement => {
    const {t} = useTranslation();
    const [failed, setFailed] = React.useState(false);

    return (
        <Box
            sx={{
                width: THUMBNAIL_SIZE,
                height: THUMBNAIL_SIZE,
                flexShrink: 0,
                borderRadius: 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "action.hover",
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
                    <Typography variant="caption" color="text.secondary" align="center" sx={{px: 1}}>
                        {failed ? t("history.mapLoadError") : t("history.noMap")}
                    </Typography>
            }
        </Box>
    );
};

const HistoryEntryCard: React.FunctionComponent<{
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

    const content = (
        <Stack direction="row" spacing={2} alignItems="center" sx={{p: 1.5}}>
            <MapThumbnail entry={entry} alt={t("history.mapAlt", {title: title})}/>
            <Box sx={{minWidth: 0, flexGrow: 1}}>
                <Typography variant="subtitle1" sx={{fontWeight: 500}} noWrap>
                    {title}
                </Typography>
                <Stack direction="row" spacing={2} sx={{mt: 0.5, flexWrap: "wrap"}} useFlexGap>
                    <Stack direction="row" spacing={0.5} alignItems="center" title={t("history.duration")}>
                        <DurationIcon fontSize="small" color="action"/>
                        <Typography variant="body2" color="text.secondary">
                            {formatDuration(entry.durationSeconds)}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center" title={t("history.area")}>
                        <AreaIcon fontSize="small" color="action"/>
                        <Typography variant="body2" color="text.secondary">
                            {formatArea(entry.area)}
                        </Typography>
                    </Stack>
                </Stack>
            </Box>
            {entry.hasMap && <ZoomInIcon color="action" titleAccess={t("history.openMap")}/>}
        </Stack>
    );

    return (
        <Grid2 size={{xs: 12, md: 6}}>
            <Card sx={{boxShadow: 2, height: "100%"}}>
                {
                    entry.hasMap ?
                        <CardActionArea
                            sx={{height: "100%"}}
                            onClick={() => {
                                onOpenMap(entry);
                            }}
                            aria-label={t("history.openMap")}
                        >
                            {content}
                        </CardActionArea> :
                        content
                }
            </Card>
        </Grid2>
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
                                        objectFit: "contain"
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
                <Stack alignItems="center" spacing={1} sx={{py: 4}}>
                    <HistoryIcon color="disabled" sx={{fontSize: 48}}/>
                    <Typography color="text.secondary" align="center">
                        {t("history.empty")}
                    </Typography>
                </Stack>
            );
        }

        return (
            <Grid2 container spacing={2}>
                {history.map(entry => {
                    return (
                        <HistoryEntryCard
                            key={entry.cleanId}
                            entry={entry}
                            onOpenMap={setSelectedEntry}
                        />
                    );
                })}
            </Grid2>
        );
    }, [history, isPending, isError, t]);

    return (
        <PaperContainer>
            <Stack spacing={3}>
                <HistoryTotals/>
                <Box>
                    <Typography variant="h6" gutterBottom>
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
        </PaperContainer>
    );
};

export default History;
