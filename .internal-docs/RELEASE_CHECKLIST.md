# Protocolo de Release

Lista de verificación obligatoria antes de proceder con la publicación de una nueva versión de Xzp.

---

## 🛠️ Fase de Validación Técnica

1. **Pruebas Automatizadas:** Ejecución completa de `npm test` sin fallos.
2. **Consistencia Documental:** Revisión de `README.md` y documentos internos bajo el criterio de estilo soberbio.
3. **Integridad del Paquete:** Confirmar que `package.json` incluya todos los binarios, assets y archivos de localización necesarios.
4. **Verificación de Comandos:** Validar la ayuda principal (`-h`) y el comportamiento del modo agente.
5. **Pruebas de Campo:** Comprobar flujos críticos en entornos reales (Termux nativo y Proot-distro).

---

## 📦 Fase de Empaquetado

1. **I18n:** Revisar cambios en los archivos de locale (`data/locales/`).
2. **Contexto de Agente:** Asegurar que el contexto persistido sea regenerable y preciso.
3. **Contratos JSON:** Verificar que no existan cambios rompientes en las salidas estructuradas de los comandos.
4. **Versión:** Confirmar el incremento correcto en `package.json` y la alineación con el registro de cambios.

---
<p align="center">
  <img src="../icon/logo-transparent-xzp.png" alt="Xzp Logo" width="60" />
  <br>
  <sub>Xzp · Checklist de Publicación</sub>
</p>
