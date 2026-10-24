import {
    Box,
    Button,
    ButtonGroup,
    DialogContentText,
    Grid2,
    Paper,
    Skeleton,
    Typography,
} from "@mui/material";
import {
    BasicControlCommand,
    StatusState,
    useBasicControlMutation,
    useRobotStatusQuery,
} from "../api";
import {
    Home as HomeIcon,
    Pause as PauseIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
    SvgIconComponent,
} from "@mui/icons-material";
import React from "react";
import ConfirmationDialog from "../components/ConfirmationDialog";
import {usePendingMapAction} from "../map/BaseMap";
import {useTranslation} from "react-i18next";

const StartStates: StatusState["value"][] = ["idle", "docked", "paused", "error"];
const PauseStates: StatusState["value"][] = ["cleaning", "returning", "moving"];

interface CommandButton {
    command: BasicControlCommand;
    enabled: boolean;
    label: string;
    Icon: SvgIconComponent;
}

const BasicControls = (): React.ReactElement => {
    const {t} = useTranslation();
    const [startConfirmationDialogOpen, setStartConfirmationDialogOpen] = React.useState(false);
    const { data: status, isPending: statusPending } = useRobotStatusQuery();
    const {
        mutate: executeBasicControlCommand,
        isPending: basicControlIsExecuting
    } = useBasicControlMutation();

    const {
        hasPendingMapAction: hasPendingMapAction
    } = usePendingMapAction();

    const isPending = basicControlIsExecuting;

    const sendCommand = (command: BasicControlCommand) => {
        if (command === "start" && hasPendingMapAction) {
            setStartConfirmationDialogOpen(true);
        } else {
            executeBasicControlCommand(command);
        }
    };

    if (statusPending) {
        return (
            <Grid2>
                <Paper>
                    <Box p={1}>
                        <Skeleton height="4rem" />
                    </Box>
                </Paper>
            </Grid2>
        );
    }

    if (status === undefined) {
        return (
            <Grid2>
                <Paper>
                    <Box p={1}>
                        <Typography color="error">{t("controls.basic.loadError")}</Typography>
                    </Box>
                </Paper>
            </Grid2>
        );
    }

    const { flag, value: state } = status;

    const buttons: CommandButton[] = [
        {
            command: "start",
            enabled: StartStates.includes(state),
            label: flag === "resumable" ? t("controls.basic.resume") : t("controls.basic.start"),
            Icon: StartIcon,
        },
        {
            command: "pause",
            enabled: PauseStates.includes(state),
            Icon: PauseIcon,
            label: t("controls.basic.pause"),
        },
        {
            command: "stop",
            enabled: flag === "resumable" || (state !== "idle" && state !== "docked"),
            Icon: StopIcon,
            label: t("controls.basic.stop"),
        },
        {
            command: "home",
            enabled: state === "idle" || state === "error" || state === "paused",
            Icon: HomeIcon,
            label: t("controls.basic.home"),
        },
    ];

    return (
        <>
            <Grid2>
                <Paper>
                    <Box p={1.5}>
                        <Grid2 container direction="column">
                            <Grid2>
                                <ButtonGroup
                                    fullWidth
                                    variant="outlined"
                                >
                                    {buttons.map(({ label, command, enabled, Icon }) => {
                                        return (

                                            <Button
                                                key={command}
                                                variant="outlined"
                                                size="medium"
                                                disabled={!enabled || isPending}
                                                onClick={() => {
                                                    sendCommand(command);
                                                }}
                                                color="inherit"
                                                title={label}
                                                aria-label={label}
                                                style={{height: "3.5em", borderColor: "inherit"}}
                                            >
                                                <Icon />
                                            </Button>
                                        );
                                    })}
                                </ButtonGroup >
                            </Grid2>
                        </Grid2>
                    </Box>
                </Paper>
            </Grid2>

            <ConfirmationDialog
                title={t("controls.basic.fullCleanupConfirmTitle")}
                open={startConfirmationDialogOpen}
                onClose={() => {
                    setStartConfirmationDialogOpen(false);
                }}
                onAccept={() => {
                    executeBasicControlCommand("start");
                }}>
                <DialogContentText>
                    {t("controls.basic.pendingMapAction")}
                    <br/>
                    <br/>
                    <strong>{t("controls.basic.hint")}</strong>
                    <br/>
                    {t("controls.basic.hintText")}
                </DialogContentText>
            </ConfirmationDialog>
        </>
    );
};

export default BasicControls;
