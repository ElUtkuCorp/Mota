import React from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {
    MotaMapVersion,
    useMotaMapVersionDeleteMutation,
    useMotaMapVersionMapQuery,
    useMotaMapVersionRestoreRoomsMutation,
    useMotaMapVersionSaveMutation,
    useMotaMapVersionsQuery,
    useMotaMapVersionsThresholdMutation,
} from "../api";
import PaperContainer from "../components/PaperContainer";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {MotaMapView} from "../map/StaticMap";
import {DISPLAY_LOCALE} from "../i18n";
import {useIsMobileView} from "../hooks";

/**
 * Mota: versiones del mapa (sustituye al guardián del mapa). Antes de cada limpieza Mota hace una foto del mapa; si
 * al terminar el mapa ha cambiado mucho, la foto de antes se guarda como versión. Aquí se pueden ver, guardar a mano,
 * recuperar sus habitaciones y borrar.
 */

const THRESHOLD_OPTIONS = [0, 95, 90, 85, 75, 60];

const formatDate = (iso: string): string => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString(DISPLAY_LOCALE, {dateStyle: "medium", timeStyle: "short"});
};

const VersionMapDialog: React.FunctionComponent<{
    version: MotaMapVersion | null,
    onClose: () => void
}> = ({version, onClose}): React.ReactElement => {
    const {t} = useTranslation();
    const mobileView = useIsMobileView();
    const {data: map, isPending, isError} = useMotaMapVersionMapQuery(version?.id);

    let content: React.ReactElement;
    if (isPending) {
        content = <CircularProgress/>;
    } else if (isError || !map) {
        content = <Typography color="error">{t("mapVersions.mapLoadError")}</Typography>;
    } else {
        content = (
            <Box sx={{width: "min(900px, 100%)"}}>
                <MotaMapView key={version?.id} rawMap={map} height={mobileView ? "70vh" : "72vh"}/>
            </Box>
        );
    }

    return (
        <Dialog open={version !== null} onClose={onClose} fullScreen={mobileView} maxWidth="lg">
            <DialogTitle>{version ? formatDate(version.createdAt) : ""}</DialogTitle>
            <DialogContent dividers>
                <Stack alignItems="center">{content}</Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("common.close")}</Button>
            </DialogActions>
        </Dialog>
    );
};

const VersionRow: React.FunctionComponent<{
    version: MotaMapVersion,
    onView: () => void,
    onRestore: () => void,
    onDelete: () => void,
    busy: boolean
}> = ({version, onView, onRestore, onDelete, busy}): React.ReactElement => {
    const {t} = useTranslation();

    let reason = t("mapVersions.reason.manual");
    if (version.reason === "first") {
        reason = t("mapVersions.reason.first");
    } else if (version.reason === "reset") {
        reason = t("mapVersions.reason.reset");
    } else if (version.reason === "changed") {
        reason = t("mapVersions.reason.changed", {similarity: version.similarity ?? "?"});
    }

    return (
        <Paper elevation={1} sx={{p: 1.5}}>
            <Stack spacing={1}>
                <Box>
                    <Typography sx={{fontWeight: 600}}>{formatDate(version.createdAt)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {reason} · {t("mapVersions.rooms", {count: version.roomCount})}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="contained" onClick={onView}>{t("mapVersions.view")}</Button>
                    <Button size="small" variant="outlined" disabled={busy || version.roomCount === 0} onClick={onRestore}>
                        {t("mapVersions.restoreRooms")}
                    </Button>
                    <Button size="small" color="error" disabled={busy} onClick={onDelete}>{t("mapVersions.delete")}</Button>
                </Stack>
            </Stack>
        </Paper>
    );
};

const MapVersionsPage = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data, isPending, isError} = useMotaMapVersionsQuery();
    const {mutate: setThreshold, isPending: thresholdPending} = useMotaMapVersionsThresholdMutation();
    const {mutate: saveVersion, isPending: savePending} = useMotaMapVersionSaveMutation();
    const {mutate: restoreRooms, isPending: restorePending} = useMotaMapVersionRestoreRoomsMutation();
    const {mutate: deleteVersion, isPending: deletePending} = useMotaMapVersionDeleteMutation();

    const [viewed, setViewed] = React.useState<MotaMapVersion | null>(null);
    const [toRestore, setToRestore] = React.useState<MotaMapVersion | null>(null);
    const [toDelete, setToDelete] = React.useState<MotaMapVersion | null>(null);

    const busy = restorePending || deletePending;

    let body: React.ReactElement;
    if (isPending) {
        body = <CircularProgress sx={{alignSelf: "center"}}/>;
    } else if (isError || !data) {
        body = <Typography color="error">{t("mapVersions.loadError")}</Typography>;
    } else if (data.versions.length === 0) {
        body = <Typography color="text.secondary">{t("mapVersions.empty")}</Typography>;
    } else {
        body = (
            <Stack spacing={1.25}>
                {data.versions.map(version => {
                    return (
                        <VersionRow
                            key={version.id}
                            version={version}
                            busy={busy}
                            onView={() => {
                                setViewed(version);
                            }}
                            onRestore={() => {
                                setToRestore(version);
                            }}
                            onDelete={() => {
                                setToDelete(version);
                            }}
                        />
                    );
                })}
            </Stack>
        );
    }

    return (
        <PaperContainer>
            <Stack spacing={2}>
                <Typography variant="h6">{t("mapVersions.title")}</Typography>
                <Typography variant="body2" color="text.secondary">{t("mapVersions.explanation")}</Typography>
                <Alert severity="info">{t("mapVersions.firmwareLimit")}</Alert>

                <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} alignItems={{xs: "stretch", sm: "center"}}>
                    <FormControl size="small" sx={{minWidth: 260}} disabled={!data || thresholdPending}>
                        <InputLabel id="mota-map-versions-threshold">{t("mapVersions.threshold")}</InputLabel>
                        <Select
                            labelId="mota-map-versions-threshold"
                            label={t("mapVersions.threshold")}
                            value={data?.threshold ?? ""}
                            onChange={(e) => {
                                setThreshold(Number(e.target.value));
                            }}
                        >
                            {THRESHOLD_OPTIONS.map(value => {
                                return (
                                    <MenuItem key={value} value={value}>
                                        {value === 0 ? t("mapVersions.thresholdOff") : t("mapVersions.thresholdValue", {value: value})}
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined"
                        disabled={savePending}
                        onClick={() => {
                            saveVersion();
                        }}
                    >
                        {t("mapVersions.saveNow")}
                    </Button>
                </Stack>

                {body}
            </Stack>

            <VersionMapDialog
                version={viewed}
                onClose={() => {
                    setViewed(null);
                }}
            />
            <ConfirmationDialog
                title={t("mapVersions.restoreConfirmTitle")}
                text={t("mapVersions.restoreConfirmText")}
                open={toRestore !== null}
                onClose={() => {
                    setToRestore(null);
                }}
                onAccept={() => {
                    if (toRestore) {
                        restoreRooms(toRestore.id);
                    }
                }}
            />
            <ConfirmationDialog
                title={t("mapVersions.deleteConfirmTitle")}
                open={toDelete !== null}
                onClose={() => {
                    setToDelete(null);
                }}
                onAccept={() => {
                    if (toDelete) {
                        deleteVersion(toDelete.id);
                    }
                }}
            />
        </PaperContainer>
    );
};

export default MapVersionsPage;
