import {
    AppBar,
    Box,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    PaletteMode,
    Switch,
    Toolbar,
    Typography
} from "@mui/material";
import React from "react";
import {
    AccessTime as TimeIcon,
    Equalizer as StatisticsIcon,
    DarkMode as DarkModeIcon,
    Map as MapManagementIcon,
    Home as HomeIcon,
    Article as LogIcon,
    Menu as MenuIcon,
    ArrowBack as BackIcon,
    PendingActions as PendingActionsIcon,
    Hub as ConnectivityIcon,
    SystemUpdateAlt as UpdaterIcon,
    SettingsRemote as SettingsRemoteIcon,
    Videocam as CameraIcon,
    GitHub as GithubIcon,
    Wysiwyg as SystemInformationIcon,
    Info as AboutIcon,
    Help as HelpIcon,
    History as HistoryIcon,
    SvgIconComponent
} from "@mui/icons-material";
import {Link, useLocation} from "react-router-dom";
import ValetudoEvents from "./ValetudoEvents";
import {
    Capability,
    useDuststreamingConfigurationQuery,
    useMotaCleanHistoryQuery,
    useValetudoCustomizationsQuery
} from "../api";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {
    RobotMonochromeIcon,
    SwaggerUIIcon,
    ValetudoMonochromeIcon,
    ValetudoHeartMonochromeIcon
} from "./CustomIcons";
import {useTranslation} from "react-i18next";
import {DESKTOP_DRAWER_WIDTH, useIsDesktopLayout} from "../hooks";
import {TITLE_FONT_FAMILY} from "../theme";
import {BatteryChips, WifiChip} from "../controls/StatusChips";

// Note: "title" and "menuText" are i18n keys
interface MenuEntry {
    kind: "MenuEntry";
    route: string;
    title: string;
    menuIcon: SvgIconComponent;
    menuText: string;
    requiredCapabilities?: {
        capabilities: Capability[];
        type: "allof" | "anyof"
    };
    // Mota: solo se muestra si responde la API propia (/api/v2/mota/)
    requiresMotaApi?: boolean;
}

interface MenuSubEntry {
    kind: "MenuSubEntry",
    route: string,
    title: string,
    parentRoute: string
}

interface MenuSubheader {
    kind: "Subheader";
    title: string;
    // Mota: se muestra también (sin mirar las capacidades) si responde la API propia
    showIfMotaApi?: boolean;
    requiredCapabilities?: {
        capabilities: Capability[];
        type: "allof" | "anyof"
    };
}



