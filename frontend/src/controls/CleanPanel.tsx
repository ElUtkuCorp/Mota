import {
    alpha,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    Stack,
    SvgIconProps,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import {
    Adjust as SpotIcon,
    BorderOuter as EdgeIcon,
    CheckBox as CheckedIcon,
    CheckBoxOutlineBlank as UncheckedIcon,
    CropFree as ZoneIcon,
    Cyclone as SpiralIcon,
    GridView as WholeHomeIcon,
    Home as HomeIcon,
    MeetingRoomOutlined as RoomsIcon,
    Pause as PauseIcon,
    PlayArrow as StartIcon,
    Stop as StopIcon,
} from "@mui/icons-material";
import React from "react";
import {useTranslation} from "react-i18next";
import {
    BasicControlCommand,
    Capability,
    PresetSelectionState,
    RobotAttributeClass,
    StatusState,
    useBasicControlMutation,
    useCarpetModeStateMutation,
    useCarpetModeStateQuery,
    useCleanRouteMutation,
    useCleanRouteQuery,
    usePresetSelectionMutation,
    usePresetSelectionsQuery,
    useRobotAttributeQuery,
    useRobotInformationQuery,
    useRobotStatusQuery,
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {useLocalStorage} from "../hooks";
import {requestLiveMapMode, useLiveMapControl} from "../map/liveMapControl";
import type {LiveMapMode} from "../map/LiveMap";
import {PanelCard, PanelSectionTitle} from "./PanelSection";
import PresetSegmented from "./PresetSegmented";
import Dock from "./Dock";
import Attachments from "./Attachments";

/**
 * Mota: panel "Limpiar" de Inicio (X8). Un solo flujo:
 * qué (toda la casa, habitaciones, zona, punto, bordes, espiral) + cómo (x2, fregar, alfombra, potencia)
 * + iniciar. Recuerda la última elección en el navegador.
 *
 * - Toda la casa, Bordes y Espiral: eligen el modo de funcionamiento (vacuum/mop, edge, spiral) y después
 *   se inicia con BasicControl.
 * - Habitaciones, Zona y Punto: ponen el mapa en vivo en su modo (selección de habitaciones, zonas, "ir a")
 *   y el botón principal lanza la acción del propio mapa.
 */

export type CleanTarget = "whole" | "segments" | "zones" | "goto" | "edge" | "spiral";
type LocalCleanTarget = "whole" | "edge" | "spiral";

const MAP_TARGETS: Array<LiveMapMode> = ["segments", "zones", "goto"];
const START_STATES: Array<StatusState["value"]> = ["idle", "docked", "paused", "error"];
const PAUSE_STATES: Array<StatusState["value"]> = ["cleaning", "returning", "moving"];

const TARGET_STORAGE_KEY = "mota-clean-target";
const MOP_STORAGE_KEY = "mota-clean-mop";

interface TargetTile {
    target: CleanTarget;
    icon: React.ComponentType<SvgIconProps>;
    label: string;
    available: boolean;
}

const TargetTileButton: React.FunctionComponent<{
    tile: TargetTile,
    selected: boolean,
    disabled: boolean,
    onSelect: () => void
}> = ({
    tile,
    selected,
    disabled,
    onSelect
}): React.ReactElement => {
    const {t} = useTranslation();
    const theme = useTheme();
    const tokens = theme.palette.mota;
    const Icon = tile.icon;

    const button = (
        <ButtonBase
            role="radio"
            aria-checked={selected}
            aria-label={tile.label}
            disabled={disabled || !tile.available}
            onClick={onSelect}
            focusRipple
            sx={{
                width: "100%",
                minWidth: 0,
                minHeight: 76,
                px: 0.5,
                py: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                borderRadius: "16px",
                border: "1.5px solid",
                borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
                backgroundColor: selected ? tokens.accentSoft : theme.palette.background.paper,
                color: selected ? tokens.accentSoftText : theme.palette.text.primary,
                transition: "background-color 120ms, border-color 120ms",
                "&:hover": {
                    backgroundColor: selected ? tokens.accentSoft : tokens.surfaceMuted,
                },
                "&.Mui-disabled": {
                    opacity: 0.45,
                },
                "&.Mui-focusVisible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                },
            }}
        >
            <Icon sx={{fontSize: 24}}/>
            <Typography
                component="span"
                sx={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    lineHeight: 1.15,
                    textAlign: "center",
                    maxWidth: "100%",
                    hyphens: "auto",
                    overflowWrap: "anywhere",
                }}
            >
                {tile.label}
            </Typography>
        </ButtonBase>
    );

    if (!tile.available) {
        return (
            <Tooltip title={t("home.clean.notAvailable")}>
                <span style={{display: "block"}}>{button}</span>
            </Tooltip>
        );
    }

    return button;
};

// Casilla con forma de píldora (objetivo táctil de 44 px)
const OptionToggle: React.FunctionComponent<{
    label: string,
    checked: boolean,
    disabled?: boolean,
    pending?: boolean,
    tooltip?: string,
    onChange: (checked: boolean) => void
}> = ({
    label,
    checked,
    disabled = false,
    pending = false,
    tooltip,
    onChange
}): React.ReactElement => {
    const theme = useTheme();
    const tokens = theme.palette.mota;

    const button = (
        <ButtonBase
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            focusRipple
            onClick={() => {
                onChange(!checked);
            }}
            sx={{
                height: 44,
                px: 1.5,
                gap: 0.75,
                borderRadius: 999,
                border: "1.5px solid",
                borderColor: checked ? theme.palette.primary.main : theme.palette.divider,
                backgroundColor: checked ? tokens.accentSoft : theme.palette.background.paper,
                color: checked ? tokens.accentSoftText : theme.palette.text.primary,
                fontSize: "0.88rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
                width: "100%",
                "&.Mui-disabled": {
                    opacity: 0.45,
                },
                "&.Mui-focusVisible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                },
            }}
        >
            {
                pending ?
                    <CircularProgress size={18} color="inherit"/> :
                    (checked ? <CheckedIcon sx={{fontSize: 20}}/> : <UncheckedIcon sx={{fontSize: 20, color: "text.secondary"}}/>)
            }
            {label}
        </ButtonBase>
    );

    return (
        <Box sx={{flex: "1 1 auto", minWidth: 0}}>
            {
                tooltip ?
                    <Tooltip title={tooltip}>
                        <span style={{display: "block"}}>{button}</span>
                    </Tooltip> :
                    button
            }
        </Box>
    );
};

const DoubleCleaningToggle = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: route, isPending, isError} = useCleanRouteQuery();
    const {mutate: setRoute, isPending: isUpdating} = useCleanRouteMutation();

    return (
        <OptionToggle
            label={t("home.clean.double")}
            tooltip={t("controls.cleaningModifiers.doubleHelp")}
            checked={route === "intensive"}
            disabled={isPending || isError || isUpdating}
            pending={isUpdating}
            onChange={(checked) => {
                setRoute(checked ? "intensive" : "normal");
            }}
        />
    );
};

