import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printBanner, printKeyValueRows, printSection, statusLabel } from '../ui/output.js';

const PACKAGE_NAME = 'xzp';
const PACKAGE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

export async function runVersionCommand(options = {}) {
  const localPackage = await readLocalPackage();
  const localVersion = localPackage.version || 'desconocida';
  if (options.outputFormat !== 'json') {
    printBanner('Xzp Version', [
      'Comparacion entre la version local del repo y la publicada en npm.',
    ]);
  }

  const latest = await readLatestPublishedVersion();
  const channel = detectReleaseChannel(latest?.version || localVersion);
  const releasePlan = buildReleasePlan(localVersion, latest?.version || null);
  const changelogShort = buildShortChangelog(localVersion, latest?.version || null, channel, releasePlan);

  if (!latest) {
    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({
        package: localPackage.name || PACKAGE_NAME,
        local: localVersion,
        npm: null,
        channel,
        status: 'unavailable',
        recommendedBump: releasePlan.recommendedVersion,
        releaseCriteria: releasePlan.criteria,
        releaseType: releasePlan.type,
        changelogShort,
      }, null, 2));
      return;
    }
    printSection('Estado');
    printKeyValueRows([
      ['Paquete', localPackage.name || PACKAGE_NAME],
      ['Local', localVersion],
      ['npm', 'no pude consultar la version publicada ahora mismo'],
      ['Canal', channel],
      ['Siguiente', releasePlan.recommendedVersion],
      ['Criterio', releasePlan.criteria],
    ]);
    printSection('Changelog Corto');
    changelogShort.forEach((line) => console.log(`- ${line}`));
    return;
  }

  const comparison = compareVersions(localVersion, latest.version);
  const status = comparison < 0
    ? `${statusLabel('update disponible', 'warn')} npm i -g ${PACKAGE_NAME}`
    : comparison > 0
      ? statusLabel('local va por delante', 'accent')
      : statusLabel('alineado con npm', 'ok');

  if (options.outputFormat === 'json') {
    console.log(JSON.stringify({
      package: localPackage.name || PACKAGE_NAME,
      local: localVersion,
      npm: latest.version,
      channel,
      comparison,
      recommendedBump: releasePlan.recommendedVersion,
      releaseType: releasePlan.type,
      releaseCriteria: releasePlan.criteria,
      changelogShort,
      status: comparison < 0 ? 'behind' : comparison > 0 ? 'ahead' : 'aligned',
    }, null, 2));
    return;
  }

  printSection('Estado');
  printKeyValueRows([
    ['Paquete', localPackage.name || PACKAGE_NAME],
    ['Local', localVersion],
    ['npm', latest.version],
    ['Canal', channel],
    ['Resultado', status],
    ['Siguiente', releasePlan.recommendedVersion],
    ['Criterio', releasePlan.criteria],
  ]);
  printSection('Changelog Corto');
  changelogShort.forEach((line) => console.log(`- ${line}`));
}

async function readLocalPackage() {
  const raw = await fs.readFile(PACKAGE_PATH, 'utf8');
  return JSON.parse(raw);
}

async function readLatestPublishedVersion() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(REGISTRY_URL, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      version: data.version || 'desconocida',
    };
  } catch {
    return null;
  }
}

