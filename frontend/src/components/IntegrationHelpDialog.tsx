import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Typography
} from "@mui/material";
import InfoBox from "./InfoBox";
import {useTranslation} from "react-i18next";

const IntegrationHelpDialog: React.FunctionComponent<{
    dialogOpen: boolean,
    setDialogOpen: (newOpen: boolean) => void,
    helperText: string,
    coordinatesWarning: boolean,
    payload: string
}> = ({
    dialogOpen,
    setDialogOpen,
    helperText,
    coordinatesWarning,
    payload
}): React.ReactElement => {
    const {t} = useTranslation();

    return (
        <Dialog
            onClose={() =>{
                setDialogOpen(false);
            }}
            open={dialogOpen}

            style={{userSelect: "none"}}
        >
            <DialogTitle>
                {t("components.integrationHelp.title")}
            </DialogTitle>
            <DialogContent>
                <DialogContentText component={"span"}>
                    {helperText}

                    {
                        coordinatesWarning &&
                        <InfoBox
                            boxShadow={5}
                            style={{
                                marginTop: "1.5rem",
                            }}
                        >
                            <Typography color="info">
                                {t("components.integrationHelp.coordinatesWarning")}
                            </Typography>
                        </InfoBox>
                    }
                    <div style={{padding: "1rem"}}>
                        <pre
                            style={{
                                backgroundColor: "#000000",
                                padding: "1rem",
                                userSelect: "text",
                                color: "#ffffff",
                                fontFamily: "\"JetBrains Mono\",monospace",
                                fontWeight: 200,
                                whiteSpace: "pre-wrap"
                            }}
                        >
                            {payload}
                        </pre>
                    </div>
                </DialogContentText>
            </DialogContent>

            <DialogActions>
                <Button autoFocus onClick={() => {
                    setDialogOpen(false);
                }}>
                    {t("common.ok")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default IntegrationHelpDialog;