const CarpetModeToggle = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: carpetMode, isPending, isError} = useCarpetModeStateQuery();
    const {mutate: setCarpetMode, isPending: isUpdating} = useCarpetModeStateMutation();

    return (
        <OptionToggle
            label={t("home.clean.carpet")}
            tooltip={t("controls.cleaningModifiers.carpetHelp")}
            checked={carpetMode?.enabled === true}
            disabled={isPending || isError || isUpdating}
            pending={isUpdating}
            onChange={(checked) => {
                setCarpetMode(checked);
            }}
        />
    );
};

const SquareActionButton: React.FunctionComponent<{
    label: string,
    icon: React.ReactElement,
    disabled: boolean,
    variant: "ink" | "outlined",
    onClick: () => void
}> = ({
    label,
    icon,
    disabled,
    variant,
    onClick
}): React.ReactElement => {
    const theme = useTheme();
    const tokens = theme.palette.mota;

    return (
        <Tooltip title={label}>
            <span style={{display: "inline-flex"}}>
                <Button
                    aria-label={label}
                    disabled={disabled}
                    onClick={onClick}
                    variant={variant === "ink" ? "contained" : "outlined"}
                    sx={{
                        minWidth: 56,
                        width: 56,
                        height: 56,
                        p: 0,
                        borderRadius: "18px",
                        ...(variant === "ink" ? {
                            backgroundColor: tokens.ink,
                            color: tokens.inkText,
                            "&:hover": {
                                backgroundColor: tokens.inkHover,
                            },
                        } : {
                            color: theme.palette.text.primary,
                            borderColor: theme.palette.divider,
                            backgroundColor: theme.palette.background.paper,
                        }),
                        "&.Mui-disabled": {
                            backgroundColor: variant === "ink" ? alpha(tokens.ink, 0.25) : undefined,
                            color: variant === "ink" ? tokens.inkText : undefined,
                        },
                    }}
                >
                    {icon}
                </Button>
            </span>
        </Tooltip>
    );
};

