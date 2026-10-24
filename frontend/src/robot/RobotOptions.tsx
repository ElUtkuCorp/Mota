// noinspection HtmlUnknownAttribute

import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {
    AutoEmptyDockAutoEmptyDuration,
    AutoEmptyDockAutoEmptyInterval,
    Capability,
    CarpetSensorMode,
    CleanRoute,
    MopDockMopDryingDuration,
    MopDockMopWashTemperature,
    useAutoEmptyDockAutoEmptyDurationControlPropertiesQuery,
    useAutoEmptyDockAutoEmptyDurationMutation,
    useAutoEmptyDockAutoEmptyDurationQuery,
    useAutoEmptyDockAutoEmptyIntervalMutation,
    useAutoEmptyDockAutoEmptyIntervalPropertiesQuery,
    useAutoEmptyDockAutoEmptyIntervalQuery,
    useCameraLightControlMutation,
    useCameraLightControlQuery,
    useCarpetModeStateMutation,
    useCarpetModeStateQuery,
    useCarpetSensorModeMutation,
    useCarpetSensorModePropertiesQuery,
    useCarpetSensorModeQuery,
    useCleanRouteControlPropertiesQuery,
    useCleanRouteMutation,
    useCleanRouteQuery,
    useCollisionAvoidantNavigationControlMutation,
    useCollisionAvoidantNavigationControlQuery,
    useFloorMaterialDirectionAwareNavigationControlMutation,
    useFloorMaterialDirectionAwareNavigationControlQuery,
    useKeyLockStateMutation,
    useKeyLockStateQuery,
    useLocateMutation,
    useMopDockMopAutoDryingControlMutation,
    useMopDockMopAutoDryingControlQuery,
    useMopDockMopDryingTimeControlPropertiesQuery,
    useMopDockMopDryingTimeMutation,
    useMopDockMopDryingTimeQuery,
    useMopDockMopWashTemperatureMutation,
    useMopDockMopWashTemperaturePropertiesQuery,
    useMopDockMopWashTemperatureQuery,
    useMopExtensionControlMutation,
    useMopExtensionControlQuery,
    useMopExtensionFurnitureLegHandlingControlMutation,
    useMopExtensionFurnitureLegHandlingControlQuery,
    useMopTwistControlMutation,
    useMopTwistControlQuery,
    useObstacleAvoidanceControlMutation,
    useObstacleAvoidanceControlQuery,
    useObstacleImagesMutation,
    useObstacleImagesQuery,
    usePetObstacleAvoidanceControlMutation,
    usePetObstacleAvoidanceControlQuery,
} from "../api";
import React from "react";
import {ListMenu} from "../components/list_menu/ListMenu";
import {ToggleSwitchListMenuItem} from "../components/list_menu/ToggleSwitchListMenuItem";
import {
    Air as MopDockMopAutoDryingControlIcon,
    AvTimer as MopDockMopDryingTimeControlIcon,
    AvTimer as AutoEmptyDockAutoEmptyDurationControlIcon,
    AutoDelete as AutoEmptyIntervalControlIcon,
    Cable as ObstacleAvoidanceControlIcon,
    DeviceThermostat as MopDockMopWashTemperatureControlIcon,
    Explore as FloorMaterialDirectionAwareNavigationControlIcon,
    FlashlightOn as CameraLightControlIcon,
    KeyboardDoubleArrowUp as CarpetModeIcon,
    Lock as KeyLockIcon,
    MiscellaneousServices as SystemIcon,
    NotListedLocation as LocateIcon,
    Pets as PetObstacleAvoidanceControlIcon,
    Photo as ObstacleImagesIcon,
    RoundaboutRight as CollisionAvoidantNavigationControlIcon,
    Route as CleanRouteControlIcon,
    SatelliteAlt as PerceptionIcon,
    Schema as BehaviourIcon,
    Settings as GeneralIcon,
    Star as QuirksIcon,
    TableBar as MopExtensionFurnitureLegHandlingControlIcon,
    Troubleshoot as CarpetSensorModeIcon,
    Tune as MiscIcon,
    Villa as DockIcon
} from "@mui/icons-material";
import {SpacerListMenuItem} from "../components/list_menu/SpacerListMenuItem";
import {LinkListMenuItem} from "../components/list_menu/LinkListMenuItem";
import PaperContainer from "../components/PaperContainer";
import {ButtonListMenuItem} from "../components/list_menu/ButtonListMenuItem";
import {SelectListMenuItem, SelectListMenuItemOption} from "../components/list_menu/SelectListMenuItem";
import {SubHeaderListMenuItem} from "../components/list_menu/SubHeaderListMenuItem";
import {
    MopExtensionControlCapability as MopExtensionControlCapabilityIcon,
    MopTwistControlCapability as MopTwistControlCapabilityIcon,
    MopTwistControlCapabilityExtended as MopTwistControlCapabilityExtendedIcon,
} from "../components/CustomIcons";
import {useTranslation} from "react-i18next";

const LocateButtonListMenuItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        mutate: locate,
        isPending: locateIsExecuting
    } = useLocateMutation();

    return (
        <ButtonListMenuItem
            primaryLabel={t("options.robot.locate.title")}
            secondaryLabel={t("options.robot.locate.description")}
            icon={<LocateIcon/>}
            buttonLabel={t("options.robot.locate.button")}
            action={() => {
                locate();
            }}
            actionLoading={locateIsExecuting}
        />
    );
};

const KeyLockCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useKeyLockStateQuery();

    const {mutate: mutate, isPending: isChanging} = useKeyLockStateMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.keyLock.title")}
            secondaryLabel={t("options.robot.keyLock.description")}
            icon={<KeyLockIcon/>}
        />
    );
};

const CarpetModeControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useCarpetModeStateQuery();

    const {mutate: mutate, isPending: isChanging} = useCarpetModeStateMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.carpetMode.title")}
            secondaryLabel={t("options.robot.carpetMode.description")}
            icon={<CarpetModeIcon/>}
        />
    );
};

const CarpetSensorModeControlCapabilitySelectListMenuItem = () => {
    const {t} = useTranslation();
    const SORT_ORDER = {
        "off": 4,
        "detach": 3,
        "avoid": 2,
        "lift": 1
    };

    const {
        data: carpetSensorModeProperties,
        isPending: carpetSensorModePropertiesPending,
        isError: carpetSensorModePropertiesError
    } = useCarpetSensorModePropertiesQuery();

    const options: Array<SelectListMenuItemOption> = (
        carpetSensorModeProperties?.supportedModes ?? []
    ).sort((a, b) => {
        const aMapped = SORT_ORDER[a] ?? 10;
        const bMapped = SORT_ORDER[b] ?? 10;

        if (aMapped < bMapped) {
            return -1;
        } else if (bMapped < aMapped) {
            return 1;
        } else {
            return 0;
        }
    }).map((val: CarpetSensorMode) => {
        let label;

        switch (val) {
            case "off":
                label = t("options.robot.carpetSensor.none");
                break;
            case "avoid":
                label = t("options.robot.carpetSensor.avoid");
                break;
            case "lift":
                label = t("options.robot.carpetSensor.lift");
                break;
            case "detach":
                label = t("options.robot.carpetSensor.detach");
                break;
        }

        return {
            value: val,
            label: label
        };
    });


    const {
        data: data,
        isPending: isPending,
        isFetching: isFetching,
        isError: isError,
    } = useCarpetSensorModeQuery();

    const {mutate: mutate, isPending: isChanging} = useCarpetSensorModeMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    const currentValue = options.find(mode => {
        return mode.value === data;
    }) ?? {value: "", label: ""};


    return (
        <SelectListMenuItem
            options={options}
            currentValue={currentValue}
            setValue={(e) => {
                mutate(e.value as CarpetSensorMode);
            }}
            disabled={disabled}
            loadingOptions={carpetSensorModePropertiesPending || isPending}
            loadError={carpetSensorModePropertiesError}
            primaryLabel={t("options.robot.carpetSensor.title")}
            secondaryLabel={t("options.robot.carpetSensor.description")}
            icon={<CarpetSensorModeIcon/>}
        />
    );
};

