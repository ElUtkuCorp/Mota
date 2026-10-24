import React, {FunctionComponent} from "react";
import {TimerPreActionControlProps} from "./types";
import {
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid2,
    InputLabel,
    MenuItem,
    Select,
    Typography
} from "@mui/material";
import {Capability, PresetSelectionState, usePresetSelectionsQuery} from "../../api";
import {getPresetFriendlyName, sortPresets} from "../../presetUtils";
import {useTranslation} from "react-i18next";


const PresetSelectionPreActionControl: FunctionComponent<{
    wasEnabled: boolean,
    params: Record<string, unknown>,
    setParams(valid: boolean, hasParams: boolean, newParams: Record<string, unknown>): void,

    capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl,
    label: string
}> = ({
    wasEnabled,
    params,
    setParams,

    capability,
    label
}) => {
    const {t} = useTranslation();
    const [enabled, setEnabled] = React.useState(wasEnabled);
    const [selectedPreset, setSelectedPreset] = React.useState<string>(params.value as string ?? "");

    const {
        isPending: presetsPending,
        isError: presetLoadError,
        data: presets,
    } = usePresetSelectionsQuery(capability);

    const filteredPresets = React.useMemo(() => {
        return sortPresets(
            presets?.filter(
                (x): x is Exclude<PresetSelectionState["value"], "custom"> => {
                    return x !== "custom";
                }
            ) ?? []
        );
    }, [presets]);

    const presetMenuItems = React.useMemo(() => {
        return filteredPresets.map((preset) => {
            return (
                <MenuItem key={preset} value={preset}>
                    {getPresetFriendlyName(capability, preset)}
                </MenuItem>
            );
        });
    }, [filteredPresets, capability]);


    if (presetsPending) {
        return (
            <Grid2>
                <CircularProgress size={20} />
            </Grid2>
        );
    }

    if (presetLoadError) {
        return (
            <Grid2>
                <Typography color="error">{t("controls.presets.loadError", {capability: capability})}</Typography>
            </Grid2>
        );
    }

    return (
        <Grid2
            container
            direction="row"
            sx={{
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem"
            }}
        >
            <Grid2 sx={{minWidth: "9rem"}}>
                <FormControlLabel
                    sx={{userSelect: "none"}}
                    control={
                        <Checkbox
                            checked={enabled}
                            onChange={(e) => {
                                setEnabled(e.target.checked);

                                setParams(
                                    e.target.checked,
                                    //@ts-ignore
                                    filteredPresets.includes(selectedPreset),
                                    {value: selectedPreset}
                                );
                            }}
                        />
                    }
                    label={label}
                />
            </Grid2>
            <Grid2 sx={{flexGrow: 1, marginLeft: "1rem"}}>
                <FormControl sx={{width: "100%"}}>
                    <InputLabel id={"FanSpeedControlPreActionControl_presets_label"}>{t("timers.preset")}</InputLabel>
                    <Select
                        labelId={"FanSpeedControlPreActionControl_presets_label"}
                        id={"FanSpeedControlPreActionControl_presets-select"}
                        label={t("timers.preset")}
                        value={selectedPreset}
                        onChange={(e) => {
                            setSelectedPreset(e.target.value);

                            setParams(
                                enabled,
                                //@ts-ignore
                                filteredPresets.includes(e.target.value),
                                {value: e.target.value}
                            );
                        }}
                    >
                        {presetMenuItems}
                    </Select>
                </FormControl>
            </Grid2>
        </Grid2>
    );
};

export const FanSpeedControlPreActionControl: FunctionComponent<TimerPreActionControlProps> = ({
    wasEnabled,
    params,
    setParams
}) => {
    const {t} = useTranslation();

    return (
        <PresetSelectionPreActionControl
            wasEnabled={wasEnabled}
            params={params}
            setParams={setParams}

            capability={Capability.FanSpeedControl}
            label={t("timers.preActions.fanSpeed")}
        />
    );
};

export const WaterUsageControlPreActionControl: FunctionComponent<TimerPreActionControlProps> = ({
    wasEnabled,
    params,
    setParams
}) => {
    const {t} = useTranslation();

    return (
        <PresetSelectionPreActionControl
            wasEnabled={wasEnabled}
            params={params}
            setParams={setParams}

            capability={Capability.WaterUsageControl}
            label={t("timers.preActions.waterUsage")}
        />
    );
};

export const OperationModeControlPreActionControl: FunctionComponent<TimerPreActionControlProps> = ({
    wasEnabled,
    params,
    setParams
}) => {
    const {t} = useTranslation();

    return (
        <PresetSelectionPreActionControl
            wasEnabled={wasEnabled}
            params={params}
            setParams={setParams}

            capability={Capability.OperationModeControl}
            label={t("timers.preActions.operationMode")}
        />
    );
};
