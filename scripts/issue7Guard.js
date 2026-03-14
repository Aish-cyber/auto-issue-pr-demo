/*
 * scripts/issue7Guard.js
 *
 * A small validation utility intended for use in CI/GitHub Actions.
 * It validates that a GitHub issue has a non-empty description/body.
 *
 * Usage:
 *   node scripts/issue7Guard.js --eventPath "$GITHUB_EVENT_PATH"
 *
 * Exits with code 0 when valid, 1 when invalid.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--eventPath' || token === '-e') {
      args.eventPath = argv[i + 1];
      i++;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }
  return args;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function validateIssueEventPayload(payload) {
  // GitHub issue event payload shape: { issue: { body: string, title: string, ... }, ... }
  const issue = payload && payload.issue;
  if (!issue) {
    return { ok: false, reason: 'No issue object found in event payload.' };
  }

  const body = issue.body;
  if (!isNonEmptyString(body)) {
    const issueNumber = issue.number != null ? String(issue.number) : 'unknown';
    const title = isNonEmptyString(issue.title) ? issue.title.trim() : '(no title)';
    return {
      ok: false,
      reason: `Issue #${issueNumber} (“${title}”) has no description/body. Please add details (steps to reproduce, expected vs actual, environment, etc.).`
    };
  }

  return { ok: true };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      'Usage: node scripts/issue7Guard.js --eventPath <path-to-github-event-json>\n'
    );
    process.exit(0);
  }

  const eventPath = args.eventPath || process.env.GITHUB_EVENT_PATH;
  if (!isNonEmptyString(eventPath)) {
    process.stderr.write(
      'Error: Missing event payload path. Provide --eventPath or set GITHUB_EVENT_PATH.\n'
    );
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), eventPath);
  if (!fs.existsSync(resolved)) {
    process.stderr.write(`Error: Event payload file not found: ${resolved}\n`);
    process.exit(1);
  }

  let payload;
  try {
    payload = readJson(resolved);
  } catch (err) {
    process.stderr.write(`Error: Failed to read/parse JSON at ${resolved}: ${err.message}\n`);
    process.exit(1);
  }

  const result = validateIssueEventPayload(payload);
  if (!result.ok) {
    process.stderr.write(result.reason + '\n');
    process.exit(1);
  }

  process.stdout.write('Issue description validation passed.\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateIssueEventPayload,
  isNonEmptyString
};
