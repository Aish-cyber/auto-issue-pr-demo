#!/usr/bin/env node
'use strict';

/**
 * Diagnose script for issues with missing context.
 *
 * Usage:
 *   node scripts/diagnose-issue-7.js
 *   node scripts/diagnose-issue-7.js --json
 *   node scripts/diagnose-issue-7.js --out diagnostics.json
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
  } catch (e) {
    const stderr = (e && e.stderr && String(e.stderr)) || '';
    const stdout = (e && e.stdout && String(e.stdout)) || '';
    return [stdout, stderr].filter(Boolean).join('\n').trim() || null;
  }
}

function findRepoRoot(startDir) {
  let dir = startDir;
  while (dir && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  return startDir;
}

function redactEnv(env) {
  const redacted = {};
  const sensitive = /(token|secret|password|passwd|key|session|cookie|auth|private)/i;
  for (const [k, v] of Object.entries(env || {})) {
    if (sensitive.test(k)) {
      redacted[k] = '[REDACTED]';
    } else if (typeof v === 'string' && v.length > 500) {
      redacted[k] = v.slice(0, 500) + '…';
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

function getPackageInfo(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkgText = safeReadFile(pkgPath);
  const pkg = safeParseJson(pkgText);

  if (!pkg) {
    return {
      found: false,
      path: pkgPath,
      name: null,
      version: null,
      scripts: null,
      dependencies: null,
      devDependencies: null
    };
  }

  return {
    found: true,
    path: pkgPath,
    name: pkg.name || null,
    version: pkg.version || null,
    scripts: pkg.scripts || null,
    dependencies: pkg.dependencies || null,
    devDependencies: pkg.devDependencies || null,
    engines: pkg.engines || null
  };
}

function getLockfileInfo(repoRoot) {
  const candidates = [
    'package-lock.json',
    'npm-shrinkwrap.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb'
  ];
  const found = [];
  for (const name of candidates) {
    const p = path.join(repoRoot, name);
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      found.push({ file: name, path: p, bytes: stat.size, modifiedAt: stat.mtime.toISOString() });
    }
  }
  return found;
}

function getGitInfo(repoRoot) {
  const isGitRepo = fs.existsSync(path.join(repoRoot, '.git'));
  if (!isGitRepo) {
    return { isGitRepo: false };
  }

  return {
    isGitRepo: true,
    branch: safeExec('git rev-parse --abbrev-ref HEAD'),
    commit: safeExec('git rev-parse HEAD'),
    status: safeExec('git status --porcelain'),
    remotes: safeExec('git remote -v'),
    lastCommit: safeExec('git log -1 --pretty=fuller')
  };
}

function getNodeToolingInfo() {
  return {
    node: process.version,
    npm: safeExec('npm -v'),
    yarn: safeExec('yarn -v'),
    pnpm: safeExec('pnpm -v'),
    bun: safeExec('bun -v')
  };
}

function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    type: os.type(),
    cpus: os.cpus().map(c => ({ model: c.model, speed: c.speed })).slice(0, 8),
    cpuCount: os.cpus().length,
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem()
    },
    uptimeSeconds: os.uptime()
  };
}

function getFsHealth(repoRoot) {
  const checks = [
    'README.md',
    'LICENSE',
    '.env',
    '.env.example',
    'src',
    'index.js'
  ];

  const results = {};
  for (const rel of checks) {
    const p = path.join(repoRoot, rel);
    results[rel] = fs.existsSync(p);
  }
  return results;
}

function parseArgs(argv) {
  const args = { json: false, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--out') {
      args.out = argv[i + 1] || null;
      i++;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const repoRoot = findRepoRoot(cwd);

  const report = {
    issue: 7,
    generatedAt: new Date().toISOString(),
    repoRoot,
    cwd,
    system: getSystemInfo(),
    tooling: getNodeToolingInfo(),
    git: getGitInfo(repoRoot),
    package: getPackageInfo(repoRoot),
    lockfiles: getLockfileInfo(repoRoot),
    fsHealth: getFsHealth(repoRoot),
    env: redactEnv(process.env)
  };

  const output = args.json ? JSON.stringify(report, null, 2) : formatHuman(report);

  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(cwd, args.out);
    fs.writeFileSync(outPath, args.json ? output : output + '\n', 'utf8');
    process.stdout.write(`Wrote diagnostics to ${outPath}\n`);
  } else {
    process.stdout.write(output + (args.json ? '\n' : ''));
  }
}

function formatHuman(r) {
  const lines = [];
  lines.push(`Diagnostics for Issue #${r.issue}`);
  lines.push(`Generated: ${r.generatedAt}`);
  lines.push(`Repo root: ${r.repoRoot}`);
  lines.push(`CWD: ${r.cwd}`);
  lines.push('');

  lines.push('System:');
  lines.push(`  Platform: ${r.system.platform} ${r.system.release} (${r.system.type})`);
  lines.push(`  Arch: ${r.system.arch}`);
  lines.push(`  CPU count: ${r.system.cpuCount}`);
  lines.push(`  Memory total/free: ${r.system.memory.totalBytes}/${r.system.memory.freeBytes}`);
  lines.push('');

  lines.push('Tooling:');
  lines.push(`  Node: ${r.tooling.node}`);
  lines.push(`  npm: ${r.tooling.npm || 'n/a'}`);
  lines.push(`  yarn: ${r.tooling.yarn || 'n/a'}`);
  lines.push(`  pnpm: ${r.tooling.pnpm || 'n/a'}`);
  lines.push(`  bun: ${r.tooling.bun || 'n/a'}`);
  lines.push('');

  lines.push('Git:');
  if (!r.git.isGitRepo) {
    lines.push('  Not a git repository');
  } else {
    lines.push(`  Branch: ${r.git.branch || 'n/a'}`);
    lines.push(`  Commit: ${r.git.commit || 'n/a'}`);
    lines.push(`  Dirty: ${r.git.status ? 'yes' : 'no'}`);
  }
  lines.push('');

  lines.push('Package:');
  if (!r.package.found) {
    lines.push('  package.json not found');
  } else {
    lines.push(`  Name: ${r.package.name || 'n/a'}`);
    lines.push(`  Version: ${r.package.version || 'n/a'}`);
    lines.push(`  Engines: ${r.package.engines ? JSON.stringify(r.package.engines) : 'n/a'}`);
    lines.push(`  Scripts: ${r.package.scripts ? Object.keys(r.package.scripts).join(', ') : 'n/a'}`);
  }
  lines.push('');

  lines.push('Lockfiles:');
  if (!r.lockfiles.length) {
    lines.push('  None found');
  } else {
    for (const lf of r.lockfiles) {
      lines.push(`  ${lf.file} (${lf.bytes} bytes, modified ${lf.modifiedAt})`);
    }
  }
  lines.push('');

  lines.push('FS health checks:');
  for (const [k, v] of Object.entries(r.fsHealth)) {
    lines.push(`  ${k}: ${v ? 'present' : 'missing'}`);
  }
  lines.push('');

  lines.push('Note: Environment variables have been included with sensitive keys redacted.');

  return lines.join('\n');
}

main();
