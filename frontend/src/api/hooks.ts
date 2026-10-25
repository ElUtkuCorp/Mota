/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useSnackbar } from "notistack";
import React from "react";
import {
    QueryClient,
    useMutation,
    UseMutationOptions,
    useQuery,
    useQueryClient,
    UseQueryResult
} from "@tanstack/react-query";
import {
    BasicControlCommand,
    deleteTimer,
    fetchCapabilities,
    fetchCarpetModeState,
    fetchCombinedVirtualRestrictionsProperties,
    fetchConsumableStateInformation,
    fetchCurrentStatistics,
    fetchCurrentStatisticsProperties,
    fetchDoNotDisturbConfiguration,
    fetchHTTPBasicAuthConfiguration,
    fetchKeyLockState,
    fetchManualControlProperties,
    fetchManualControlState,
    fetchMap,
    fetchMapSegmentationProperties,
    fetchMQTTConfiguration,
    fetchMQTTProperties,
    fetchNTPClientConfiguration,
    fetchNTPClientStatus,
    fetchObstacleAvoidanceControlState,
    fetchPersistentMapState,
    fetchPresetSelections,
    fetchRobotInformation,
    fetchSegments,
    fetchSpeakerVolumeState,
    fetchStateAttributes,
    fetchSystemHostInfo,
    fetchSystemRuntimeInfo,
    fetchTimerInformation,
    fetchTimerProperties,
    fetchTotalStatistics,
    fetchTotalStatisticsProperties,
    fetchUpdaterState,
    fetchValetudoEvents,
    fetchValetudoVersionInformation,
    fetchValetudoLog,
    fetchValetudoLogLevel,
    fetchVoicePackManagementState,
    fetchWifiStatus,
    fetchZoneProperties,
    sendAutoEmptyDockManualTriggerCommand,
    sendBasicControlCommand,
    sendCarpetModeEnable,
    sendCleanSegmentsCommand,
    sendCleanZonesCommand,
    sendCombinedVirtualRestrictionsUpdate,
    sendConsumableReset,
    sendDoNotDisturbConfiguration,
    sendGoToCommand,
    sendHTTPBasicAuthConfiguration,
    sendJoinSegmentsCommand,
    sendKeyLockEnable,
    sendLocateCommand,
    sendManualControlInteraction,
    sendMapReset,
    sendMQTTConfiguration,
    sendNTPClientConfiguration,
    sendObstacleAvoidanceControlState,
    sendPersistentMapEnabled,
    sendRenameSegmentCommand,
    sendSpeakerTestCommand,
    sendSpeakerVolume,
    sendSplitSegmentCommand,
    sendStartMappingPass,
    sendTimerCreation,
    sendTimerUpdate,
    sendUpdaterCommand,
    sendValetudoEventInteraction,
    sendValetudoLogLevel,
    sendVoicePackManagementCommand,
    sendWifiConfiguration,
    subscribeToLogMessages,
    subscribeToMap,
    subscribeToStateAttributes,
    updatePresetSelection,
    fetchValetudoInformation,
    fetchQuirks,
    sendSetQuirkValueCommand,
    fetchRobotProperties,
    fetchMQTTStatus,
    fetchNetworkAdvertisementConfiguration,
    fetchNetworkAdvertisementProperties,
    sendNetworkAdvertisementConfiguration,
    sendMopDockDryManualTriggerCommand,
    sendMopDockCleanManualTriggerCommand,
    MopDockCleanManualTriggerCommand,
    MopDockDryManualTriggerCommand,
    fetchWifiConfigurationProperties,
    fetchWifiScan,
    sendDismissWelcomeDialogAction,
    sendRestoreDefaultConfigurationAction,
    fetchUpdaterConfiguration,
    sendUpdaterConfiguration,
    fetchValetudoCustomizations,
    sendValetudoCustomizations,
    fetchConsumableProperties,
    sendTimerAction,
    fetchPetObstacleAvoidanceControlState,
    sendPetObstacleAvoidanceControlState,
    fetchCollisionAvoidantNavigationControlState,
    sendCollisionAvoidantNavigationControlState,
    fetchCarpetSensorModeProperties,
    fetchCarpetSensorMode,
    sendCarpetSensorMode,
    fetchAutoEmptyDockAutoEmptyInterval,
    sendAutoEmptyDockAutoEmptyInterval,
    fetchAutoEmptyDockAutoEmptyIntervalProperties,
    fetchObstacleImagesProperties,
    fetchObstacleImagesState,
    sendObstacleImagesState,
    fetchDuststreamingProperties,
    fetchDuststreamingConfiguration,
    sendDuststreamingConfiguration,
    fetchHighResolutionManualControlState,
    sendHighResolutionManualControlInteraction,
    fetchMopExtensionControlState,
    sendMopExtensionControlState,
    fetchCameraLightControlState,
    sendCameraLightControlState,
    fetchMopDockMopWashTemperature,
    sendMopDockMopWashTemperature,
    fetchMopDockMopWashTemperatureProperties,
    fetchMopExtensionFurnitureLegHandlingControlState,
    sendMopExtensionFurnitureLegHandlingControlState,
    fetchMopTwistControlState,
    sendMopTwistControlState,
    fetchMopDockMopAutoDryingControlState,
    sendMopDockMopAutoDryingControlState,
    fetchMapSegmentMaterialControlProperties,
    sendSetSegmentMaterialCommand,
    fetchFloorMaterialDirectionAwareNavigationControlState,
    sendFloorMaterialDirectionAwareNavigationControlState,
    fetchCleanRoute,
    sendCleanRoute,
    fetchCleanRouteControlProperties,
    fetchMopDockMopDryingTime,
    sendMopDockMopDryingTime,
    fetchMopDockMopDryingTimeControlProperties,
    fetchAutoEmptyDockAutoEmptyDuration,
    sendAutoEmptyDockAutoEmptyDuration,
    fetchAutoEmptyDockAutoEmptyDurationControlProperties,
    fetchMapAnnotationsProperties,
    sendMapAnnotationsUpdate,
    fetchMotaCleanHistory,
    fetchMotaCleanHistoryTotals,
    fetchMotaDiagnostics,
    fetchMotaMirrors,
    sendMotaMirrors,
    sendMotaResegment,
    fetchMotaRooms,
    sendMotaRoomColor,
    fetchCombinedVirtualRestrictions,
} from "./client";
import {
    PresetSelectionState,
    RobotAttribute,
    RobotAttributeClass,
    StatusState,
} from "./RawRobotState";
import { isAttribute } from "./utils";
import {
    AutoEmptyDockAutoEmptyDuration,
    AutoEmptyDockAutoEmptyInterval,
    Capability,
    DuststreamingConfiguration,
    CarpetSensorMode,
    CleanRoute,
    CombinedVirtualRestrictionsUpdateRequestParameters,
    MotaMirrorsSaveRequest,
    MotaMirrorZone,
    MotaRoomColorRequest,
    ValetudoRestrictedZone,
    ValetudoRestrictedZoneType,
    ConsumableId,
    DoNotDisturbConfiguration,
    HighResolutionManualControlInteraction,
    HTTPBasicAuthConfiguration,
    ManualControlInteraction,
    MapSegmentationActionRequestParameters,
    MapSegmentEditJoinRequestParameters,
    MapSegmentEditSplitRequestParameters,
    MapSegmentMaterialControlRequestParameters,
    MapSegmentRenameRequestParameters,
    MopDockMopDryingDuration,
    MopDockMopWashTemperature,
    MQTTConfiguration,
    NetworkAdvertisementConfiguration,
    NTPClientConfiguration,
    NTPClientStatus,
    Point,
    SetLogLevelRequest,
    Timer,
    UpdaterConfiguration,
    ValetudoCustomizations,
    ValetudoEventInteractionContext,
    ValetudoInformation,
    ValetudoMapAnnotation,
    VoicePackManagementCommand,
    WifiConfiguration,
    ZoneActionRequestParameters,
} from "./types";
import type { MutationFunction } from "@tanstack/query-core";
import i18n from "../i18n";

