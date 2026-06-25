import fs from 'node:fs/promises';
import { gatherDoctorReport } from '../utils/system-inspect.js';
import { getAndroidConfig, getUserConfigPath, loadUserConfig } from '../core/config.js';
import { resolvePlatformMode, getQuickAccessRoot } from '../utils/platform.js';
import { printBanner, printSection, printKeyValueRows, statusLabel } from '../ui/output.js';


const ANSI = {
  bold: '\x1b[1m',
  reset: '\x1b[0m',
  slate: '\x1b[38;5;245m',
  steel: '\x1b[38;5;110m',
  mint: '\x1b[38;5;121m',
  amber: '\x1b[38;5;179m',
  red: '\x1b[38;5;203m',
  white: '\x1b[38;5;255m',
};

const DIAGNOSE_VERSION = '1.5.0';

export async function runDiagnoseCommand({ outputFormat = 'text', runtimePreferences } = {}) {
  const noColor = runtimePreferences?.noColor === true;
  const c = noColor ? { bold: '', reset: '', slate: '', steel: '', mint: '', amber: '', red: '', white: '' } : ANSI;
  const config = await loadUserConfig().catch(() => null);
  const platformMode = resolvePlatformMode(config || {});
  const doctor = await gatherDoctorReport().catch(() => null);
  const androidConfig = await getAndroidConfig().catch(() => null);

  // Categorías de salud
  const categories = {
    core: await scoreCore(config, doctor),
    environment: await scoreEnvironment(doctor),
    android: await scoreAndroid(platformMode, androidConfig),
    config: await scoreConfig(config),
    prompts: await scorePrompts(),
  };

  const globalScore = Math.round(
    Object.values(categories).reduce((sum, cat) => sum + cat.score, 0) / Object.keys(categories).length
  );

  const issues = doctor?.issues || [];
  const findings = buildFindings(categories, issues, platformMode, config);

  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      schemaVersion: '1.0',
      diagnoseVersion: DIAGNOSE_VERSION,
      timestamp: new Date().toISOString(),
      platform: platformMode,
      globalScore,
      categories,
      findings: findings.map(f => ({
        severity: f.severity,
        area: f.area,
        message: f.message,
        recommendation: f.recommendation,
      })),
      summary: buildSummary(globalScore),
    }, null, 2));
    return;
  }

  // === OUTPUT TEXT ===
  printBanner(`Xzp Diagnóstico v${DIAGNOSE_VERSION}`, [
    `Análisis completo del sistema · Puntuación: ${globalScore}/100 · ${buildSummary(globalScore)}`,
  ]);

  // Score general destacado
  const globalColor = globalScore >= 80 ? c.mint : globalScore >= 60 ? c.amber : c.red;
  const globalIcon = globalScore >= 80 ? '🟢' : globalScore >= 60 ? '🟡' : '🔴';
  const barFull = Math.round(globalScore / 5);
  const barEmpty = 20 - barFull;
  const globalBar = `${globalColor}${'█'.repeat(barFull)}${c.slate}${'░'.repeat(barEmpty)}${c.reset}`;
  console.log(`  ${globalIcon}  Global  ${globalColor}${String(globalScore).padStart(3)}/100${c.reset}  ${globalBar}`);
  console.log(`  ${c.slate}Plataforma: ${platformMode}${c.reset}`);
  console.log('');

  // Scores por categoría en tabla compacta
  printSection('Puntuación por Categoría');
  const categoryKeys = Object.entries(categories);
  for (const [key, cat] of categoryKeys) {
    const label = getCategoryLabel(key);
    const bar = renderScoreBar(cat.score, c);
    const flag = cat.score >= 80 ? '✅' : cat.score >= 60 ? '⚠️' : '❌';
    const scoreColor = cat.score >= 80 ? c.mint : cat.score >= 60 ? c.amber : c.red;
    console.log(`  ${flag} ${c.bold}${label.padEnd(20)}${c.reset} ${scoreColor}${String(cat.score).padStart(3)}/100${c.reset}  ${bar}`);
    if (cat.details?.length) {
      for (const detail of cat.details) {
        const icon = detail.includes('✅') ? '' : '  ';
        console.log(`  ${icon}  ${c.slate}${detail}${c.reset}`);
      }
    }
    // Blank line between categories for readability
    if (key !== categoryKeys[categoryKeys.length - 1][0]) {
      console.log('');
    }
  }

  // Hallazgos compactos con bordes
  if (findings.length > 0) {
    printSection('Hallazgos y Recomendaciones');
    const severityConfig = {
      critical: { label: 'CRÍTICO', color: c.red },
      high: { label: 'ALTO', color: c.amber },
      medium: { label: 'MEDIO', color: c.amber },
      low: { label: 'BAJO', color: c.slate },
    };
    for (const f of findings) {
      const cfg = severityConfig[f.severity] || severityConfig.low;
      const tag = `${cfg.color}[${cfg.label}]${c.reset}`;
      console.log(`  ${tag} ${c.bold}${f.area}${c.reset}: ${f.message}`);
      console.log(`    ${c.slate}→ ${f.recommendation}${c.reset}`);
    }
  } else {
    console.log(`\n  ${c.mint}✅ No se encontraron problemas relevantes.${c.reset}`);
  }

  console.log('');
}

