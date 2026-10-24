import {
    Box,
    Button,
    Checkbox,
    Divider,
    FormControl,
    FormControlLabel,
    Grid2,
    IconButton,
    Input,
    InputAdornment,
    InputLabel,
    Skeleton,
    TextField,
    Typography
} from "@mui/material";
import React from "react";
import {useHTTPBasicAuthConfigurationMutation, useHTTPBasicAuthConfigurationQuery} from "../../api";
import InfoBox from "../../components/InfoBox";
import PaperContainer from "../../components/PaperContainer";
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    VpnKey as BasicAuthIcon
} from "@mui/icons-material";
import DetailPageHeaderRow from "../../components/DetailPageHeaderRow";
import {Trans, useTranslation} from "react-i18next";

const AuthSettings = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: storedConfiguration,
        isPending: configurationPending,
        isError: configurationError,
    } = useHTTPBasicAuthConfigurationQuery();

    const {mutate: updateConfiguration, isPending: configurationUpdating} = useHTTPBasicAuthConfigurationMutation();

    const [enabled, setEnabled] = React.useState(false);
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");

    const [showPasswordAsPlain, setShowPasswordAsPlain] = React.useState(false);
    const [configurationModified, setConfigurationModified] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (storedConfiguration) {
            setEnabled(storedConfiguration.enabled);
            setUsername(storedConfiguration.username);
            setPassword(storedConfiguration.password);
        }
    }, [storedConfiguration]);

    if (configurationPending) {
        return (
            <Skeleton height={"8rem"}/>
        );
    }

    if (configurationError || !storedConfiguration) {
        return <Typography color="error">{t("options.auth.loadError")}</Typography>;
    }

    return (
        <>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={enabled}
                        onChange={e => {
                            setEnabled(e.target.checked);
                            setConfigurationModified(true);
                        }}
                    />
                }
                label={t("options.auth.enabled")}
                sx={{mb: 1}}
            />
            <Grid2 container spacing={1} sx={{mb: 1}} direction="row">
                <Grid2 size="grow" style={{flexGrow: 1}}>
                    <TextField
                        style={{width: "100%"}}
                        label={t("options.auth.username")}
                        value={username}
                        variant="standard"
                        disabled={!enabled}
                        onChange={e => {
                            setUsername(e.target.value);
                            setConfigurationModified(true);
                        }}
                    />
                </Grid2>
                <Grid2 size="grow" style={{flexGrow: 1}}>
                    <FormControl style={{width: "100%"}} variant="standard">
                        <InputLabel htmlFor="standard-adornment-password">{t("options.auth.password")}</InputLabel>
                        <Input
                            type={showPasswordAsPlain ? "text" : "password"}
                            fullWidth
                            value={password}
                            disabled={!enabled}
                            endAdornment={
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label={t("options.auth.togglePasswordVisibility")}
                                        onClick={() => {
                                            setShowPasswordAsPlain(!showPasswordAsPlain);
                                        }}
                                        onMouseDown={e => {
                                            e.preventDefault();
                                        }}
                                        edge="end"
                                    >
                                        {showPasswordAsPlain ? <VisibilityOffIcon/> : <VisibilityIcon/>}
                                    </IconButton>
                                </InputAdornment>
                            }
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setConfigurationModified(true);
                            }}/>
                    </FormControl>
                </Grid2>
            </Grid2>

            <InfoBox
                boxShadow={5}
                style={{
                    marginTop: "3rem",
                    marginBottom: "2rem"
                }}
            >
                <Typography color="info">
                    <Trans i18nKey="options.auth.info"/>
                </Typography>
            </InfoBox>

            <Divider sx={{mt: 1}} style={{marginBottom: "1rem"}}/>
            <Grid2 container>
                <Grid2 style={{marginLeft: "auto"}}>
                    <Button
                        loading={configurationUpdating}
                        color="primary"
                        variant="outlined"
                        disabled={!configurationModified}
                        onClick={() => {
                            updateConfiguration({
                                enabled: enabled,
                                username: username,
                                password: password
                            });
                            setConfigurationModified(false);
                        }}
                    >
                        {t("options.common.saveConfiguration")}
                    </Button>
                </Grid2>
            </Grid2>
        </>
    );
};

const AuthSettingsPage = (): React.ReactElement => {
    const {t} = useTranslation();
    return (
        <PaperContainer>
            <Grid2 container direction="row">
                <Box style={{width: "100%"}}>
                    <DetailPageHeaderRow
                        title={t("options.auth.header")}
                        icon={<BasicAuthIcon/>}
                    />
                    <AuthSettings/>
                </Box>
            </Grid2>
        </PaperContainer>
    );
};

export default AuthSettingsPage;
