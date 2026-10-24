import React from "react";
import {Box, styled} from "@mui/material";
import {ActionButton} from "../../Styled";
import {
    Help as HelpIcon
} from "@mui/icons-material";
import {useTranslation} from "react-i18next";

const HelpButtonContainer = styled(Box)(({theme}) => {
    return {
        position: "absolute",
        pointerEvents: "none",
        top: theme.spacing(2),
        right: theme.spacing(2),
    };
});

export type mode = "segments" | "virtual_restrictions";

const ModeSwitchAction: React.FunctionComponent<{ helpDialogOpen: boolean, setHelpDialogOpen: (open: boolean) => void }> = (
    {
        helpDialogOpen,
        setHelpDialogOpen
    }
): React.ReactElement => {
    const {t} = useTranslation();

    return (
        <HelpButtonContainer>
            <ActionButton
                color="inherit"
                size="medium"
                variant="extended"
                onClick={() => {
                    setHelpDialogOpen(true);
                }}
                title={t("common.help")}
            >
                <HelpIcon/>
            </ActionButton>
        </HelpButtonContainer>
    );
};

export default ModeSwitchAction;