// Mota: primero las secciones principales (Inicio, Mapa, Programación, Historial) y después Robot,
// Ajustes y Sistema (2.4). Las rutas no cambian
//Note that order is important here
const menuTree: Array<MenuEntry | MenuSubEntry | MenuSubheader> = [
    {
        kind: "MenuEntry",
        route: "/",
        title: "nav.home",
        menuIcon: HomeIcon,
        menuText: "nav.home"
    },
    {
        kind: "MenuEntry",
        route: "/options/map_management",
        title: "nav.mapOptions",
        menuIcon: MapManagementIcon,
        menuText: "nav.map",
        requiredCapabilities: {
            capabilities: [
                Capability.PersistentMapControl,
                Capability.MappingPass,
                Capability.MapReset,

                Capability.MapSegmentEdit,
                Capability.MapSegmentRename,

                Capability.CombinedVirtualRestrictions,
                Capability.MapAnnotations
            ],
            type: "anyof"
        }
    },
    {
        kind: "MenuSubEntry",
        route: "/options/map_management/segments",
        title: "nav.segmentManagement",
        parentRoute: "/options/map_management"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/map_management/virtual_restrictions",
        title: "nav.virtualRestrictionManagement",
        parentRoute: "/options/map_management"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/map_management/mirrors",
        title: "nav.mirrorManagement",
        parentRoute: "/options/map_management"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/map_management/annotations",
        title: "nav.mapAnnotations",
        parentRoute: "/options/map_management"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/map_management/robot_coverage",
        title: "nav.robotCoverageMap",
        parentRoute: "/options/map_management"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/map_management/spectator",
        title: "nav.spectatorMap",
        parentRoute: "/options/map_management"
    },
    {
        kind: "MenuEntry",
        route: "/valetudo/timers",
        title: "nav.timers",
        menuIcon: TimeIcon,
        menuText: "nav.timers"
    },
    {
        kind: "MenuEntry",
        route: "/robot/history",
        title: "nav.history",
        menuIcon: HistoryIcon,
        menuText: "nav.history",
        requiresMotaApi: true
    },
    {
        kind: "Subheader",
        title: "nav.robot",
        requiredCapabilities: {
            capabilities: [
                Capability.ConsumableMonitoring,
                Capability.ManualControl,
                Capability.HighResolutionManualControl,
                Capability.TotalStatistics,
                Capability.Duststreaming
            ],
            type: "anyof"
        }
    },
    {
        kind: "MenuEntry",
        route: "/robot/consumables",
        title: "nav.consumables",
        menuIcon: PendingActionsIcon,
        menuText: "nav.consumables",
        requiredCapabilities: {
            capabilities: [Capability.ConsumableMonitoring],
            type: "allof"
        }
    },
    {
        kind: "MenuEntry",
        route: "/robot/manual_control",
        title: "nav.manualControl",
        menuIcon: SettingsRemoteIcon,
        menuText: "nav.manualControl",
        requiredCapabilities: {
            capabilities: [Capability.ManualControl, Capability.HighResolutionManualControl],
            type: "anyof"
        }
    },
    {
        kind: "MenuEntry",
        route: "/robot/total_statistics",
        title: "nav.statistics",
        menuIcon: StatisticsIcon,
        menuText: "nav.statistics",
        requiredCapabilities: {
            capabilities: [Capability.TotalStatistics],
            type: "allof"
        }
    },
    {
        kind: "MenuEntry",
        route: "/robot/camera",
        title: "nav.camera",
        menuIcon: CameraIcon,
        menuText: "nav.camera",
        requiredCapabilities: {
            capabilities: [Capability.Duststreaming],
            type: "allof"
        }
    },
    {
        kind: "Subheader",
        title: "nav.options"
    },
    {
        kind: "MenuEntry",
        route: "/options/robot",
        title: "nav.robotOptions",
        menuIcon: RobotMonochromeIcon,
        menuText: "nav.robot"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/robot/system",
        title: "nav.systemOptions",
        parentRoute: "/options/robot"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/robot/quirks",
        title: "nav.quirks",
        parentRoute: "/options/robot"
    },
    {
        kind: "MenuEntry",
        route: "/options/connectivity",
        title: "nav.connectivityOptions",
        menuIcon: ConnectivityIcon,
        menuText: "nav.connectivity"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/connectivity/auth",
        title: "nav.authSettings",
        parentRoute: "/options/connectivity"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/connectivity/mqtt",
        title: "nav.mqtt",
        parentRoute: "/options/connectivity"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/connectivity/networkadvertisement",
        title: "nav.networkAdvertisement",
        parentRoute: "/options/connectivity"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/connectivity/ntp",
        title: "nav.ntp",
        parentRoute: "/options/connectivity"
    },
    {
        kind: "MenuSubEntry",
        route: "/options/connectivity/wifi",
        title: "nav.wifi",
        parentRoute: "/options/connectivity"
    },
    {
        kind: "MenuEntry",
        route: "/options/valetudo",
        title: "nav.motaOptions",
        menuIcon: ValetudoMonochromeIcon,
        menuText: "nav.mota"
    },
    {
        kind: "Subheader",
        title: "nav.system"
    },
    {
        kind: "MenuEntry",
        route: "/valetudo/log",
        title: "nav.log",
        menuIcon: LogIcon,
        menuText: "nav.log"
    },
    {
        kind: "MenuEntry",
        route: "/valetudo/updater",
        title: "nav.updater",
        menuIcon: UpdaterIcon,
        menuText: "nav.updater"
    },
    {
        kind: "MenuEntry",
        route: "/valetudo/system_information",
        title: "nav.systemInformation",
        menuIcon: SystemInformationIcon,
        menuText: "nav.systemInformation"
    },
    {
        kind: "MenuEntry",
        route: "/valetudo/help",
        title: "nav.generalHelp",
        menuIcon: HelpIcon,
        menuText: "nav.generalHelp"
    },
    {
        kind: "MenuEntry",
        route: "/valetudo/about",
        title: "nav.about",
        menuIcon: AboutIcon,
        menuText: "nav.about"
    },
];