enum QueryKey {
    Capabilities = "capabilities",
    Map = "map",
    Consumables = "consumables",
    ConsumableProperties = "consumable_properties",
    Attributes = "attributes",
    PresetSelections = "preset_selections",
    ZoneProperties = "zone_properties",
    Segments = "segments",
    MapSegmentationProperties = "map_segmentation_properties",
    PersistentMap = "persistent_map",
    RobotInformation = "robot_information",
    ValetudoInformation = "valetudo_information",
    ValetudoVersion = "valetudo_version",
    CarpetMode = "carpet_mode",
    SpeakerVolume = "speaker_volume",
    VoicePackManagement = "voice_pack",
    SystemHostInfo = "system_host_info",
    SystemRuntimeInfo = "system_runtime_info",
    MQTTConfiguration = "mqtt_configuration",
    MQTTStatus = "mqtt_status",
    MQTTProperties = "mqtt_properties",
    HTTPBasicAuth = "http_basic_auth",
    NetworkAdvertisementConfiguration = "network_advertisement_configuration",
    NetworkAdvertisementProperties = "network_advertisement_properties",
    NTPClientStatus = "ntp_client_status",
    NTPClientConfiguration = "ntp_client_configuration",
    Timers = "timers",
    TimerProperties = "timer_properties",
    ValetudoEvents = "valetudo_events",
    Log = "log",
    LogLevel = "log_level",
    KeyLockInformation = "key_lock",
    ObstacleAvoidance = "obstacle_avoidance",
    PetObstacleAvoidance = "pet_obstacle_avoidance",
    AutoEmptyDockAutoEmptyInterval = "auto_empty_dock_auto_empty_interval",
    AutoEmptyDockAutoEmptyIntervalProperties = "auto_empty_dock_auto_empty_interval_properties",
    DoNotDisturb = "do_not_disturb",
    WifiStatus = "wifi_status",
    WifiConfigurationProperties = "wifi_configuration_properties",
    WifiScan = "wifi_scan",
    ManualControl = "manual_control",
    ManualControlProperties = "manual_control_properties",
    HighResolutionManualControl = "high_resolution_manual_control",
    CombinedVirtualRestrictionsProperties = "combined_virtual_restrictions_properties",
    UpdaterConfiguration = "updater_configuration",
    UpdaterState = "updater_state",
    CurrentStatistics = "current_statistics",
    CurrentStatisticsProperties = "current_statistics_properties",
    TotalStatistics = "total_statistics",
    TotalStatisticsProperties = "total_statistics_properties",
    Quirks = "quirks",
    RobotProperties = "robot_properties",
    ValetudoCustomizations = "valetudo_customizations",
    CollisionAvoidantNavigation = "collision_avoidant_navigation",
    CarpetSensorMode = "carpet_sensor_mode",
    CarpetSensorModeProperties = "carpet_sensor_mode_properties",
    ObstacleImages = "obstacle_image",
    ObstacleImagesProperties = "obstacle_image_properties",
    DuststreamingProperties = "duststreaming_properties",
    DuststreamingConfiguration = "duststreaming_configuration",
    MopExtensionControl = "mop_extension_control",
    CameraLightControl = "camera_light_control",
    MopDockMopWashTemperature = "mop_dock_mop_wash_temperature",
    MopDockMopWashTemperatureProperties = "mop_dock_mop_wash_temperature_properties",
    MopTwistControl = "mop_twist_control",
    MopExtensionFurnitureLegHandlingControl = "mop_extension_furniture_leg_handling_control",
    MopDockMopAutoDryingControl = "mop_dock_mop_auto_drying_control",
    MapSegmentMaterialControlProperties = "map_segment_material_control_properties",
    FloorMaterialDirectionAwareNavigationControl = "floor_material_direction_aware_navigation_control",
    CleanRouteControl = "clean_route_control",
    CleanRouteControlProperties = "clean_route_control_properties",
    MopDockMopDryingTimeControl = "mop_dock_mop_drying_time_control",
    MopDockMopDryingTimeControlProperties = "mop_dock_mop_drying_time_control_properties",
    AutoEmptyDockAutoEmptyDurationControl = "auto_empty_dock_auto_empty_duration_control",
    AutoEmptyDockAutoEmptyDurationControlProperties = "auto_empty_dock_auto_empty_duration_control_properties",
    MapAnnotationsProperties = "map_annotations_properties",
    MotaCleanHistory = "mota_clean_history",
    MotaCleanHistoryTotals = "mota_clean_history_totals",
    MotaDiagnostics = "mota_diagnostics",
    MotaMirrors = "mota_mirrors",
    MotaRooms = "mota_rooms",
}

// "capability" is either a capability name or an i18n key
const useOnCommandError = (capability: Capability | string): ((error: unknown) => void) => {
    const {enqueueSnackbar} = useSnackbar();

    return React.useCallback((error: any) => {
        let errorMessage = "";
        if (typeof error?.toString === "function") {
            errorMessage = error.toString();
        }

        if (typeof error?.response?.data === "string") {
            errorMessage = error.response.data;
        }

        enqueueSnackbar(i18n.t("api.commandError", {capability: i18n.exists(capability) ? i18n.t(capability) : capability, message: errorMessage}), {
            preventDuplicate: true,
            key: capability,
            variant: "error",
        });
    }, [capability, enqueueSnackbar]);
};

// "setting" is an i18n key
const useOnSettingsChangeError = (setting: string): ((error: unknown) => void) => {
    const {enqueueSnackbar} = useSnackbar();

    return React.useCallback((error: unknown) => {
        enqueueSnackbar(i18n.t("api.settingsError", {setting: i18n.t(setting), error: String(error)}), {
            preventDuplicate: true,
            key: setting,
            variant: "error",
        });
    }, [setting, enqueueSnackbar]);
};

const useSSECacheUpdater = <T>(
    key: QueryKey,
    subscriber: (listener: (data: T) => void) => () => void
): void => {
    const queryClient = useQueryClient();

    React.useEffect(() => {
        return subscriber((data) => {
            queryClient.setQueryData<T>([key], (oldData) => {
                return data;
            }, {
                updatedAt: Date.now()
            });
        });
    }, [key, queryClient, subscriber]);
};

