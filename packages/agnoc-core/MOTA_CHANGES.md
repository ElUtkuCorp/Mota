# Cambios de Mota sobre @agnoc/core 0.17.2

Copia del paquete publicado en npm (código compilado en `lib/`, licencia MIT en `LICENSE.md`),
modificada para la Cecotec Conga 3090. Origen: https://github.com/congatudo/agnoc

Los cambios están marcados en el código con comentarios `Mota:`.

## Petición del mapa (`DEVICE_MAPID_GET_GLOBAL_INFO_REQ`)

- Sin `MAP_PLANS` se pide con `0xff | 0x400`: con `0xff` la 3090 devuelve las zonas prohibidas del guardado anterior.
- Pero `0x400` hace que el firmware guarde el mapa y cierre la tarea en curso. Por eso se pide solo con el robot en
  reposo (modo 0). Al conectar, o con una tarea abierta (limpieza, zonas, vuelta a la base o espera para seguir tras
  cargar), se pide con `0xff` y la petición completa se repite cuando el robot pasa a reposo (`getMotaMapMask`,
  `motaRefreshMapWhenIdle`).
- Guardar zonas prohibidas sigue pidiendo `0x400`, porque sin él no se borrarían las últimas.
