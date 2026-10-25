import React from "react";
import {
    Box,
    Button,
    ButtonBase,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    InputAdornment,
    Radio,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {Check as CheckIcon} from "@mui/icons-material";
import {useTranslation} from "react-i18next";

// Mota: paleta propia: primero los 5 pasteles del sistema visual (los mismos que usa el color automático)
// y después 12 colores suaves, separados en tono para que las habitaciones se distingan bien
export const ROOM_COLOR_PALETTE: Array<{key: string, color: string}> = [
    {key: "sage", color: "#c9e4de"},
    {key: "wheat", color: "#f3d9b1"},
    {key: "wisteria", color: "#d8d4f2"},
    {key: "blush", color: "#f2cfd4"},
    {key: "mist", color: "#cfe0f5"},
    {key: "coral", color: "#ef8a80"},
    {key: "peach", color: "#f4ad72"},
    {key: "sand", color: "#f2d06b"},
    {key: "lime", color: "#c3dd73"},
    {key: "mint", color: "#86d29b"},
    {key: "turquoise", color: "#6fd0c4"},
    {key: "sky", color: "#7cc4ec"},
    {key: "blue", color: "#8aa8ee"},
    {key: "lavender", color: "#a99af0"},
    {key: "lilac", color: "#cc98e6"},
    {key: "pink", color: "#ee93c8"},
    {key: "stone", color: "#bdb6aa"},
];

const COLOR_REGEX = /^#[0-9a-f]{6}$/i;

interface SegmentColorDialogProps {
    open: boolean;
    onClose: () => void;
    name: string;
    // "#rrggbb" o undefined si la habitación usa el color automático
    currentColor: string | undefined;
    // "#rrggbb" en minúsculas, o "" para volver al automático
    onSubmit: (color: string) => void;
}

const SegmentColorDialog = (props: SegmentColorDialogProps): React.ReactElement => {
    const {t} = useTranslation();
    const {open, onClose, name, currentColor, onSubmit} = props;
    const [value, setValue] = React.useState<string>(currentColor ?? "");

    React.useEffect(() => {
        if (open) {
            setValue(currentColor?.toLowerCase() ?? "");
        }
    }, [open, currentColor]);

    const normalizedValue = value.trim().toLowerCase();
    const isAuto = normalizedValue === "";
    const isValid = isAuto || COLOR_REGEX.test(normalizedValue);

    const submit = () => {
        if (isValid) {
            onSubmit(normalizedValue);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} sx={{userSelect: "none"}}>
            <DialogTitle>{t("map.segments.colorTitle")}</DialogTitle>
            <DialogContent>
                <DialogContentText style={{marginBottom: "1rem"}}>
                    {t("map.segments.colorQuestion", {name: name})}
                </DialogContentText>

                <Box
                    role="radiogroup"
                    aria-label={t("map.segments.colorTitle")}
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 40px)",
                        gap: 1.25,
                        justifyContent: "center",
                        mb: 2
                    }}
                >
                    {ROOM_COLOR_PALETTE.map(entry => {
                        const selected = normalizedValue === entry.color;
                        const label = t(`map.segments.colorNames.${entry.key}`);

                        return (
                            <Tooltip key={entry.key} title={label}>
                                <ButtonBase
                                    role="radio"
                                    aria-checked={selected}
                                    aria-label={label}
                                    onClick={() => {
                                        setValue(entry.color);
                                    }}
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "50%",
                                        backgroundColor: entry.color,
                                        border: "2px solid",
                                        borderColor: selected ? "text.primary" : "transparent",
                                        boxShadow: selected ? 3 : 0,
                                        transition: "box-shadow 120ms, border-color 120ms"
                                    }}
                                >
                                    {selected && <CheckIcon sx={{color: "rgba(0, 0, 0, 0.75)"}}/>}
                                </ButtonBase>
                            </Tooltip>
                        );
                    })}
                </Box>

                <FormControlLabel
                    control={
                        <Radio
                            checked={isAuto}
                            onChange={() => {
                                setValue("");
                            }}
                        />
                    }
                    label={
                        <Box>
                            <Typography variant="body1">{t("map.segments.colorAuto")}</Typography>
                            <Typography variant="caption" color="textSecondary">{t("map.segments.colorAutoHint")}</Typography>
                        </Box>
                    }
                    sx={{mb: 2}}
                />

                <TextField
                    margin="dense"
                    variant="standard"
                    fullWidth
                    label={t("map.segments.colorCustom")}
                    placeholder="#rrggbb"
                    value={value}
                    error={!isValid}
                    helperText={isValid ? t("map.segments.colorCustomHint") : t("map.segments.colorInvalid")}
                    onChange={(e) => {
                        setValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    slotProps={{
                        htmlInput: {
                            maxLength: 7,
                            spellCheck: false,
                            autoCapitalize: "off",
                            autoComplete: "off"
                        },
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Box
                                        component="input"
                                        type="color"
                                        aria-label={t("map.segments.colorPicker")}
                                        title={t("map.segments.colorPicker")}
                                        value={!isAuto && isValid ? normalizedValue : "#bdb6aa"}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setValue(e.target.value.toLowerCase());
                                        }}
                                        sx={{
                                            width: 32,
                                            height: 28,
                                            p: 0,
                                            border: "none",
                                            background: "none",
                                            cursor: "pointer"
                                        }}
                                    />
                                </InputAdornment>
                            )
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t("common.cancel")}</Button>
                <Button
                    disabled={!isValid}
                    onClick={submit}
                >
                    {t("common.save")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SegmentColorDialog;
