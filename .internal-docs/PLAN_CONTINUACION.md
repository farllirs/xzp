# Plan de Continuación Estratégica

## 🎯 Objetivo General

Evolucionar la funcionalidad de Xzp manteniendo la mantenibilidad del código y la estabilidad del núcleo del sistema.

---

## 🚀 Prioridades Operativas

### 1. Evolución del Modo Agente
- **Estandarización de Contratos:** Ampliar la compatibilidad de comandos con esquemas de salida estables.
- **Optimización de Contexto:** Utilizar la persistencia de datos para minimizar el escaneo redundante del sistema.
- **Protocolos de Uso:** Definir reglas claras sobre la preferencia de comandos Xzp sobre la ejecución de shell directa.

### 2. Internacionalización (i18n)
- **Centralización de Textos:** Migración exhaustiva de cadenas de texto hacia archivos de locale.
- **Referencia Editorial:** Mantener `co_es` como el estándar de redacción para futuras traducciones.

### 3. Experiencia Interactiva (TTY)
- **Estabilidad Visual:** Mitigación de parpadeos y errores de redibujado en sesiones interactivas.
- **Extensión Funcional:** Adaptar la base interactiva del navegador para el comando `tree` expandible.

### 4. Seguridad y Endurecimiento
- **Gestión de Rutas:** Validación estricta de rutas derivadas y nombres persistidos.
- **Control de Inyección:** Refuerzo de la seguridad en la inyección de variables de entorno de shell.
- **Robustez de Errores:** Estandarización del manejo y reporte de fallos críticos.

---

## ✅ Criterios de Aceptación

Una mejora se considera finalizada cuando:
- Reduce la complejidad operativa real.
- Preserva la compatibilidad externa y los contratos JSON.
- Mantiene o incrementa la cobertura de pruebas unitarias.

---
<p align="center">
  <img src="../icon/logo-transparent-xzp.png" alt="Xzp Logo" width="60" />
  <br>
  <sub>Xzp · Hoja de Ruta de Desarrollo</sub>
</p>
