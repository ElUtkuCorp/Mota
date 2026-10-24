import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Collapse,
    Container,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Grid2,
    IconButton,
    Input,
    InputAdornment,
    InputLabel,
    Popper,
    Skeleton,
    Switch,
    Typography,
    useTheme,
} from "@mui/material";
import {
    ArrowUpward,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,

    LinkOff as MQTTDisconnectedIcon,
    Link as MQTTConnectedIcon,
    Sync as MQTTConnectingIcon,
    Warning as MQTTErrorIcon,
} from "@mui/icons-material";
import React from "react";
import {
    MQTTConfiguration,
    MQTTStatus,
    useMQTTConfigurationMutation,
    useMQTTConfigurationQuery,
    useMQTTPropertiesQuery,
    useMQTTStatusQuery
} from "../../api";
import {getIn, setIn} from "../../api/utils";
import {convertBytesToHumans, deepCopy, extractHostFromUrl} from "../../utils";
import {InputProps} from "@mui/material/Input/Input";
import InfoBox from "../../components/InfoBox";
import PaperContainer from "../../components/PaperContainer";
import {MQTTIcon} from "../../components/CustomIcons";
import TextInformationGrid from "../../components/TextInformationGrid";
import DetailPageHeaderRow from "../../components/DetailPageHeaderRow";
import {Trans, useTranslation} from "react-i18next";

const MQTTStatusComponent: React.FunctionComponent<{
    status: MQTTStatus | undefined,
    statusLoading: boolean,
    statusError: boolean
}> = ({
    status,
    statusLoading,
    statusError
}) => {
    const {t} = useTranslation();

    if (statusLoading || !status) {
        return (
            <Skeleton height={"4rem"}/>
        );
    }

    if (statusError) {
        return <Typography color="error">{t("options.mqtt.statusLoadError")}</Typography>;
    }

    const getIconForState = (): React.ReactElement => {
        switch (status.state) {
            case "disconnected":
                return <MQTTDisconnectedIcon sx={{fontSize: "4rem"}}/>;
            case "ready":
                return <MQTTConnectedIcon sx={{fontSize: "4rem"}}/>;
            case "init":
                return <MQTTConnectingIcon sx={{fontSize: "4rem"}}/>;
            case "lost":
            case "alert":
                return <MQTTErrorIcon sx={{fontSize: "4rem"}}/>;
        }
    };

    const getContentForState = (): React.ReactElement => {
        switch (status.state) {
            case "disconnected":
                return (
                    <Typography variant="h5">{t("options.mqtt.state.disconnected")}</Typography>
                );
            case "ready":
                return (
                    <Typography variant="h5">{t("options.mqtt.state.connected")}</Typography>
                );
            case "init":
                return (
                    <Typography variant="h5">{t("options.mqtt.state.connecting")}</Typography>
                );
            case "lost":
            case "alert":
                return (
                    <Typography variant="h5">{t("options.mqtt.state.error")}</Typography>
                );
        }
    };

    const getMessageStats = (): React.ReactElement => {
        const items = [
            {
                header: t("options.mqtt.stats.messagesSent"),
                body: status.stats.messages.count.sent.toString()
            },
            {
                header: t("options.mqtt.stats.bytesSent"),
                body: convertBytesToHumans(status.stats.messages.bytes.sent)
            },
            {
                header: t("options.mqtt.stats.messagesReceived"),
                body: status.stats.messages.count.received.toString()
            },
            {
                header: t("options.mqtt.stats.bytesReceived"),
                body: convertBytesToHumans(status.stats.messages.bytes.received)
            },
        ];

        return <TextInformationGrid items={items}/>;
    };

    const getConnectionStats = (): React.ReactElement => {
        const items = [
            {
                header: t("options.mqtt.stats.connects"),
                body: status.stats.connection.connects.toString()
            },
            {
                header: t("options.mqtt.stats.disconnects"),
                body: status.stats.connection.disconnects.toString()
            },
            {
                header: t("options.mqtt.stats.reconnects"),
                body: status.stats.connection.reconnects.toString()
            },
            {
                header: t("options.mqtt.stats.errors"),
                body: status.stats.connection.errors.toString()
            },
        ];

        return <TextInformationGrid items={items}/>;
    };


    return (
        <Grid2 container alignItems="center" direction="column" style={{paddingBottom: "1rem"}}>
            <Grid2 style={{marginTop: "1rem"}}>
                {getIconForState()}
            </Grid2>
            <Grid2
                sx={{
                    maxWidth: "100% !important", //Why, MUI? Why?
                    wordWrap: "break-word",
                    textAlign: "center",
                    userSelect: "none"
                }}
            >
                {getContentForState()}
            </Grid2>
            <Grid2
                container
                direction="row"
                style={{marginTop: "1rem"}}
            >
                <Grid2
                    style={{flexGrow: 1}}
                    p={1}
                >
                    <Card
                        sx={{boxShadow: 3}}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {t("options.mqtt.stats.messageStatistics")}
                            </Typography>
                            <Divider/>
                            {getMessageStats()}
                        </CardContent>
                    </Card>
                </Grid2>
                <Grid2
                    style={{flexGrow: 1}}
                    p={1}
                >
                    <Card
                        sx={{boxShadow: 3}}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {t("options.mqtt.stats.connectionStatistics")}
                            </Typography>
                            <Divider/>
                            {getConnectionStats()}
                        </CardContent>
                    </Card>
                </Grid2>
            </Grid2>
        </Grid2>
    );
};


