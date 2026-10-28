import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { WEAK_JWT_SECRETS } from './preflight-docker-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'preflight-docker-env.mjs');
const example = path.join(root, '.env.docker.example');
const fixture = path.join(root, 'scripts', 'fixtures', 'docker-preflight.pass');

function run(file) {
  return spawnSync(process.execPath, [script, file], { cwd: root, encoding: 'utf8' });
}

describe('preflight-docker-env', () => {
  it('rejects the production example file without printing secret values', () => {
    const result = run(example);
    assert.notEqual(result.status, 0);
    const output = `${result.stdout}${result.stderr}`;
    for (const name of [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'CORS_ORIGIN',
      'SITE_DOMAIN',
      'POSTGRES_PASSWORD',
      'NEXT_PUBLIC_APP_URL',
    ]) {
      assert.match(output, new RegExp(name));
    }
    assert.doesNotMatch(output, /kia_academy/);
    assert.doesNotMatch(output, /replace-with-a-long-random/);
    assert.doesNotMatch(output, /postgresql:\/\//);
  });

  it('accepts the safe fixture and does not print its values', () => {
    const result = run(fixture);
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 0, output);
    assert.match(output, /preflight ok/);
    assert.doesNotMatch(output, /fixture-db-password-not-real/);
    assert.doesNotMatch(output, /fixture-jwt-secret/);
    assert.doesNotMatch(output, /fixture-jwt-refresh/);
  });

  it('exits 1 when the env file is missing', () => {
    const result = run(path.join(root, 'scripts', 'fixtures', 'does-not-exist'));
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /env file not found/);
  });

  it('keeps the weak JWT list aligned with env.validation.ts', () => {
    const src = fs.readFileSync(
      path.join(root, 'apps', 'api', 'src', 'config', 'env.validation.ts'),
      'utf8',
    );
    const start = src.indexOf('WEAK_JWT_SECRETS');
    const end = src.indexOf('];', start);
    const quoted = [...src.slice(start, end).matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.deepEqual([...quoted].sort(), [...WEAK_JWT_SECRETS].sort());
  });
});
