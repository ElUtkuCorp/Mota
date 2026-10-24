import {Capability, PresetSelectionState, PresetValue} from "./api";
import React, {ReactElement} from "react";
import {
    FanSpeedHighIcon,
    FanSpeedLowIcon,
    FanSpeedMaxIcon,
    FanSpeedMediumIcon,
    FanSpeedMinIcon,
    FanSpeedOffIcon,
    FanSpeedTurboIcon,
    OperationModeMop,
    OperationModeVacuum,
    OperationModeVacuumAndMop,
    OperationModeVacuumThenMop,
    WaterGradeHighIcon,
    WaterGradeLowIcon,
    WaterGradeMaxIcon,
    WaterGradeMediumIcon,
    WaterGradeMinIcon,
    WaterGradeOffIcon
} from "./components/CustomIcons";
import i18n from "./i18n";

const order: Array<PresetValue> = ["off", "min", "low", "medium", "high", "max", "turbo", "vacuum", "vacuum_and_mop", "vacuum_then_mop", "mop", "edge", "spiral"];
export const sortPresets = (presets: PresetSelectionState["value"][]) => {
    return [...presets].sort((a, b) => {
        return order.indexOf(a) - order.indexOf(b);
    });
};
const presetValues: Array<PresetValue> = [
    "off", "min", "low", "medium", "high", "max", "turbo", "custom",
    "vacuum_and_mop", "vacuum_then_mop", "vacuum", "mop", "edge", "spiral"
];

// Translated lazily via getters so that the current UI language is always used
export const presetFriendlyNames: {readonly [key in PresetValue]: string} = Object.freeze(
    presetValues.reduce((acc, preset) => {
        Object.defineProperty(acc, preset, {
            enumerable: true,
            get: () => {
                return i18n.t(`presets.${preset}`);
            }
        });

        return acc;
    }, {} as {[key in PresetValue]: string})
);

/**
 * Like presetFriendlyNames, but with wording specific to the capability (e.g. grammatical gender in Spanish:
 * "Potencia de aspiración: Alta" vs. "Nivel de agua: Alto")
 *
 * @param {Capability} capability
 * @param {PresetValue} preset
 * @returns {string}
 */
export function getPresetFriendlyName(capability: Capability, preset: PresetValue): string {
    let group: string | undefined;

    switch (capability) {
        case Capability.FanSpeedControl:
            group = "fanSpeed";
            break;
        case Capability.WaterUsageControl:
            group = "waterUsage";
            break;
        case Capability.OperationModeControl:
            group = "operationMode";
            break;
    }

    if (group !== undefined && i18n.exists(`presets.${group}.${preset}`)) {
        return i18n.t(`presets.${group}.${preset}`);
    }

    return presetFriendlyNames[preset];
}

export function getPresetIconOrLabel(capability: Capability, preset: PresetValue, style?: React.CSSProperties): ReactElement | string {
    switch (capability) {
        case Capability.FanSpeedControl:
            switch (preset) {
                case "off":
                    return <FanSpeedOffIcon style={style}/>;
                case "min":
                    return <FanSpeedMinIcon style={style}/>;
                case "low":
                    return <FanSpeedLowIcon style={style}/>;
                case "medium":
                    return <FanSpeedMediumIcon style={style}/>;
                case "high":
                    return <FanSpeedHighIcon style={style}/>;
                case "max":
                    return <FanSpeedMaxIcon style={style}/>;
                case "turbo":
                    return <FanSpeedTurboIcon style={style}/>;
                default:
                    return getPresetFriendlyName(capability, preset);

            }
        case Capability.WaterUsageControl:
            switch (preset) {
                case "off":
                    return <WaterGradeOffIcon style={style}/>;
                case "min":
                    return <WaterGradeMinIcon style={style}/>;
                case "low":
                    return <WaterGradeLowIcon style={style}/>;
                case "medium":
                    return <WaterGradeMediumIcon style={style}/>;
                case "high":
                    return <WaterGradeHighIcon style={style}/>;
                case "max":
                    return <WaterGradeMaxIcon style={style}/>;
                default:
                    return getPresetFriendlyName(capability, preset);
            }
        case Capability.OperationModeControl:
            switch (preset) {
                case "vacuum":
                    return <OperationModeVacuum style={style}/>;
                case "mop":
                    return <OperationModeMop style={style}/>;
                case "vacuum_and_mop":
                    return <OperationModeVacuumAndMop style={style}/>;
                case "vacuum_then_mop":
                    return <OperationModeVacuumThenMop style={style}/>;
                default:
                    return getPresetFriendlyName(capability, preset);
            }
        default:
            return getPresetFriendlyName(capability, preset);
    }
}
