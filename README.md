# Mota

**Mota** es una interfaz local y libre para robots aspiradores Cecotec Conga 3090: control sin nube, en español, con historial, habitaciones y mapa mejorado. Corre dentro del propio robot y no necesita Internet.

> Estado: fase 2.0 (base técnica). Todavía no hay una versión utilizable en el robot.

## Origen

Mota es un fork de [Valetudo](https://github.com/Hypfer/Valetudo) 2026.10.0 al que se incorpora el controlador para el protocolo 3irobotix de [Congatudo](https://github.com/congatudo/Congatudo) y [agnoc](https://github.com/congatudo/agnoc). Todos se distribuyen bajo la licencia Apache 2.0: ver [LICENSE](LICENSE) y [NOTICE](NOTICE).

Mota no está afiliado a esos proyectos ni a Cecotec. **No pidas soporte de Mota a Valetudo ni a Congatudo.** El README original de Valetudo se conserva en [README.valetudo.md](README.valetudo.md).

## Compilación

Requiere Node.js 22.

```bash
npm ci
npm run build_openapi_schema
npm run build --workspace=frontend
npm run build_armv7 --workspace=backend
```

El binario queda en `build/armv7/valetudo`. GitHub Actions ([mota-build.yml](.github/workflows/mota-build.yml)) compila `mota-armv7` y `mota-armv7-lowmem` en cada push a `main` y los adjunta, con `SHA256SUMS`, a cada release publicada.

## Licencia

Apache 2.0. Ver [LICENSE](LICENSE) y [NOTICE](NOTICE).
