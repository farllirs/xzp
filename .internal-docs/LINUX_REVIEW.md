# Revisión Técnica: Entorno Linux

Directrices para la operación de Xzp en distribuciones Linux puras y entornos Proot/Chroot.

---

## 🔍 Puntos de Control

- **Resolución de Shells:** Validar la disponibilidad de binarios de shell antes de iniciar sesiones interactivas.
- **Gestión de Almacenamiento:** Mantener una estrategia de fallback robusta cuando no se detecten puntos de montaje de almacenamiento compartido (`/sdcard`).
- **Compatibilidad de Protocolos:** Revisar la integración con clientes de correo y la resolución de enlaces `mailto`.
- **Degradación Controlada:** Asegurar que las funciones específicas de Android (Navigator) degraden correctamente a exploradores de rutas rápidas de Linux sin errores de ejecución.

---
<p align="center">
  <img src="../icon/logo-transparent-xzp.png" alt="Xzp Logo" width="60" />
  <br>
  <sub>Xzp · Documentación Técnica de Revisión</sub>
</p>
