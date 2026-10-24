import React from "react";
import {
    RestartAlt as ConfigRestoreIcon,
    SystemUpdateAlt as UpdaterIcon,
    Badge as FriendlyNameIcon,
    Equalizer as StatisticsIcon,
    Source as RepositoryIcon,
} from "@mui/icons-material";
import {ListMenu} from "../components/list_menu/ListMenu";
import PaperContainer from "../components/PaperContainer";
import {
    UpdaterConfiguration,
    Capability,
    useRestoreDefaultConfigurationMutation,
    useUpdaterConfigurationMutation,
    useUpdaterConfigurationQuery,
    useValetudoCustomizationsMutation,
    useValetudoCustomizationsQuery
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {ButtonListMenuItem} from "../components/list_menu/ButtonListMenuItem";
import {SelectListMenuItem, SelectListMenuItemOption} from "../components/list_menu/SelectListMenuItem";
import {SpacerListMenuItem} from "../components/list_menu/SpacerListMenuItem";
import { TextEditModalListMenuItem } from "../components/list_menu/TextEditModalListMenuItem";
import { DuststreamingListMenuItem } from "../components/list_menu/DuststreamingListMenuItem";
import { ActivationListMenuItem } from "./ValetudoActivation";
import {isAprilFools} from "../utils";
import {LinkListMenuItem} from "../components/list_menu/LinkListMenuItem";


const ConfigRestoreButtonListMenuItem = (): React.ReactElement => {
    const {
        mutate: restoreDefaultConfiguration,
        isPending: restoreDefaultConfigurationIsExecuting
    } = useRestoreDefaultConfigurationMutation();

    return (
        <ButtonListMenuItem
            primaryLabel="Restore Default Configuration"
            secondaryLabel="This will only affect Valetudo"
            icon={<ConfigRestoreIcon/>}
            buttonLabel="Go"
            buttonColor={"error"}
            confirmationDialog={{
                title: "Restore default Valetudo configuration?",
                body: "Are you sure that you want to restore the default configuration? This will not affect Wi-Fi settings, Map data etc."
            }}
            action={() => {
                restoreDefaultConfiguration();
            }}
            actionLoading={restoreDefaultConfigurationIsExecuting}
        />
    );
};

const FriendlyNameEditModalListMenuItem = (): React.ReactElement => {
    const {
        data: valetudoCustomizations,
        isPending: valetudoCustomizationsPending,
    } = useValetudoCustomizationsQuery();
    const {
        mutate: updateValetudoCustomizations,
        isPending: valetudoCustomizationsUpdating
    } = useValetudoCustomizationsMutation();

    const description = "Set a custom friendly name for Network Advertisement, MQTT etc.";
    let secondaryLabel = description;

    if (valetudoCustomizations && valetudoCustomizations.friendlyName !== "") {
        secondaryLabel = valetudoCustomizations.friendlyName;
    }

    return (
        <TextEditModalListMenuItem
            isLoading={valetudoCustomizationsPending || valetudoCustomizationsUpdating}
            value={valetudoCustomizations?.friendlyName ?? ""}

            dialog={{
                title: "Custom Friendly Name",
                description: description,

                validatingTransformer: (newValue: string) => {
                    return newValue.replace(/[^a-zA-Z0-9 -]/g, "").slice(0,24);
                },
                onSave: (newValue: string) => {
                    updateValetudoCustomizations({
                        friendlyName: newValue
                    });
                }
            }}

            icon={<FriendlyNameIcon/>}
            primaryLabel={"Custom Friendly Name"}
            secondaryLabel={secondaryLabel}
        />
    );
};

const updateProviders : Array<SelectListMenuItemOption> = [
    {
        value: "github",
        label: "Estable"
    },
    {
        value: "github_nightly",
        label: "Pruebas (pre-releases)"
    }
];

const UpdateProviderSelectListMenuItem = (): React.ReactElement => {
    const {
        data: storedConfiguration,
        isPending: configurationPending,
        isError: configurationError,
    } = useUpdaterConfigurationQuery();

    const {mutate: updateConfiguration, isPending: configurationUpdating} = useUpdaterConfigurationMutation();

    const disabled = configurationPending || configurationUpdating || configurationError;

    const currentValue = updateProviders.find(provider => provider.value === storedConfiguration?.updateProvider) ?? {value: "", label: ""};

    return (
        <SelectListMenuItem
            options={updateProviders}
            currentValue={currentValue}
            setValue={(e) => {
                updateConfiguration({
                    updateProvider: e.value
                } as UpdaterConfiguration);
            }}
            disabled={disabled}
            loadingOptions={false}
            loadError={configurationError}
            primaryLabel="Canal de actualizaciones"
            secondaryLabel="Estable usa solo las releases publicadas; Pruebas incluye también las pre-releases"
            icon={<UpdaterIcon/>}
        />
    );
};

// Mota: repositorio de GitHub del que se descargan las actualizaciones (modo avanzado), para que
// quien haga su propio fork pueda cambiarlo sin tocar código
const UpdateRepositoryEditModalListMenuItem = (): React.ReactElement => {
    const {
        data: storedConfiguration,
        isPending: configurationPending,
    } = useUpdaterConfigurationQuery();
    const {mutate: updateConfiguration, isPending: configurationUpdating} = useUpdaterConfigurationMutation();

    const description = "Avanzado: repositorio de GitHub (propietario/nombre) del que se descargan las actualizaciones. Déjalo vacío para usar el de Mota.";

    return (
        <TextEditModalListMenuItem
            isLoading={configurationPending || configurationUpdating}
            value={storedConfiguration?.repository ?? ""}

            dialog={{
                title: "Repositorio de actualizaciones",
                description: description,

                validatingTransformer: (newValue: string) => {
                    return newValue.replace(/[^A-Za-z0-9._/-]/g, "").slice(0, 140);
                },
                onSave: (newValue: string) => {
                    updateConfiguration({
                        updateProvider: storedConfiguration?.updateProvider ?? "github",
                        repository: newValue
                    });
                }
            }}

            icon={<RepositoryIcon/>}
            primaryLabel="Repositorio de actualizaciones"
            secondaryLabel={storedConfiguration?.repository ?? description}
        />
    );
};

const ValetudoOptions = (): React.ReactElement => {
    const [duststreamingCapabilitySupported] = useCapabilitiesSupported(
        Capability.Duststreaming,
    );

    const listItems = React.useMemo(() => {
        const items = [
            <ConfigRestoreButtonListMenuItem key={"configRestoreAction"}/>,
            <SpacerListMenuItem key={"spacer0"}/>,
            <FriendlyNameEditModalListMenuItem key={"friendlyName"}/>,
            <UpdateProviderSelectListMenuItem key={"updateProviderSelect"}/>,
            <UpdateRepositoryEditModalListMenuItem key={"updateRepository"}/>,
            <LinkListMenuItem
                key={"analytics"}
                url="/options/valetudo/analytics"
                primaryLabel="Analytics"
                secondaryLabel="Learn how we use your data"
                icon={<StatisticsIcon />}
            />,
        ];

        if (duststreamingCapabilitySupported) {
            items.push(
                <SpacerListMenuItem key={"spacer1"}/>,
                <DuststreamingListMenuItem key={"duststreaming"}/>
            );
        }

        if (isAprilFools) {
            items.unshift(
                <ActivationListMenuItem key={"activation"}/>,
                <SpacerListMenuItem key={"spacer2"}/>
            );
        }

        return items;
    }, [duststreamingCapabilitySupported]);

    return (
        <PaperContainer>
            <ListMenu
                primaryHeader={"Valetudo Options"}
                secondaryHeader={"Tunables and actions provided by Valetudo"}
                listItems={listItems}
            />
        </PaperContainer>
    );
};

export default ValetudoOptions;
