# Revisión de Compatibilidad: Termux

Xzp ha sido optimizado para el entorno de Termux en Android. A continuación se listan los requisitos y comportamientos específicos para esta plataforma.

## Integración con Android
- **Almacenamiento**: El acceso rápido debe resolver correctamente las rutas hacia `storage/shared` para permitir la interacción con archivos fuera del entorno aislado de Termux.
- **Repositorios**: Al ejecutar `xzp -i`, la herramienta debe verificar la disponibilidad de los mirrors de Termux y notificar al usuario si se detectan problemas de conexión o repositorios caídos.
- **Seguridad en Shell**: La función `safe-shell` debe aplicar restricciones adicionales cuando se trabaje en directorios de Android para evitar modificaciones accidentales en archivos del sistema o de otras aplicaciones.

## Optimización de Interfaz
- **Modo Agente**: El funcionamiento debe ser fluido y sin interrupciones por prompts innecesarios, permitiendo una integración limpia con otros procesos automatizados en el dispositivo.
- **Salida de Datos**: Las salidas en formato JSON deben estar limpias de códigos de color ANSI o banners decorativos para asegurar que sean legibles por otros scripts o aplicaciones.
