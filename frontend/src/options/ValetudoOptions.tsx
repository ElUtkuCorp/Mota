import React from "react";
import {
    RestartAlt as ConfigRestoreIcon,
    SystemUpdateAlt as UpdaterIcon,
    Badge as FriendlyNameIcon,
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
import {useTranslation} from "react-i18next";


const ConfigRestoreButtonListMenuItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        mutate: restoreDefaultConfiguration,
        isPending: restoreDefaultConfigurationIsExecuting
    } = useRestoreDefaultConfigurationMutation();

    return (
        <ButtonListMenuItem
            primaryLabel={t("options.mota.restoreDefaults.title")}
            secondaryLabel={t("options.mota.restoreDefaults.description")}
            icon={<ConfigRestoreIcon/>}
            buttonLabel={t("options.mota.restoreDefaults.button")}
            buttonColor={"error"}
            confirmationDialog={{
                title: t("options.mota.restoreDefaults.confirmTitle"),
                body: t("options.mota.restoreDefaults.confirmBody")
            }}
            action={() => {
                restoreDefaultConfiguration();
            }}
            actionLoading={restoreDefaultConfigurationIsExecuting}
        />
    );
};

const FriendlyNameEditModalListMenuItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: valetudoCustomizations,
        isPending: valetudoCustomizationsPending,
    } = useValetudoCustomizationsQuery();
    const {
        mutate: updateValetudoCustomizations,
        isPending: valetudoCustomizationsUpdating
    } = useValetudoCustomizationsMutation();

    const description = t("options.mota.friendlyName.description");
    let secondaryLabel = description;

    if (valetudoCustomizations && valetudoCustomizations.friendlyName !== "") {
        secondaryLabel = valetudoCustomizations.friendlyName;
    }

    return (
        <TextEditModalListMenuItem
            isLoading={valetudoCustomizationsPending || valetudoCustomizationsUpdating}
            value={valetudoCustomizations?.friendlyName ?? ""}

            dialog={{
                title: t("options.mota.friendlyName.title"),
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
            primaryLabel={t("options.mota.friendlyName.title")}
            secondaryLabel={secondaryLabel}
        />
    );
};

// Labels are i18n keys
const updateProviders : Array<SelectListMenuItemOption> = [
    {
        value: "github",
        label: "options.updater.channel.stable"
    },
    {
        value: "github_nightly",
        label: "options.updater.channel.prerelease"
    }
];

const UpdateProviderSelectListMenuItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: storedConfiguration,
        isPending: configurationPending,
        isError: configurationError,
    } = useUpdaterConfigurationQuery();

    const {mutate: updateConfiguration, isPending: configurationUpdating} = useUpdaterConfigurationMutation();

    const disabled = configurationPending || configurationUpdating || configurationError;

    const translatedUpdateProviders = React.useMemo(() => {
        return updateProviders.map(provider => {
            return {
                value: provider.value,
                label: t(provider.label)
            };
        });
    }, [t]);

    const currentValue = translatedUpdateProviders.find(provider => provider.value === storedConfiguration?.updateProvider) ?? {value: "", label: ""};

    return (
        <SelectListMenuItem
            options={translatedUpdateProviders}
            currentValue={currentValue}
            setValue={(e) => {
                updateConfiguration({
                    updateProvider: e.value
                } as UpdaterConfiguration);
            }}
            disabled={disabled}
            loadingOptions={false}
            loadError={configurationError}
            primaryLabel={t("options.updater.channel.title")}
            secondaryLabel={t("options.updater.channel.description")}
            icon={<UpdaterIcon/>}
        />
    );
};

// Mota: repositorio de GitHub del que se descargan las actualizaciones (modo avanzado), para que
// quien haga su propio fork pueda cambiarlo sin tocar código
const UpdateRepositoryEditModalListMenuItem = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: storedConfiguration,
        isPending: configurationPending,
    } = useUpdaterConfigurationQuery();
    const {mutate: updateConfiguration, isPending: configurationUpdating} = useUpdaterConfigurationMutation();

    const description = t("options.updater.repository.description");

    return (
        <TextEditModalListMenuItem
            isLoading={configurationPending || configurationUpdating}
            value={storedConfiguration?.repository ?? ""}

            dialog={{
                title: t("options.updater.repository.title"),
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
            primaryLabel={t("options.updater.repository.title")}
            secondaryLabel={storedConfiguration?.repository ?? description}
        />
    );
};

const ValetudoOptions = (): React.ReactElement => {
    const {t} = useTranslation();
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
        ];

        if (duststreamingCapabilitySupported) {
            items.push(
                <SpacerListMenuItem key={"spacer1"}/>,
                <DuststreamingListMenuItem key={"duststreaming"}/>
            );
        }

        return items;
    }, [duststreamingCapabilitySupported]);

    return (
        <PaperContainer>
            <ListMenu
                primaryHeader={t("options.mota.title")}
                secondaryHeader={t("options.mota.description")}
                listItems={listItems}
            />
        </PaperContainer>
    );
};

export default ValetudoOptions;
