import React, {FunctionComponent} from "react";
import {Button, Collapse, LinearProgress, TextField, Typography} from "@mui/material";
import {
    Capability,
    useVoicePackManagementMutation,
    useVoicePackManagementStateQuery,
    VoicePackManagementCommand
} from "../../api";
import {useCapabilitiesSupported} from "../../CapabilitiesProvider";
import {CapabilityItem} from "./CapabilityLayout";
import {useTranslation} from "react-i18next";

const VoicePackControl: FunctionComponent = () => {
    const {t} = useTranslation();
    const {
        data: voicePack,
        isFetching: voicePackFetching,
        isError: voicePackError,
        refetch: voicePackRefetch,
    } = useVoicePackManagementStateQuery();

    const [url, setUrl] = React.useState("");
    const [languageCode, setLanguageCode] = React.useState("");
    const [hash, setHash] = React.useState("");

    const {mutate: sendVoicePackCommand, isPending: voicePackMutating} = useVoicePackManagementMutation();

    const intervalRef = React.useRef<any>(undefined);
    React.useEffect(() => {
        const operationType = voicePack?.operationStatus.type;
        if (operationType === "downloading" || operationType === "installing") {
            intervalRef.current = setInterval(() => {
                return voicePackRefetch();
            }, 1000);
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [voicePack, voicePackRefetch]);

    const voicePackContent = React.useMemo(() => {
        if (voicePackError) {
            return (
                <Typography color="error">
                    {t("robot.capabilities.voicePack.loadError")}
                </Typography>
            );
        }

        const statusType = voicePack?.operationStatus.type;
        const isError = statusType === "error";
        const isDownloading = statusType === "downloading";
        const isInstalling = statusType === "installing";
        const isWorking = isDownloading || isInstalling;
        const commandDisabled = !voicePack || isDownloading || isInstalling;
        const progressValue = voicePack?.operationStatus.progress;
        const progressVariant = progressValue ? "determinate" : "indeterminate";

        return (
            <>
                <Typography variant="body1" sx={{mb: 1}}>
                    {t("robot.capabilities.voicePack.currentLanguage", {language: voicePack?.currentLanguage})}
                </Typography>
                {isError && (
                    <Typography color="error">
                        {t("robot.capabilities.voicePack.installError")}
                    </Typography>
                )}
                <Collapse in={isWorking}>
                    <Typography variant="subtitle1">
                        {isDownloading ? t("robot.capabilities.voicePack.downloading") : t("robot.capabilities.voicePack.installing")}
                    </Typography>
                    <LinearProgress color={isDownloading ? "success" : "secondary"} variant={progressVariant} value={progressValue} sx={{mb: 1}}/>
                </Collapse>

                <TextField label={t("robot.capabilities.voicePack.url")} value={url} onChange={(e) => {
                    setUrl(e.target.value);
                }} variant="standard" placeholder="https://" disabled={commandDisabled} fullWidth sx={{mb: 0.3}}/>
                <TextField label={t("robot.capabilities.voicePack.languageCode")} value={languageCode} onChange={(e) => {
                    setLanguageCode(e.target.value);
                }} variant="standard" placeholder="VA" disabled={commandDisabled} fullWidth sx={{mb: 0.3}}/>
                <TextField label={t("robot.capabilities.voicePack.hash")} value={hash} onChange={(e) => {
                    setHash(e.target.value);
                }} variant="standard" disabled={commandDisabled} fullWidth sx={{mb: 1}}/>

                <Button loading={voicePackMutating || commandDisabled}
                    loadingPosition="center"
                    variant="outlined"
                    onClick={() => {
                        const command: VoicePackManagementCommand = {
                            action: "download",
                            url: url,
                            hash: hash,
                            language: languageCode
                        };
                        sendVoicePackCommand(command);
                    }}>
                    {t("robot.capabilities.voicePack.set")}
                </Button>
            </>
        );
    }, [sendVoicePackCommand, voicePack, voicePackError, voicePackMutating, hash, languageCode, url, t]);

    const loading = voicePackFetching || voicePackMutating || !voicePack;
    return (
        <CapabilityItem
            title={t("robot.capabilities.voicePack.title")}
            loading={loading}
            helpText={t("help.voicepack")}
        >
            {voicePackContent}
        </CapabilityItem>
    );
};

const VoicePackManagement: FunctionComponent = () => {
    const [voicePackManagement] = useCapabilitiesSupported(Capability.VoicePackManagement);
    if (!voicePackManagement) {
        return null;
    }

    return <VoicePackControl/>;
};

export default VoicePackManagement;