const AutoEmptyDockAutoEmptyIntervalControlCapabilitySelectListMenuItem = () => {
    const {t} = useTranslation();
    const SORT_ORDER = {
        "frequent": 1,
        "normal": 2,
        "infrequent": 3,
        "off": 4
    };

    const {
        data: autoEmptyDockAutoEmptyIntervalProperties,
        isPending: autoEmptyDockAutoEmptyIntervalPropertiesPending,
        isError: autoEmptyDockAutoEmptyIntervalPropertiesError
    } = useAutoEmptyDockAutoEmptyIntervalPropertiesQuery();

    const options: Array<SelectListMenuItemOption> = (
        autoEmptyDockAutoEmptyIntervalProperties?.supportedIntervals ?? []
    ).sort((a, b) => {
        const aMapped = SORT_ORDER[a] ?? 10;
        const bMapped = SORT_ORDER[b] ?? 10;

        if (aMapped < bMapped) {
            return -1;
        } else if (bMapped < aMapped) {
            return 1;
        } else {
            return 0;
        }
    }).map((val: AutoEmptyDockAutoEmptyInterval) => {
        let label;

        switch (val) {
            case "frequent":
                label = t("options.robot.autoEmptyInterval.frequent");
                break;
            case "normal":
                label = t("options.robot.autoEmptyInterval.normal");
                break;
            case "infrequent":
                label = t("options.robot.autoEmptyInterval.infrequent");
                break;
            case "off":
                label = t("options.robot.autoEmptyInterval.off");
                break;
        }

        return {
            value: val,
            label: label
        };
    });


    const {
        data: data,
        isPending: isPending,
        isFetching: isFetching,
        isError: isError,
    } = useAutoEmptyDockAutoEmptyIntervalQuery();

    const {mutate: mutate, isPending: isChanging} = useAutoEmptyDockAutoEmptyIntervalMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    const currentValue = options.find(mode => {
        return mode.value === data;
    }) ?? {value: "", label: ""};


    return (
        <SelectListMenuItem
            options={options}
            currentValue={currentValue}
            setValue={(e) => {
                mutate(e.value as AutoEmptyDockAutoEmptyInterval);
            }}
            disabled={disabled}
            loadingOptions={autoEmptyDockAutoEmptyIntervalPropertiesPending || isPending}
            loadError={autoEmptyDockAutoEmptyIntervalPropertiesError}
            primaryLabel={t("options.robot.autoEmptyInterval.title")}
            secondaryLabel={t("options.robot.autoEmptyInterval.description")}
            icon={<AutoEmptyIntervalControlIcon/>}
        />
    );
};


const ObstacleAvoidanceControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useObstacleAvoidanceControlQuery();

    const {mutate: mutate, isPending: isChanging} = useObstacleAvoidanceControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.obstacleAvoidance.title")}
            secondaryLabel={t("options.robot.obstacleAvoidance.description")}
            icon={<ObstacleAvoidanceControlIcon/>}
        />
    );
};

const PetObstacleAvoidanceControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = usePetObstacleAvoidanceControlQuery();

    const {mutate: mutate, isPending: isChanging} = usePetObstacleAvoidanceControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.petObstacleAvoidance.title")}
            secondaryLabel={t("options.robot.petObstacleAvoidance.description")}
            icon={<PetObstacleAvoidanceControlIcon/>}
        />
    );
};

const ObstacleImagesCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useObstacleImagesQuery();

    const {mutate: mutate, isPending: isChanging} = useObstacleImagesMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.obstacleImages.title")}
            secondaryLabel={t("options.robot.obstacleImages.description")}
            icon={<ObstacleImagesIcon/>}
        />
    );
};

const CollisionAvoidantNavigationControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useCollisionAvoidantNavigationControlQuery();

    const {mutate: mutate, isPending: isChanging} = useCollisionAvoidantNavigationControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.collisionAvoidantNavigation.title")}
            secondaryLabel={t("options.robot.collisionAvoidantNavigation.description")}
            icon={<CollisionAvoidantNavigationControlIcon/>}
        />
    );
};

const MopExtensionControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useMopExtensionControlQuery();

    const {mutate: mutate, isPending: isChanging} = useMopExtensionControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.mopExtension.title")}
            secondaryLabel={t("options.robot.mopExtension.description")}
            icon={<MopExtensionControlCapabilityIcon/>}
        />
    );
};

const CameraLightControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useCameraLightControlQuery();

    const {mutate: mutate, isPending: isChanging} = useCameraLightControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.cameraLight.title")}
            secondaryLabel={t("options.robot.cameraLight.description")}
            icon={<CameraLightControlIcon/>}
        />
    );
};

const MopDockMopWashTemperatureControlCapabilitySelectListMenuItem = () => {
    const {t} = useTranslation();
    const SORT_ORDER: Record<MopDockMopWashTemperature, number> = {
        "cold": 1,
        "warm": 2,
        "hot": 3,
        "scalding": 4,
        "boiling": 5,
    };

    const {
        data: mopDockMopWashTemperatureProperties,
        isPending: mopDockMopWashTemperaturePropertiesPending,
        isError: mopDockMopWashTemperaturePropertiesError
    } = useMopDockMopWashTemperaturePropertiesQuery();

    const options: Array<SelectListMenuItemOption> = (
        mopDockMopWashTemperatureProperties?.supportedTemperatures ?? []
    ).sort((a, b) => {
        const aMapped = SORT_ORDER[a] ?? 10;
        const bMapped = SORT_ORDER[b] ?? 10;

        return aMapped - bMapped;
    }).map((val: MopDockMopWashTemperature) => {
        let label;

        switch (val) {
            case "cold":
                label = t("options.robot.mopWashTemperature.cold");
                break;
            case "warm":
                label = t("options.robot.mopWashTemperature.warm");
                break;
            case "hot":
                label = t("options.robot.mopWashTemperature.hot");
                break;
            case "scalding":
                label = t("options.robot.mopWashTemperature.scalding");
                break;
            case "boiling":
                label = t("options.robot.mopWashTemperature.boiling");
                break;
        }

        return {
            value: val,
            label: label
        };
    });


    const {
        data: data,
        isPending: isPending,
        isFetching: isFetching,
        isError: isError,
    } = useMopDockMopWashTemperatureQuery();

    const {mutate: mutate, isPending: isChanging} = useMopDockMopWashTemperatureMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    const currentValue = options.find(mode => {
        return mode.value === data;
    }) ?? {value: "", label: ""};


    return (
        <SelectListMenuItem
            options={options}
            currentValue={currentValue}
            setValue={(e) => {
                mutate(e.value as MopDockMopWashTemperature);
            }}
            disabled={disabled}
            loadingOptions={mopDockMopWashTemperaturePropertiesPending || isPending}
            loadError={mopDockMopWashTemperaturePropertiesError}
            primaryLabel={t("options.robot.mopWashTemperature.title")}
            secondaryLabel={t("options.robot.mopWashTemperature.description")}
            icon={<MopDockMopWashTemperatureControlIcon/>}
        />
    );
};

const MopTwistControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const [
        mopExtensionControlCapabilitySupported,
    ] = useCapabilitiesSupported(
        Capability.MopExtensionControl
    );

    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useMopTwistControlQuery();

    const {mutate: mutate, isPending: isChanging} = useMopTwistControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    let label;
    let icon;
    if (mopExtensionControlCapabilitySupported) {
        label = t("options.robot.mopTwist.descriptionExtended");
        icon = <MopTwistControlCapabilityExtendedIcon/>;
    } else {
        label = t("options.robot.mopTwist.description");
        icon = <MopTwistControlCapabilityIcon/>;
    }

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.mopTwist.title")}
            secondaryLabel={label}
            icon={icon}
        />
    );
};

const MopExtensionFurnitureLegHandlingControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useMopExtensionFurnitureLegHandlingControlQuery();

    const {mutate: mutate, isPending: isChanging} = useMopExtensionFurnitureLegHandlingControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.mopExtensionFurnitureLegs.title")}
            secondaryLabel={t("options.robot.mopExtensionFurnitureLegs.description")}
            icon={<MopExtensionFurnitureLegHandlingControlIcon/>}
        />
    );
};

const MopDockMopAutoDryingControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useMopDockMopAutoDryingControlQuery();

    const {mutate: mutate, isPending: isChanging} = useMopDockMopAutoDryingControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.mopAutoDrying.title")}
            secondaryLabel={t("options.robot.mopAutoDrying.description")}
            icon={<MopDockMopAutoDryingControlIcon/>}
        />
    );
};

const FloorMaterialDirectionAwareNavigationControlCapabilitySwitchListMenuItem = () => {
    const {t} = useTranslation();
    const {
        data: data,
        isFetching: isFetching,
        isError: isError,
    } = useFloorMaterialDirectionAwareNavigationControlQuery();

    const {mutate: mutate, isPending: isChanging} = useFloorMaterialDirectionAwareNavigationControlMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    return (
        <ToggleSwitchListMenuItem
            value={data?.enabled ?? false}
            setValue={(value) => {
                mutate(value);
            }}
            disabled={disabled}
            loadError={isError}
            primaryLabel={t("options.robot.materialAlignedNavigation.title")}
            secondaryLabel={t("options.robot.materialAlignedNavigation.description")}
            icon={<FloorMaterialDirectionAwareNavigationControlIcon/>}
        />
    );
};

