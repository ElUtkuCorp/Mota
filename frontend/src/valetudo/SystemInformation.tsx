import {
    Button,
    ButtonGroup,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid2,
    Paper,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import React from "react";
import {
    useRobotInformationQuery,
    useSystemHostInfoQuery,
    useSystemRuntimeInfoQuery,
    useValetudoVersionQuery,
    useRobotPropertiesQuery,
    useValetudoInformationQuery,
    useMotaSystemRebootMutation,
    CPUUsageType,
    SystemHostInfo,
} from "../api";
import ConfirmationDialog from "../components/ConfirmationDialog";
import RatioBar from "../components/RatioBar";
import {convertSecondsToHumans} from "../utils";
import {useIsMobileView} from "../hooks";
import ReloadableCard from "../components/ReloadableCard";
import PaperContainer from "../components/PaperContainer";
import TextInformationGrid from "../components/TextInformationGrid";
import MotaDiagnostics from "./MotaDiagnostics";
import {useValetudoColorsInverse} from "../hooks/useValetudoColors";
import {useTranslation} from "react-i18next";
import {formatNumber} from "../i18n";

const formatMiB = (bytes: number): string => {
    return formatNumber(bytes / 1024 / 1024, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " MiB";
};

// Mota: uso de RAM y CPU en números (además de las barras)
const getUsage = (info: SystemHostInfo): {ramPercent: number, ramUsed: number, cpuPercent: number} => {
    const ramUsed = info.mem.total - info.mem.free;
    const cpuBusy = info.cpus.map(cpu => {
        return 100 - (cpu.usage[CPUUsageType.IDLE] ?? 0);
    });

    return {
        ramPercent: info.mem.total > 0 ? Math.round(ramUsed / info.mem.total * 100) : 0,
        ramUsed: ramUsed,
        cpuPercent: cpuBusy.length > 0 ? Math.round(cpuBusy.reduce((a, b) => {
            return a + b;
        }, 0) / cpuBusy.length) : 0,
    };
};

const UsageTile = ({label, value, detail}: {label: string, value: string, detail?: string}): React.ReactElement => {
    return (
        <Paper variant="outlined" sx={{px: 2, py: 1.25, minWidth: 140, flexGrow: 1}}>
            <Typography variant="caption" color="textSecondary">{label}</Typography>
            <Typography sx={{fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.2}}>{value}</Typography>
            {detail && <Typography variant="caption" color="textSecondary">{detail}</Typography>}
        </Paper>
    );
};

// Mota: reiniciar el sistema del robot (ejecuta reboot)
const RebootCard = (): React.ReactElement => {
    const {t} = useTranslation();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const {mutate: reboot, isPending, isSuccess} = useMotaSystemRebootMutation();

    return (
        <Card sx={{boxShadow: 3}}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {t("systemInformation.reboot.title")}
                </Typography>
                <Divider/>
                <Stack spacing={1.5} sx={{mt: 1.5}}>
                    <Typography variant="body2" color="textSecondary">
                        {isSuccess ? t("systemInformation.reboot.inProgress") : t("systemInformation.reboot.description")}
                    </Typography>
                    <Button
                        variant="outlined"
                        color="warning"
                        disabled={isPending || isSuccess}
                        onClick={() => {
                            setDialogOpen(true);
                        }}
                        sx={{alignSelf: "flex-start"}}
                    >
                        {t("systemInformation.reboot.button")}
                    </Button>
                </Stack>
                <ConfirmationDialog
                    title={t("systemInformation.reboot.confirmTitle")}
                    text={t("systemInformation.reboot.confirmText")}
                    open={dialogOpen}
                    onClose={() => {
                        setDialogOpen(false);
                    }}
                    onAccept={() => {
                        reboot();
                    }}
                />
            </CardContent>
        </Card>
    );
};

const SystemRuntimeInfo = (): React.ReactElement => {
    const {t} = useTranslation();
    const {
        data: systemRuntimeInfo,
        isPending: systemRuntimeInfoPending,
        isFetching: systemRuntimeInfoFetching,
        refetch: fetchSystemRuntimeInfo,
    } = useSystemRuntimeInfoQuery();

    const [nodeDialogOpen, setNodeDialogOpen] = React.useState(false);
    const [envDialogOpen, setEnvDialogOpen] = React.useState(false);

    const mobileView = useIsMobileView();

    const systemRuntimeInformation = React.useMemo(() => {
        if (systemRuntimeInfoPending) {
            return <Skeleton height={"6rem"}/>;
        }

        if (!systemRuntimeInfo) {
            return <Typography color="error">{t("systemInformation.noRuntimeInformation")}</Typography>;
        }

        const topItems: Array<[header: string, body: string]> = [
            [t("systemInformation.uptimeMota"), convertSecondsToHumans(systemRuntimeInfo.uptime)],
            ["UID", String(systemRuntimeInfo.uid)],
            ["GID", String(systemRuntimeInfo.gid)],
            ["PID", String(systemRuntimeInfo.pid)],
            [t("systemInformation.reincarnation"), systemRuntimeInfo.phoenix.canReincarnate ? t("systemInformation.possible") : t("systemInformation.impossible")],
            [t("systemInformation.generation"), String(systemRuntimeInfo.phoenix.generation)],
            ["argv", systemRuntimeInfo.argv.join(" ")]
        ];

        const versionRows = Object.keys(systemRuntimeInfo.versions).map(lib => {
            const version = systemRuntimeInfo.versions[lib];
            return (
                <TableRow
                    key={lib}
                    sx={{"&:last-child td, &:last-child th": {border: 0}}}
                >
                    <TableCell component="th" scope="row">{lib}</TableCell>
                    <TableCell align="right">{version}</TableCell>
                </TableRow>
            );
        });

        const environmentRows = Object.keys(systemRuntimeInfo.env).sort().map(key => {
            const value = systemRuntimeInfo.env[key];
            return (
                <TableRow
                    key={key}
                    sx={{"&:last-child td, &:last-child th": {border: 0}}}
                >
                    <TableCell component="th" scope="row">{key}</TableCell>
                    <TableCell>{value}</TableCell>
                </TableRow>
            );
        });

        return (
            <Stack spacing={2}>
                <Grid2 container spacing={2}>
                    {topItems.map(([header, body]) => {
                        return (
                            <Grid2 key={header}>
                                <Typography variant="caption" color="textSecondary">
                                    {header}
                                </Typography>
                                <Typography variant="body2">{body}</Typography>
                            </Grid2>
                        );
                    })}
                </Grid2>
                <ButtonGroup variant="outlined">
                    <Button onClick={() => {
                        setNodeDialogOpen(true);
                    }}>{t("systemInformation.node")}</Button>
                    <Button onClick={() => {
                        setEnvDialogOpen(true);
                    }}>{t("systemInformation.environment")}</Button>
                </ButtonGroup>

                <Dialog
                    open={nodeDialogOpen}
                    onClose={() => {
                        setNodeDialogOpen(false);
                    }}
                    scroll={"body"}
                    fullScreen={mobileView}
                >
                    <DialogTitle>{t("systemInformation.nodeInformation")}</DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={2}>
                            <Grid2 container spacing={2}>
                                <Grid2>
                                    <Typography variant="caption" color="textSecondary">
                                        execPath
                                    </Typography>
                                    <Typography variant="body2">{systemRuntimeInfo.execPath}</Typography>
                                </Grid2>
                                <Grid2>
                                    <Typography variant="caption" color="textSecondary">
                                        execArgv
                                    </Typography>
                                    <Typography
                                        variant="body2">{systemRuntimeInfo.execArgv.join(" ")}</Typography>
                                </Grid2>
                            </Grid2>

                            <TableContainer component={Paper}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t("systemInformation.dependency")}</TableCell>
                                            <TableCell align="right">{t("systemInformation.version")}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {versionRows}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setNodeDialogOpen(false);
                        }}>{t("common.close")}</Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={envDialogOpen}
                    onClose={() => {
                        setEnvDialogOpen(false);
                    }}
                    fullScreen={mobileView}
                    maxWidth={"xl"}
                    scroll={"body"}
                >
                    <DialogTitle>{t("systemInformation.environment")}</DialogTitle>
                    <DialogContent>
                        <TableContainer component={Paper}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t("systemInformation.key")}</TableCell>
                                        <TableCell>{t("systemInformation.value")}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {environmentRows}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setEnvDialogOpen(false);
                        }}>{t("common.close")}</Button>
                    </DialogActions>
                </Dialog>
            </Stack>
        );
    }, [systemRuntimeInfoPending, systemRuntimeInfo, nodeDialogOpen, envDialogOpen, mobileView, t]);

    return (
        <ReloadableCard
            title={t("systemInformation.runtimeInformation")}
            loading={systemRuntimeInfoFetching}
            onReload={() => {
                return fetchSystemRuntimeInfo();
            }}
            boxShadow={3}
        >
            {systemRuntimeInformation}
        </ReloadableCard>
    );
};

