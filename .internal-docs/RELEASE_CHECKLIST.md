# Lista de Verificación para Lanzamientos (Release Checklist)

Este documento sirve como guía obligatoria antes de publicar cualquier nueva versión de Xzp en npm o GitHub.

## Pruebas de Funcionamiento
- [ ] Ejecutar la suite de pruebas completa: `npm test`.
- [ ] Verificar la ayuda del comando: `node ./bin/xzp --help`.
- [ ] Validar el estado del sistema con Doctor: `XZP_OUTPUT_FORMAT=json node ./bin/xzp --doctor`.
- [ ] Comprobar la inspección de proyectos: `XZP_OUTPUT_FORMAT=json node ./bin/xzp --inspect`.
- [ ] Confirmar el estado del modo agente: `XZP_OUTPUT_FORMAT=json node ./bin/xzp --agent-status`.
- [ ] Revisar manualmente los snapshots generados en la carpeta `snapshots/`.

## Validación del Paquete
- [ ] Realizar un simulacro de empaquetado: `npm pack --dry-run`.
- [ ] Asegurar que los archivos esenciales estén incluidos: `README.md`, `BRANDING.md`, carpetas `icon/`, `assets/` y `snapshots/`.
- [ ] Confirmar que el nombre del paquete sea el correcto: `@nyxur/xzp`.

## Seguridad y Privacidad
- [ ] Auditar los reportes de error para asegurar que no se filtren tokens, claves o rutas personales.
- [ ] Verificar que las salidas JSON sean estables y seguras para su uso en scripts.
- [ ] Probar la experiencia de usuario final tanto en entornos Linux como en Termux.

## Finalización del Proceso
- [ ] Incrementar la versión en `package.json`.
- [ ] Actualizar el registro de cambios (changelog) con las novedades de la versión.
- [ ] Proceder con la publicación oficial.
