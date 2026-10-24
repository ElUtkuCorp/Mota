import {Grid2} from "@mui/material";
import {
    AppRegistration as OperationModeIcon,
} from "@mui/icons-material";
import {Capability, useRobotInformationQuery} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import BasicControls from "./BasicControls";
import PresetSelectionControl from "./PresetSelection";
import RobotStatus from "./RobotStatus";
import Dock from "./Dock";
import CurrentStatistics from "./CurrentStatistics";
import Attachments from "./Attachments";
import {FanSpeedMediumIcon, WaterGradeLowIcon} from "../components/CustomIcons";
import React from "react";
import {useTranslation} from "react-i18next";


const ControlsBody = (): React.ReactElement => {
    const {t} = useTranslation();
    const [
        basicControls,
        fanSpeed,
        waterControl,
        operationMode,
        triggerEmptySupported,
        mopDockCleanTriggerSupported,
        mopDockDryTriggerSupported,
        currentStatistics,
    ] = useCapabilitiesSupported(
        Capability.BasicControl,
        Capability.FanSpeedControl,
        Capability.WaterUsageControl,
        Capability.OperationModeControl,
        Capability.AutoEmptyDockManualTrigger,
        Capability.MopDockCleanManualTrigger,
        Capability.MopDockDryManualTrigger,
        Capability.CurrentStatistics
    );

    const {
        data: robotInformation,
    } = useRobotInformationQuery();


    return (
        <Grid2 container spacing={1.5} direction="column" sx={{userSelect: "none"}}>
            {basicControls && <BasicControls />}

            <RobotStatus />

            {operationMode && (
                <PresetSelectionControl
                    capability={Capability.OperationModeControl}
                    label={t("controls.mode")}
                    icon={
                        <OperationModeIcon
                            fontSize="small"
                        />
                    }
                />
            )}

            {fanSpeed && (
                <PresetSelectionControl
                    capability={Capability.FanSpeedControl}
                    label={t("controls.fanSpeed")}
                    icon={
                        <FanSpeedMediumIcon
                            fontSize="small"
                        />
                    }
                />
            )}
            {waterControl && (
                <PresetSelectionControl
                    capability={Capability.WaterUsageControl}
                    label={t("controls.waterUsage")}
                    icon={<WaterGradeLowIcon fontSize="small" />}
                />
            )}

            {
                (triggerEmptySupported || mopDockCleanTriggerSupported || mopDockDryTriggerSupported) &&

                <Dock/>
            }

            {
                robotInformation &&
                robotInformation.modelDetails.supportedAttachments.length > 0 &&

                <Attachments/>
            }

            {currentStatistics && <CurrentStatistics/>}
        </Grid2>
    );
};

export default ControlsBody;