const useSSECacheAppender = <T>(
    key: QueryKey,
    subscriber: (listener: (data: T) => void) => () => void,
): void => {
    const queryClient = useQueryClient();

    React.useEffect(() => {
        return subscriber((data) => {
            let currentLog = queryClient.getQueryData([key]);
            let newData;

            if (typeof currentLog === "string" || currentLog instanceof String) {
                currentLog = currentLog.trim();
                newData = `${currentLog}\n${data}`;
            } else {
                newData = `${data}`;
            }

            return queryClient.setQueryData<T>([key], newData as T);
        });
    }, [key, queryClient, subscriber]);
};

export const useCapabilitiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.Capabilities],
        queryFn: fetchCapabilities,

        staleTime: Infinity
    });
};

export const useRobotMapQuery = () => {
    useSSECacheUpdater(QueryKey.Map, subscribeToMap);

    return useQuery({
        queryKey: [QueryKey.Map],
        queryFn: fetchMap,

        staleTime: 1000
    });
};

export function useRobotAttributeQuery<C extends RobotAttributeClass>(
    clazz: C
): UseQueryResult<Extract<RobotAttribute, { __class: C }>[]>;
export function useRobotAttributeQuery<C extends RobotAttributeClass, T>(
    clazz: C,
    select: (attributes: Extract<RobotAttribute, { __class: C }>[]) => T
): UseQueryResult<T>;
export function useRobotAttributeQuery<C extends RobotAttributeClass>(
    clazz: C,
    select?: (attributes: Extract<RobotAttribute, { __class: C }>[]) => any
): UseQueryResult<any> {
    useSSECacheUpdater(QueryKey.Attributes, subscribeToStateAttributes);

    return useQuery({
        queryKey: [QueryKey.Attributes],
        queryFn: fetchStateAttributes,

        staleTime: 1000,
        select: (attributes) => {
            const filteredAttributes = attributes.filter(isAttribute(clazz));

            return select ? select(filteredAttributes) : filteredAttributes;
        },
    });
}

export function useRobotStatusQuery(): UseQueryResult<StatusState>;
export function useRobotStatusQuery<T>(
    select: (status: StatusState) => T
): UseQueryResult<T>;
export function useRobotStatusQuery(select?: (status: StatusState) => any) {
    useSSECacheUpdater(QueryKey.Attributes, subscribeToStateAttributes);

    return useQuery({
        queryKey: [QueryKey.Attributes],
        queryFn: fetchStateAttributes,

        staleTime: 1000,
        select: (attributes) => {
            const status =
                attributes.filter(isAttribute(RobotAttributeClass.StatusState))[0] ??
                ({
                    __class: RobotAttributeClass.StatusState,
                    metaData: {},
                    value: "error",
                    flag: "none",
                } as StatusState);

            return select ? select(status) : status;
        },
    });
}

export const usePresetSelectionsQuery = (
    capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl
) => {
    return useQuery({
        queryKey: [QueryKey.PresetSelections, capability],
        queryFn: () => {
            return fetchPresetSelections(capability);
        },

        staleTime: Infinity,
    });
};

export const capabilityToPresetType: Record<Parameters<typeof usePresetSelectionMutation>[0],
    PresetSelectionState["type"]> = {
        [Capability.FanSpeedControl]: "fan_speed",
        [Capability.WaterUsageControl]: "water_grade",
        [Capability.OperationModeControl]: "operation_mode",
    };
export const usePresetSelectionMutation = (
    capability: Capability.FanSpeedControl | Capability.WaterUsageControl | Capability.OperationModeControl
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (level: PresetSelectionState["value"]) => {
            return updatePresetSelection(capability, level).then(
                fetchStateAttributes
            );
        },
        onSuccess: (data) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
        },
        onError: useOnCommandError(capability),
    });
};

export const useBasicControlMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (command: BasicControlCommand) => {
            return sendBasicControlCommand(command).then(fetchStateAttributes);
        },
        onError: useOnCommandError(Capability.BasicControl),
        onSuccess: (data) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
        },
    });
};

export const useGoToMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, Point>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (coordinates: { x: number; y: number }) => {
            return sendGoToCommand(coordinates).then(fetchStateAttributes);
        },
        ...options,

        onError: useOnCommandError(Capability.GoToLocation),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useZonePropertiesQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ZoneProperties],
        queryFn: fetchZoneProperties,

        staleTime: Infinity,
    });
};

export const useCleanZonesMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, ZoneActionRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: ZoneActionRequestParameters) => {
            return sendCleanZonesCommand(parameters).then(fetchStateAttributes);
        },
        ...options,

        onError: useOnCommandError(Capability.ZoneCleaning),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useSegmentsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.Segments],
        queryFn: fetchSegments
    });
};

// As conditional hooks aren't allowed, this query needs a way to be disabled but referenced
// for cases where a component might need the properties but only if the capability exists
export const useMapSegmentationPropertiesQuery = (enabled?: boolean) => {
    return useQuery({
        queryKey: [QueryKey.MapSegmentationProperties],
        queryFn: fetchMapSegmentationProperties,

        staleTime: Infinity,
        enabled: enabled ?? true
    });
};

export const useCleanSegmentsMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, MapSegmentationActionRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: MapSegmentationActionRequestParameters) => {
            return sendCleanSegmentsCommand(parameters).then(fetchStateAttributes);
        },
        ...options,

        onError: useOnCommandError(Capability.MapSegmentation),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useJoinSegmentsMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, MapSegmentEditJoinRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: MapSegmentEditJoinRequestParameters) => {
            return sendJoinSegmentsCommand(parameters).then(fetchStateAttributes); //TODO: this should actually refetch the map
        },
        ...options,

        onError: useOnCommandError(Capability.MapSegmentEdit),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useSplitSegmentMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, MapSegmentEditSplitRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: MapSegmentEditSplitRequestParameters) => {
            return sendSplitSegmentCommand(parameters).then(fetchStateAttributes); //TODO: this should actually refetch the map
        },
        ...options,

        onError: useOnCommandError(Capability.MapSegmentEdit),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useRenameSegmentMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, MapSegmentRenameRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: MapSegmentRenameRequestParameters) => {
            return sendRenameSegmentCommand(parameters).then(fetchStateAttributes); //TODO: this should actually refetch the map
        },
        ...options,

        onError: useOnCommandError(Capability.MapSegmentRename),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useMapSegmentMaterialControlPropertiesQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.MapSegmentMaterialControlProperties],
        queryFn: fetchMapSegmentMaterialControlProperties,

        staleTime: Infinity,
    });
};

export const useSetSegmentMaterialMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, MapSegmentMaterialControlRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: MapSegmentMaterialControlRequestParameters) => {
            return sendSetSegmentMaterialCommand(parameters).then(fetchStateAttributes); //TODO: this should actually refetch the map
        },
        ...options,

        onError: useOnCommandError(Capability.MapSegmentMaterialControl),
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useLocateMutation = () => {
    return useMutation({
        mutationFn: sendLocateCommand,
        onError: useOnCommandError(Capability.Locate)
    });
};

export const useConsumableStateQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.Consumables],
        queryFn: fetchConsumableStateInformation,
        staleTime: 300_000,
        refetchInterval: 300_000
    });
};

