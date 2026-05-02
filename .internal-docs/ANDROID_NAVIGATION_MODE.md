# Especificación: Modo de Navegación Android

## 🎯 Objetivo Operativo

El comando `xzp -a` proporciona una interfaz interactiva para el acceso rápido a directorios, optimizando el flujo de trabajo en dispositivos táctiles o con teclados limitados.

---

## 🕹️ Interacción TTY

### Controles del Navegador
- **`↑ / ↓`**: Desplazamiento de la selección actual.
- **`Enter / →`**: Acceso al directorio seleccionado.
- **`Esc / ←`**: Retorno al directorio padre.
- **`Ctrl+G`**: Confirmación de la ruta actual y retorno a la shell.

### Integración con Shell
- Apertura automática en el directorio seleccionado.
- Inyección de alias de acceso rápido (Quick Access).
- Capacidad de reinvocar el navegador mediante el atajo `Ctrl+G` desde una sesión activa.

---

## ⚙️ Arquitectura Técnica

- **Aislamiento de Estado:** Separación estricta entre el motor de renderizado, el estado de navegación y el proceso final de la shell.
- **Eficiencia de Recursos:** Evitar listeners de TTY persistentes tras el cierre de sesión y optimizar el manejo de directorios con alta densidad de archivos.
- **Caché de Firmas:** Persistencia temporal de firmas de proyecto para evitar re-escaneos innecesarios durante la navegación.

---

## 📌 Estado de Implementación

1. ✅ Base interactiva funcional.
2. ✅ Integración total de `Ctrl+G`.
3. 🚧 Pendiente: Implementación de vista `tree` expandible y pruebas de compatibilidad en emuladores de terceros.

---
<p align="center">
  <img src="../icon/logo-transparent-xzp.png" alt="Xzp Logo" width="60" />
  <br>
  <sub>Xzp · Especificación de Navegación</sub>
</p>
