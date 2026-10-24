import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";
import React, {FunctionComponent} from "react";
import {useTranslation} from "react-i18next";

interface YesNoDialogProps {
    title: string;
    text?: string | React.ReactElement;
    open: boolean;
    children?: React.ReactNode;
    onClose: () => void;
    onAccept: () => void;
}

const ConfirmationDialog: FunctionComponent<YesNoDialogProps> = ({
    title,
    text,
    open,
    children,
    onClose,
    onAccept,
}): React.ReactElement => {
    const {t} = useTranslation();

    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            <DialogTitle>
                {title}
            </DialogTitle>
            <DialogContent>
                {text && (
                    <DialogContentText
                        style={{
                            whiteSpace: "pre-wrap"
                        }}
                    >
                        {text}
                    </DialogContentText>
                )}
                {children}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => {
                    onAccept();
                    onClose();
                }} autoFocus>
                    {t("common.yes")}
                </Button>
                <Button onClick={() => {
                    onClose();
                }}>{t("common.no")}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