const CleanRouteControlCapabilitySelectListMenuItem = () => {
    const {t} = useTranslation();
    const SORT_ORDER = {
        "quick": 1,
        "normal": 2,
        "intensive": 3,
        "deep": 4
    };

    const {
        data: cleanRouteControlProperties,
        isPending: cleanRouteControlPropertiesPending,
        isError: cleanRouteControlPropertiesError
    } = useCleanRouteControlPropertiesQuery();

    const options: Array<SelectListMenuItemOption> = (
        cleanRouteControlProperties?.supportedRoutes ?? []
    ).sort((a, b) => {
        const aMapped = SORT_ORDER[a] ?? 10;
        const bMapped = SORT_ORDER[b] ?? 10;

        if (aMapped < bMapped) {
            return -1;
        } else if (bMapped < aMapped) {
            return 1;
        } else {
            return 0;
        }
    }).map((val: CleanRoute) => {
        let label;

        switch (val) {
            case "quick":
                label = t("options.robot.cleanRoute.quick");
                break;
            case "normal":
                label = t("options.robot.cleanRoute.normal");
                break;
            case "intensive":
                label = t("options.robot.cleanRoute.intensive");
                break;
            case "deep":
                label = t("options.robot.cleanRoute.deep");
                break;
        }

        return {
            value: val,
            label: label
        };
    });

    const description = React.useMemo(() => {
        let desc = t("options.robot.cleanRoute.description");

        if (cleanRouteControlProperties) {
            if (cleanRouteControlProperties.mopOnly.length > 0) {
                const labels = cleanRouteControlProperties.mopOnly.map(route => {
                    const label = options.find(o => o.value === route)?.label ?? t("common.unknown");

                    return t("options.robot.quoted", {value: label});
                });

                desc += " " + t("options.robot.cleanRoute.mopOnly", {count: labels.length, routes: labels.join(", ")});
            }

            if (cleanRouteControlProperties.oneTime.length > 0) {
                const labels = cleanRouteControlProperties.oneTime.map(route => {
                    const label = options.find(o => o.value === route)?.label ?? t("common.unknown");

                    return t("options.robot.quoted", {value: label});
                });

                desc += " " + t("options.robot.cleanRoute.oneTime", {count: labels.length, routes: labels.join(", ")});
            }
        }

        return desc;
    }, [cleanRouteControlProperties, options, t]);


    const {
        data: data,
        isPending: isPending,
        isFetching: isFetching,
        isError: isError,
    } = useCleanRouteQuery();

    const {mutate: mutate, isPending: isChanging} = useCleanRouteMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    const currentValue = options.find(mode => {
        return mode.value === data;
    }) ?? {value: "", label: ""};


    return (
        <SelectListMenuItem
            options={options}
            currentValue={currentValue}
            setValue={(e) => {
                mutate(e.value as CleanRoute);
            }}
            disabled={disabled}
            loadingOptions={cleanRouteControlPropertiesPending || isPending}
            loadError={cleanRouteControlPropertiesError}
            primaryLabel={t("options.robot.cleanRoute.title")}
            secondaryLabel={description}
            icon={<CleanRouteControlIcon/>}
        />
    );
};

const MopDockMopDryingTimeControlCapabilitySelectListMenuItem = () => {
    const {t} = useTranslation();
    const SORT_ORDER = {
        "2h": 1,
        "3h": 2,
        "4h": 3,
        "5h": 4,
        "quiet": 5,
        "cold": 6
    };

    const {
        data: mopDryingTimeProperties,
        isPending: mopDryingTimePropertiesPending,
        isError: mopDryingTimePropertiesError
    } = useMopDockMopDryingTimeControlPropertiesQuery();

    const options: Array<SelectListMenuItemOption> = (
        mopDryingTimeProperties?.supportedDurations ?? []
    ).sort((a, b) => {
        const aMapped = SORT_ORDER[a] ?? 10;
        const bMapped = SORT_ORDER[b] ?? 10;

        if (aMapped < bMapped) {
            return -1;
        } else if (bMapped < aMapped) {
            return 1;
        } else {
            return 0;
        }
    }).map((val: MopDockMopDryingDuration) => {
        let label;

        switch (val) {
            case "2h":
                label = t("options.robot.mopDryingTime.hours", {count: 2});
                break;
            case "3h":
                label = t("options.robot.mopDryingTime.hours", {count: 3});
                break;
            case "4h":
                label = t("options.robot.mopDryingTime.hours", {count: 4});
                break;
            case "5h":
                label = t("options.robot.mopDryingTime.hours", {count: 5});
                break;
            case "quiet":
                label = t("options.robot.mopDryingTime.quiet");
                break;
            case "cold":
                label = t("options.robot.mopDryingTime.cold");
                break;
        }

        return {
            value: val,
            label: label
        };
    });

    const description = React.useMemo(() => {
        let desc = t("options.robot.mopDryingTime.description");

        if (mopDryingTimeProperties?.supportedDurations?.includes("cold")) {
            desc += " " + t("options.robot.mopDryingTime.coldDescription");
        }

        return desc;
    }, [mopDryingTimeProperties, t]);


    const {
        data: data,
        isPending: isPending,
        isFetching: isFetching,
        isError: isError,
    } = useMopDockMopDryingTimeQuery();

    const {mutate: mutate, isPending: isChanging} = useMopDockMopDryingTimeMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    const currentValue = options.find(mode => {
        return mode.value === data;
    }) ?? {value: "", label: ""};


    return (
        <SelectListMenuItem
            options={options}
            currentValue={currentValue}
            setValue={(e) => {
                mutate(e.value as MopDockMopDryingDuration);
            }}
            disabled={disabled}
            loadingOptions={mopDryingTimePropertiesPending || isPending}
            loadError={mopDryingTimePropertiesError}
            primaryLabel={t("options.robot.mopDryingTime.title")}
            secondaryLabel={description}
            icon={<MopDockMopDryingTimeControlIcon/>}
        />
    );
};

