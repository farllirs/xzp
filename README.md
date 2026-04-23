<p align="center">
  <img src="./icon/banner-xzp.png" alt="Xzp Banner" width="100%" />
</p>

<h1 align="center">Xzp</h1>

<p align="center">
  <b>Una interfaz de línea de comandos visual y técnica diseñada para la eficiencia en entornos Termux y Linux.</b><br>
  <i>Optimización de flujos de trabajo, auditoría de proyectos y gestión de contexto con un enfoque en la seguridad y la sobriedad.</i>
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Termux%20%7C%20Linux-111111?style=flat-square&labelColor=F97316&color=1F2937">
  <img alt="Package" src="https://img.shields.io/badge/package-%40nyxur%2Fxzp-111111?style=flat-square&labelColor=0F766E&color=1F2937">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.1-111111?style=flat-square&labelColor=2563EB&color=1F2937">
  <img alt="License" src="https://img.shields.io/badge/license-XZP-111111?style=flat-square&labelColor=334155&color=1F2937">
</p>

---

## Presentación

**Xzp** no es solo una herramienta de terminal; es un ecosistema utilitario que aporta claridad y estructura al desarrollo en entornos móviles y de escritorio. Diseñado para desarrolladores que exigen precisión, Xzp facilita la navegación por proyectos complejos, la gestión de dependencias y la auditoría de seguridad sin sacrificar la potencia de la línea de comandos nativa.

### Capacidades Principales

*   **Análisis de Contexto**: Detección automática de stacks tecnológicos y perfiles de proyecto.
*   **Exploración Inteligente**: Búsqueda semántica avanzada y visualización de estructuras de directorios mediante árboles comparativos.
*   **Gestión de Favoritos**: Sistema persistente para el acceso rápido a rutas críticas de desarrollo.
*   **Seguridad Integrada**: Auditoría de salud del sistema (`doctor`), inspección profunda y reportes de error con redacción automática de datos sensibles.
*   **Modo Agente**: Interfaz optimizada para la integración con agentes de IA y flujos de automatización mediante salidas JSON estables.

---

## Instalación y Configuración

### Instalación Global
Para integrar Xzp en su flujo de trabajo global, utilice el gestor de paquetes npm:

```bash
npm i -g @nyxur/xzp
```

### Ejecución Local
Si prefiere ejecutar la herramienta directamente desde el repositorio:

```bash
node ./bin/xzp --help
```

### Archivos de Configuración
Xzp mantiene su estado y preferencias en: `~/.config/xzp/config.json`. Este archivo gestiona versiones de esquema, favoritos, historial de contextos y exclusiones de búsqueda.

---

## Guía de Comandos Rápidos

| Categoría | Funcionalidad | Comando |
| :--- | :--- | :--- |
| **Interfaz** | Menú visual interactivo y ajustes | `xzp -m` |
| **Contexto** | Perfilado de proyecto y favoritos | `xzp -x --profile` |
| **Exploración** | Búsqueda semántica y árboles | `xzp -b` / `xzp -t` |
| **Clipboard** | Gestión avanzada del portapapeles | `xzp -c` / `xzp -p` |
| **Auditoría** | Diagnóstico de salud e inspección | `xzp --doctor` |
| **Seguridad** | Generación de reportes redactados | `xzp --report-error` |

---

## Documentación Detallada

Para una comprensión profunda de los principios y el funcionamiento interno de Xzp, consulte nuestra documentación técnica:

*   📘 **[Guía de Identidad Visual (Branding)](./.internal-docs/BRANDING.md)**: Principios de diseño y estética.
*   📋 **[Lista de Verificación de Lanzamientos](./.internal-docs/RELEASE_CHECKLIST.md)**: Protocolos de publicación y calidad.
*   🛠️ **[Revisión de Entorno: Termux](./.internal-docs/TERMUX_REVIEW.md)**: Optimizaciones específicas para Android.
*   🐧 **[Revisión de Entorno: Linux](./.internal-docs/LINUX_REVIEW.md)**: Compatibilidad y comportamiento en escritorio.
*   📈 **[Registro de Evolución y Continuidad](./.internal-docs/PLAN_CONTINUACION.md)**: Hoja de ruta y progreso del proyecto.
*   🔍 **[Resumen de Estado y Contexto](./.internal-docs/CORTE_CONTEXTO_ACTUAL.md)**: Detalles técnicos sobre seguridad y arquitectura.

---

## Flujos de Trabajo Especializados

### Integración con Agentes de IA
Xzp incluye un **Modo Agente** diseñado para ser consumido por procesos automatizados:

```bash
# Activar modo agente
xzp --agent-on

# Ejecutar comandos con salida JSON pura
XZP_AGENT_MODE=1 xzp --doctor
```

### Recetas por Lenguaje
Xzp adapta su comportamiento según el lenguaje detectado:
*   **Node.js**: `xzp -b "package" --scope actual`
*   **Python**: `xzp -b "requirements" --scope actual`
*   **PHP**: `xzp -b "composer" --scope actual`

---

## Desarrollo y Contribución

Para asegurar la estabilidad del proyecto, contamos con una suite de pruebas completa:

```bash
# Ejecutar tests unitarios y de integración
npm test
```

<p align="center">
  <img src="./icon/logo-transparent-xzp.png" alt="Xzp Logo" width="80" />
  <br>
  <sub>Desarrollado con un enfoque en la sobriedad y la eficiencia técnica.</sub>
</p>
