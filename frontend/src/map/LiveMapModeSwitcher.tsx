import {Box, emphasize, SpeedDial, SpeedDialAction, styled} from "@mui/material";
import {
    CropSquare as ZoneModeIcon,
    Dashboard as SegmentModeIcon,
    Room as GoToModeIcon,
    QuestionMark as NoneModeIcon,
} from "@mui/icons-material";
import React from "react";
import {TransitionProps} from "@mui/material/transitions";
import {LiveMapMode} from "./LiveMap";
import {useTranslation} from "react-i18next";

const LiveMapModeButtonContainer = styled(Box)(({theme}) => {
    return {
        position: "absolute",
        pointerEvents: "none",
        top: theme.spacing(2),
        right: theme.spacing(2),
    };
});

const StyledSpeedDial = styled(SpeedDial)(({theme}) => {
    return {
        "& .MuiSpeedDial-fab": {
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            "&:hover": {
                backgroundColor: emphasize(theme.palette.background.paper, 0.15),
            }
        },
        "& > .MuiSpeedDial-actions > .MuiSpeedDialAction-staticTooltip > .MuiSpeedDialAction-staticTooltipLabel": {
            transition: "none !important",
            WebkitTransition: "none !important",
            transitionDelay: "unset !important",
            userSelect: "none",
            whiteSpace: "nowrap"
        },
        "& > .MuiSpeedDial-actions > .MuiSpeedDialAction-staticTooltip > .MuiFab-root": {
            transition: "none !important",
            WebkitTransition: "none !important",
            transitionDelay: "unset !important",
            border: `1px solid ${theme.palette.divider}`,
        }
    };
});

const modeToIcon: Record<LiveMapMode, React.ReactElement> = {
    "segments": <SegmentModeIcon/>,
    "zones": <ZoneModeIcon/>,
    "goto": <GoToModeIcon/>,
    "none": <NoneModeIcon/>
};

// i18n keys
const modeToLabel: Record<LiveMapMode, string> = {
    "segments": "map.modes.segments",
    "zones": "map.modes.zones",
    "goto": "map.modes.goto",
    "none": "map.modes.none"
};

/* eslint-disable react/display-name */
export const NoTransition = React.forwardRef< // https://stackoverflow.com/a/71617594
    React.ReactElement,
    TransitionProps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    >(({ children }, ref) => {
        return <>{ children }</>;
    });


export const LiveMapModeSwitcher : React.FunctionComponent<{
    supportedModes: Array<LiveMapMode>, // Order is important here
    currentMode: LiveMapMode,
    setMode: (newMode: LiveMapMode) => void
}> = ({
    supportedModes,
    currentMode,
    setMode
}) => {
    const {t} = useTranslation();
    const [open, setOpen] = React.useState(false);

    return (
        <LiveMapModeButtonContainer>
            <StyledSpeedDial
                open={open}
                onClick={() => {
                    setOpen(!open);
                }}
                icon={modeToIcon[currentMode]}
                title={t("map.modeSelector")}
                FabProps={{ size: "small" }}
                ariaLabel={t("map.modeSelector")}
                direction="down"
                TransitionComponent={NoTransition}
            >
                {supportedModes.map((mode) => (
                    <SpeedDialAction
                        key={mode}
                        tooltipOpen
                        tooltipTitle={t(modeToLabel[mode])}
                        icon={modeToIcon[mode]}
                        onClick={() => {
                            setMode(mode);

                            setOpen(false);
                        }}
                    />
                ))}
            </StyledSpeedDial>
        </LiveMapModeButtonContainer>
    );
};

