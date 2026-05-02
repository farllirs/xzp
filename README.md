<p align="center">
  <img src="./icon/banner-xzp.png" alt="Xzp Banner" width="100%" />
</p>

# Xzp

**Control y visibilidad para entornos Termux y Linux.**

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Termux%20%7C%20Linux-111111?style=flat-square&labelColor=F97316&color=1F2937">
  <img alt="Package" src="https://img.shields.io/badge/package-%40nyxur%2Fxzp-111111?style=flat-square&labelColor=0F766E&color=1F2937">
  <img alt="Version" src="https://img.shields.io/badge/version-1.2.1-111111?style=flat-square&labelColor=2563EB&color=1F2937">
  <img alt="License" src="https://img.shields.io/badge/license-XZP-111111?style=flat-square&labelColor=334155&color=1F2937">
</p>

Xzp es una herramienta técnica diseñada para optimizar la inspección de proyectos, la navegación de archivos y la gestión de contextos en la terminal. Prioriza la claridad de los datos, la seguridad en la ejecución y la compatibilidad con automatizaciones.

---

## 🛠️ Capacidades Principales

- **Detección de Contexto:** Identificación automática de rumbos de proyecto (Node, Python, PHP, Go, etc.) y estados de instalación.
- **Navegación TTY:** Explorador visual de directorios optimizado para pantallas táctiles y teclados compactos.
- **Puente de Datos (Xzp Bridge):** Sincronización transparente de archivos y rutas entre el host de Termux y distribuciones Linux (Debian, Ubuntu, etc.).
- **Smart Install:** Sistema de instalación protegida con barra de progreso visual y reportes de éxito/fallo.
- **Safe Mode:** Aislamiento de ejecución para proteger el sistema de archivos principal durante el desarrollo.

---

## 🚀 Instalación y Uso

Instalación global:
```bash
npm i -g @nyxur/xzp
```

### Comandos de Control

| Comando | Acción |
| :--- | :--- |
| `xzp -m` | Menú de acceso rápido a herramientas. |
| `xzp -a` | Navegador visual para Android storage. |
| `xzp -i` | Instalación asistida y segura del proyecto actual. |
| `xzp -c 'ruta'` | Copia inteligente al portapapeles compartido. |
| `xzp -p 'linux'` | Pegado directo en la raíz del entorno Linux configurado. |
| `xzp -r` | Apertura de shell segura con entorno aislado. |
| `xzp -t .` | Generación de árbol de directorios con resumen técnico. |

---

## 🌉 Conectividad (Cross-Environment)

Xzp permite operar entre el almacenamiento de Android y contenedores Linux sin cambiar de contexto manualmente.

- Para enviar a Linux: `xzp -p 'linux'`
- Para retornar a Termux: `xzp -p 'termux'`

*El sistema mapea automáticamente los puntos de montaje de `proot-distro` y resuelve las rutas relativas.*

---

## 🧪 Instalación Silenciosa

El sistema **Smart Install** (`-i`) reduce el ruido en la terminal capturando la salida de los gestores de paquetes y mostrando un indicador de progreso unificado. Al finalizar, genera un resumen detallado de las dependencias procesadas.

---

## 📱 Navegador Android

La interfaz visual de `xzp -a` permite una movilidad fluida entre carpetas sin ensuciar la shell con comandos `cd` repetitivos.

<p align="center">
  <img src="./icon/android-nav-preview.png" alt="Xzp Android Navigator" width="480" />
</p>

---

## 🤖 Modo Agente

Xzp expone una interfaz de datos diseñada para ser consumida por agentes de IA o scripts de automatización. Activa el modo para obtener salidas JSON consistentes:

```bash
xzp --agent-on
```

---

<p align="center">
  <img src="./icon/logo-transparent-xzp.png" alt="Xzp Logo" width="80" />
  <br>
  <sub>Xzp · Desarrollado para la eficiencia técnica y el control total.</sub>
</p>