const GroupBox = (props: {
    title: string,
    children: React.ReactNode,
    checked?: boolean,
    disabled?: boolean,
    onChange?: ((event: React.ChangeEvent<HTMLInputElement>) => void)
}): React.ReactElement => {
    let title = (
        <Typography
            variant="subtitle1"
            sx={{
                marginBottom: 0,
                userSelect: "none"
            }}
        >
            {props.title}
        </Typography>
    );
    if (props.onChange) {
        title = (
            <FormControlLabel
                control={
                    <Checkbox
                        checked={props.checked}
                        disabled={props.disabled}
                        onChange={props.onChange}
                    />
                }
                disableTypography
                label={title}
            />
        );
    }

    return (
        <Container sx={{m: 0.2}}>
            {title}
            <Collapse in={props.checked || !props.onChange} appear={false}>
                <div>
                    {props.children}
                </div>
            </Collapse>
            <Box pt={1}/>
        </Container>
    );
};

const MQTTInput: React.FunctionComponent<{
    mqttConfiguration: MQTTConfiguration,
    modifyMQTTConfig: (value: any, configPath: Array<string>) => void,
    disabled?: boolean,

    title: string,
    helperText: string,
    required: boolean,
    configPath: Array<string>,
    additionalProps?: InputProps
    inputPostProcessor?: (value: any) => any
}> = ({
    mqttConfiguration,
    modifyMQTTConfig,
    disabled = false,

    title,
    helperText,
    required,
    configPath,
    additionalProps,
    inputPostProcessor
}) => {
    const idBase = "mqtt-config-" + configPath.join("-");
    const inputId = idBase + "-input";
    const helperId = idBase + "-helper";
    const value = getIn(mqttConfiguration, configPath);
    const error = required && !value;

    return (
        <FormControl
            required={required}
            error={error}
            component="fieldset"
            sx={{ml: 1, mt: 2}}

        >
            <InputLabel htmlFor={inputId}>{title}</InputLabel>
            <Input
                id={inputId}
                value={value}
                onChange={(e) => {
                    let newValue = additionalProps?.type === "number" ? parseInt(e.target.value) : e.target.value;
                    if (inputPostProcessor) {
                        newValue = inputPostProcessor(newValue);
                    }

                    modifyMQTTConfig(newValue, configPath);
                }}
                aria-describedby={helperId}

                {...additionalProps}
            />
            <FormHelperText id={helperId} sx={{userSelect: "none"}}>
                {helperText}
            </FormHelperText>
        </FormControl>
    );
};

