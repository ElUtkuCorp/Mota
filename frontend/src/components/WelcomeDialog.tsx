import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Link,
    Paper,
    Typography
} from "@mui/material";
import React, {FunctionComponent} from "react";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {Capability, useBasicControlMutation, useDismissWelcomeDialogMutation} from "../api";
import {MappingPassButtonItem, PersistentMapSwitchListItem} from "../options/MapManagement";
import {ButtonListMenuItem} from "./list_menu/ButtonListMenuItem";
import {
    Layers as MappingPassIcon
} from "@mui/icons-material";
import {Trans, useTranslation} from "react-i18next";

const FullCleanupButtonItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        mutate: executeBasicControlCommand,
        isPending: basicControlIsExecuting
    } = useBasicControlMutation();

    return (
        <ButtonListMenuItem
            primaryLabel={t("welcome.fullCleanup.title")}
            secondaryLabel={t("welcome.fullCleanup.description")}
            icon={<MappingPassIcon/>}
            buttonLabel={t("welcome.fullCleanup.button")}
            confirmationDialog={{
                title: t("welcome.fullCleanup.confirmTitle"),
                body: t("welcome.fullCleanup.confirmBody")
            }}
            action={() => {
                executeBasicControlCommand("start");
            }}
            actionLoading={basicControlIsExecuting}
        />
    );
};

const WelcomeDialog: FunctionComponent<{open: boolean, hide: () => void}> = ({
    open,
    hide
}): React.ReactElement => {
    const {t} = useTranslation();
    const [
        basicControlSupported,
        persistentMapControlSupported,
        mappingPassSupported
    ] = useCapabilitiesSupported(
        Capability.BasicControl,
        Capability.PersistentMapControl,
        Capability.MappingPass
    );
    const {
        mutate: dismissWelcomeDialog,
    } = useDismissWelcomeDialogMutation();

    return (
        <Dialog
            open={open}
        >
            <DialogTitle>
                {t("welcome.title")}
            </DialogTitle>
            <DialogContent>
                <DialogContentText
                    style={{
                        whiteSpace: "pre-wrap"
                    }}
                    component="span"
                >
                    <Typography>
                        {t("welcome.firstTime")}
                    </Typography>
                    <br/>
                    <Typography>
                        {t("welcome.firstStep")}
                        <br/><br/>
                        {t("welcome.variations")}
                    </Typography>
                    <br/>
                    <Typography component="span">
                        {t("welcome.checklistIntro")}
                        <ul>
                            <li>{t("welcome.checklist.docked")}</li>
                            <li>{t("welcome.checklist.doors")}</li>
                            <li>{t("welcome.checklist.cables")}</li>
                            <li>{t("welcome.checklist.blocked")}</li>
                        </ul>
                        {t("welcome.checklistOutro")}
                    </Typography>
                    {
                        persistentMapControlSupported &&
                        (
                            <Paper
                                elevation={2}
                                sx={{marginTop: "1rem"}}
                            >
                                <PersistentMapSwitchListItem/>
                            </Paper>
                        )
                    }
                    {
                        mappingPassSupported &&
                        (
                            <Paper
                                elevation={2}
                                sx={{marginTop: "1rem"}}
                            >
                                <MappingPassButtonItem/>
                            </Paper>
                        )
                    }
                    {
                        basicControlSupported &&
                        !mappingPassSupported &&
                        (
                            <Paper
                                elevation={2}
                                sx={{marginTop: "1rem"}}
                            >
                                <FullCleanupButtonItem/>
                            </Paper>
                        )
                    }
                    <br/>
                    <Typography>
                        <Trans
                            i18nKey="welcome.donate"
                            components={{
                                donateLink: <Link href="https://github.com/sponsors/Hypfer" target="_blank" rel="noopener"/>
                            }}
                        />
                        <br/><br/>
                        {t("welcome.enjoy")}
                    </Typography>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    hide();
                }}>
                    {t("welcome.hide")}
                </Button>
                <Button onClick={() => {
                    dismissWelcomeDialog();
                }}>
                    {t("welcome.doNotShowAgain")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WelcomeDialog;