// Mota: marca propia en la cabecera del menú (monograma y nombre)
const MotaBrand = (): React.ReactElement => {
    const {t} = useTranslation();

    return (
        <Box sx={{display: "flex", alignItems: "center", gap: 1.25, px: 2.5, pt: 2.5, pb: 1.5}}>
            <Box
                aria-hidden={true}
                sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "12px",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: TITLE_FONT_FAMILY,
                    fontWeight: 800,
                    fontSize: "1.15rem",
                }}
            >
                {t("app.name").charAt(0)}
            </Box>
            <Typography sx={{fontFamily: TITLE_FONT_FAMILY, fontWeight: 800, fontSize: "1.25rem"}}>
                {t("app.name")}
            </Typography>
        </Box>
    );
};

// Mota: cabecera de Inicio: nombre de la app y del robot
const HomeHeaderTitle = (): React.ReactElement => {
    const {t} = useTranslation();
    const {data: customizations} = useValetudoCustomizationsQuery();
    const friendlyName = customizations?.friendlyName?.trim();
    const robotName = friendlyName || t("home.header.robotFallback");

    return (
        <Box sx={{minWidth: 0, flex: "1 1 auto"}}>
            <Typography
                component="h1"
                noWrap
                sx={{fontFamily: TITLE_FONT_FAMILY, fontWeight: 800, fontSize: "1.2rem", lineHeight: 1.15}}
            >
                {t("app.name")}
            </Typography>
            <Typography component="div" variant="caption" color="text.secondary" noWrap sx={{lineHeight: 1.25}}>
                {robotName}
            </Typography>
        </Box>
    );
};

