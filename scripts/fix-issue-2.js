/*
 * scripts/fix-issue-2.js
 *
 * This script adds a GitHub issue template to prevent blank issues like Issue #2.
 *
 * Usage:
 *   node scripts/fix-issue-2.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const githubDir = path.join(repoRoot, '.github');
const templatesDir = path.join(githubDir, 'ISSUE_TEMPLATE');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, contents) {
  let existing = null;
  try {
    existing = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    // file does not exist
  }

  if (existing === contents) return false;
  fs.writeFileSync(filePath, contents, 'utf8');
  return true;
}

function main() {
  ensureDir(templatesDir);

  const bugTemplatePath = path.join(templatesDir, 'bug_report.yml');
  const bugTemplate = `name: "Bug report"
description: "Report a bug with reproduction steps"
title: "bug: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to file a bug report.
        Please fill out the fields below so we can reproduce and fix the issue.

  - type: textarea
    id: description
    attributes:
      label: "What happened?"
      description: "Describe the bug clearly and concisely."
      placeholder: "A clear and concise description of what happened."
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: "Steps to reproduce"
      description: "Provide step-by-step instructions so we can reproduce the behavior."
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: "Expected behavior"
      placeholder: "What did you expect to happen?"
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: "Actual behavior"
      placeholder: "What actually happened? Include error messages if any."
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: "Relevant logs/output"
      description: "Paste any relevant logs or stack traces."
      render: shell
    validations:
      required: false

  - type: input
    id: version
    attributes:
      label: "Package/app version"
      description: "The version/commit you are running."
      placeholder: "e.g., 1.2.3 or commit SHA"
    validations:
      required: false

  - type: input
    id: node
    attributes:
      label: "Node.js version"
      placeholder: "e.g., 20.11.1"
    validations:
      required: false

  - type: input
    id: os
    attributes:
      label: "OS"
      placeholder: "e.g., macOS 14.2 / Ubuntu 22.04 / Windows 11"
    validations:
      required: false
`;

  const configPath = path.join(githubDir, 'config.yml');
  const config = `blank_issues_enabled: false
contact_links:
  - name: "Security issues"
    url: "https://github.com/${process.env.GITHUB_REPOSITORY || 'OWNER/REPO'}/security/policy"
    about: "Please report security vulnerabilities via the security policy."
`;

  const changedBug = writeFileIfChanged(bugTemplatePath, bugTemplate);
  const changedConfig = writeFileIfChanged(configPath, config);

  const changed = changedBug || changedConfig;
  if (!changed) {
    process.stdout.write('No changes needed. Issue templates already up to date.\n');
    return;
  }

  process.stdout.write('Added/updated GitHub issue templates to prevent blank issues.\n');
}

if (require.main === module) {
  main();
}