const MQTTSwitch: React.FunctionComponent<{
    mqttConfiguration: MQTTConfiguration,
    modifyMQTTConfig: (value: any, configPath: Array<string>) => void,
    disabled?: boolean,

    title: string,
    configPath: Array<string>,
}> = ({
    mqttConfiguration,
    modifyMQTTConfig,
    disabled = false,

    title,
    configPath,
}) => {
    const value = getIn(mqttConfiguration, configPath);
    return (
        <FormControlLabel
            control={
                <Switch checked={value} onChange={(e) => {
                    modifyMQTTConfig(e.target.checked, configPath);
                }}/>
            }

            label={title}
            sx={{userSelect: "none"}}
        />
    );
};

const MQTTOptionalExposedCapabilitiesEditor: React.FunctionComponent<{
    mqttConfiguration: MQTTConfiguration,
    modifyMQTTConfig: (value: any, configPath: Array<string>) => void,
    disabled?: boolean,

    configPath: Array<string>,
    exposableCapabilities: Array<string>
}> = ({
    mqttConfiguration,
    modifyMQTTConfig,
    disabled = false,

    configPath,
    exposableCapabilities
}) => {
    let selection: Array<string> = getIn(mqttConfiguration, configPath);

    return (
        <Container sx={{m: 0.2}}>
            <FormGroup>
                {
                    exposableCapabilities.map((capabilityName: string) => {
                        return (
                            <FormControlLabel
                                key={capabilityName}
                                control={
                                    <Checkbox
                                        checked={selection.includes(capabilityName)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                selection.push(capabilityName);
                                            } else {
                                                selection = selection.filter(e => {
                                                    return e !== capabilityName;
                                                });
                                            }

                                            modifyMQTTConfig(selection, configPath);
                                        }
                                        }
                                    />
                                }

                                label={capabilityName}
                                sx={{userSelect: "none"}}
                            />
                        );
                    })
                }

            </FormGroup>
        </Container>
    );
};

const sanitizeStringForMQTT = (value: string, allowSlashes = false) => {
    /*
      This rather limited set of characters is unfortunately required by Home Assistant
      Without Home Assistant, it would be enough to replace [\s+#/]

      See also: https://www.home-assistant.io/docs/mqtt/discovery/#discovery-topic
     */
    return value.replace(
        allowSlashes ? /[^a-zA-Z0-9_\-/]/g : /[^a-zA-Z0-9_-]/g,
        ""
    );
};

const sanitizeTopicPrefix = (value: string) => {
    return value.replace(
        /^\//,
        ""
    ).replace(
        /\/$/,
        ""
    );
};

const sanitizeConfigBeforeSaving = (mqttConfiguration: MQTTConfiguration) => {
    mqttConfiguration.customizations.topicPrefix = sanitizeTopicPrefix(mqttConfiguration.customizations.topicPrefix);
};