async function scoreCore(config, doctor) {
  const details = [];
  let score = 85;

  if (!config) {
    score -= 30;
    details.push('❌ No se pudo cargar la configuración');
  }

  if (doctor) {
    if (doctor.health?.counts?.critical > 0) {
      score -= doctor.health.counts.critical * 15;
      details.push(`⚠️  ${doctor.health.counts.critical} problema(s) crítico(s) detectados`);
    }
    if (doctor.health?.counts?.high > 0) {
      score -= doctor.health.counts.high * 8;
    }
  } else {
    score -= 20;
    details.push('⚠️  No se pudo ejecutar el doctor');
  }

  return { score: clampScore(score), details };
}

async function scoreEnvironment(doctor) {
  const details = [];
  let score = 80;

  if (!doctor?.tools?.length) {
    score -= 20;
    details.push('❌ No se detectaron herramientas del sistema');
  } else {
    const found = doctor.tools.filter(t => t.found).length;
    const total = doctor.tools.length;
    const ratio = total > 0 ? found / total : 0;
    if (ratio < 0.3) {
      score -= 25;
      details.push(`⚠️  Solo ${found}/${total} herramientas disponibles`);
    } else if (ratio < 0.6) {
      score -= 10;
      details.push(`ℹ️  ${found}/${total} herramientas disponibles`);
    } else {
      details.push(`✅ ${found}/${total} herramientas disponibles`);
    }
  }

  return { score: clampScore(score), details };
}

async function scoreAndroid(platformMode, androidConfig) {
  const details = [];
  let score = 60; // Punto de partida honesto: el módulo Android está base

  if (platformMode !== 'termux') {
    return { score: 85, details: ['ℹ️  No aplica (plataforma no Termux)'] };
  }

  if (!androidConfig) {
    score -= 20;
    details.push('❌ No hay configuración Android');
  } else {
    const qa = androidConfig.enabledQuickAccess || [];
    if (qa.length === 0) {
      score -= 15;
      details.push('⚠️  No hay accesos rápidos configurados');
    } else {
      details.push(`✅ ${qa.length} acceso(s) rápido(s) configurado(s): ${qa.join(', ')}`);
    }

    if (androidConfig.persistLastLocation) {
      details.push('✅ Persistencia de ubicación activada');
    } else {
      score -= 5;
    }

    if (androidConfig.integrateWithAgent) {
      details.push('✅ Integración con Modo Agente activada');
    } else {
      score -= 5;
    }
  }

  // Check storage access
  try {
    const quickRoot = getQuickAccessRoot(platformMode);
    if (quickRoot) {
      await fs.access(quickRoot);
      details.push(`✅ Almacenamiento accesible: ${quickRoot}`);
    }
  } catch {
    score -= 20;
    details.push('❌ Almacenamiento Android no accesible');
  }

  return { score: clampScore(score), details };
}

