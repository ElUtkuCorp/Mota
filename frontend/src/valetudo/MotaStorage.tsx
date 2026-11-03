import React from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControl,
    Grid2,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {MotaStorageStatus, useMotaStorageCleanupMutation, useMotaStorageQuery} from "../api";
import RatioBar from "../components/RatioBar";
import {useValetudoColorsInverse} from "../hooks/useValetudoColors";
import {useIsMobileView} from "../hooks";
import {convertBytesToHumans} from "../utils";
import {DISPLAY_LOCALE} from "../i18n";

/**
 * Mota: espacio en UDISK (la partición de datos del robot), qué lo ocupa y limpieza de los logs rotados del
 * fabricante. En el robot simulado no existe la API y la tarjeta no se muestra.
 */

const KEEP_OPTIONS = [1, 2, 3, 4, 5];
const DEFAULT_KEEP = 2;

const formatDate = (iso: string): string => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString(DISPLAY_LOCALE, {dateStyle: "medium", timeStyle: "short"});
};

const StorageBar: React.FunctionComponent<{ storage: MotaStorageStatus }> = ({storage}): React.ReactElement => {
    const {t} = useTranslation();
    const theme = useTheme();
    const palette = useValetudoColorsInverse();

    const {totalBytes, freeBytes, reserveBytes, parts} = storage;
    const used = Math.max(0, totalBytes - freeBytes);
    const known = parts.motaBinaries + parts.motaData + parts.mapBackups + parts.vendorLogs + parts.vendorMap;
    const other = Math.max(0, used - known);

    const partitions = [
        {key: "motaBinaries", value: parts.motaBinaries, color: palette.blue},
        {key: "motaData", value: parts.motaData, color: palette.teal},
        {key: "mapBackups", value: parts.mapBackups, color: palette.green},
        {key: "vendorLogs", value: parts.vendorLogs, color: palette.yellow},
        {key: "vendorMap", value: parts.vendorMap, color: palette.purple},
        {key: "other", value: other, color: palette.red},
    ].filter(part => {
        return part.value > 0;
    }).map(part => {
        return {
            label: t(`storage.parts.${part.key}`),
            value: part.value,
            valueLabel: convertBytesToHumans(part.value),
            color: part.color,
        };
    });

    // La reserva tiene que quedar libre: la marca está donde empieza, contando desde el final
    const reserveStart = totalBytes > 0 ? Math.max(0, Math.min(100, (totalBytes - reserveBytes) / totalBytes * 100)) : 100;

    return (
        <Box>
            <Box sx={{position: "relative", pt: "3px", pb: "3px"}}>
                <RatioBar
                    total={totalBytes}
                    totalLabel={convertBytesToHumans(totalBytes)}
                    partitions={partitions}
                    hideLegend
                />
                <Box
                    title={t("storage.reserveMark", {reserve: convertBytesToHumans(reserveBytes)})}
                    sx={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: `${reserveStart}%`,
                        width: "2px",
                        ml: "-1px",
                        backgroundColor: theme.palette.text.primary,
                    }}
                />
            </Box>
            <Typography variant="caption" color="textSecondary">
                {t("storage.reserveLegend", {reserve: convertBytesToHumans(reserveBytes)})}
            </Typography>
            <List dense disablePadding sx={{mt: 1}}>
                {partitions.map(part => {
                    return (
                        <ListItem key={part.label} disableGutters sx={{py: 0}}>
                            <Box component="span" sx={{color: part.color, mr: 1}}>●</Box>
                            <ListItemText primary={part.label}/>
                            <Typography variant="body2">{part.valueLabel}</Typography>
                        </ListItem>
                    );
                })}
                <ListItem disableGutters sx={{py: 0}}>
                    <Box component="span" sx={{color: "text.disabled", mr: 1}}>●</Box>
                    <ListItemText primary={t("storage.free")}/>
                    <Typography variant="body2">{convertBytesToHumans(freeBytes)}</Typography>
                </ListItem>
            </List>
        </Box>
    );
};