const MQTTConnectivity = (): React.ReactElement => {
    const {t} = useTranslation();
    const theme = useTheme();

    const [anchorElement, setAnchorElement] = React.useState(null);

    const identifierElement = React.useRef(null);
    const topicElement = React.useRef(null);

    const {
        data: storedMQTTConfiguration,
        isPending: mqttConfigurationPending,
        isError: mqttConfigurationError,
    } = useMQTTConfigurationQuery();

    const {
        data: mqttStatus,
        isPending: mqttStatusPending,
        isError: mqttStatusError,
    } = useMQTTStatusQuery();

    const {
        data: mqttProperties,
        isPending: mqttPropertiesPending,
        isError: mqttPropertiesError
    } = useMQTTPropertiesQuery();

    const {mutate: updateMQTTConfiguration, isPending: mqttConfigurationUpdating} = useMQTTConfigurationMutation();

    const [mqttConfiguration, setMQTTConfiguration] = React.useState<MQTTConfiguration | null>(null);
    const [configurationModified, setConfigurationModified] = React.useState<boolean>(false);


    const [showMQTTAuthPasswordAsPlain, setShowMQTTAuthPasswordAsPlain] = React.useState(false);

    React.useEffect(() => {
        if (storedMQTTConfiguration && !configurationModified && !mqttConfigurationUpdating) {
            setMQTTConfiguration(deepCopy(storedMQTTConfiguration));
            setConfigurationModified(false);
        }
    }, [storedMQTTConfiguration, configurationModified, mqttConfigurationUpdating]);

    const modifyMQTTConfig = React.useCallback((value: any, configPath: Array<string>): void => {
        if (!mqttConfiguration) {
            return;
        }
        const newConfig = deepCopy(mqttConfiguration);
        setIn(newConfig, value, configPath);
        setMQTTConfiguration(newConfig);
        setConfigurationModified(true);
    }, [mqttConfiguration]);

    if (mqttConfigurationPending || mqttPropertiesPending || !mqttConfiguration) {
        return (
            <>
                <Skeleton height={"12rem"}/>
                <Divider sx={{mt: 1}} style={{marginBottom: "1rem"}}/>
                <Skeleton height={"36rem"}/>
            </>
        );
    }

    if (mqttConfigurationError || mqttPropertiesError || !storedMQTTConfiguration || !mqttProperties) {
        return <Typography color="error">{t("options.mqtt.configLoadError")}</Typography>;
    }

    return (
        <>
            <MQTTStatusComponent
                status={mqttStatus}
                statusLoading={mqttStatusPending}
                statusError={mqttStatusError}
            />
            <Divider sx={{mt: 1}} style={{marginBottom: "1rem"}}/>

            <FormControlLabel
                control={
                    <Checkbox
                        checked={mqttConfiguration.enabled}
                        onChange={e => {
                            modifyMQTTConfig(e.target.checked, ["enabled"]);
                        }}
                    />
                }
                label={t("options.mqtt.enabled")}
                sx={{userSelect: "none", marginLeft: "0.5rem", marginBottom: "0.5rem"}}
            />

            <GroupBox title={t("options.mqtt.connection")}>
                <MQTTInput
                    mqttConfiguration={mqttConfiguration}
                    modifyMQTTConfig={modifyMQTTConfig}

                    title={t("options.mqtt.host")}
                    helperText={t("options.mqtt.hostHelp")}
                    required={true}
                    configPath={["connection", "host"]}
                    inputPostProcessor={(value) => {
                        return extractHostFromUrl(value);
                    }}
                />
                <MQTTInput
                    mqttConfiguration={mqttConfiguration}
                    modifyMQTTConfig={modifyMQTTConfig}

                    title={t("options.mqtt.port")}
                    helperText={t("options.mqtt.portHelp")}
                    required={true}
                    configPath={["connection", "port"]}
                    additionalProps={{type: "number"}}
                />

                <GroupBox title={t("options.mqtt.tls")} checked={mqttConfiguration.connection.tls.enabled}
                    onChange={(e) => {
                        modifyMQTTConfig(e.target.checked, ["connection", "tls", "enabled"]);
                    }}>
                    <MQTTInput
                        mqttConfiguration={mqttConfiguration}
                        modifyMQTTConfig={modifyMQTTConfig}

                        title={t("options.mqtt.ca")}
                        helperText={t("options.mqtt.caHelp")}
                        required={false}
                        configPath={["connection", "tls", "ca"]}
                        additionalProps={{
                            multiline: true,
                            minRows: 3,
                            maxRows: 10,
                        }}
                    />
                    <br/><br/>
                    <MQTTSwitch
                        mqttConfiguration={mqttConfiguration}
                        modifyMQTTConfig={modifyMQTTConfig}
                        title={t("options.mqtt.ignoreCertificateErrors")}
                        configPath={["connection", "tls", "ignoreCertificateErrors"]}
                    />
                </GroupBox>

                <GroupBox title={t("options.mqtt.authentication")}>
                    <GroupBox title={t("options.mqtt.credentials")}
                        checked={mqttConfiguration.connection.authentication.credentials.enabled}
                        onChange={(e) => {
                            modifyMQTTConfig(e.target.checked, ["connection", "authentication", "credentials", "enabled"]);
                        }}>
                        <MQTTInput
                            mqttConfiguration={mqttConfiguration}
                            modifyMQTTConfig={modifyMQTTConfig}

                            title={t("options.mqtt.username")}
                            helperText={t("options.mqtt.usernameHelp")}
                            required={true}
                            configPath={["connection", "authentication", "credentials", "username"]}
                        />
                        <MQTTInput
                            mqttConfiguration={mqttConfiguration}
                            modifyMQTTConfig={modifyMQTTConfig}

                            title={t("options.mqtt.password")}
                            helperText={t("options.mqtt.passwordHelp")}
                            required={false}
                            configPath={["connection", "authentication", "credentials", "password"]}
                            additionalProps={{
                                type: showMQTTAuthPasswordAsPlain ? "text" : "password",
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={t("options.mqtt.togglePasswordVisibility")}
                                            onClick={() => {
                                                setShowMQTTAuthPasswordAsPlain(!showMQTTAuthPasswordAsPlain);
                                            }}
                                            onMouseDown={e => {
                                                e.preventDefault();
                                            }}
                                            edge="end"
                                        >
                                            {showMQTTAuthPasswordAsPlain ? <VisibilityOffIcon/> : <VisibilityIcon/>}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </GroupBox>
                    <GroupBox title={t("options.mqtt.clientCertificate")}
                        checked={mqttConfiguration.connection.authentication.clientCertificate.enabled}
                        onChange={(e) => {
                            modifyMQTTConfig(e.target.checked, ["connection", "authentication", "clientCertificate", "enabled"]);
                        }}>

                        <MQTTInput
                            mqttConfiguration={mqttConfiguration}
                            modifyMQTTConfig={modifyMQTTConfig}

                            title={t("options.mqtt.certificate")}
                            helperText={t("options.mqtt.certificateHelp")}
                            required={true}
                            configPath={["connection", "authentication", "clientCertificate", "certificate"]}
                            additionalProps={{
                                multiline: true,
                                minRows: 3,
                                maxRows: 10
                            }}
                        />
                        <MQTTInput
                            mqttConfiguration={mqttConfiguration}
                            modifyMQTTConfig={modifyMQTTConfig}

                            title={t("options.mqtt.key")}
                            helperText={t("options.mqtt.keyHelp")}
                            required={true}
                            configPath={["connection", "authentication", "clientCertificate", "key"]}
                            additionalProps={{
                                multiline: true,
                                minRows: 3,
                                maxRows: 10
                            }}
                        />
                    </GroupBox>
                </GroupBox>
            </GroupBox>

            <GroupBox title={t("options.mqtt.customizations")}>
                <MQTTInput
                    mqttConfiguration={mqttConfiguration}
                    modifyMQTTConfig={modifyMQTTConfig}

                    title={t("options.mqtt.topicPrefix")}
                    helperText={t("options.mqtt.topicPrefixHelp")}
                    required={false}
                    configPath={["customizations", "topicPrefix"]}
                    additionalProps={{
                        placeholder: mqttProperties.defaults.customizations.topicPrefix,
                        color: "warning",
                        onFocus: () => {
                            setAnchorElement(topicElement.current);
                        },
                        onBlur: () => {
                            setAnchorElement(null);
                        },
                    }}
                    inputPostProcessor={(value) => {
                        return sanitizeStringForMQTT(
                            value,
                            true
                        ).replace(
                            /\/\//g,
                            "/"
                        );
                    }}
                />
                <MQTTInput
                    mqttConfiguration={mqttConfiguration}
                    modifyMQTTConfig={modifyMQTTConfig}

                    title={t("options.mqtt.identifier")}
                    helperText={t("options.mqtt.identifierHelp")}
                    required={false}
                    configPath={["identity", "identifier"]}
                    additionalProps={{
                        placeholder: mqttProperties.defaults.identity.identifier,
                        color: "secondary",
                        onFocus: () => {
                            setAnchorElement(identifierElement.current);
                        },
                        onBlur: () => {
                            setAnchorElement(null);
                        },
                    }}
                    inputPostProcessor={(value) => {
                        return sanitizeStringForMQTT(value, false);
                    }}
                />
                <br/>
                <Typography variant="subtitle2" sx={{mt: "0.5rem", mb: "2rem", userSelect: "none"}} noWrap={false}>
                    {t("options.mqtt.topicStructure")}<br/>
                    <span style={{
                        fontFamily: "\"JetBrains Mono\",monospace",
                        fontWeight: 200,
                        overflowWrap: "anywhere",
                        userSelect: "text"
                    }}>
                        <span
                            style={{
                                color: theme.palette.warning.main
                            }}
                            ref={topicElement}
                        >
                            {sanitizeTopicPrefix(mqttConfiguration.customizations.topicPrefix) || mqttProperties.defaults.customizations.topicPrefix}
                        </span>
                        /<wbr/>
                        <span
                            style={{
                                color: theme.palette.secondary.main
                            }}
                            ref={identifierElement}
                        >
                            {mqttConfiguration.identity.identifier || mqttProperties.defaults.identity.identifier}
                        </span>
                            /<wbr/>BatteryStateAttribute/<wbr/>level
                    </span>
                </Typography>
            </GroupBox>

            {
                mqttProperties.optionalExposableCapabilities.length > 0 &&
                <GroupBox title={t("options.mqtt.optionalCapabilities")}>
                    <MQTTOptionalExposedCapabilitiesEditor
                        mqttConfiguration={mqttConfiguration}
                        modifyMQTTConfig={modifyMQTTConfig}
                        configPath={["optionalExposedCapabilities"]}
                        exposableCapabilities={mqttProperties.optionalExposableCapabilities}
                    />
                </GroupBox>
            }

            <Popper
                open={Boolean(anchorElement)}
                anchorEl={anchorElement}
            >
                <Box>
                    <ArrowUpward fontSize={"large"} color={"info"}/>
                </Box>
            </Popper>

            <InfoBox
                boxShadow={5}
                style={{
                    marginTop: "2rem",
                    marginBottom: "2rem"
                }}
            >
                <Typography color="info">
                    <Trans i18nKey="options.mqtt.info"/>
                </Typography>
            </InfoBox>

            <Divider sx={{mt: 1}} style={{marginBottom: "1rem"}}/>

            <Grid2 container>
                <Grid2 style={{marginLeft: "auto"}}>
                    <Button
                        disabled={!configurationModified}
                        loading={mqttConfigurationUpdating}
                        color="primary"
                        variant="outlined"
                        onClick={() => {
                            sanitizeConfigBeforeSaving(mqttConfiguration);

                            updateMQTTConfiguration(mqttConfiguration);
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

const MQTTConnectivityPage = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        isFetching: mqttStatusFetching,
        refetch: refetchMqttStatus,
    } = useMQTTStatusQuery();

    return (
        <PaperContainer>
            <Grid2 container direction="row">
                <Box style={{width: "100%"}}>
                    <DetailPageHeaderRow
                        title={t("options.mqtt.header")}
                        icon={<MQTTIcon/>}
                        onRefreshClick={() => {
                            refetchMqttStatus().catch(() => {
                                /* intentional */
                            });
                        }}
                        isRefreshing={mqttStatusFetching}
                    />
                    <MQTTConnectivity/>
                </Box>
            </Grid2>
        </PaperContainer>
    );
};

export default MQTTConnectivityPage;
