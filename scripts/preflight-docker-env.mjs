#!/usr/bin/env node
/**
 * Fail closed before a production Docker boot.
 *
 * Reads `.env.docker` when it exists, otherwise `.env.docker.example`,
 * unless a path is passed. Prints variable NAMES and reasons only — never values.
 *
 * Usage:
 *   node scripts/preflight-docker-env.mjs
 *   node scripts/preflight-docker-env.mjs path/to/env-file
 *
 * Exit 0 only when NODE_ENV=production and every check below passes,
 * or when NODE_ENV is not production (those checks are the production boot).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keep in sync with WEAK_JWT_SECRETS in apps/api/src/config/env.validation.ts */
export const WEAK_JWT_SECRETS = [
  'change-me-in-production-use-a-long-random-string',
  'change-me-refresh-secret-use-a-different-long-string',
  'replace-with-a-long-random-production-secret-at-least-32-chars',
  'replace-with-a-different-long-random-refresh-secret-32+',
  'secret',
  'changeme',
];

const LOCALHOST = /localhost|127\.0\.0\.1/i;
const WEAK = new Set(WEAK_JWT_SECRETS);

export function parseEnvFile(text) {
  const env = {};
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) env[key] = value;
  }
  return env;
}

function jwtReason(value) {
  if (!value || value.length < 32) return 'missing or shorter than 32 characters';
  if (WEAK.has(value)) return 'matches a known placeholder';
  return null;
}

/**
 * @param {Record<string, string>} env
 * @returns {{ ok: boolean, skipped: boolean, failures: { name: string, reason: string }[] }}
 */
export function evaluateProductionEnv(env) {
  if (env.NODE_ENV !== 'production') {
    return { ok: true, skipped: true, failures: [] };
  }

  const failures = [];
  const push = (name, reason) => failures.push({ name, reason });

  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const reason = jwtReason(env[name] ?? '');
    if (reason) push(name, reason);
  }

  const cors = env.CORS_ORIGIN ?? '';
  if (!cors.trim() || LOCALHOST.test(cors)) {
    push('CORS_ORIGIN', 'empty or contains localhost or 127.0.0.1');
  }

  if (!(env.SITE_DOMAIN ?? '').trim()) {
    push('SITE_DOMAIN', 'missing');
  }

  const dbPassword = env.POSTGRES_PASSWORD ?? '';
  if (!dbPassword || dbPassword === 'kia_academy') {
    push('POSTGRES_PASSWORD', 'missing or still the example database password');
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? '';
  if (!appUrl.trim() || LOCALHOST.test(appUrl)) {
    push('NEXT_PUBLIC_APP_URL', 'missing or points at localhost');
  }

  return { ok: failures.length === 0, skipped: false, failures };
}

export function formatReport(fileLabel, result) {
  if (result.skipped) {
    return `preflight skipped production checks (${fileLabel}): NODE_ENV is not production`;
  }
  if (result.ok) return `preflight ok (${fileLabel})`;
  const lines = result.failures.map((failure) => `- ${failure.name}: ${failure.reason}`);
  return `preflight failed (${fileLabel}):\n${lines.join('\n')}`;
}

function defaultEnvFile(cwd) {
  const docker = path.join(cwd, '.env.docker');
  if (fs.existsSync(docker)) return docker;
  return path.join(cwd, '.env.docker.example');
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

export function runPreflight(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      exitCode: 1,
      output: `preflight failed: env file not found (${path.basename(filePath)})`,
    };
  }
  const env = parseEnvFile(fs.readFileSync(filePath, 'utf8'));
  const result = evaluateProductionEnv(env);
  return {
    exitCode: result.ok ? 0 : 1,
    output: formatReport(path.basename(filePath), result),
  };
}

if (isDirectRun()) {
  const filePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : defaultEnvFile(process.cwd());
  const { exitCode, output } = runPreflight(filePath);
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${output}\n`);
  process.exit(exitCode);
}
