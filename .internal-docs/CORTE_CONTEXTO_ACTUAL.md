# Resumen de Estado y Contexto Actual: Xzp

Este documento proporciona una visión técnica del estado actual del código y las medidas de seguridad implementadas hasta la fecha.

## Arquitectura y Seguridad
Se ha puesto especial énfasis en la robustez del sistema:
- **Validación de Entradas**: Saneamiento estricto de todos los argumentos recibidos por la CLI.
- **Privacidad**: Los reportes de error y snapshots ahora ocultan automáticamente tokens, claves y rutas personales (sustituyéndolas por `~`).
- **Configuración**: Implementación de un sistema de configuración versionado que permite migraciones seguras entre actualizaciones.
- **Salidas Estructuradas**: Optimización de los formatos JSON para garantizar que sean procesables por scripts sin incluir ruido visual o caracteres de control innecesarios.

## Verificación de Funcionalidad
Se han validado los siguientes componentes mediante pruebas exhaustivas:
- Gestión de portapapeles y acciones de copia/pegado.
- Búsqueda semántica y generación de árboles de directorios con filtros.
- Sistema de instalación con reportes persistentes.
- Modo Agente y estados de ejecución para IA.
- Suite de tests unitarios y de integración para el núcleo del sistema.

## Referencias de Archivos Críticos
Para cualquier modificación futura, se deben tener en cuenta los siguientes módulos:
- `src/core/config.js`: Lógica de persistencia y esquemas.
- `src/ui/output.js`: Gestión de la interfaz y formatos de salida.
- `src/utils/security.js`: Filtros de privacidad y saneamiento de datos.
- `src/commands/`: Implementación de la lógica de negocio por comando.

## Instrucciones para el Desarrollo
Antes de realizar cambios significativos, es fundamental:
1. Validar que no se introduzcan fugas de información en los logs.
2. Mantener la compatibilidad de las salidas JSON para no romper integraciones existentes.
3. Seguir los principios definidos en la `BRANDING.md` para cualquier nueva interfaz.
