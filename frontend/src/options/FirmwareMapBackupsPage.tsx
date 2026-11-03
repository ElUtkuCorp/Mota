import React from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    Paper,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import {useTranslation} from "react-i18next";
import {
    getMotaFirmwareMapBackupDownloadUrl,
    MotaFirmwareMapBackup,
    useMotaFirmwareMapBackupDeleteMutation,
    useMotaFirmwareMapBackupRestoreMutation,
    useMotaFirmwareMapBackupSaveMutation,
    useMotaFirmwareMapBackupsAutoMutation,
    useMotaFirmwareMapBackupsQuery,
} from "../api";
import PaperContainer from "../components/PaperContainer";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {DISPLAY_LOCALE} from "../i18n";
import {convertBytesToHumans} from "../utils";

/**
 * Mota: copias del mapa que usa el firmware (carto_slam.data y resume_data.info, comprimidos en el robot). Se pueden
 * guardar a mano o automáticamente, descargar al PC, restaurar (con reinicio del robot) y borrar.
 */

const formatDate = (iso: string): string => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return iso;
    }

    return date.toLocaleString(DISPLAY_LOCALE, {dateStyle: "medium", timeStyle: "short"});
};

const BackupRow: React.FunctionComponent<{
    backup: MotaFirmwareMapBackup,
    canRestore: boolean,
    busy: boolean,
    onRestore: () => void,
    onDelete: () => void
}> = ({backup, canRestore, busy, onRestore, onDelete}): React.ReactElement => {
    const {t} = useTranslation();

    const details = [
        t(`firmwareMapBackups.reason.${backup.reason}`, {defaultValue: backup.reason}),
        convertBytesToHumans(backup.sizeBytes),
    ];
    if (backup.roomCount !== null) {
        details.push(t("firmwareMapBackups.rooms", {count: backup.roomCount}));
    }

    return (
        <Paper elevation={1} sx={{p: 1.5}}>
            <Stack spacing={1}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{fontWeight: 600}}>{formatDate(backup.createdAt)}</Typography>
                        {backup.isActive && (
                            <Chip size="small" color="success" variant="outlined" label={t("firmwareMapBackups.active")}/>
                        )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        {details.join(" · ")}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                        size="small"
                        variant="contained"
                        component="a"
                        href={getMotaFirmwareMapBackupDownloadUrl(backup.id)}
                        download
                    >
                        {t("firmwareMapBackups.download")}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={busy || !canRestore || backup.isActive}
                        onClick={onRestore}
                    >
                        {t("firmwareMapBackups.restore")}
                    </Button>
                    <Button size="small" color="error" disabled={busy} onClick={onDelete}>
                        {t("firmwareMapBackups.delete")}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
};

const FirmwareMapBackupsPage = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data, isPending, isError} = useMotaFirmwareMapBackupsQuery();
    const {mutate: setAuto, isPending: autoPending} = useMotaFirmwareMapBackupsAutoMutation();
    const {mutate: saveBackup, isPending: savePending} = useMotaFirmwareMapBackupSaveMutation();
    const {mutate: deleteBackup, isPending: deletePending} = useMotaFirmwareMapBackupDeleteMutation();
    const {
        mutate: restoreBackup,
        isPending: restorePending,
        isSuccess: restoreRequested
    } = useMotaFirmwareMapBackupRestoreMutation();

    const [autoConfirmOpen, setAutoConfirmOpen] = React.useState(false);
    const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false);
    const [toRestore, setToRestore] = React.useState<MotaFirmwareMapBackup | null>(null);
    const [toDelete, setToDelete] = React.useState<MotaFirmwareMapBackup | null>(null);

    const restoring = restorePending || restoreRequested || data?.restoring === true;
    const busy = deletePending || savePending || restoring;

    let body: React.ReactElement;
    if (isPending) {
        body = <CircularProgress sx={{alignSelf: "center"}}/>;
    } else if (isError || !data) {
        body = <Typography color="error">{t("firmwareMapBackups.loadError")}</Typography>;
    } else if (data.copies.length === 0) {
        body = <Typography color="text.secondary">{t("firmwareMapBackups.empty")}</Typography>;
    } else {
        body = (
            <Stack spacing={1.25}>
                {data.copies.map(backup => {
                    return (
                        <BackupRow
                            key={backup.id}
                            backup={backup}
                            canRestore={data.canRestore.ok}
                            busy={busy}
                            onRestore={() => {
                                setToRestore(backup);
                            }}
                            onDelete={() => {
                                setToDelete(backup);
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
                <Typography variant="h6">{t("firmwareMapBackups.title")}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {t("firmwareMapBackups.explanation", {count: data?.maxCopies ?? 3})}
                </Typography>
                <Alert severity="info">{t("firmwareMapBackups.downloadHint")}</Alert>

                {restoring && (
                    <Alert severity="warning">
                        {t("firmwareMapBackups.restoringNotice")}
                    </Alert>
                )}

                {data && (
                    <Stack spacing={1.5}>
                        <Box>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={data.autoEnabled}
                                        disabled={autoPending}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setAutoConfirmOpen(true);
                                            } else {
                                                setAuto(false);
                                            }
                                        }}
                                    />
                                }
                                label={t("firmwareMapBackups.auto")}
                            />
                            <Typography variant="body2" color="text.secondary">
                                {t("firmwareMapBackups.autoDescription")}
                            </Typography>
                        </Box>

                        <Box>
                            <Button
                                variant="outlined"
                                loading={savePending}
                                disabled={busy || !data.canBackup.ok}
                                onClick={() => {
                                    setSaveConfirmOpen(true);
                                }}
                            >
                                {t("firmwareMapBackups.saveNow")}
                            </Button>
                            {!data.canBackup.ok && data.canBackup.reason && (
                                <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                                    {data.canBackup.reason}
                                </Typography>
                            )}
                        </Box>

                        {!data.canRestore.ok && data.canRestore.reason && !restoring && (
                            <Alert severity="info">
                                {t("firmwareMapBackups.cannotRestore", {reason: data.canRestore.reason})}
                            </Alert>
                        )}
                    </Stack>
                )}

                {body}
            </Stack>

            <ConfirmationDialog
                title={t("firmwareMapBackups.autoConfirmTitle")}
                text={t("firmwareMapBackups.autoConfirmText", {count: data?.maxCopies ?? 3})}
                open={autoConfirmOpen}
                onClose={() => {
                    setAutoConfirmOpen(false);
                }}
                onAccept={() => {
                    setAuto(true);
                }}
            />
            <ConfirmationDialog
                title={t("firmwareMapBackups.saveConfirmTitle")}
                text={t("firmwareMapBackups.saveConfirmText", {count: data?.maxCopies ?? 3})}
                open={saveConfirmOpen}
                onClose={() => {
                    setSaveConfirmOpen(false);
                }}
                onAccept={() => {
                    saveBackup();
                }}
            />
            <ConfirmationDialog
                title={t("firmwareMapBackups.restoreConfirmTitle")}
                text={
                    toRestore ?
                        t("firmwareMapBackups.restoreConfirmText", {date: formatDate(toRestore.createdAt)}) :
                        ""
                }
                open={toRestore !== null}
                onClose={() => {
                    setToRestore(null);
                }}
                onAccept={() => {
                    if (toRestore) {
                        restoreBackup(toRestore.id);
                    }
                }}
            />
            <ConfirmationDialog
                title={t("firmwareMapBackups.deleteConfirmTitle")}
                text={t("firmwareMapBackups.deleteConfirmText")}
                open={toDelete !== null}
                onClose={() => {
                    setToDelete(null);
                }}
                onAccept={() => {
                    if (toDelete) {
                        deleteBackup(toDelete.id);
                    }
                }}
            />
        </PaperContainer>
    );
};

export default FirmwareMapBackupsPage;