const CleanupDialog: React.FunctionComponent<{
    open: boolean,
    onClose: () => void,
    onCleaned: (freedBytes: number) => void
}> = ({open, onClose, onCleaned}): React.ReactElement => {
    const {t} = useTranslation();
    const mobileView = useIsMobileView();
    const [keep, setKeep] = React.useState(DEFAULT_KEEP);
    const {data, isFetching, isError} = useMotaStorageQuery(open ? keep : undefined);
    const {mutate: cleanup, isPending} = useMotaStorageCleanupMutation();

    // Mientras llega el plan del keep nuevo se ve el anterior: no se deja confirmar
    const plan = data?.cleanup;
    const planMatches = plan !== undefined && plan.keep === keep && !isFetching;

    let content: React.ReactNode;
    if (isError) {
        content = <Typography color="error">{t("storage.cleanup.loadError")}</Typography>;
    } else if (!plan) {
        content = <CircularProgress size={24}/>;
    } else if (plan.files.length === 0) {
        content = <Typography color="text.secondary">{t("storage.cleanup.nothing")}</Typography>;
    } else {
        content = (
            <>
                <Typography variant="body2" sx={{fontWeight: 600}}>
                    {t("storage.cleanup.summary", {count: plan.files.length, bytes: convertBytesToHumans(plan.bytes)})}
                </Typography>
                <List dense disablePadding sx={{maxHeight: 280, overflow: "auto", opacity: planMatches ? 1 : 0.5}}>
                    {plan.files.map(file => {
                        return (
                            <ListItem key={file.name} disableGutters>
                                <ListItemText
                                    primary={file.name}
                                    secondary={formatDate(file.modifiedAt)}
                                    slotProps={{primary: {sx: {wordBreak: "break-all"}}}}
                                />
                                <Typography variant="body2" sx={{ml: 1, whiteSpace: "nowrap"}}>
                                    {convertBytesToHumans(file.sizeBytes)}
                                </Typography>
                            </ListItem>
                        );
                    })}
                </List>
            </>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} fullScreen={mobileView} maxWidth="sm" fullWidth>
            <DialogTitle>{t("storage.cleanup.title")}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <DialogContentText sx={{whiteSpace: "pre-wrap"}}>
                        {t("storage.cleanup.explanation")}
                    </DialogContentText>
                    <FormControl size="small" sx={{maxWidth: 320}}>
                        <InputLabel id="mota-storage-cleanup-keep">{t("storage.cleanup.keep")}</InputLabel>
                        <Select
                            labelId="mota-storage-cleanup-keep"
                            label={t("storage.cleanup.keep")}
                            value={keep}
                            onChange={(e) => {
                                setKeep(Number(e.target.value));
                            }}
                        >
                            {KEEP_OPTIONS.map(value => {
                                return (
                                    <MenuItem key={value} value={value}>
                                        {t("storage.cleanup.keepValue", {count: value})}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                    {content}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("common.cancel")}</Button>
                <Button
                    color="error"
                    variant="contained"
                    loading={isPending}
                    disabled={!planMatches || plan === undefined || plan.files.length === 0}
                    onClick={() => {
                        cleanup(keep, {
                            onSuccess: (result) => {
                                onCleaned(result.freedBytes);
                                onClose();
                            }
                        });
                    }}
                >
                    {t("storage.cleanup.confirm", {count: plan?.files.length ?? 0})}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const MotaStorage = (): React.ReactElement | null => {
    const {t} = useTranslation();
    const {data: storage} = useMotaStorageQuery();
    const [cleanupOpen, setCleanupOpen] = React.useState(false);
    const [lastFreed, setLastFreed] = React.useState<number | null>(null);

    if (!storage) {
        return null;
    }

    const lowSpace = storage.freeBytes < storage.reserveBytes;

    return (
        <Grid2 style={{flexGrow: 1}}>
            <Card sx={{boxShadow: 3}}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {t("storage.title")}
                    </Typography>
                    <Divider/>
                    <Stack spacing={1.5} sx={{mt: 1.5}}>
                        <Typography variant="body2">
                            {t("storage.freeOfTotal", {
                                free: convertBytesToHumans(storage.freeBytes),
                                total: convertBytesToHumans(storage.totalBytes)
                            })}
                        </Typography>
                        <StorageBar storage={storage}/>
                        {lowSpace && (
                            <Alert severity="warning">
                                {t("storage.lowSpace", {reserve: convertBytesToHumans(storage.reserveBytes)})}
                            </Alert>
                        )}
                        {lastFreed !== null && (
                            <Alert
                                severity="success"
                                onClose={() => {
                                    setLastFreed(null);
                                }}
                            >
                                {t("storage.cleanup.done", {bytes: convertBytesToHumans(lastFreed)})}
                            </Alert>
                        )}
                        <Typography variant="body2" color="textSecondary">
                            {t("storage.cleanup.description", {
                                count: storage.cleanup.files.length,
                                bytes: convertBytesToHumans(storage.cleanup.bytes)
                            })}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setCleanupOpen(true);
                            }}
                            sx={{alignSelf: "flex-start"}}
                        >
                            {t("storage.cleanup.button")}
                        </Button>
                    </Stack>
                    <CleanupDialog
                        open={cleanupOpen}
                        onClose={() => {
                            setCleanupOpen(false);
                        }}
                        onCleaned={setLastFreed}
                    />
                </CardContent>
            </Card>
        </Grid2>
    );
};

export default MotaStorage;
