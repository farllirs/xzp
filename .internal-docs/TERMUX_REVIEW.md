# Revisión Técnica: Entorno Termux

Directrices para asegurar el funcionamiento óptimo de Xzp dentro del entorno de emulación de Android.

---

## 🔍 Puntos de Control

- **Compatibilidad de Almacenamiento:** Priorizar el acceso y manipulación de archivos en `/sdcard` y puntos de montaje de almacenamiento compartido.
- **Gestión de TTY:** Validar el comportamiento del terminal en operaciones de `redraw` y `raw mode` para evitar artefactos visuales.
- **Atajos Operativos:** Mantener `Ctrl+G` como el comando estándar para alternar entre el navegador visual y la shell activa.
- **Rutas de Sistema:** Verificar la existencia y permisos de ejecución de rumbos de shell estándar (`/usr/bin/bash`, `/usr/bin/zsh`).
- **Aislamiento de Entorno:** Asegurar que las variables de entorno de Termux no interfieran con la lógica de detección de proyectos en Linux (Proot).

---
<p align="center">
  <img src="../icon/logo-transparent-xzp.png" alt="Xzp Logo" width="60" />
  <br>
  <sub>Xzp · Documentación Técnica de Revisión</sub>
</p>
