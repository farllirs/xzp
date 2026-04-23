# Release Checklist Xzp

## Antes De Publicar

- correr `npm test`
- revisar `node ./bin/xzp --help`
- revisar `XZP_OUTPUT_FORMAT=json node ./bin/xzp --doctor`
- revisar `XZP_OUTPUT_FORMAT=json node ./bin/xzp --inspect`
- revisar `XZP_OUTPUT_FORMAT=json node ./bin/xzp --agent-status`
- validar snapshots en `snapshots/`

## Empaquetado

- correr `npm pack --dry-run`
- confirmar inclusion de `README.md`, `BRANDING.md`, `icon/`, `assets/`, `snapshots/`
- validar nombre `@nyxur/xzp`

## Seguridad

- revisar fugas de rutas o tokens en reportes
- revisar outputs JSON para scripts y agentes
- revisar experiencia real en Termux y Linux

## Cierre

- actualizar version
- actualizar changelog corto de release
- publicar
