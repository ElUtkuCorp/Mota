import {Alert, AlertTitle, Box, Button, SxProps, Theme} from "@mui/material";
import React from "react";
import {useTranslation} from "react-i18next";
import {
    useMotaFirmwareMapBackupRestoreMutation,
    useMotaMapRecoveryMutation,
    useMotaMapRecoveryQuery
} from "../api";
import ConfirmationDialog from "../components/ConfirmationDialog";

// Mota: aviso de mapa temporal del firmware y botón para recuperar el mapa guardado
const MapRecoveryNotice: React.FunctionComponent<{ sx?: SxProps<Theme> }> = ({sx}): React.ReactElement | null => {
    const {t} = useTranslation();
    const {data: status} = useMotaMapRecoveryQuery();
    const {mutate: recoverMap, isPending} = useMotaMapRecoveryMutation();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    // Mota: restaurar la última copia del mapa del robot (reinicia el robot)
    const {
        mutate: restoreBackup,
        isPending: restorePending,
        isSuccess: restoreRequested
    } = useMotaFirmwareMapBackupRestoreMutation();
    const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
    const [resultDismissed, setResultDismissed] = React.useState(false);

    if (!status) {
        return null;
    }

    const backupId = status.backupAvailable ?? null;

    if (restoreRequested) {
        return (
            <Alert severity="info" sx={sx}>
                {t("home.mapRecovery.restoreRequested")}
            </Alert>
        );
    }

    const running = isPending || status.state !== "idle";
    const result = running ? null : status.result;

    if ((result === "recovered" || result === "home_failed") && !resultDismissed) {
        return (
            <Alert
                severity={result === "recovered" ? "success" : "error"}
                sx={sx}
                onClose={() => {
                    setResultDismissed(true);
                }}
            >
                {t(result === "recovered" ? "home.mapRecovery.recovered" : "home.mapRecovery.homeFailed")}
            </Alert>
        );
    }

    if (!status.temporaryMap && !running) {
        return null;
    }

    return (
        <>
            <Alert severity="warning" sx={sx}>
                <AlertTitle>{t("home.mapRecovery.title")}</AlertTitle>
                {running ? t("home.mapRecovery.running") : t("home.mapRecovery.body")}
                {result === "not_recovered" && <><br/>{t("home.mapRecovery.notRecovered")}</>}
                {!running && !status.docked && <><br/>{t("home.mapRecovery.needsDock")}</>}
                <Box sx={{mt: 1, display: "flex", gap: 1, flexWrap: "wrap"}}>
                    <Button
                        color="inherit"
                        size="small"
                        variant="outlined"
                        loading={running}
                        disabled={!status.docked}
                        onClick={() => {
                            setDialogOpen(true);
                        }}
                    >
                        {t("home.mapRecovery.button")}
                    </Button>
                    {backupId !== null && (
                        <Button
                            color="inherit"
                            size="small"
                            variant="outlined"
                            loading={restorePending}
                            disabled={!status.docked || running}
                            onClick={() => {
                                setRestoreDialogOpen(true);
                            }}
                        >
                            {t("home.mapRecovery.restoreBackupButton")}
                        </Button>
                    )}
                </Box>
            </Alert>
            <ConfirmationDialog
                title={t("home.mapRecovery.confirmTitle")}
                text={t("home.mapRecovery.confirmBody")}
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                }}
                onAccept={() => {
                    setResultDismissed(false);
                    recoverMap();
                }}
            />
            <ConfirmationDialog
                title={t("home.mapRecovery.restoreBackupConfirmTitle")}
                text={t("firmwareMapBackups.restoreConfirmTextLatest")}
                open={restoreDialogOpen}
                onClose={() => {
                    setRestoreDialogOpen(false);
                }}
                onAccept={() => {
                    if (backupId !== null) {
                        restoreBackup(backupId);
                    }
                }}
            />
        </>
    );
};

export default MapRecoveryNotice;