const useValetudoFetchingMutation = <TData, TVariables>(options: {
    onError: ((error: unknown) => void),
    queryKey: Array<QueryKey>,
    mutationFn: MutationFunction<TData, TVariables>
}) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: options.mutationFn,
        onSuccess: (data) => {
            queryClient.setQueryData<TData>(options.queryKey, data, {
                updatedAt: Date.now(),
            });
        },
        onError: options.onError
    });
};

export const useConsumablePropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.ConsumableProperties],
        queryFn: fetchConsumableProperties,

        staleTime: Infinity
    });
};

export const useConsumableResetMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.Consumables],
        mutationFn: (parameters: ConsumableId) => {
            return sendConsumableReset(parameters).then(fetchConsumableStateInformation);
        },
        onError: useOnCommandError(Capability.ConsumableMonitoring)
    });
};

export const useAutoEmptyDockManualTriggerMutation = () => {
    return useMutation({
        mutationFn: sendAutoEmptyDockManualTriggerCommand,
        onError: useOnCommandError(Capability.AutoEmptyDockManualTrigger)
    });
};

export const useRobotInformationQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.RobotInformation],
        queryFn: fetchRobotInformation,

        staleTime: Infinity,
    });
};

export const useValetudoInformationQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ValetudoInformation],
        queryFn: fetchValetudoInformation,

        staleTime: Infinity,
    });
};

export const useDismissWelcomeDialogMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            return sendDismissWelcomeDialogAction().then(fetchValetudoInformation).then((state) => {
                queryClient.setQueryData<ValetudoInformation>([QueryKey.ValetudoInformation], state, {
                    updatedAt: Date.now(),
                });
            });
        },
        onError: useOnSettingsChangeError("api.settings.welcomeDialog")
    });
};

export const useRestoreDefaultConfigurationMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            return sendRestoreDefaultConfigurationAction().then(() => {
                queryClient.refetchQueries().catch(() => {
                    /*intentional*/
                });
            });
        },
        onError: useOnSettingsChangeError("api.settings.configRestore")
    });
};

export const useValetudoVersionQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ValetudoVersion],
        queryFn: fetchValetudoVersionInformation,

        staleTime: Infinity,
    });
};

export const useSystemHostInfoQuery = () => {
    return useQuery({
        queryKey: [QueryKey.SystemHostInfo],
        queryFn: fetchSystemHostInfo,

        staleTime: 5_000,
        refetchInterval: 5_000
    });
};

export const useSystemRuntimeInfoQuery = () => {
    return useQuery({
        queryKey: [QueryKey.SystemRuntimeInfo],
        queryFn: fetchSystemRuntimeInfo
    });
};

export const useMQTTConfigurationQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MQTTConfiguration],
        queryFn: fetchMQTTConfiguration,

        staleTime: Infinity,
    });
};

export const useMQTTConfigurationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MQTTConfiguration],
        mutationFn: (mqttConfiguration: MQTTConfiguration) => {
            return sendMQTTConfiguration(mqttConfiguration).then(fetchMQTTConfiguration);
        },
        onError: useOnSettingsChangeError("api.settings.mqtt"),
    });
};

export const useMQTTStatusQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MQTTStatus],
        queryFn: fetchMQTTStatus,

        staleTime: 5_000,
        refetchInterval: 5_000
    });
};

export const useMQTTPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MQTTProperties],
        queryFn: fetchMQTTProperties,

        staleTime: Infinity,
    });
};

export const useHTTPBasicAuthConfigurationQuery = () => {
    return useQuery({
        queryKey: [QueryKey.HTTPBasicAuth],
        queryFn: fetchHTTPBasicAuthConfiguration,

        staleTime: Infinity,
    });
};

export const useHTTPBasicAuthConfigurationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.HTTPBasicAuth],
        mutationFn: (configuration: HTTPBasicAuthConfiguration) => {
            return sendHTTPBasicAuthConfiguration(configuration).then(fetchHTTPBasicAuthConfiguration);
        },
        onError: useOnSettingsChangeError("api.settings.httpBasicAuth")
    });
};

export const useNetworkAdvertisementConfigurationQuery = () => {
    return useQuery({
        queryKey: [QueryKey.NetworkAdvertisementConfiguration],
        queryFn: fetchNetworkAdvertisementConfiguration,

        staleTime: Infinity,
    });
};

export const useNetworkAdvertisementConfigurationMutation = () => {
    const queryClient = useQueryClient();

    return useValetudoFetchingMutation({
        queryKey: [QueryKey.NetworkAdvertisementConfiguration],
        mutationFn: (networkAdvertisementConfiguration: NetworkAdvertisementConfiguration) => {
            return sendNetworkAdvertisementConfiguration(networkAdvertisementConfiguration).then(async (result) => {
                // Mota: el nombre .local puede haber cambiado
                await queryClient.invalidateQueries({queryKey: [QueryKey.NetworkAdvertisementProperties]});

                return result;
            }).then(fetchNetworkAdvertisementConfiguration);
        },
        onError: useOnSettingsChangeError("api.settings.networkAdvertisement")
    });
};

export const useNetworkAdvertisementPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.NetworkAdvertisementProperties],
        queryFn: fetchNetworkAdvertisementProperties,

        staleTime: Infinity,
    });
};

export const useNTPClientStatusQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.NTPClientStatus],
        queryFn: fetchNTPClientStatus,

        staleTime: 5_000,
        refetchInterval: 5_000
    });
};

export const useNTPClientConfigurationQuery = () => {
    return useQuery({
        queryKey: [QueryKey.NTPClientConfiguration],
        queryFn: fetchNTPClientConfiguration,

        staleTime: Infinity,
    });
};

export const useNTPClientConfigurationMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (configuration: NTPClientConfiguration) => {
            return sendNTPClientConfiguration(configuration).then(fetchNTPClientConfiguration).then((configuration) => {
                queryClient.setQueryData<NTPClientConfiguration>([QueryKey.NTPClientConfiguration], configuration, {
                    updatedAt: Date.now(),
                });
            }).then(fetchNTPClientStatus).then((state) => {
                queryClient.setQueryData<NTPClientStatus>([QueryKey.NTPClientStatus], state, {
                    updatedAt: Date.now(),
                });
            });
        },
        onError: useOnSettingsChangeError("api.settings.ntpClient")
    });
};

export const useTimerInfoQuery = () => {
    return useQuery({
        queryKey: [QueryKey.Timers],
        queryFn: fetchTimerInformation
    });
};

export const useTimerPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.TimerProperties],
        queryFn: fetchTimerProperties,

        staleTime: Infinity
    });
};

export const useTimerCreationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.Timers],
        mutationFn: (timer: Timer) => {
            return sendTimerCreation(timer).then(fetchTimerInformation);
        },
        onError: useOnSettingsChangeError("api.settings.timer")
    });
};

export const useTimerModificationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.Timers],
        mutationFn: (timer: Timer) => {
            return sendTimerUpdate(timer).then(fetchTimerInformation);
        },
        onError: useOnSettingsChangeError("api.settings.timer")
    });
};

export const useTimerActionMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.Timers],
        mutationFn: (params: {timerId: string, timerAction: "execute_now"}) => {
            return sendTimerAction(params.timerId, params.timerAction).then(fetchTimerInformation);
        },
        onError: useOnSettingsChangeError("api.settings.timer")
    });
};

