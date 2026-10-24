import React, {FunctionComponent} from "react";
import {Button, Checkbox, FormControlLabel, Stack, TextField, Typography} from "@mui/material";
import {
    Capability,
    DoNotDisturbConfiguration,
    DoNotDisturbTime,
    useDoNotDisturbConfigurationQuery,
    useDoNotDisturbConfigurationMutation
} from "../../api";
import {useCapabilitiesSupported} from "../../CapabilitiesProvider";
import {deepCopy} from "../../utils";
import {CapabilityItem} from "./CapabilityLayout";
import {useTranslation} from "react-i18next";

const formatTime = (value: DoNotDisturbTime | undefined): string => {
    if (!value) {
        return "??:??";
    }
    return `${value.hour.toString().padStart(2, "0")}:${value.minute.toString().padStart(2, "0")}`;
};

const DoNotDisturbControl: FunctionComponent = () => {
    const {t} = useTranslation();
    const {
        data: dndConfiguration,
        isFetching: dndConfigurationFetching,
        isError: dndConfigurationError,
    } = useDoNotDisturbConfigurationQuery();

    const [editConfig, setEditConfig] = React.useState<null | DoNotDisturbConfiguration>(null);
    React.useEffect(() => {
        if (dndConfiguration) {
            setEditConfig(deepCopy(dndConfiguration));
        }
    }, [dndConfiguration]);

    const {
        mutate: updateDndConfiguration,
        isPending: dndConfigurationUpdating
    } = useDoNotDisturbConfigurationMutation();

    const startTimeValue = React.useMemo(() => {
        const date = new Date();
        date.setUTCHours(editConfig?.start.hour ?? 0, editConfig?.start.minute ?? 0, 0, 0);
        return date;
    }, [editConfig]);

    const endTimeValue = React.useMemo(() => {
        const date = new Date();
        date.setUTCHours(editConfig?.end.hour ?? 0, editConfig?.end.minute ?? 0, 0, 0);
        return date;
    }, [editConfig]);

    const dndConfigurationContent = React.useMemo(() => {
        if (dndConfigurationError) {
            return (
                <Typography color="error">
                    {t("robot.capabilities.dnd.loadError")}
                </Typography>
            );
        }

        return (
            <>
                <FormControlLabel control={<Checkbox checked={editConfig?.enabled || false} onChange={(e) => {
                    if (editConfig) {
                        const newConfig = deepCopy(editConfig);
                        newConfig.enabled = e.target.checked;
                        setEditConfig(newConfig);
                    }
                }}/>} label={t("robot.capabilities.dnd.enabled")}/>
                <Stack direction="row" spacing={1} sx={{mt: 1, mb: 1}}>
                    <TextField
                        label={t("robot.capabilities.dnd.startTime")}
                        type="time"
                        value={`${startTimeValue.getHours().toString().padStart(2, "0")}:${startTimeValue.getMinutes().toString().padStart(2, "0")}`}
                        InputLabelProps={{ shrink: true }}
                        disabled={!editConfig?.enabled || false}
                        onChange={(e) => {
                            if (editConfig && e.target.value) {
                                const [hours, minutes] = e.target.value.split(":").map(Number);
                                const date = new Date();
                                date.setHours(hours, minutes, 0, 0);
                                const newConfig = deepCopy(editConfig);
                                newConfig.start.hour = date.getUTCHours();
                                newConfig.start.minute = date.getUTCMinutes();
                                setEditConfig(newConfig);
                            }
                        }}
                    />
                    <TextField
                        label={t("robot.capabilities.dnd.endTime")}
                        type="time"
                        value={`${endTimeValue.getHours().toString().padStart(2, "0")}:${endTimeValue.getMinutes().toString().padStart(2, "0")}`}
                        InputLabelProps={{ shrink: true }}
                        disabled={!editConfig?.enabled || false}
                        onChange={(e) => {
                            if (editConfig && e.target.value) {
                                const [hours, minutes] = e.target.value.split(":").map(Number);
                                const date = new Date();
                                date.setHours(hours, minutes, 0, 0);
                                const newConfig = deepCopy(editConfig);
                                newConfig.end.hour = date.getUTCHours();
                                newConfig.end.minute = date.getUTCMinutes();
                                setEditConfig(newConfig);
                            }
                        }}
                    />
                </Stack>
                <Typography variant="subtitle2" color="textSecondary" sx={{mb: 2}}>
                    {t("robot.capabilities.dnd.utc", {start: formatTime(editConfig?.start), end: formatTime(editConfig?.end)})}
                </Typography>
                <Button loading={dndConfigurationUpdating} variant="outlined" color="success" onClick={() => {
                    if (editConfig) {
                        updateDndConfiguration(editConfig);
                    }
                }}>{t("robot.capabilities.dnd.apply")}</Button>
            </>
        );
    }, [editConfig, startTimeValue, endTimeValue, dndConfigurationError, dndConfigurationUpdating, updateDndConfiguration, t]);


    const loading = dndConfigurationUpdating || dndConfigurationFetching || !dndConfiguration;
    return (
        <CapabilityItem
            title={t("robot.capabilities.dnd.title")}
            loading={loading}
            helpText={t("help.doNotDisturb")}
        >
            {dndConfigurationContent}
        </CapabilityItem>
    );
};

const DoNotDisturb: FunctionComponent = () => {
    const [doNotDisturb] = useCapabilitiesSupported(Capability.DoNotDisturb);
    if (!doNotDisturb) {
        return null;
    }

    return <DoNotDisturbControl/>;
};

export default DoNotDisturb;
