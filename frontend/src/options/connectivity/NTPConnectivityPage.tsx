import {
    Box,
    Button,
    Checkbox,
    Divider,
    FormControlLabel,
    Grid2,
    Skeleton,
    TextField,
    Typography,
} from "@mui/material";
import React from "react";
import {
    NTPClientStatus,
    useNTPClientConfigurationMutation,
    useNTPClientConfigurationQuery,
    useNTPClientStatusQuery
} from "../../api";

import {
    AccessTime as NTPIcon,
    Sync as SyncEnabledIcon,
    SyncDisabled as SyncDisabledIcon,
    SyncLock as SyncSuccessfulIcon,
    SyncProblem as SyncErrorIcon
} from "@mui/icons-material";
import InfoBox from "../../components/InfoBox";
import PaperContainer from "../../components/PaperContainer";
import DetailPageHeaderRow from "../../components/DetailPageHeaderRow";
import {extractHostFromUrl} from "../../utils";
import {useTranslation} from "react-i18next";
import {formatNumber} from "../../i18n";
import {formatDateTime} from "../../utils";

const formatRobotTime = (robotTime: string): string => {
    const date = new Date(robotTime);

    return isNaN(date.getTime()) ? robotTime : formatDateTime(date);
};

const NTPClientStatusComponent: React.FunctionComponent<{
    status: NTPClientStatus | undefined,
    statusLoading: boolean,
    stateError: boolean
}> = ({
    status,
    statusLoading,
    stateError
}) => {
    const {t} = useTranslation();

    if (statusLoading || !status) {
        return (
            <Skeleton height={"8rem"}/>
        );
    }

    if (stateError) {
        return <Typography color="error">{t("options.ntp.stateLoadError")}</Typography>;
    }

    const getIconForState = (): React.ReactElement => {
        switch (status.state.__class) {
            case "ValetudoNTPClientEnabledState":
                return <SyncEnabledIcon sx={{fontSize: "4rem"}}/>;
            case "ValetudoNTPClientDisabledState":
                return <SyncDisabledIcon sx={{fontSize: "4rem"}}/>;
            case "ValetudoNTPClientSyncedState":
                return <SyncSuccessfulIcon sx={{fontSize: "4rem"}}/>;
            case "ValetudoNTPClientErrorState":
                return <SyncErrorIcon sx={{fontSize: "4rem"}}/>;
        }
    };

    const getContentForState = (): React.ReactElement | undefined => {
        switch (status.state.__class) {
            case "ValetudoNTPClientErrorState":
                return (
                    <>
                        <Typography variant="h5" color="red">{t("options.ntp.errorState", {type: status.state.type})}</Typography>
                        <Typography color="red">{status.state.message}</Typography>
                    </>
                );
            case "ValetudoNTPClientEnabledState":
                return (
                    <Typography variant="h5">{t("options.ntp.syncEnabled")}</Typography>
                );
            case "ValetudoNTPClientDisabledState":
                return (
                    <Typography variant="h5">{t("options.ntp.syncDisabled")}</Typography>
                );
            case "ValetudoNTPClientSyncedState":
                return (
                    <>
                        <Typography variant="h5">{t("options.ntp.syncSuccessful")}</Typography>
                        <Typography>{t("options.ntp.offset", {offset: status.state.offset !== undefined ? formatNumber(status.state.offset) : "?"})}</Typography>
                    </>
                );
        }
    };


    return (
        <Grid2 container alignItems="center" direction="column" style={{paddingBottom: "1rem"}}>
            <Grid2 style={{marginTop: "1rem"}}>
                {getIconForState()}
            </Grid2>
            <Grid2
                sx={{
                    maxWidth: "100% !important", //Why, MUI? Why?
                    wordWrap: "break-word",
                    textAlign: "center",
                    userSelect: "none"
                }}
            >
                {getContentForState()}
            </Grid2>
            <Grid2
                sx={{
                    maxWidth: "100% !important", //Why, MUI? Why?
                    wordWrap: "break-word",
                    textAlign: "center",
                    userSelect: "none",
                    marginTop: "0.5rem"
                }}
            >
                {t("options.ntp.robotTime", {time: formatRobotTime(status.robotTime)})}
            </Grid2>
        </Grid2>
    );
};