const AutoEmptyDockAutoEmptyDurationControlCapabilitySelectListMenuItem = () => {
    const {t} = useTranslation();
    const SORT_ORDER = {
        "auto": 1,
        "short": 2,
        "medium": 3,
        "long": 4
    };

    const {
        data: autoEmptyDurationProperties,
        isPending: autoEmptyDurationPropertiesPending,
        isError: autoEmptyDurationPropertiesError
    } = useAutoEmptyDockAutoEmptyDurationControlPropertiesQuery();

    const options: Array<SelectListMenuItemOption> = (
        autoEmptyDurationProperties?.supportedDurations ?? []
    ).sort((a, b) => {
        const aMapped = SORT_ORDER[a] ?? 10;
        const bMapped = SORT_ORDER[b] ?? 10;

        if (aMapped < bMapped) {
            return -1;
        } else if (bMapped < aMapped) {
            return 1;
        } else {
            return 0;
        }
    }).map((val: AutoEmptyDockAutoEmptyDuration) => {
        let label;

        switch (val) {
            case "auto":
                label = t("options.robot.autoEmptyDuration.auto");
                break;
            case "short":
                label = t("options.robot.autoEmptyDuration.short");
                break;
            case "medium":
                label = t("options.robot.autoEmptyDuration.medium");
                break;
            case "long":
                label = t("options.robot.autoEmptyDuration.long");
                break;
        }

        return {
            value: val,
            label: label
        };
    });

    const {
        data: data,
        isPending: isPending,
        isFetching: isFetching,
        isError: isError,
    } = useAutoEmptyDockAutoEmptyDurationQuery();

    const {mutate: mutate, isPending: isChanging} = useAutoEmptyDockAutoEmptyDurationMutation();
    const loading = isFetching || isChanging;
    const disabled = loading || isChanging || isError;

    const currentValue = options.find(mode => {
        return mode.value === data;
    }) ?? {value: "", label: ""};


    return (
        <SelectListMenuItem
            options={options}
            currentValue={currentValue}
            setValue={(e) => {
                mutate(e.value as AutoEmptyDockAutoEmptyDuration);
            }}
            disabled={disabled}
            loadingOptions={autoEmptyDurationPropertiesPending || isPending}
            loadError={autoEmptyDurationPropertiesError}
            primaryLabel={t("options.robot.autoEmptyDuration.title")}
            secondaryLabel={t("options.robot.autoEmptyDuration.description")}
            icon={<AutoEmptyDockAutoEmptyDurationControlIcon/>}
        />
    );
};

