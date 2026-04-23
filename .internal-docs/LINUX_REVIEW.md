# Revisión de Compatibilidad: Linux

Este documento detalla los puntos críticos para asegurar el correcto funcionamiento de Xzp en entornos Linux convencionales.

## Consideraciones de Sistema
- **Rutas de Acceso**: El sistema de acceso rápido debe priorizar el directorio `home` del usuario o los puntos de montaje de almacenamiento compartido disponibles.
- **Gestión de Paquetes**: El comando `xzp -i` debe ser agnóstico al gestor de paquetes; no se debe asumir la presencia de `pkg` (propio de Termux) y se debe validar el entorno antes de sugerir instalaciones.
- **Ejecución de Comandos**: La funcionalidad `safe-shell` debe integrarse con la shell interactiva configurada en el host para respetar alias y variables de entorno del usuario.

## Interacción y Automatización
- **Modo Agente**: Para integraciones con herramientas de IA o scripts, se debe priorizar la salida en formato JSON estable, evitando prompts interactivos que puedan bloquear la ejecución.
- **Consistencia de Salida**: Los resultados mostrados en terminal deben mantener una estructura predecible para facilitar su procesamiento mediante tuberías (pipes) o redirecciones.