const NTPConnectivity = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: ntpClientStatus,
        isPending: ntpClientStatusPending,
        isError: ntpClientStatusError,
    } = useNTPClientStatusQuery();

    const {
        data: ntpClientConfig,
        isPending: ntpClientConfigPending,
        isError: ntpClientConfigError,
    } = useNTPClientConfigurationQuery();

    const {mutate: updateConfiguration, isPending: configurationUpdating} = useNTPClientConfigurationMutation();

    const [enabled, setEnabled] = React.useState(false);
    const [server, setServer] = React.useState("");
    const [port, setPort] = React.useState(0);
    const [ntpInterval, setNtpInterval] = React.useState(0);
    const [ntpTimeout, setNtpTimeout] = React.useState(0);

    const [configurationModified, setConfigurationModified] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (ntpClientConfig) {
            setEnabled(ntpClientConfig.enabled);
            setServer(ntpClientConfig.server);
            setPort(ntpClientConfig.port);
            setNtpInterval(ntpClientConfig.interval);
            setNtpTimeout(ntpClientConfig.timeout);
        }
    }, [ntpClientConfig]);

    if (ntpClientStatusPending || ntpClientConfigPending) {
        return (
            <Skeleton height={"8rem"}/>
        );
    }

    if (ntpClientStatusError || ntpClientConfigError || !ntpClientStatus || !ntpClientConfig) {
        return <Typography color="error">{t("options.ntp.configLoadError")}</Typography>;
    }

    return (
        <>
            <NTPClientStatusComponent
                status={ntpClientStatus}
                statusLoading={ntpClientStatusPending}
                stateError={ntpClientStatusError}
            />
            <Divider sx={{mt: 1}} style={{marginBottom: "1rem"}}/>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={enabled}
                        onChange={e => {
                            setEnabled(e.target.checked);
                            setConfigurationModified(true);
                        }}
                    />
                }
                label={t("options.ntp.enabled")}
                sx={{mb: 1}}
            />
            <Grid2 container spacing={1} sx={{mb: 2}}>
                <Grid2 style={{flexGrow: 1}}>
                    <TextField
                        style={{width: "100%"}}
                        label={t("options.ntp.server")}
                        value={server}
                        disabled={!enabled}
                        variant="standard"
                        onChange={e => {
                            setServer(extractHostFromUrl(e.target.value));
                            setConfigurationModified(true);
                        }}
                    />
                </Grid2>
                <Grid2 style={{flexGrow: 1}}>
                    <TextField
                        style={{width: "100%"}}
                        label={t("options.ntp.port")}
                        value={port}
                        disabled={!enabled}
                        type="number"
                        inputProps={{min: 1, max: 65535}}
                        variant="standard"
                        onChange={e => {
                            setPort(parseInt(e.target.value));
                            setConfigurationModified(true);
                        }}
                    />
                </Grid2>
                <Grid2 style={{flexGrow: 1}}>
                    <TextField
                        style={{width: "100%"}}
                        label={t("options.ntp.interval")}
                        value={ntpInterval / 3_600_000}
                        sx={{minWidth: 100}}
                        disabled={!enabled}
                        type="number"
                        inputProps={{min: 1, max: 24}}
                        variant="standard"
                        onChange={e => {
                            setNtpInterval(3_600_000 * parseInt(e.target.value));
                            setConfigurationModified(true);
                        }}
                    />
                </Grid2>
                <Grid2 style={{flexGrow: 1}}>
                    <TextField
                        style={{width: "100%"}}
                        label={t("options.ntp.timeout")}
                        value={ntpTimeout / 1000}
                        sx={{minWidth: 150}}
                        disabled={!enabled}
                        type="number"
                        inputProps={{min: 5, max: 60}}
                        variant="standard"
                        onChange={e => {
                            setNtpTimeout(1000 * parseInt(e.target.value));
                            setConfigurationModified(true);
                        }}
                    />
                </Grid2>
            </Grid2>

            <InfoBox
                boxShadow={5}
                style={{
                    marginTop: "3rem",
                    marginBottom: "2rem"
                }}
            >
                <Typography color="info">
                    {t("options.ntp.info")}
                </Typography>
            </InfoBox>

            <Divider sx={{mt: 1}} style={{marginBottom: "1rem"}}/>
            <Grid2 container>
                <Grid2 style={{marginLeft: "auto"}}>
                    <Button
                        loading={configurationUpdating}
                        color="primary"
                        variant="outlined"
                        disabled={!configurationModified}
                        onClick={() => {
                            updateConfiguration({
                                enabled: enabled,
                                server: server,
                                port: port,
                                interval: ntpInterval,
                                timeout: ntpTimeout
                            });
                            setConfigurationModified(false);
                        }}
                    >
                        {t("options.common.saveConfiguration")}
                    </Button>
                </Grid2>
            </Grid2>
        </>
    );
};

const NTPConnectivityPage = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        isFetching: ntpClientStatusFetching,
        refetch: refetchNtpClientState
    } = useNTPClientStatusQuery();

    return (
        <PaperContainer>
            <Grid2 container direction="row">
                <Box style={{width: "100%"}}>
                    <DetailPageHeaderRow
                        title={t("options.ntp.header")}
                        icon={<NTPIcon/>}
                        onRefreshClick={() => {
                            refetchNtpClientState().catch(() => {
                                /* intentional */
                            });
                        }}
                        isRefreshing={ntpClientStatusFetching}
                    />

                    <NTPConnectivity/>
                </Box>
            </Grid2>
        </PaperContainer>
    );
};

export default NTPConnectivityPage;
