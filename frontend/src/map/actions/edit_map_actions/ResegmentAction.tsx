import {StatusState, useMotaResegmentMutation} from "../../../api";
import React from "react";
import {CircularProgress, Grid2} from "@mui/material";
import {ActionButton} from "../../Styled";
import {AutoAwesomeMosaic as ResegmentIcon} from "@mui/icons-material";
import ConfirmationDialog from "../../../components/ConfirmationDialog";
import {useTranslation} from "react-i18next";

interface ResegmentActionProperties {
    robotStatus: StatusState,

    onDone(): void;
}

// Mota: repite la división automática del mapa en habitaciones (se pierden los nombres y la división actual)
const ResegmentAction = (
    props: ResegmentActionProperties
): React.ReactElement => {
    const {t} = useTranslation();
    const {robotStatus, onDone} = props;
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const {
        mutate: resegment,
        isPending: resegmentExecuting
    } = useMotaResegmentMutation({
        onSuccess: onDone
    });

    const canEdit = robotStatus.value === "docked";

    return (
        <Grid2 container spacing={1} direction="row-reverse" flexWrap="wrap-reverse" sx={{mt: 1}}>
            <Grid2>
                <ActionButton
                    disabled={resegmentExecuting || !canEdit}
                    color="inherit"
                    size="medium"
                    variant="extended"
                    onClick={() => {
                        setDialogOpen(true);
                    }}
                >
                    <ResegmentIcon style={{marginRight: "0.25rem", marginLeft: "-0.25rem"}}/>
                    {t("map.segments.resegment.button")}
                    {resegmentExecuting && (
                        <CircularProgress
                            color="inherit"
                            size={18}
                            style={{marginLeft: 10}}
                        />
                    )}
                </ActionButton>
            </Grid2>
            <ConfirmationDialog
                title={t("map.segments.resegment.confirmTitle")}
                text={t("map.segments.resegment.confirmBody")}
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                }}
                onAccept={() => {
                    resegment();
                }}
            />
        </Grid2>
    );
};

export default ResegmentAction;
