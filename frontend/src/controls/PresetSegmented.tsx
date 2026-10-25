import {Box, CircularProgress, Skeleton, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import React from "react";
import {useTranslation} from "react-i18next";
import {
    Capability,
    capabilityToPresetType,
    PresetSelectionState,
    RobotAttributeClass,
    usePresetSelectionMutation,
    usePresetSelectionsQuery,
    useRobotAttributeQuery,
} from "../api";
import {getPresetFriendlyName, sortPresets} from "../presetUtils";
import {PanelSectionTitle} from "./PanelSection";

// Mota: control segmentado para una selección de preajustes (potencia, nivel de agua).
// Sustituye al deslizador: con 3 o 4 niveles se elige de un toque y se ve el valor actual.
const PresetSegmented: React.FunctionComponent<{
    capability: Capability.FanSpeedControl | Capability.WaterUsageControl,
    label: string
}> = ({
    capability,
    label
}): React.ReactElement => {
    const {t} = useTranslation();
    const labelId = `${capability}-segmented-label`;

    const {data: preset} = useRobotAttributeQuery(
        RobotAttributeClass.PresetSelectionState,
        (attributes) => {
            return attributes.filter((attribute) => {
                return attribute.type === capabilityToPresetType[capability];
            })[0];
        }
    );
    const {
        isPending: presetsPending,
        isError: presetLoadError,
        data: presets,
    } = usePresetSelectionsQuery(capability);
    const {
        mutate: selectPreset,
        isPending: selectPresetIsPending,
        variables: pendingPreset
    } = usePresetSelectionMutation(capability);

    const filteredPresets = React.useMemo(() => {
        return sortPresets(
            presets?.filter(
                (x): x is Exclude<PresetSelectionState["value"], "custom"> => {
                    return x !== "custom";
                }
            ) ?? []
        );
    }, [presets]);

    const value = selectPresetIsPending && pendingPreset ? pendingPreset : (preset?.value ?? null);

    let body: React.ReactElement;
    if (presetsPending) {
        body = <Skeleton variant="rounded" height={48} sx={{borderRadius: "14px"}}/>;
    } else if (presetLoadError || filteredPresets.length === 0) {
        body = <Typography color="error" variant="body2">{t("controls.presets.loadError", {capability: capability})}</Typography>;
    } else {
        body = (
            <ToggleButtonGroup
                exclusive
                fullWidth
                value={value}
                aria-labelledby={labelId}
                disabled={selectPresetIsPending}
                onChange={(_event, newValue: PresetSelectionState["value"] | null) => {
                    if (newValue !== null && newValue !== preset?.value) {
                        selectPreset(newValue);
                    }
                }}
            >
                {filteredPresets.map(p => {
                    return (
                        <ToggleButton key={p} value={p} sx={{minHeight: 44}}>
                            {getPresetFriendlyName(capability, p)}
                        </ToggleButton>
                    );
                })}
            </ToggleButtonGroup>
        );
    }

    return (
        <Box>
            <PanelSectionTitle
                id={labelId}
                trailing={selectPresetIsPending ? <CircularProgress size={16}/> : undefined}
            >
                {label}
            </PanelSectionTitle>
            {body}
        </Box>
    );
};

export default PresetSegmented;
