import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {
    Capability,
    useDuststreamingConfigurationQuery,
    useMapResetMutation,
    useMotaMirrorsQuery,
    usePersistentMapMutation,
    usePersistentMapQuery,
    useRobotMapQuery,
    useStartMappingPassMutation,
    useValetudoInformationQuery
} from "../api";
import {
    Save as PersistentMapControlIcon,
    Layers as MappingPassIcon,
    LayersClear as MapResetIcon,
    Dashboard as SegmentEditIcon,
    Crop as CleanupCoverageIcon,
    Download as ValetudoMapDownloadIcon,
    EditNote as MapAnnotationsIcon,
    Videocam as SpectatorIcon,
    Flip as MirrorsIcon,
} from "@mui/icons-material";
import React from "react";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { LinkListMenuItem } from "../components/list_menu/LinkListMenuItem";
import { ButtonListMenuItem } from "../components/list_menu/ButtonListMenuItem";
import {SpacerListMenuItem} from "../components/list_menu/SpacerListMenuItem";
import {ListMenu} from "../components/list_menu/ListMenu";
import {ToggleSwitchListMenuItem} from "../components/list_menu/ToggleSwitchListMenuItem";
import PaperContainer from "../components/PaperContainer";
import {VirtualRestrictionsIcon} from "../components/CustomIcons";
import {useTranslation} from "react-i18next";


export const MappingPassButtonItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {mutate: startMappingPass, isPending: mappingPassStarting} = useStartMappingPassMutation();

    return (
        <ButtonListMenuItem
            primaryLabel={t("options.map.mappingPass.title")}
            secondaryLabel={t("options.map.mappingPass.description")}
            icon={<MappingPassIcon/>}
            buttonLabel={t("options.map.mappingPass.button")}
            confirmationDialog={{
                title: t("options.map.mappingPass.confirmTitle"),
                body: t("options.map.mappingPass.confirmBody")
            }}
            action={startMappingPass}
            actionLoading={mappingPassStarting}
        />
    );
};

const MapResetButtonItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {mutate: resetMap, isPending: mapResetting} = useMapResetMutation();

    return (
        <ButtonListMenuItem
            primaryLabel={t("options.map.reset.title")}
            secondaryLabel={t("options.map.reset.description")}
            icon={<MapResetIcon/>}
            buttonLabel={t("options.map.reset.button")}
            buttonColor={"error"}
            confirmationDialog={{
                title: t("options.map.reset.confirmTitle"),
                body: t("options.map.reset.confirmBody")
            }}
            action={resetMap}
            actionLoading={mapResetting}
        />
    );
};

export const PersistentMapSwitchListItem = () => {
    const {t} = useTranslation();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const {
        data: persistentData,
        isFetching: persistentDataLoading,
        isError: persistentDataError,
    } = usePersistentMapQuery();

    const {mutate: mutatePersistentData, isPending: persistentDataChanging} = usePersistentMapMutation();
    const loading = persistentDataLoading || persistentDataChanging;
    const disabled = loading || persistentDataChanging || persistentDataError;

    return (
        <>
            <ToggleSwitchListMenuItem
                value={persistentData?.enabled ?? false}
                setValue={(value) => {
                    // Disabling requires confirmation
                    if (value) {
                        mutatePersistentData(true);
                    } else {
                        setDialogOpen(true);
                    }
                }}
                disabled={disabled}
                loadError={persistentDataError}
                primaryLabel={t("options.map.persistent.title")}
                secondaryLabel={t("options.map.persistent.description")}
                icon={<PersistentMapControlIcon/>}
            />
            <ConfirmationDialog
                title={t("options.map.persistent.disableTitle")}
                text={(
                    <>
                        {t("options.map.persistent.disableQuestion")}<br/>
                        {t("options.map.persistent.disableWarning")}
                    </>
                )}
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                }}
                onAccept={() => {
                    mutatePersistentData(false);
                }}
            />
        </>
    );
};

const ValetudoMapDataExportButtonItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: valetudoInformation,
        isPending: valetudoInformationPending
    } = useValetudoInformationQuery();

    const {
        data: mapData,
        isPending: mapPending,
    } = useRobotMapQuery();


    return (
        <ButtonListMenuItem
            primaryLabel={t("options.map.export.title")}
            secondaryLabel={t("options.map.export.description")}
            icon={<ValetudoMapDownloadIcon/>}
            buttonLabel={t("options.map.export.button")}
            action={() => {
                if (valetudoInformation && mapData) {
                    const timestamp = new Date().toISOString().replaceAll(":","-").split(".")[0];
                    const mapExportBlob = new Blob(
                        [JSON.stringify(mapData, null, 2)],
                        { type: "application/json" }
                    );

                    const linkElement = document.createElement("a");

                    linkElement.href = URL.createObjectURL(mapExportBlob);
                    linkElement.download = `ValetudoMapExport-${valetudoInformation.systemId}-${timestamp}.json`;

                    linkElement.click();
                }
            }}
            actionLoading={valetudoInformationPending || mapPending}
        />
    );
};

