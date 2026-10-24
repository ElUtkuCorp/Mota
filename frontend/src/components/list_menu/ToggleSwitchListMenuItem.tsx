import React from "react";
import {Avatar, ListItem, ListItemAvatar, ListItemText, Switch, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";

export const ToggleSwitchListMenuItem: React.FunctionComponent<{
    value: boolean,
    setValue: (newValue: boolean) => void,
    disabled: boolean,
    loadError: boolean,
    primaryLabel: string,
    secondaryLabel: string,
    icon: React.ReactElement
}> = ({
    value,
    setValue,
    disabled,
    loadError,
    primaryLabel,
    secondaryLabel,
    icon
}): React.ReactElement => {
    const {t} = useTranslation();

    let toggle;

    if (loadError) {
        toggle = <Typography variant="body2" color="error">{t("common.error")}</Typography>;
    } else {
        toggle = (
            <Switch
                disabled={disabled}
                checked={value ?? false}
                onChange={(e) => {
                    setValue(e.target.checked);
                }}
            />
        );
    }


    return (
        <ListItem
            style={{
                userSelect: "none"
            }}
        >
            <ListItemAvatar>
                <Avatar>
                    {icon}
                </Avatar>
            </ListItemAvatar>
            <ListItemText
                primary={primaryLabel}
                secondary={secondaryLabel}
                style={{marginRight: "2rem"}}
            />
            {toggle}
        </ListItem>
    );
};