const SystemInformation = (): React.ReactElement => {
    const {t} = useTranslation();
    const palette = useValetudoColorsInverse();
    const {
        data: robotInformation,
        isPending: robotInformationPending,
    } = useRobotInformationQuery();
    const {
        data: version,
        isPending: versionPending,
    } = useValetudoVersionQuery();
    const {
        data: valetudoInformation,
        isPending: valetudoInformationPending
    } = useValetudoInformationQuery();
    const {
        data: systemHostInfo,
        isPending: systemHostInfoPending,
        isFetching: systemHostInfoFetching,
        refetch: fetchSystemHostInfo,
    } = useSystemHostInfoQuery();
    const {
        data: robotProperties,
        isPending: robotPropertiesPending
    } = useRobotPropertiesQuery();

    // Mota: el uso de RAM y CPU se refresca solo cada 5 s
    React.useEffect(() => {
        const interval = setInterval(() => {
            fetchSystemHostInfo().catch(() => {
                /* intentional */
            });
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, [fetchSystemHostInfo]);

    const valetudoInformationViewLoading = versionPending || valetudoInformationPending;

    const valetudoInformationView = React.useMemo(() => {
        if (valetudoInformationViewLoading) {
            return (
                <Skeleton height={"4rem"}/>
            );
        }

        if (!version && !valetudoInformation) {
            return <Typography color="error">{t("systemInformation.noMotaInformation")}</Typography>;
        }

        const items = [
            {
                header: t("systemInformation.release"),
                body: version?.release
            },
            {
                header: t("systemInformation.commit"),
                body: version?.commit
            },
            {
                header: t("systemInformation.embedded"),
                body: valetudoInformation?.embedded ? t("systemInformation.yes") : t("systemInformation.no")
            },
            {
                header: t("systemInformation.systemId"),
                body: valetudoInformation?.systemId
            }
        ].filter(item => {
            return item.body !== undefined;
        }) as Array<{header: string, body: string}>;

        return (
            <TextInformationGrid items={items}/>
        );
    }, [valetudoInformationViewLoading, version, valetudoInformation, t]);


    const robotInformationViewLoading = robotInformationPending || robotPropertiesPending;

    const robotInformationView = React.useMemo(() => {
        if (robotInformationViewLoading) {
            return (
                <Skeleton height={"4rem"}/>
            );
        }

        if (!robotInformation && !robotProperties) {
            return <Typography color="error">{t("systemInformation.noRobotInformation")}</Typography>;
        }

        const items = [
            {
                header: t("systemInformation.manufacturer"),
                body: robotInformation?.manufacturer
            },
            {
                header: t("systemInformation.model"),
                body: robotInformation?.modelName
            },
            {
                header: t("systemInformation.implementation"),
                body: robotInformation?.implementation
            },
            {
                header: t("systemInformation.firmwareVersion"),
                body: robotProperties?.firmwareVersion
            }
        ].filter(item => {
            return item.body !== undefined;
        }) as Array<{header: string, body: string}>;

        return (
            <TextInformationGrid items={items}/>
        );

    }, [robotInformation, robotInformationViewLoading, robotProperties, t]);

    const systemHostInformation = React.useMemo(() => {
        if (systemHostInfoPending) {
            return (
                <Skeleton height={"12rem"}/>
            );
        }
        if (!systemHostInfo) {
            return (
                <Typography color="textSecondary">{t("systemInformation.noHostInformation")}</Typography>
            );
        }

        const cpuUsageTypeColors: Record<CPUUsageType, string> = {
            [CPUUsageType.USER]: palette.green,
            [CPUUsageType.NICE]: palette.teal,
            [CPUUsageType.SYS]: palette.red,
            [CPUUsageType.IRQ]: palette.purple,
            [CPUUsageType.IDLE]: "#000000", //not used
        };


        const usage = getUsage(systemHostInfo);

        return (
            <Grid2 container spacing={2}>
                <Grid2 size={{xs: 12}}>
                    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
                        <UsageTile
                            label={t("systemInformation.ramUsage")}
                            value={`${usage.ramPercent} %`}
                            detail={t("systemInformation.ramUsageDetail", {used: formatMiB(usage.ramUsed), total: formatMiB(systemHostInfo.mem.total)})}
                        />
                        <UsageTile
                            label={t("systemInformation.cpuUsageNow")}
                            value={`${usage.cpuPercent} %`}
                            detail={t("systemInformation.cpuUsageDetail", {count: systemHostInfo.cpus.length})}
                        />
                        <UsageTile
                            label={t("systemInformation.memoryMota")}
                            value={formatMiB(systemHostInfo.mem.valetudo_current)}
                        />
                    </Stack>
                </Grid2>
                <Grid2>
                    <Typography variant="caption" color="textSecondary">
                        {t("systemInformation.hostname")}
                    </Typography>
                    <Typography variant="body2">{systemHostInfo.hostname}</Typography>
                </Grid2>
                <Grid2>
                    <Typography variant="caption" color="textSecondary">
                        {t("systemInformation.arch")}
                    </Typography>
                    <Typography variant="body2">{systemHostInfo.arch}</Typography>
                </Grid2>
                <Grid2>
                    <Typography variant="caption" color="textSecondary">
                        {t("systemInformation.uptime")}
                    </Typography>
                    <Typography variant="body2">
                        {convertSecondsToHumans(systemHostInfo.uptime)}
                    </Typography>
                </Grid2>
                <Grid2 size={{xs: 12}}>
                    <Typography variant="caption" color="textSecondary">
                        {t("systemInformation.memory")}
                    </Typography>

                    <RatioBar
                        total={systemHostInfo.mem.total}
                        totalLabel={formatMiB(systemHostInfo.mem.free)}
                        partitions={
                            [
                                {
                                    label: t("systemInformation.memorySystem"),
                                    value: systemHostInfo.mem.total - systemHostInfo.mem.free - systemHostInfo.mem.valetudo_current,
                                    valueLabel: formatMiB(systemHostInfo.mem.total - systemHostInfo.mem.free - systemHostInfo.mem.valetudo_current),
                                    color: palette.green
                                },
                                {
                                    label: t("systemInformation.memoryMota"),
                                    value: systemHostInfo.mem.valetudo_current,
                                    valueLabel: formatMiB(systemHostInfo.mem.valetudo_current),
                                    color: palette.red
                                },
                                {
                                    label: t("systemInformation.memoryMotaMax"),
                                    value: systemHostInfo.mem.valetudo_max - systemHostInfo.mem.valetudo_current,
                                    valueLabel: formatMiB(systemHostInfo.mem.valetudo_max),
                                    color: palette.teal
                                }
                            ]
                        }
                        noneLegendLabel={t("systemInformation.memoryFree")}
                    />
                </Grid2>

                <Grid2 size={{xs: 12}}>
                    <Typography variant="caption" color="textSecondary">
                        {t("systemInformation.cpuUsage")}
                    </Typography>
                    {
                        systemHostInfo.cpus.map((cpu, i) => {
                            return (
                                <RatioBar
                                    key={`cpu_${i}`}
                                    style={{marginTop: "4px"}}
                                    total={100}
                                    partitions={
                                        Object.entries(cpu.usage).filter(
                                            ([type, value]) => type !== CPUUsageType.IDLE
                                        ).map(([type, value]) => {
                                            return {
                                                label: type,
                                                value: value,
                                                valueLabel: `${value} %`,
                                                color: cpuUsageTypeColors[type as CPUUsageType],
                                            };
                                        })
                                    }
                                    hideLegend={i !== systemHostInfo.cpus.length -1}
                                    noneLegendLabel={t("systemInformation.cpuIdle")}
                                />
                            );
                        })
                    }
                </Grid2>
            </Grid2>

        );
    }, [systemHostInfo, systemHostInfoPending, palette, t]);

    return (
        <PaperContainer>
            <Grid2
                container
                spacing={2}
            >
                <Grid2
                    style={{flexGrow: 1}}
                >
                    <Card
                        sx={{boxShadow: 3}}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {t("systemInformation.robot")}
                            </Typography>
                            <Divider/>
                            {robotInformationView}
                        </CardContent>
                    </Card>
                </Grid2>
                <Grid2
                    style={{flexGrow: 1}}
                >
                    <Card
                        sx={{boxShadow: 3}}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                {t("systemInformation.mota")}
                            </Typography>
                            <Divider/>
                            {valetudoInformationView}
                        </CardContent>
                    </Card>
                </Grid2>
                <Grid2
                    style={{flexGrow: 1}}
                >
                    <ReloadableCard title={t("systemInformation.hostInformation")} loading={systemHostInfoFetching}
                        boxShadow={3}
                        onReload={() => {
                            return fetchSystemHostInfo();
                        }}>
                        {systemHostInformation}
                    </ReloadableCard>
                </Grid2>
                <Grid2
                    style={{flexGrow: 1}}
                >
                    <SystemRuntimeInfo/>
                </Grid2>
                <Grid2
                    style={{flexGrow: 1}}
                >
                    <RebootCard/>
                </Grid2>
                <MotaDiagnostics/>
            </Grid2>
        </PaperContainer>
    );
};

export default SystemInformation;
