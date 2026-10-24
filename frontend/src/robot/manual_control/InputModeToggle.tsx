import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { InputMode } from "./VirtualController";
import {useTranslation} from "react-i18next";

interface InputModeToggleProps {
    mode: InputMode;
    onChange: (mode: InputMode) => void;
}

export function InputModeToggle({ mode, onChange }: InputModeToggleProps) {
    const {t} = useTranslation();
    const handleChange = (_: React.MouseEvent<HTMLElement>, newMode: InputMode | null) => {
        if (newMode) {
            onChange(newMode);
        }
    };

    return (
        <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleChange}
            size="small"
            sx={{ mb: 8 }}
        >
            <ToggleButton value="joystick">{t("manualControl.modes.joystick")}</ToggleButton>
            <ToggleButton value="dpad">{t("manualControl.modes.dpad")}</ToggleButton>
            <ToggleButton value="keyboard">{t("manualControl.modes.keyboard")}</ToggleButton>
        </ToggleButtonGroup>
    );
}