export const useTimerDeletionMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.Timers],
        mutationFn:(timerId: string) => {
            return deleteTimer(timerId).then(fetchTimerInformation);
        },
        onError: useOnSettingsChangeError("api.settings.timer")
    });
};

export const useValetudoEventsQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ValetudoEvents],
        queryFn: fetchValetudoEvents,

        staleTime: 30_000,
        refetchInterval: 30_000
    });
};

export const useValetudoEventsInteraction = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.ValetudoEvents],
        mutationFn: (interaction: ValetudoEventInteractionContext) => {
            return sendValetudoEventInteraction(interaction).then(fetchValetudoEvents);
        },
        onError: useOnSettingsChangeError("api.settings.events")
    });
};

export function useValetudoLogQuery(): UseQueryResult<string>;
export function useValetudoLogQuery<T>(
    select: (status: StatusState) => T
): UseQueryResult<T>;
export function useValetudoLogQuery() {
    useSSECacheAppender(QueryKey.Log, subscribeToLogMessages);

    return useQuery({
        queryKey: [QueryKey.Log],
        queryFn: fetchValetudoLog,

        staleTime: Infinity,
    });
}

export const useLogLevelQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.LogLevel],
        queryFn: fetchValetudoLogLevel,

        staleTime: Infinity
    });
};

export const useLogLevelMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.LogLevel],
        mutationFn: (logLevel: SetLogLevelRequest) => {
            return sendValetudoLogLevel(logLevel).then(fetchValetudoLogLevel);
        },
        onError: useOnSettingsChangeError("api.settings.logLevel")
    });
};

export const usePersistentMapQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.PersistentMap],
        queryFn: fetchPersistentMapState,

        staleTime: Infinity
    });
};

export const usePersistentMapMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.PersistentMap],
        mutationFn: (enabled: boolean) => {
            return sendPersistentMapEnabled(enabled).then(fetchPersistentMapState);
        },
        onError: useOnCommandError(Capability.PersistentMapControl)
    });
};

export const useMapResetMutation = () => {
    return useMutation({
        mutationFn: sendMapReset,
        onError: useOnCommandError(Capability.MapReset),
    });
};

export const useStartMappingPassMutation = () => {
    return useMutation({
        mutationFn: sendStartMappingPass,
        onError: useOnCommandError(Capability.MappingPass),
    });
};

export const useSpeakerVolumeStateQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.SpeakerVolume],
        queryFn: fetchSpeakerVolumeState,

        staleTime: Infinity
    });
};

export const useSpeakerVolumeMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.SpeakerVolume],
        mutationFn: (volume: number) => {
            return sendSpeakerVolume(volume).then(fetchSpeakerVolumeState);
        },
        onError: useOnCommandError(Capability.SpeakerVolumeControl)
    });
};

export const useSpeakerTestTriggerTriggerMutation = () => {
    return useMutation({
        mutationFn: sendSpeakerTestCommand,
        onError: useOnCommandError(Capability.SpeakerTest)
    });
};

export const useVoicePackManagementStateQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.VoicePackManagement],
        queryFn: fetchVoicePackManagementState,

        staleTime: 500,
    });
};

export const useVoicePackManagementMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.VoicePackManagement],
        mutationFn: (command: VoicePackManagementCommand) => {
            return sendVoicePackManagementCommand(command).then(fetchVoicePackManagementState);
        },
        onError: useOnCommandError(Capability.VoicePackManagement)
    });
};

export const useKeyLockStateQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.KeyLockInformation],
        queryFn: fetchKeyLockState,

        staleTime: Infinity
    });
};

export const useKeyLockStateMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.KeyLockInformation],
        mutationFn: (enable: boolean) => {
            return sendKeyLockEnable(enable).then(fetchKeyLockState);
        },
        onError: useOnCommandError(Capability.KeyLock)
    });
};

export const useCarpetModeStateQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.CarpetMode],
        queryFn: fetchCarpetModeState,

        staleTime: Infinity
    });
};

export const useCarpetModeStateMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.CarpetMode],
        mutationFn: (enable: boolean) => {
            return sendCarpetModeEnable(enable).then(fetchCarpetModeState);
        },
        onError: useOnCommandError(Capability.CarpetModeControl)
    });
};

export const useObstacleAvoidanceControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ObstacleAvoidance],
        queryFn: fetchObstacleAvoidanceControlState,

        staleTime: Infinity
    });
};

export const useObstacleAvoidanceControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.ObstacleAvoidance],
        mutationFn: (enable: boolean) => {
            return sendObstacleAvoidanceControlState(enable).then(fetchObstacleAvoidanceControlState);
        },
        onError: useOnCommandError(Capability.ObstacleAvoidanceControl)
    });
};

export const usePetObstacleAvoidanceControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.PetObstacleAvoidance],
        queryFn: fetchPetObstacleAvoidanceControlState,

        staleTime: Infinity
    });
};

export const usePetObstacleAvoidanceControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.PetObstacleAvoidance],
        mutationFn: (enable: boolean) => {
            return sendPetObstacleAvoidanceControlState(enable).then(fetchPetObstacleAvoidanceControlState);
        },
        onError: useOnCommandError(Capability.PetObstacleAvoidanceControl)
    });
};

export const useCollisionAvoidantNavigationControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.CollisionAvoidantNavigation],
        queryFn: fetchCollisionAvoidantNavigationControlState,

        staleTime: Infinity
    });
};

export const useCollisionAvoidantNavigationControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.CollisionAvoidantNavigation],
        mutationFn: (enable: boolean) => {
            return sendCollisionAvoidantNavigationControlState(enable).then(fetchCollisionAvoidantNavigationControlState);
        },
        onError: useOnCommandError(Capability.CollisionAvoidantNavigation)
    });
};

export const useDoNotDisturbConfigurationQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.DoNotDisturb],
        queryFn: fetchDoNotDisturbConfiguration,

        staleTime: Infinity
    });
};

export const useDoNotDisturbConfigurationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.DoNotDisturb],
        mutationFn: (configuration: DoNotDisturbConfiguration) => {
            return sendDoNotDisturbConfiguration(configuration).then(fetchDoNotDisturbConfiguration);
        },
        onError: useOnCommandError(Capability.DoNotDisturb)
    });
};

export const useWifiStatusQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.WifiStatus],
        queryFn: fetchWifiStatus,

        staleTime: Infinity
    });
};

// Mota: la pantalla principal muestra la señal wifi y la refresca periódicamente
export const useWifiSignalQuery = (enabled: boolean) => {
    return useQuery( {
        queryKey: [QueryKey.WifiStatus, "signal"],
        queryFn: fetchWifiStatus,
        enabled: enabled,

        refetchInterval: 30_000
    });
};

export const useWifiConfigurationPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.WifiConfigurationProperties],
        queryFn: fetchWifiConfigurationProperties,

        staleTime: Infinity
    });
};

