import {Route} from "react-router";
import {Navigate, Routes} from "react-router-dom";
import MapManagement from "./MapManagement";
import EditMapPage from "../map/EditMapPage";
import {useCapabilitiesSupported} from "../CapabilitiesProvider";
import {Capability, useDuststreamingConfigurationQuery} from "../api";
import React from "react";
import SpectatorMapPage from "../map/SpectatorMapPage";
import MapVersionsPage from "./MapVersionsPage";
import FirmwareMapBackupsPage from "./FirmwareMapBackupsPage";

const OptionsRouter = (): React.ReactElement => {
    const [
        combinedVirtualRestrictionsCapabilitySupported,

        mapSegmentEditCapabilitySupported,
        mapSegmentRenameCapabilitySupported,

        mapAnnotationsCapabilitySupported,

        duststreamingSupported,
    ] = useCapabilitiesSupported(
        Capability.CombinedVirtualRestrictions,

        Capability.MapSegmentEdit,
        Capability.MapSegmentRename,

        Capability.MapAnnotations,

        Capability.Duststreaming
    );

    const {data: duststreamingConfiguration} = useDuststreamingConfigurationQuery({
        enabled: duststreamingSupported
    });
    const duststreamingPossible = duststreamingSupported && duststreamingConfiguration?.enabled !== false;

    return (
        <Routes>
            <Route path={""} element={<MapManagement />}/>

            {
                (mapSegmentEditCapabilitySupported || mapSegmentRenameCapabilitySupported) &&
                <Route
                    path={"segments"}
                    element={
                        <EditMapPage
                            mode={"segments"}
                        />
                    }
                />
            }
            {
                combinedVirtualRestrictionsCapabilitySupported &&
                <Route
                    path={"virtual_restrictions"}
                    element={
                        <EditMapPage
                            mode={"virtual_restrictions"}
                        />
                    }
                />
            }
            {
                mapAnnotationsCapabilitySupported &&
                <Route
                    path={"annotations"}
                    element={
                        <EditMapPage
                            mode={"annotations"}
                        />
                    }
                />
            }

            {/* Mota: sin la API propia, la página muestra el error de carga */}
            <Route
                path={"mirrors"}
                element={
                    <EditMapPage
                        mode={"mirrors"}
                    />
                }
            />

            <Route
                path={"retouch"}
                element={
                    <EditMapPage
                        mode={"retouch"}
                    />
                }
            />

            {/* Mota: la cobertura es una vista del mapa de Inicio */}
            <Route path={"robot_coverage"} element={<Navigate to="/"/>}/>

            {/* Mota: versiones del mapa (sin la API propia, la página muestra el error de carga) */}
            <Route path={"versions"} element={<MapVersionsPage/>}/>

            {/* Mota: copias del mapa del robot (sin la API propia, la página muestra el error de carga) */}
            <Route path={"robot_backups"} element={<FirmwareMapBackupsPage/>}/>

            <Route path={"spectator"} element={duststreamingPossible ? <SpectatorMapPage/> : <Navigate to="/" />}/>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

export default OptionsRouter;