const ValetudoAppBar: React.FunctionComponent<{ paletteMode: PaletteMode, setPaletteMode: (newMode: PaletteMode) => void }> = ({
    paletteMode,
    setPaletteMode
}): React.ReactElement => {
    const {t} = useTranslation();
    const [drawerOpen, setDrawerOpen] = React.useState<boolean>(false);
    const desktopLayout = useIsDesktopLayout();
    const currentLocation = useLocation()?.pathname;
    const isHome = currentLocation === "/";
    const robotCapabilities = useCapabilitiesSupported(...Object.values(Capability));

    const duststreamingSupported = robotCapabilities[
        Object.values(Capability).indexOf(Capability.Duststreaming)
    ];

    const {data: duststreamingConfiguration} = useDuststreamingConfigurationQuery({
        enabled: duststreamingSupported
    });
    const duststreamingEnabled = duststreamingConfiguration?.enabled === true;

    // Mota: el historial no tiene capacidad propia; la entrada se muestra si la consulta responde
    const {data: motaCleanHistory} = useMotaCleanHistoryQuery();
    const motaApiAvailable = motaCleanHistory !== undefined;

    //@ts-ignore
    const currentMenuEntry = menuTree.find(element => element.route === currentLocation) ?? menuTree[0];

    const pageTitle = React.useMemo(() => {
        let ret = "";

        menuTree.forEach((element) => {
            //@ts-ignore
            if (currentLocation.includes(element.route) && element.route !== "/" && element.title) {
                if (ret !== "") {
                    ret += " - ";
                }

                ret += t(element.title);
            }
        });

        const productName = t("app.name");

        if (ret !== "") {
            document.title = `${productName} - ${ret}`;
        } else {
            document.title = productName;
        }

        return t(currentMenuEntry.title);
    }, [currentLocation, currentMenuEntry, t]);

    const drawerContent = React.useMemo(() => {
        return (
            <Box
                sx={{width: desktopLayout ? "100%" : 280, pb: 2}}
                role="presentation"
                onClick={() => {
                    setDrawerOpen(false);
                }}
                onKeyDown={() => {
                    setDrawerOpen(false);
                }}
                style={{
                    scrollbarWidth: "thin",
                    overflowX: "hidden"
                }}
            >
                <MotaBrand/>
                <List>
                    {menuTree.filter(item => {
                        return item.kind !== "MenuSubEntry";
                    }).map((value, idx) => {
                        switch (value.kind) {
                            case "Subheader":
                                if (value.requiredCapabilities && !(value.showIfMotaApi && motaApiAvailable)) {
                                    switch (value.requiredCapabilities.type) {
                                        case "allof": {
                                            if (!value.requiredCapabilities.capabilities.every(capability => {
                                                const idx = Object.values(Capability).indexOf(capability);
                                                return robotCapabilities[idx];
                                            })) {
                                                return null;
                                            }

                                            break;
                                        }
                                        case "anyof": {
                                            if (!value.requiredCapabilities.capabilities.some(capability => {
                                                const idx = Object.values(Capability).indexOf(capability);
                                                return robotCapabilities[idx];
                                            })) {
                                                return null;
                                            }

                                            break;
                                        }
                                    }
                                }

                                return (
                                    <ListSubheader
                                        key={`${idx}`}
                                        sx={{
                                            background: "transparent",
                                            userSelect: "none"
                                        }}
                                        disableSticky={true}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {t(value.title)}
                                    </ListSubheader>
                                );

                            case "MenuEntry": {
                                // This breaks with the menu generation logic and should likely be refactored if it ever gains siblings
                                if (value.route === "/robot/camera" && !duststreamingEnabled) {
                                    return null;
                                }

                                if (value.requiresMotaApi && !motaApiAvailable) {
                                    return null;
                                }

                                if (value.requiredCapabilities) {
                                    switch (value.requiredCapabilities.type) {
                                        case "allof": {
                                            if (!value.requiredCapabilities.capabilities.every(capability => {
                                                const idx = Object.values(Capability).indexOf(capability);
                                                return robotCapabilities[idx];
                                            })) {
                                                return null;
                                            }

                                            break;
                                        }
                                        case "anyof": {
                                            if (!value.requiredCapabilities.capabilities.some(capability => {
                                                const idx = Object.values(Capability).indexOf(capability);
                                                return robotCapabilities[idx];
                                            })) {
                                                return null;
                                            }

                                            break;
                                        }
                                    }
                                }

                                const ItemIcon = value.menuIcon;

                                return (
                                    <ListItemButton
                                        key={value.route}
                                        selected={
                                            value.route === currentLocation ||
                                            (value.route !== "/" && currentLocation.startsWith(value.route + "/"))
                                        }
                                        component={Link}
                                        to={value.route}
                                    >
                                        <ListItemIcon>
                                            <ItemIcon/>
                                        </ListItemIcon>
                                        <ListItemText primary={t(value.menuText)}/>
                                    </ListItemButton>
                                );
                            }
                        }
                    })}

                    <Divider sx={{my: 1}}/>
                    <ListItem
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            userSelect: "none"
                        }}
                    >
                        <ListItemIcon>
                            <DarkModeIcon/>
                        </ListItemIcon>
                        <ListItemText primary={t("nav.darkMode")}/>
                        <Switch
                            edge="end"
                            onChange={(e) => {
                                setPaletteMode(e.target.checked ? "dark" : "light");
                            }}
                            checked={paletteMode === "dark"}
                        />
                    </ListItem>


                    <ListSubheader
                        sx={{
                            background: "transparent",
                            userSelect: "none"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {t("nav.links")}
                    </ListSubheader>
                    <ListItemButton
                        component="a"
                        href="./swagger/"
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ListItemIcon>
                            <SwaggerUIIcon/>
                        </ListItemIcon>
                        <ListItemText primary={t("nav.swaggerUi")}/>
                    </ListItemButton>
                    <ListItemButton
                        component="a"
                        href="https://github.com/ElUtkuCorp/Mota"
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ListItemIcon>
                            <GithubIcon/>
                        </ListItemIcon>
                        <ListItemText primary={t("nav.motaRepository")}/>
                    </ListItemButton>
                    <ListItemButton
                        component="a"
                        href="https://github.com/Hypfer/Valetudo"
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ListItemIcon>
                            <GithubIcon/>
                        </ListItemIcon>
                        <ListItemText primary={t("nav.upstreamRepository")}/>
                    </ListItemButton>
                    <ListItemButton
                        component="a"
                        href="https://github.com/sponsors/Hypfer"
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ListItemIcon>
                            <ValetudoHeartMonochromeIcon/>
                        </ListItemIcon>
                        <ListItemText primary={t("nav.donate")}/>
                    </ListItemButton>


                </List>
            </Box>
        );
    }, [currentLocation, paletteMode, setPaletteMode, robotCapabilities, duststreamingEnabled, motaApiAvailable, desktopLayout, t]);

    const toolbarContent = React.useMemo(() => {
        switch (currentMenuEntry.kind) {
            case "MenuEntry":
                return (
                    <>
                        {
                            !desktopLayout &&
                            <IconButton
                                size="large"
                                edge="start"
                                color="inherit"
                                aria-label={t("common.menu")}
                                sx={{mr: isHome ? 0.5 : 1.5}}
                                onClick={() => {
                                    setDrawerOpen(true);
                                }}
                                title={t("common.menu")}
                            >
                                <MenuIcon/>
                            </IconButton>
                        }
                        {
                            isHome ?
                                <HomeHeaderTitle/> :
                                <Typography variant="h6" component="h1" noWrap sx={{flexGrow: 1, minWidth: 0}}>
                                    {pageTitle}
                                </Typography>
                        }
                        {
                            isHome &&
                            <Box sx={{display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0}}>
                                <WifiChip/>
                                <BatteryChips/>
                            </Box>
                        }
                    </>
                );
            case "MenuSubEntry":
                return (
                    <>
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label={t("common.back")}
                            title={t("common.back")}
                            sx={{mr: 1.5}}

                            component={Link}
                            to={currentMenuEntry.parentRoute}
                        >
                            <BackIcon/>
                        </IconButton>
                        <Typography variant="h6" component="h1" noWrap sx={{flexGrow: 1, minWidth: 0}}>
                            {pageTitle}
                        </Typography>
                    </>
                );
            case "Subheader":
                //This can never happen
                return (<></>);
        }
    }, [currentMenuEntry, setDrawerOpen, pageTitle, desktopLayout, isHome, t]);

    return (
        <Box
            sx={{
                userSelect: "none"
            }}
        >
            <AppBar
                position="fixed"
                sx={desktopLayout ? {
                    width: `calc(100% - ${DESKTOP_DRAWER_WIDTH}px)`,
                    ml: `${DESKTOP_DRAWER_WIDTH}px`,
                } : undefined}
            >
                <Toolbar sx={{gap: 0.75, px: {xs: 1.5, sm: 2.5}}}>
                    {toolbarContent}
                    <Box sx={{flexShrink: 0}}>
                        <ValetudoEvents/>
                    </Box>
                </Toolbar>
            </AppBar>
            <Toolbar/>
            {
                desktopLayout &&
                <Drawer
                    variant="permanent"
                    anchor="left"
                    sx={{
                        "& .MuiDrawer-paper": {
                            width: DESKTOP_DRAWER_WIDTH,
                            boxSizing: "border-box",
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            }
            {
                !desktopLayout && currentMenuEntry.kind !== "MenuSubEntry" &&
                <Drawer
                    anchor={"left"}
                    open={drawerOpen}
                    onClose={() => {
                        setDrawerOpen(false);
                    }}
                >
                    {drawerContent}
                </Drawer>
            }
        </Box>
    );
};

export default ValetudoAppBar;