export const useWifiConfigurationMutation = (
    options?: UseMutationOptions<void, unknown, WifiConfiguration>
) => {
    const {
        refetch: refetchWifiStatus,
    } = useWifiStatusQuery();

    return useMutation({
        mutationFn: sendWifiConfiguration,
        onError: useOnCommandError(Capability.WifiConfiguration),
        onSuccess: async (data, ...args) => {
            refetchWifiStatus().catch(() => {
                /*intentional*/
            });

            await options?.onSuccess?.(data, ...args);
        }
    });
};

export const useWifiScanQuery = () => {
    return useQuery({
        queryKey: [QueryKey.WifiScan],
        queryFn: fetchWifiScan,

        staleTime: Infinity,
    });
};


export const useManualControlStateQuery = () => {
    return useQuery({
        queryKey: [QueryKey.ManualControl],
        queryFn: fetchManualControlState,

        staleTime: 10_000,
        refetchInterval: 10_000
    });
};

export const useManualControlPropertiesQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ManualControlProperties],
        queryFn: fetchManualControlProperties,

        staleTime: Infinity
    });
};

export const useManualControlInteraction = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.ManualControl],
        mutationFn: (interaction: ManualControlInteraction) => {
            return sendManualControlInteraction(interaction).then(() => {
                if (interaction.action !== "move") {
                    return fetchManualControlState();
                }
            });
        },
        onError: useOnCommandError(Capability.ManualControl)
    });
};

export const useHighResolutionManualControlStateQuery = () => {
    return useQuery({
        queryKey: [QueryKey.HighResolutionManualControl],
        queryFn: fetchHighResolutionManualControlState,

        staleTime: 10_000,
        refetchInterval: 10_000
    });
};

export const useHighResolutionManualControlInteraction = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.HighResolutionManualControl],
        mutationFn: (interaction: HighResolutionManualControlInteraction) => {
            return sendHighResolutionManualControlInteraction(interaction).then(() => {
                if (interaction.action !== "move") {
                    return fetchHighResolutionManualControlState();
                }
            });
        },
        onError: useOnCommandError(Capability.HighResolutionManualControl)
    });
};

export const useCombinedVirtualRestrictionsPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CombinedVirtualRestrictionsProperties],
        queryFn: fetchCombinedVirtualRestrictionsProperties,

        staleTime: Infinity
    });
};

export const useCombinedVirtualRestrictionsMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, CombinedVirtualRestrictionsUpdateRequestParameters>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (parameters: CombinedVirtualRestrictionsUpdateRequestParameters) => {
            return sendCombinedVirtualRestrictionsUpdate(parameters).then(fetchStateAttributes); //TODO: this should actually refetch the map
        },
        onError: useOnCommandError(Capability.CombinedVirtualRestrictions),
        ...options,
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

export const useUpdaterConfigurationQuery = () => {
    return useQuery({
        queryKey: [QueryKey.UpdaterConfiguration],
        queryFn: fetchUpdaterConfiguration,

        staleTime: Infinity,
    });
};

export const useUpdaterConfigurationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.UpdaterConfiguration],
        mutationFn: (updaterConfiguration: UpdaterConfiguration) => {
            return sendUpdaterConfiguration(updaterConfiguration).then(fetchUpdaterConfiguration);
        },
        onError: useOnSettingsChangeError("api.settings.updater")
    });
};

export const useUpdaterStateQuery = () => {
    return useQuery({
        queryKey: [QueryKey.UpdaterState],
        queryFn: fetchUpdaterState,

        staleTime: 5_000,
        refetchInterval: 5_000
    });
};

export const useUpdaterCommandMutation = () => {
    const {
        refetch: refetchUpdaterState,
    } = useUpdaterStateQuery();

    return useMutation({
        mutationFn: sendUpdaterCommand,
        onError: useOnCommandError("api.settings.updaterCommand"),
        onSuccess: () => {
            refetchUpdaterState().catch(() => {/*intentional*/});
        }
    });
};

export const useCurrentStatisticsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CurrentStatistics],
        queryFn: fetchCurrentStatistics,

        staleTime: 30_000,
        refetchInterval: 30_000
    });
};

export const useCurrentStatisticsPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CurrentStatisticsProperties],
        queryFn: fetchCurrentStatisticsProperties,

        staleTime: Infinity
    });
};

export const useTotalStatisticsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.TotalStatistics],
        queryFn: fetchTotalStatistics,

        staleTime: 60_000,
        refetchInterval: 60_000
    });
};

export const useTotalStatisticsPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.TotalStatisticsProperties],
        queryFn: fetchTotalStatisticsProperties,

        staleTime: Infinity
    });
};

export const useQuirksQuery = () => {
    return useQuery({
        queryKey: [QueryKey.Quirks],
        queryFn: fetchQuirks
    });
};

export const useSetQuirkValueMutation = () => {
    const {
        refetch: refetchQuirksState,
    } = useQuirksQuery();

    return useMutation({
        mutationFn: sendSetQuirkValueCommand,
        onError: useOnCommandError(Capability.Quirks),
        onSuccess: () => {
            refetchQuirksState().catch(() => {/*intentional*/});
        }
    });
};

export const useRobotPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.RobotProperties],
        queryFn: fetchRobotProperties,

        staleTime: Infinity,
    });
};

export const useMopDockCleanManualTriggerMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (command: MopDockCleanManualTriggerCommand) => {
            return sendMopDockCleanManualTriggerCommand(command).then(fetchStateAttributes);
        },

        onError: useOnCommandError(Capability.MopDockCleanManualTrigger),
        onSuccess: (data) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
        },
    });
};

export const useMopDockDryManualTriggerMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (command: MopDockDryManualTriggerCommand) => {
            return sendMopDockDryManualTriggerCommand(command).then(fetchStateAttributes);
        },
        onError: useOnCommandError(Capability.MopDockDryManualTrigger),
        onSuccess: (data) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
        },
    });
};

export const useMopExtensionControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.MopExtensionControl],
        queryFn: fetchMopExtensionControlState,

        staleTime: Infinity
    });
};

export const useMopExtensionControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MopExtensionControl],
        mutationFn: (enable: boolean) => {
            return sendMopExtensionControlState(enable).then(fetchMopExtensionControlState);
        },
        onError: useOnCommandError(Capability.MopExtensionControl)
    });
};

export const useCameraLightControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.CameraLightControl],
        queryFn: fetchCameraLightControlState,

        staleTime: Infinity
    });
};

export const useCameraLightControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.CameraLightControl],
        mutationFn: (enable: boolean) => {
            return sendCameraLightControlState(enable).then(fetchCameraLightControlState);
        },
        onError: useOnCommandError(Capability.CameraLightControl)
    });
};

export const useValetudoCustomizationsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.ValetudoCustomizations],
        queryFn: fetchValetudoCustomizations,

        staleTime: Infinity,
    });
};

export const useValetudoCustomizationsMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.ValetudoCustomizations],
        mutationFn: (configuration: ValetudoCustomizations) => {
            return sendValetudoCustomizations(configuration).then(fetchValetudoCustomizations);
        },
        onError: useOnSettingsChangeError("api.settings.customizations")
    });
};

export const useCarpetSensorModeQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CarpetSensorMode],
        queryFn: fetchCarpetSensorMode
    });
};