const MapManagement = (): React.ReactElement => {
    const {t} = useTranslation();
    const [
        persistentMapControlCapabilitySupported,
        mappingPassCapabilitySupported,
        mapResetCapabilitySupported,

        mapSegmentEditCapabilitySupported,
        mapSegmentRenameCapabilitySupported,

        combinedVirtualRestrictionsCapabilitySupported,
        mapAnnotationsCapabilitySupported,

        duststreamingCapabilitySupported
    ] = useCapabilitiesSupported(
        Capability.PersistentMapControl,
        Capability.MappingPass,
        Capability.MapReset,

        Capability.MapSegmentEdit,
        Capability.MapSegmentRename,

        Capability.CombinedVirtualRestrictions,
        Capability.MapAnnotations,

        Capability.Duststreaming
    );

    const {data: duststreamingConfiguration} = useDuststreamingConfigurationQuery({
        enabled: duststreamingCapabilitySupported
    });
    const duststreamingEnabled = duststreamingConfiguration?.enabled === true;

    // Mota: las zonas de espejo solo existen si responde la API propia
    const {data: mirrorZones} = useMotaMirrorsQuery();
    const mirrorsAvailable = mirrorZones !== undefined;

    const robotManagedListItems = React.useMemo(() => {
        const items = [];

        if (
            persistentMapControlCapabilitySupported ||
            mappingPassCapabilitySupported ||
            mapResetCapabilitySupported
        ) {
            if (persistentMapControlCapabilitySupported) {
                items.push(
                    <PersistentMapSwitchListItem key="persistentMapSwitch"/>
                );
            }

            if (mappingPassCapabilitySupported) {
                items.push(
                    <MappingPassButtonItem key="mappingPass"/>
                );
            }

            if (mapResetCapabilitySupported) {
                items.push(
                    <MapResetButtonItem key="mapReset"/>
                );
            }

            if (
                mapSegmentEditCapabilitySupported || mapSegmentRenameCapabilitySupported ||
                combinedVirtualRestrictionsCapabilitySupported || mirrorsAvailable
            ) {
                items.push(<SpacerListMenuItem key={"spacer1"}/>);
            }
        }


        if (mapSegmentEditCapabilitySupported || mapSegmentRenameCapabilitySupported) {
            items.push(
                <LinkListMenuItem
                    key="segmentManagement"
                    url="/options/map_management/segments"
                    primaryLabel={t("options.map.segmentManagement.title")}
                    secondaryLabel={t("options.map.segmentManagement.description")}
                    icon={<SegmentEditIcon/>}
                />
            );
        }

        if (combinedVirtualRestrictionsCapabilitySupported) {
            items.push(
                <LinkListMenuItem
                    key="virtualRestrictionManagement"
                    url="/options/map_management/virtual_restrictions"
                    primaryLabel={t("options.map.virtualRestrictions.title")}
                    secondaryLabel={t("options.map.virtualRestrictions.description")}
                    icon={<VirtualRestrictionsIcon/>}
                />
            );
        }

        if (mirrorsAvailable) {
            items.push(
                <LinkListMenuItem
                    key="mirrorManagement"
                    url="/options/map_management/mirrors"
                    primaryLabel={t("options.map.mirrors.title")}
                    secondaryLabel={t("options.map.mirrors.description")}
                    icon={<MirrorsIcon/>}
                />
            );
        }

        if (mapAnnotationsCapabilitySupported) {
            items.push(
                <LinkListMenuItem
                    key="mapAnnotationsManagement"
                    url="/options/map_management/annotations"
                    primaryLabel={t("options.map.annotations.title")}
                    secondaryLabel={t("options.map.annotations.description")}
                    icon={<MapAnnotationsIcon/>}
                />
            );
        }

        return items;
    }, [
        persistentMapControlCapabilitySupported,
        mappingPassCapabilitySupported,
        mapResetCapabilitySupported,

        combinedVirtualRestrictionsCapabilitySupported,
        mapAnnotationsCapabilitySupported,
        mapSegmentEditCapabilitySupported,
        mapSegmentRenameCapabilitySupported,
        mirrorsAvailable,
        t
    ]);

    const utilityMapItems = React.useMemo(() => {
        const items = [
            <LinkListMenuItem
                key="robotCoverageMap"
                url="/options/map_management/robot_coverage"
                primaryLabel={t("options.map.coverage.title")}
                secondaryLabel={t("options.map.coverage.description")}
                icon={<CleanupCoverageIcon/>}
            />
        ];

        if (duststreamingCapabilitySupported && duststreamingEnabled) {
            items.push(
                <LinkListMenuItem
                    key="spectatorMap"
                    url="/options/map_management/spectator"
                    primaryLabel={t("options.map.spectator.title")}
                    secondaryLabel={t("options.map.spectator.description")}
                    icon={<SpectatorIcon/>}
                />
            );
        }

        items.push(<ValetudoMapDataExportButtonItem key="valetudoMapDataExport" />);

        return items;
    }, [duststreamingCapabilitySupported, duststreamingEnabled, t]);

    return (
        <PaperContainer>
            <ListMenu
                primaryHeader={t("options.map.robotManagedTitle")}
                secondaryHeader={t("options.map.robotManagedDescription")}
                listItems={robotManagedListItems}
                helpText={t("help.mapManagement")}
            />
            <ListMenu
                primaryHeader={t("options.map.utilitiesTitle")}
                secondaryHeader={t("options.map.utilitiesDescription")}
                listItems={utilityMapItems}
                helpText={t("help.mapUtilities")}
                style={{marginTop: "1rem"}}
            />
        </PaperContainer>
    );
};

export default MapManagement;