const CleanPanel: React.FunctionComponent<{
    /** En el móvil, la barra de acciones se queda fija abajo al desplazar */
    stickyActions?: boolean
}> = ({
    stickyActions = false
}): React.ReactElement => {
    const {t} = useTranslation();
    const theme = useTheme();

    const [
        basicControlSupported,
        operationModeSupported,
        fanSpeedSupported,
        waterUsageSupported,
        segmentationSupported,
        zoneCleaningSupported,
        goToSupported,
        cleanRouteSupported,
        carpetModeSupported,
        triggerEmptySupported,
        mopDockCleanTriggerSupported,
        mopDockDryTriggerSupported,
    ] = useCapabilitiesSupported(
        Capability.BasicControl,
        Capability.OperationModeControl,
        Capability.FanSpeedControl,
        Capability.WaterUsageControl,
        Capability.MapSegmentation,
        Capability.ZoneCleaning,
        Capability.GoToLocation,
        Capability.CleanRouteControl,
        Capability.CarpetModeControl,
        Capability.AutoEmptyDockManualTrigger,
        Capability.MopDockCleanManualTrigger,
        Capability.MopDockDryManualTrigger,
    );

    const {data: robotInformation} = useRobotInformationQuery();
    const {data: status} = useRobotStatusQuery();
    const {data: operationModePresets} = usePresetSelectionsQuery(Capability.OperationModeControl);
    const {data: operationMode} = useRobotAttributeQuery(
        RobotAttributeClass.PresetSelectionState,
        (attributes) => {
            return attributes.filter((attribute) => {
                return attribute.type === "operation_mode";
            })[0];
        }
    );
    const {mutateAsync: selectOperationMode, isPending: operationModePending} = usePresetSelectionMutation(Capability.OperationModeControl);
    const {mutate: executeBasicControlCommand, isPending: basicControlPending} = useBasicControlMutation();

    const mapMode = useLiveMapControl(s => {
        return s.mode;
    });
    const mapSupportedModes = useLiveMapControl(s => {
        return s.supportedModes;
    });
    const mapPrimaryAction = useLiveMapControl(s => {
        return s.primaryAction;
    });

    const [localTarget, setLocalTarget] = useLocalStorage<LocalCleanTarget>(TARGET_STORAGE_KEY, "whole");
    const [mopChecked, setMopChecked] = useLocalStorage<boolean>(MOP_STORAGE_KEY, false);

    const operationModeAvailable = React.useCallback((mode: PresetSelectionState["value"]) => {
        return operationModeSupported && (operationModePresets ?? []).includes(mode);
    }, [operationModeSupported, operationModePresets]);

    const target: CleanTarget = MAP_TARGETS.includes(mapMode) ? (mapMode as CleanTarget) : localTarget;
    const isMapTarget = MAP_TARGETS.includes(target as LiveMapMode);
    const mopAvailable = operationModeAvailable("mop");

    const tiles: Array<TargetTile> = [
        {target: "whole", icon: WholeHomeIcon, label: t("home.clean.targets.whole"), available: basicControlSupported},
        {target: "segments", icon: RoomsIcon, label: t("home.clean.targets.segments"), available: segmentationSupported && mapSupportedModes.includes("segments")},
        {target: "zones", icon: ZoneIcon, label: t("home.clean.targets.zones"), available: zoneCleaningSupported && mapSupportedModes.includes("zones")},
        {target: "goto", icon: SpotIcon, label: t("home.clean.targets.goto"), available: goToSupported && mapSupportedModes.includes("goto")},
        {target: "edge", icon: EdgeIcon, label: t("home.clean.targets.edge"), available: basicControlSupported && operationModeAvailable("edge")},
        {target: "spiral", icon: SpiralIcon, label: t("home.clean.targets.spiral"), available: basicControlSupported && operationModeAvailable("spiral")},
    ];

    const selectTarget = (newTarget: CleanTarget) => {
        if (MAP_TARGETS.includes(newTarget as LiveMapMode)) {
            requestLiveMapMode(newTarget as LiveMapMode);
        } else {
            setLocalTarget(newTarget as LocalCleanTarget);
            requestLiveMapMode("none");
        }
    };

    const state = status?.value;
    const flag = status?.flag;
    const isRunning = state !== undefined && PAUSE_STATES.includes(state);
    const isResumable = state !== undefined && !isRunning && (state === "paused" || flag === "resumable");
    const canStart = state !== undefined && START_STATES.includes(state);
    const busy = basicControlPending || operationModePending;

    const startSelected = async () => {
        if (operationModeSupported) {
            let desired: PresetSelectionState["value"] | undefined;

            switch (target) {
                case "whole":
                    if (mopChecked && mopAvailable) {
                        desired = "mop";
                    } else if (operationModeAvailable("vacuum")) {
                        desired = "vacuum";
                    }
                    break;
                case "edge":
                case "spiral":
                    desired = target;
                    break;
            }

            if (desired !== undefined && desired !== operationMode?.value) {
                try {
                    await selectOperationMode(desired);
                } catch (e) {
                    return; // el error ya lo muestra la mutación
                }
            }
        }

        executeBasicControlCommand("start");
    };

    let mainLabel = t("controls.basic.start");
    let mainIcon = <StartIcon/>;
    let mainEnabled = false;
    let mainAction: () => void = () => {
        /* nada */
    };
    let mainHint: string | null = null;

    if (isRunning) {
        mainLabel = t("home.clean.pause");
        mainIcon = <PauseIcon/>;
        mainEnabled = true;
        mainAction = () => {
            executeBasicControlCommand("pause");
        };
    } else if (isResumable) {
        mainLabel = t("controls.basic.resume");
        mainEnabled = true;
        mainAction = () => {
            executeBasicControlCommand("start");
        };
    } else if (isMapTarget) {
        if (mapPrimaryAction !== null && mapPrimaryAction.hasSelection) {
            mainLabel = mapPrimaryAction.label;
            mainEnabled = mapPrimaryAction.enabled && canStart;
            mainAction = mapPrimaryAction.run;
        } else {
            mainLabel = t(`home.clean.pick.${target}`);
            mainHint = t(`home.clean.pickHint.${target}`);
        }
    } else {
        mainEnabled = canStart && basicControlSupported;
        mainAction = () => {
            void startSelected();
        };
    }

    const mapActionBusy = isMapTarget && mapPrimaryAction?.busy === true;

    const stopEnabled = flag === "resumable" || (state !== undefined && state !== "idle" && state !== "docked");
    const homeEnabled = state === "idle" || state === "error" || state === "paused";

    const sendCommand = (command: BasicControlCommand) => {
        executeBasicControlCommand(command);
    };

    const actionBar = (
        <Box
            sx={{
                display: "flex",
                gap: 1,
                alignItems: "stretch",
                ...(stickyActions ? {
                    position: "sticky",
                    bottom: 0,
                    zIndex: 2,
                    mx: -1.5,
                    px: 1.5,
                    pt: 1.25,
                    pb: "calc(12px + env(safe-area-inset-bottom))",
                    backgroundColor: alpha(theme.palette.background.default, 0.94),
                    backdropFilter: "blur(8px)",
                } : {}),
            }}
        >
            <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={!mainEnabled || busy || mapActionBusy}
                onClick={mainAction}
                startIcon={(busy || mapActionBusy) ? <CircularProgress size={20} color="inherit"/> : mainIcon}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    height: 56,
                    borderRadius: "18px",
                    fontSize: "1rem",
                    fontWeight: 700,
                    "& .MuiButton-startIcon > *:nth-of-type(1)": {
                        fontSize: 24,
                    },
                }}
            >
                <Box component="span" sx={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                    {mainLabel}
                </Box>
            </Button>
            {
                basicControlSupported && stopEnabled &&
                <SquareActionButton
                    label={t("controls.basic.stop")}
                    icon={<StopIcon/>}
                    disabled={busy}
                    variant="outlined"
                    onClick={() => {
                        sendCommand("stop");
                    }}
                />
            }
            {
                basicControlSupported &&
                <SquareActionButton
                    label={t("controls.basic.home")}
                    icon={<HomeIcon/>}
                    disabled={!homeEnabled || busy}
                    variant="ink"
                    onClick={() => {
                        sendCommand("home");
                    }}
                />
            }
        </Box>
    );

    const showOptions = cleanRouteSupported || mopAvailable || carpetModeSupported;
    const mopDisabledReason = target !== "whole" ? t("home.clean.mopOnlyWhole") : null;

    return (
        <Stack spacing={1.5} sx={{userSelect: "none"}}>
            <PanelCard>
                <Stack spacing={2.25}>
                    <Box>
                        <PanelSectionTitle id="mota-clean-target-label">{t("home.clean.what")}</PanelSectionTitle>
                        <Box
                            role="radiogroup"
                            aria-labelledby="mota-clean-target-label"
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                gap: 1,
                            }}
                        >
                            {tiles.map(tile => {
                                return (
                                    <TargetTileButton
                                        key={tile.target}
                                        tile={tile}
                                        selected={target === tile.target}
                                        disabled={isRunning}
                                        onSelect={() => {
                                            selectTarget(tile.target);
                                        }}
                                    />
                                );
                            })}
                        </Box>
                        {
                            mainHint !== null &&
                            <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                                {mainHint}
                            </Typography>
                        }
                    </Box>

                    {
                        showOptions &&
                        <Box>
                            <PanelSectionTitle>{t("home.clean.options")}</PanelSectionTitle>
                            <Box sx={{display: "flex", flexWrap: "wrap", gap: 1}}>
                                {cleanRouteSupported && <DoubleCleaningToggle/>}
                                {
                                    mopAvailable &&
                                    <OptionToggle
                                        label={t("home.clean.mop")}
                                        tooltip={mopDisabledReason ?? t("home.clean.mopHelp")}
                                        checked={mopChecked && target === "whole"}
                                        disabled={target !== "whole" || isRunning}
                                        onChange={(checked) => {
                                            setMopChecked(checked);
                                        }}
                                    />
                                }
                                {carpetModeSupported && <CarpetModeToggle/>}
                            </Box>
                            {
                                mopAvailable && mopDisabledReason !== null &&
                                <Typography variant="caption" color="text.secondary" sx={{display: "block", mt: 0.75}}>
                                    {mopDisabledReason}
                                </Typography>
                            }
                        </Box>
                    }

                    {fanSpeedSupported && <PresetSegmented capability={Capability.FanSpeedControl} label={t("home.clean.power")}/>}
                    {waterUsageSupported && <PresetSegmented capability={Capability.WaterUsageControl} label={t("controls.waterUsage")}/>}

                    {!stickyActions && actionBar}
                </Stack>
            </PanelCard>

            {stickyActions && actionBar}

            {
                (triggerEmptySupported || mopDockCleanTriggerSupported || mopDockDryTriggerSupported) &&
                <Dock/>
            }
            {
                robotInformation &&
                robotInformation.modelDetails.supportedAttachments.length > 0 &&
                <Attachments/>
            }
        </Stack>
    );
};

export default CleanPanel;