export const useCarpetSensorModeMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.CarpetSensorMode],
        mutationFn: (mode: CarpetSensorMode) => {
            return sendCarpetSensorMode({mode: mode}).then(fetchCarpetSensorMode);
        },
        onError: useOnCommandError(Capability.CarpetSensorModeControl)
    });
};

export const useCarpetSensorModePropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CarpetSensorModeProperties],
        queryFn: fetchCarpetSensorModeProperties,

        staleTime: Infinity
    });
};


export const useAutoEmptyDockAutoEmptyIntervalQuery = () => {
    return useQuery({
        queryKey: [QueryKey.AutoEmptyDockAutoEmptyInterval],
        queryFn: fetchAutoEmptyDockAutoEmptyInterval
    });
};

export const useAutoEmptyDockAutoEmptyIntervalMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.AutoEmptyDockAutoEmptyInterval],
        mutationFn: (interval: AutoEmptyDockAutoEmptyInterval) => {
            return sendAutoEmptyDockAutoEmptyInterval({interval: interval}).then(fetchAutoEmptyDockAutoEmptyInterval);
        },
        onError: useOnCommandError(Capability.AutoEmptyDockAutoEmptyIntervalControl)
    });
};

export const useAutoEmptyDockAutoEmptyIntervalPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.AutoEmptyDockAutoEmptyIntervalProperties],
        queryFn: fetchAutoEmptyDockAutoEmptyIntervalProperties,

        staleTime: Infinity
    });
};

export const useObstacleImagesQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ObstacleImages],
        queryFn: fetchObstacleImagesState,

        staleTime: Infinity
    });
};

export const useObstacleImagesMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.ObstacleImages],
        mutationFn: (enable: boolean) => {
            return sendObstacleImagesState(enable).then(fetchObstacleImagesState);
        },
        onError: useOnCommandError(Capability.ObstacleImages)
    });
};


export const useObstacleImagesPropertiesQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.ObstacleImagesProperties],
        queryFn: fetchObstacleImagesProperties,

        staleTime: Infinity,
    });
};

export const prefetchObstacleImagesProperties = async (queryClient : QueryClient) => {
    const queryKey = [QueryKey.ObstacleImagesProperties];

    if (!queryClient.getQueryData(queryKey)) {
        return queryClient.prefetchQuery({
            queryKey: [QueryKey.ObstacleImagesProperties],
            queryFn: fetchObstacleImagesProperties,
        });
    }
};

export const useDuststreamingPropertiesQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.DuststreamingProperties],
        queryFn: fetchDuststreamingProperties,

        staleTime: Infinity,
    });
};

export const useDuststreamingConfigurationQuery = (options?: { enabled?: boolean }) => {
    return useQuery( {
        queryKey: [QueryKey.DuststreamingConfiguration],
        queryFn: fetchDuststreamingConfiguration,

        enabled: options?.enabled ?? true,
        staleTime: Infinity,
    });
};

export const useDuststreamingConfigurationMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (configuration: DuststreamingConfiguration) => {
            return sendDuststreamingConfiguration(configuration).then(fetchDuststreamingConfiguration).then((configuration) => {
                queryClient.setQueryData<DuststreamingConfiguration>([QueryKey.DuststreamingConfiguration], configuration, {
                    updatedAt: Date.now(),
                });

                queryClient.invalidateQueries({
                    queryKey: [QueryKey.DuststreamingProperties]
                });
            });
        },
        onError: useOnSettingsChangeError("api.settings.cameraStreaming")
    });
};

export const useMopDockMopWashTemperatureQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MopDockMopWashTemperature],
        queryFn: fetchMopDockMopWashTemperature,
    });
};

export const useMopDockMopWashTemperatureMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MopDockMopWashTemperature],
        mutationFn: (temperature: MopDockMopWashTemperature) => {
            return sendMopDockMopWashTemperature({ temperature: temperature }).then(
                fetchMopDockMopWashTemperature
            );
        },
        onError: useOnCommandError(Capability.MopDockMopWashTemperatureControl),
    });
};

export const useMopDockMopWashTemperaturePropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MopDockMopWashTemperatureProperties],
        queryFn: fetchMopDockMopWashTemperatureProperties,

        staleTime: Infinity,
    });
};

export const useMopTwistControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.MopTwistControl],
        queryFn: fetchMopTwistControlState,

        staleTime: Infinity
    });
};

export const useMopTwistControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MopTwistControl],
        mutationFn: (enable: boolean) => {
            return sendMopTwistControlState(enable).then(fetchMopTwistControlState);
        },
        onError: useOnCommandError(Capability.MopTwistControl)
    });
};

export const useMopExtensionFurnitureLegHandlingControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.MopExtensionFurnitureLegHandlingControl],
        queryFn: fetchMopExtensionFurnitureLegHandlingControlState,

        staleTime: Infinity
    });
};

export const useMopExtensionFurnitureLegHandlingControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MopExtensionFurnitureLegHandlingControl],
        mutationFn: (enable: boolean) => {
            return sendMopExtensionFurnitureLegHandlingControlState(enable).then(fetchMopExtensionFurnitureLegHandlingControlState);
        },
        onError: useOnCommandError(Capability.MopExtensionFurnitureLegHandlingControl)
    });
};

export const useMopDockMopAutoDryingControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.MopDockMopAutoDryingControl],
        queryFn: fetchMopDockMopAutoDryingControlState,

        staleTime: Infinity
    });
};

export const useMopDockMopAutoDryingControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MopDockMopAutoDryingControl],
        mutationFn: (enable: boolean) => {
            return sendMopDockMopAutoDryingControlState(enable).then(fetchMopDockMopAutoDryingControlState);
        },
        onError: useOnCommandError(Capability.MopDockMopAutoDryingControl)
    });
};

export const useFloorMaterialDirectionAwareNavigationControlQuery = () => {
    return useQuery( {
        queryKey: [QueryKey.FloorMaterialDirectionAwareNavigationControl],
        queryFn: fetchFloorMaterialDirectionAwareNavigationControlState,

        staleTime: Infinity
    });
};

export const useFloorMaterialDirectionAwareNavigationControlMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.FloorMaterialDirectionAwareNavigationControl],
        mutationFn: (enable: boolean) => {
            return sendFloorMaterialDirectionAwareNavigationControlState(enable).then(fetchFloorMaterialDirectionAwareNavigationControlState);
        },
        onError: useOnCommandError(Capability.FloorMaterialDirectionAwareNavigationControl)
    });
};

export const useCleanRouteQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CleanRouteControl],
        queryFn: fetchCleanRoute
    });
};

export const useCleanRouteMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.CleanRouteControl],
        mutationFn: (route: CleanRoute) => {
            return sendCleanRoute({route: route}).then(fetchCleanRoute);
        },
        onError: useOnCommandError(Capability.CleanRouteControl)
    });
};

export const useCleanRouteControlPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.CleanRouteControlProperties],
        queryFn: fetchCleanRouteControlProperties,

        staleTime: Infinity
    });
};

export const useMopDockMopDryingTimeQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MopDockMopDryingTimeControl],
        queryFn: fetchMopDockMopDryingTime
    });
};

export const useMopDockMopDryingTimeMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.MopDockMopDryingTimeControl],
        mutationFn: (duration: MopDockMopDryingDuration) => {
            return sendMopDockMopDryingTime({duration: duration}).then(fetchMopDockMopDryingTime);
        },
        onError: useOnCommandError(Capability.MopDockMopDryingTimeControl)
    });
};

export const useMopDockMopDryingTimeControlPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MopDockMopDryingTimeControlProperties],
        queryFn: fetchMopDockMopDryingTimeControlProperties,

        staleTime: Infinity
    });
};

export const useAutoEmptyDockAutoEmptyDurationQuery = () => {
    return useQuery({
        queryKey: [QueryKey.AutoEmptyDockAutoEmptyDurationControl],
        queryFn: fetchAutoEmptyDockAutoEmptyDuration
    });
};

export const useAutoEmptyDockAutoEmptyDurationMutation = () => {
    return useValetudoFetchingMutation({
        queryKey: [QueryKey.AutoEmptyDockAutoEmptyDurationControl],
        mutationFn: (duration: AutoEmptyDockAutoEmptyDuration) => {
            return sendAutoEmptyDockAutoEmptyDuration({duration: duration}).then(fetchAutoEmptyDockAutoEmptyDuration);
        },
        onError: useOnCommandError(Capability.AutoEmptyDockAutoEmptyDurationControl)
    });
};

export const useAutoEmptyDockAutoEmptyDurationControlPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.AutoEmptyDockAutoEmptyDurationControlProperties],
        queryFn: fetchAutoEmptyDockAutoEmptyDurationControlProperties,

        staleTime: Infinity
    });
};

export const useMapAnnotationsPropertiesQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MapAnnotationsProperties],
        queryFn: fetchMapAnnotationsProperties,

        staleTime: Infinity
    });
};

export const useMapAnnotationsMutation = (
    options?: UseMutationOptions<RobotAttribute[], unknown, Array<ValetudoMapAnnotation>>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (mapAnnotations: Array<ValetudoMapAnnotation>) => {
            return sendMapAnnotationsUpdate(mapAnnotations).then(fetchStateAttributes);
        },
        onError: useOnCommandError(Capability.MapAnnotations),
        ...options,
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<RobotAttribute[]>([QueryKey.Attributes], data, {
                updatedAt: Date.now(),
            });
            await queryClient.invalidateQueries({ queryKey: [QueryKey.Map] });
            await options?.onSuccess?.(data, ...args);
        },
    });
};

// Mota: API propia en /api/v2/mota/

export const useMotaCleanHistoryQuery = (options?: { refetchInterval?: number | false }) => {
    return useQuery({
        queryKey: [QueryKey.MotaCleanHistory],
        queryFn: fetchMotaCleanHistory,

        staleTime: 30_000,
        refetchInterval: options?.refetchInterval ?? false,
        retry: 1
    });
};

export const useMotaCleanHistoryTotalsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MotaCleanHistoryTotals],
        queryFn: fetchMotaCleanHistoryTotals,

        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1
    });
};

export const useMotaDiagnosticsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MotaDiagnostics],
        queryFn: fetchMotaDiagnostics,

        staleTime: 15_000,
        refetchInterval: 15_000,
        retry: 1
    });
};

// Mota: zonas de espejo

export const useMotaMirrorsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MotaMirrors],
        queryFn: fetchMotaMirrors,

        staleTime: 30_000,
        retry: 1
    });
};

const getRestrictedZoneBounds = (zone: ValetudoRestrictedZone): string => {
    const xs = [zone.points.pA.x, zone.points.pB.x, zone.points.pC.x, zone.points.pD.x];
    const ys = [zone.points.pA.y, zone.points.pB.y, zone.points.pC.y, zone.points.pD.y];

    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round).join(",");
};

// Guarda las zonas de espejo y, para las nuevas, añade una zona prohibida en el mismo rectángulo
// a las restricciones actuales. Las restricciones que ya existían no se tocan.
export const useMotaMirrorsMutation = (
    options?: UseMutationOptions<Array<MotaMirrorZone>, unknown, MotaMirrorsSaveRequest>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (request: MotaMirrorsSaveRequest) => {
            await sendMotaMirrors(request.zones);

            if (request.newRestrictedZones.length > 0) {
                const current = await fetchCombinedVirtualRestrictions();
                const existingBounds = new Set(current.restrictedZones.filter(zone => {
                    return zone.type === ValetudoRestrictedZoneType.Regular;
                }).map(getRestrictedZoneBounds));
                const zonesToAdd = request.newRestrictedZones.filter(zone => {
                    return !existingBounds.has(getRestrictedZoneBounds(zone));
                });

                if (zonesToAdd.length > 0) {
                    await sendCombinedVirtualRestrictionsUpdate({
                        virtualWalls: current.virtualWalls.map(wall => {
                            return {
                                points: {
                                    pA: {x: wall.points.pA.x, y: wall.points.pA.y},
                                    pB: {x: wall.points.pB.x, y: wall.points.pB.y}
                                }
                            };
                        }),
                        restrictedZones: [
                            ...current.restrictedZones.map(zone => {
                                return {
                                    type: zone.type,
                                    points: {
                                        pA: {x: zone.points.pA.x, y: zone.points.pA.y},
                                        pB: {x: zone.points.pB.x, y: zone.points.pB.y},
                                        pC: {x: zone.points.pC.x, y: zone.points.pC.y},
                                        pD: {x: zone.points.pD.x, y: zone.points.pD.y}
                                    }
                                };
                            }),
                            ...zonesToAdd
                        ]
                    });
                }
            }

            return fetchMotaMirrors();
        },
        onError: useOnCommandError("api.settings.mirrors"),
        ...options,
        onSuccess: async (data, ...args) => {
            queryClient.setQueryData<Array<MotaMirrorZone>>([QueryKey.MotaMirrors], data, {
                updatedAt: Date.now(),
            });
            await queryClient.invalidateQueries({queryKey: [QueryKey.Map]});
            await options?.onSuccess?.(data, ...args);
        },
    });
};

// Mota: habitaciones virtuales y su color

export const useMotaRoomsQuery = () => {
    return useQuery({
        queryKey: [QueryKey.MotaRooms],
        queryFn: fetchMotaRooms,

        staleTime: 30_000,
        retry: 1
    });
};

export const useMotaRoomColorMutation = (
    options?: UseMutationOptions<void, unknown, MotaRoomColorRequest>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: MotaRoomColorRequest) => {
            return sendMotaRoomColor(request.id, request.color);
        },
        onError: useOnCommandError("api.settings.roomColor"),
        ...options,
        onSuccess: async (data, ...args) => {
            await queryClient.invalidateQueries({queryKey: [QueryKey.MotaRooms]});
            await queryClient.invalidateQueries({queryKey: [QueryKey.Map]});
            await options?.onSuccess?.(data, ...args);
        },
    });
};

// Mota: repetir la división automática en habitaciones

export const useMotaResegmentMutation = (
    options?: UseMutationOptions<void, unknown, void>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sendMotaResegment,
        onError: useOnCommandError("api.settings.resegment"),
        ...options,
        onSuccess: async (data, ...args) => {
            await queryClient.invalidateQueries({queryKey: [QueryKey.Map]});
            await options?.onSuccess?.(data, ...args);
        },
    });
};