const RobotOptions = (): React.ReactElement => {
    const {t} = useTranslation();
    const [
        locateCapabilitySupported,

        obstacleAvoidanceControlCapabilitySupported,
        petObstacleAvoidanceControlCapabilitySupported,
        cameraLightControlSupported,
        obstacleImagesSupported,
        collisionAvoidantNavigationControlCapabilitySupported,
        floorMaterialDirectionAwareNavigationControlSupported,
        cleanRouteControlSupported,
        carpetModeControlCapabilitySupported,
        carpetSensorModeControlCapabilitySupported,

        mopExtensionControlCapabilitySupported,
        mopTwistControlSupported,
        mopExtensionFurnitureLegHandlingControlSupported,

        autoEmptyDockAutoEmptyIntervalControlCapabilitySupported,
        autoEmptyDockAutoEmptyDurationControlCapabilitySupported,
        mopDockMopAutoDryingControlSupported,
        mopDockMopDryingTimeControlSupported,
        mopDockMopWashTemperatureControlSupported,

        keyLockControlCapabilitySupported,

        speakerVolumeControlCapabilitySupported,
        speakerTestCapabilitySupported,
        voicePackManagementCapabilitySupported,
        doNotDisturbCapabilitySupported,

        quirksCapabilitySupported,
    ] = useCapabilitiesSupported(
        Capability.Locate,

        Capability.ObstacleAvoidanceControl,
        Capability.PetObstacleAvoidanceControl,
        Capability.CameraLightControl,
        Capability.ObstacleImages,
        Capability.CollisionAvoidantNavigation,
        Capability.FloorMaterialDirectionAwareNavigationControl,
        Capability.CleanRouteControl,
        Capability.CarpetModeControl,
        Capability.CarpetSensorModeControl,

        Capability.MopExtensionControl,
        Capability.MopTwistControl,
        Capability.MopExtensionFurnitureLegHandlingControl,

        Capability.AutoEmptyDockAutoEmptyIntervalControl,
        Capability.AutoEmptyDockAutoEmptyDurationControl,
        Capability.MopDockMopAutoDryingControl,
        Capability.MopDockMopDryingTimeControl,
        Capability.MopDockMopWashTemperatureControl,

        Capability.KeyLock,

        Capability.SpeakerVolumeControl,
        Capability.SpeakerTest,
        Capability.VoicePackManagement,
        Capability.DoNotDisturb,

        Capability.Quirks
    );


    const generalListItems = React.useMemo(() => {
        const items = [];

        if (locateCapabilitySupported) {
            items.push(<LocateButtonListMenuItem key={"locateAction"}/>);
        }
        if (keyLockControlCapabilitySupported) {
            items.push(
                <KeyLockCapabilitySwitchListMenuItem key={"keyLockControl"}/>
            );
        }

        return items;
    }, [
        locateCapabilitySupported,
        keyLockControlCapabilitySupported
    ]);


    const behaviorListItems = React.useMemo(() => {
        const items = [];

        if (collisionAvoidantNavigationControlCapabilitySupported) {
            items.push(
                <CollisionAvoidantNavigationControlCapabilitySwitchListMenuItem key={"collisionAvoidantNavigationControl"}/>
            );
        }

        if (floorMaterialDirectionAwareNavigationControlSupported) {
            items.push(<FloorMaterialDirectionAwareNavigationControlCapabilitySwitchListMenuItem
                key="floorMaterialDirectionAwareNavigationControl"
            />);
        }

        if (cleanRouteControlSupported) {
            items.push(<CleanRouteControlCapabilitySelectListMenuItem key="cleanRouteControl"/>);
        }

        if (
            collisionAvoidantNavigationControlCapabilitySupported ||
            floorMaterialDirectionAwareNavigationControlSupported ||
            cleanRouteControlSupported
        ) {
            items.push(<SpacerListMenuItem key={"spacer-navigation"} halfHeight={true}/>);
        }

        if (carpetModeControlCapabilitySupported) {
            items.push(
                <CarpetModeControlCapabilitySwitchListMenuItem key={"carpetModeControl"}/>
            );
        }
        if (carpetSensorModeControlCapabilitySupported) {
            items.push(
                <CarpetSensorModeControlCapabilitySelectListMenuItem key={"carpetSensorModeControl"}/>
            );
        }

        if (carpetModeControlCapabilitySupported || carpetSensorModeControlCapabilitySupported) {
            items.push(<SpacerListMenuItem key={"spacer-carpet"} halfHeight={true}/>);
        }

        if (mopExtensionControlCapabilitySupported) {
            items.push(
                <MopExtensionControlCapabilitySwitchListMenuItem key={"mopExtensionControl"}/>
            );
        }

        if (mopTwistControlSupported) {
            items.push(
                <MopTwistControlCapabilitySwitchListMenuItem key={"mopTwistControl"}/>
            );
        }

        if (mopExtensionFurnitureLegHandlingControlSupported) {
            items.push(
                <MopExtensionFurnitureLegHandlingControlCapabilitySwitchListMenuItem
                    key={"mopExtensionFurnitureLegHandlingControl"}
                />
            );
        }

        if (items.at(-1)?.type === SpacerListMenuItem) {
            items.pop();
        }

        return items;
    }, [
        collisionAvoidantNavigationControlCapabilitySupported,
        floorMaterialDirectionAwareNavigationControlSupported,
        cleanRouteControlSupported,
        carpetModeControlCapabilitySupported,
        carpetSensorModeControlCapabilitySupported,
        mopExtensionControlCapabilitySupported,
        mopTwistControlSupported,
        mopExtensionFurnitureLegHandlingControlSupported,
    ]);

    const navigationListItems = React.useMemo(() => {
        const items = [];

        if (obstacleAvoidanceControlCapabilitySupported) {
            items.push(
                <ObstacleAvoidanceControlCapabilitySwitchListMenuItem key={"obstacleAvoidanceControl"}/>
            );
        }

        if (petObstacleAvoidanceControlCapabilitySupported) {
            items.push(
                <PetObstacleAvoidanceControlCapabilitySwitchListMenuItem key={"petObstacleAvoidanceControl"}/>
            );
        }

        if (obstacleImagesSupported) {
            items.push(
                <ObstacleImagesCapabilitySwitchListMenuItem key={"obstacleImages"}/>
            );
        }

        if (cameraLightControlSupported) {
            items.push(
                <CameraLightControlCapabilitySwitchListMenuItem key={"cameraLightControl"}/>
            );
        }

        return items;
    }, [
        obstacleAvoidanceControlCapabilitySupported,
        petObstacleAvoidanceControlCapabilitySupported,
        obstacleImagesSupported,
        cameraLightControlSupported,
    ]);

    const dockListItems = React.useMemo(() => {
        const items = [];

        if (autoEmptyDockAutoEmptyIntervalControlCapabilitySupported) {
            items.push(
                <AutoEmptyDockAutoEmptyIntervalControlCapabilitySelectListMenuItem
                    key={"autoEmptyDockAutoEmptyIntervalControl"}
                />
            );
        }

        if (autoEmptyDockAutoEmptyDurationControlCapabilitySupported) {
            items.push(
                <AutoEmptyDockAutoEmptyDurationControlCapabilitySelectListMenuItem
                    key={"autoEmptyDockAutoEmptyDurationControl"}
                />
            );
        }

        if (
            autoEmptyDockAutoEmptyIntervalControlCapabilitySupported ||
            autoEmptyDockAutoEmptyDurationControlCapabilitySupported
        ) {
            items.push(<SpacerListMenuItem key={"spacer-auto-empty"} halfHeight={true}/>);
        }

        if (mopDockMopWashTemperatureControlSupported) {
            items.push(
                <MopDockMopWashTemperatureControlCapabilitySelectListMenuItem key={"mopDockMopWashTemperatureControl"}/>
            );
        }

        if (mopDockMopAutoDryingControlSupported) {
            items.push(<MopDockMopAutoDryingControlCapabilitySwitchListMenuItem key="mopDockAutoDryingControl"/>);
        }

        if (mopDockMopDryingTimeControlSupported) {
            items.push(<MopDockMopDryingTimeControlCapabilitySelectListMenuItem key="mopDockMopDryingTimeControl"/>);
        }

        return items;
    }, [
        autoEmptyDockAutoEmptyIntervalControlCapabilitySupported,
        autoEmptyDockAutoEmptyDurationControlCapabilitySupported,
        mopDockMopWashTemperatureControlSupported,
        mopDockMopAutoDryingControlSupported,
        mopDockMopDryingTimeControlSupported,
    ]);

    const miscListItems = React.useMemo(() => {
        const items = [];

        if (
            speakerVolumeControlCapabilitySupported || speakerTestCapabilitySupported ||
            voicePackManagementCapabilitySupported ||
            doNotDisturbCapabilitySupported
        ) {
            const label = [];

            if (voicePackManagementCapabilitySupported) {
                label.push(t("options.robot.systemOptions.voicePacks"));
            }

            if (doNotDisturbCapabilitySupported) {
                label.push(t("options.robot.systemOptions.doNotDisturb"));
            }

            if (speakerVolumeControlCapabilitySupported && speakerTestCapabilitySupported) {
                label.push(t("options.robot.systemOptions.speaker"));
            }

            items.push(
                <LinkListMenuItem
                    key="systemRobotSettings"
                    url="/options/robot/system"
                    primaryLabel={t("options.robot.systemOptions.title")}
                    secondaryLabel={label.join(", ")}
                    icon={<SystemIcon/>}
                />
            );
        }

        if (quirksCapabilitySupported) {
            items.push(
                <LinkListMenuItem
                    key="quirks"
                    url="/options/robot/quirks"
                    primaryLabel={t("options.robot.quirks.title")}
                    secondaryLabel={t("options.robot.quirks.description")}
                    icon={<QuirksIcon/>}
                />
            );
        }

        return items;
    }, [
        speakerVolumeControlCapabilitySupported,
        speakerTestCapabilitySupported,
        voicePackManagementCapabilitySupported,
        doNotDisturbCapabilitySupported,

        quirksCapabilitySupported,
        t
    ]);

    const listItems = React.useMemo(() => {
        const items: Array<React.ReactElement> = [];

        const addGroup = (groupItems: React.ReactElement[], title: string, icon: React.ReactElement) => {
            if (groupItems.length > 0) {
                items.push(
                    <SubHeaderListMenuItem
                        key={`header-${title}`}
                        primaryLabel={title}
                        icon={icon}
                    />
                );
                items.push(...groupItems);
                items.push(<SpacerListMenuItem key={`spacer-${title}`}/>);
            }
        };

        addGroup(generalListItems, t("options.robot.groups.general"), <GeneralIcon/>);
        addGroup(behaviorListItems, t("options.robot.groups.behavior"), <BehaviourIcon/>);
        addGroup(navigationListItems, t("options.robot.groups.perception"), <PerceptionIcon/>);
        addGroup(dockListItems, t("options.robot.groups.dock"), <DockIcon/>);
        addGroup(miscListItems, t("options.robot.groups.misc"), <MiscIcon/>);

        if (items.at(-1)?.type === SpacerListMenuItem) {
            items.pop();
        }

        return items;
    }, [
        generalListItems,
        navigationListItems,
        behaviorListItems,
        dockListItems,
        miscListItems,
        t
    ]);

    return (
        <PaperContainer>
            <ListMenu
                primaryHeader={t("options.robot.title")}
                secondaryHeader={t("options.robot.description")}
                listItems={listItems}
            />
        </PaperContainer>
    );
};

export default RobotOptions;