async function scoreConfig(config) {
  const details = [];
  let score = 75;

  if (!config) {
    return { score: 40, details: ['❌ No se pudo cargar la configuración'] };
  }

  // Verificar archivo de configuración
  try {
    const configPath = getUserConfigPath();
    await fs.access(configPath);
    const stat = await fs.stat(configPath);
    if (stat.size > 100 * 1024) {
      score -= 10;
      details.push('⚠️  Archivo de config muy grande (>100KB)');
    } else {
      details.push('✅ Archivo de configuración existe y es accesible');
    }
  } catch {
    score -= 20;
    details.push('❌ No se pudo acceder al archivo de configuración');
  }

  // Verificar estructura Android en config
  if (!config.android) {
    score -= 10;
    details.push('⚠️  Falta sección android en configuración');
  } else {
    const requiredKeys = ['enabledQuickAccess', 'showFileSizes', 'persistLastLocation', 'integrateWithAgent'];
    const missing = requiredKeys.filter(k => !(k in config.android));
    if (missing.length > 0) {
      score -= 5 * missing.length;
      details.push(`⚠️  Faltan claves en android: ${missing.join(', ')}`);
    }
  }

  return { score: clampScore(score), details };
}

async function scorePrompts() {
  const details = [];
  let score = 73; // Baseline honesto de estabilidad de prompts

  const isTTY = process.stdin.isTTY && process.stdout.isTTY;
  if (!isTTY) {
    details.push('ℹ️  No es TTY — los prompts usan fallback');
    score += 5; // fallback mode es más estable
  } else {
    details.push('ℹ️  Modo TTY — los prompts están activos');
    // En Termux, los prompts tienen problemas conocidos
    if (process.env.TERMUX_VERSION) {
      score -= 5;
      details.push('⚠️  Termux detectado: los prompts interactivos pueden tener problemas de estabilidad');
    }
  }

  return { score: clampScore(score), details };
}

function buildFindings(categories, issues, platformMode, config) {
  const findings = [];

  for (const [key, cat] of Object.entries(categories)) {
    if (cat.score < 60) {
      findings.push({
        severity: key === 'core' ? 'critical' : 'high',
        area: getCategoryLabel(key),
        message: `Puntuación baja: ${cat.score}/100`,
        recommendation: getRecommendationForCategory(key, platformMode),
      });
    } else if (cat.score < 80) {
      findings.push({
        severity: 'medium',
        area: getCategoryLabel(key),
        message: `Puntuación mejorable: ${cat.score}/100`,
        recommendation: getRecommendationForCategory(key, platformMode),
      });
    }
  }

  // Add doctor issues as findings
  for (const issue of (issues || [])) {
    findings.push({
      severity: issue.severity || 'medium',
      area: 'Sistema',
      message: issue.label || issue.code,
      recommendation: issue.recommendation || 'Revisar documentación',
    });
  }

  return findings;
}

function buildSummary(score) {
  if (score >= 90) return 'Excelente';
  if (score >= 80) return 'Bueno';
  if (score >= 70) return 'Aceptable';
  if (score >= 60) return 'Regular';
  return 'Necesita atención';
}

function getCategoryLabel(key) {
  const labels = {
    core: 'Núcleo',
    environment: 'Entorno',
    android: 'Android/Termux',
    config: 'Configuración',
    prompts: 'Prompts Interactivos',
  };
  return labels[key] || key;
}

function getRecommendationForCategory(key, platformMode) {
  const recs = {
    core: 'Revisa que Node.js esté instalado y la configuración sea válida. Ejecuta `xzp doctor` para más detalles.',
    environment: 'Instala las herramientas que falten según tu flujo de trabajo (Node, Python, etc.).',
    android: 'Ejecuta `termux-setup-storage` y configura los accesos rápidos en Ajustes > Android/Termux.',
    config: 'Revisa ~/.config/xzp/config.json. Si está corrupto, bórralo para regenerarlo.',
    prompts: 'Los prompts interactivos tienen problemas conocidos en Termux. Usa `--json` o modo agente para evitar prompts.',
  };
  return recs[key] || 'Revisa la documentación del paquete.';
}

function renderScoreBar(score, c) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score >= 80 ? c.mint : score >= 60 ? c.amber : c.red;
  return `${color}${'█'.repeat(filled)}${c.slate}${'░'.repeat(empty)}${c.reset}`;
}

function clampScore(value) {
  return Math.min(100, Math.max(0, value));
}