export function compareVersions(left, right) {
  const leftVersion = parseSemver(left);
  const rightVersion = parseSemver(right);
  const maxLength = Math.max(leftVersion.core.length, rightVersion.core.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftVersion.core[index] || 0;
    const rightValue = rightVersion.core[index] || 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

function recommendNextBump(localVersion, remoteVersion, type = 'patch') {
  const base = remoteVersion || localVersion || '1.0.0';
  const parsed = parseSemver(base);
  const major = parsed.core[0] || 1;
  const minor = parsed.core[1] || 0;
  const patch = parsed.core[2] || 0;
  const prereleaseLabel = parsed.prerelease.find((part) => typeof part === 'string') || '';

  if (type === 'major') {
    return `${major + 1}.0.0`;
  }

  if (type === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  if (type === 'promote') {
    return `${major}.${minor}.${patch}`;
  }

  if (type === 'prerelease') {
    if (parsed.prerelease.length && prereleaseLabel) {
      const trailingNumber = typeof parsed.prerelease.at(-1) === 'number' ? parsed.prerelease.at(-1) : 0;
      return `${major}.${minor}.${patch}-${prereleaseLabel}.${Number(trailingNumber) + 1}`;
    }

    return `${major}.${minor}.${patch + 1}-rc.1`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

export function __testRecommendNextBump(localVersion, remoteVersion) {
  return recommendNextBump(localVersion, remoteVersion);
}

export function __testDetectReleaseChannel(version) {
  return detectReleaseChannel(version);
}

export function __testBuildReleasePlan(localVersion, remoteVersion) {
  return buildReleasePlan(localVersion, remoteVersion);
}

function detectReleaseChannel(version) {
  const parsed = parseSemver(version);
  const label = parsed.prerelease.find((part) => typeof part === 'string') || '';

  if (!label) {
    return 'stable';
  }

  if (label.includes('alpha')) {
    return 'alpha';
  }

  if (label.includes('beta')) {
    return 'beta';
  }

  if (label === 'rc' || label.includes('rc')) {
    return 'rc';
  }

  return 'preview';
}

function buildReleasePlan(localVersion, remoteVersion) {
  const comparison = remoteVersion ? compareVersions(localVersion, remoteVersion) : 0;
  const channel = detectReleaseChannel(remoteVersion || localVersion);

  if (!remoteVersion) {
    return {
      type: channel === 'stable' ? 'patch' : 'promote',
      recommendedVersion: recommendNextBump(localVersion, null, channel === 'stable' ? 'patch' : 'promote'),
      criteria: channel === 'stable'
        ? 'sin npm remoto: preparar patch local con verificacion manual'
        : 'sin npm remoto: promover prerelease actual antes de publicar',
    };
  }

  if (comparison < 0) {
    return {
      type: 'sync',
      recommendedVersion: remoteVersion,
      criteria: 'npm va por delante: sincronizar o confirmar si el repo local quedo atrasado',
    };
  }

  if (comparison === 0 && channel !== 'stable') {
    return {
      type: 'promote',
      recommendedVersion: recommendNextBump(localVersion, remoteVersion, 'promote'),
      criteria: 'prerelease alineada: promover a estable si ya paso pruebas y smoke checks',
    };
  }

  if (comparison === 0) {
    return {
      type: 'patch',
      recommendedVersion: recommendNextBump(localVersion, remoteVersion, 'patch'),
      criteria: 'estable alineado: siguiente release natural es patch salvo cambios rompientes',
    };
  }

  return {
    type: channel === 'stable' ? 'patch' : 'prerelease',
    recommendedVersion: recommendNextBump(localVersion, remoteVersion, channel === 'stable' ? 'patch' : 'prerelease'),
    criteria: comparison > 0
      ? 'local va por delante: publicar cuando changelog y pruebas esten cerrados'
      : 'revisar diferencias antes de liberar',
  };
}

function buildShortChangelog(localVersion, remoteVersion, channel, releasePlan) {
  const lines = [];

  if (!remoteVersion) {
    lines.push(`No hubo consulta valida a npm; se usa ${localVersion} como base local.`);
  } else if (compareVersions(localVersion, remoteVersion) === 0) {
    lines.push(`Local y npm estan alineados en ${localVersion}.`);
  } else if (compareVersions(localVersion, remoteVersion) > 0) {
    lines.push(`El repo local (${localVersion}) va por delante de npm (${remoteVersion}).`);
  } else {
    lines.push(`npm (${remoteVersion}) va por delante de la copia local (${localVersion}).`);
  }

  lines.push(`Canal detectado: ${channel}.`);
  lines.push(`Siguiente version sugerida: ${releasePlan.recommendedVersion} con criterio ${releasePlan.type}.`);
  return lines;
}

function parseSemver(version) {
  const normalized = String(version).trim();
  const [mainPart = '', prereleasePart = ''] = normalized.split('-', 2);

  return {
    core: mainPart
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => Number.isInteger(part)),
    prerelease: prereleasePart
      ? prereleasePart
        .split('.')
        .filter(Boolean)
        .map((part) => (/^\d+$/.test(part) ? Number.parseInt(part, 10) : part.toLowerCase()))
      : [],
  };
}

function comparePrerelease(left, right) {
  const leftHasPrerelease = left.length > 0;
  const rightHasPrerelease = right.length > 0;

  if (!leftHasPrerelease && !rightHasPrerelease) {
    return 0;
  }

  if (!leftHasPrerelease) {
    return 1;
  }

  if (!rightHasPrerelease) {
    return -1;
  }

  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];

    if (leftPart === undefined) {
      return -1;
    }

    if (rightPart === undefined) {
      return 1;
    }

    const comparison = comparePrereleasePart(leftPart, rightPart);
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

function comparePrereleasePart(left, right) {
  const leftIsNumber = typeof left === 'number';
  const rightIsNumber = typeof right === 'number';

  if (leftIsNumber && rightIsNumber) {
    return left === right ? 0 : left > right ? 1 : -1;
  }

  if (leftIsNumber) {
    return -1;
  }

  if (rightIsNumber) {
    return 1;
  }

  if (left === right) {
    return 0;
  }

  return left > right ? 1 : -1;
}
