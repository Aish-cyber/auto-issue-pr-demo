const fs = require('fs');
const path = require('path');

/**
 * This repository received an issue (#6) with no description.
 * Since there is no code context to fix, this script installs repo-level guardrails:
 *  - GitHub issue templates that require content
 *  - A GitHub Action that auto-labels and closes empty issues
 *
 * Run locally: node scripts/fixIssue6.js
 */

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  // Issue forms / templates
  writeFile(
    path.join('.github', 'ISSUE_TEMPLATE', 'bug_report.yml'),
    `name: "Bug report"
description: "Report a reproducible bug"
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to file a bug. Please include enough detail so we can reproduce and fix it.
  - type: textarea
    id: summary
    attributes:
      label: "Summary"
      description: "What happened?"
      placeholder: "A clear and concise description of the bug."
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: "Steps to reproduce"
      description: "How can we reproduce the behavior?"
      placeholder: |
        1. Go to ...
        2. Click ...
        3. See error ...
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
      placeholder: "What actually happened?"
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: "Environment"
      description: "Relevant version information"
      placeholder: |
        - OS:
        - Node version:
        - Package version / commit:
    validations:
      required: false
  - type: textarea
    id: logs
    attributes:
      label: "Logs / screenshots"
      description: "Add any relevant logs, stack traces, or screenshots"
      render: shell
    validations:
      required: false
`
  );

  writeFile(
    path.join('.github', 'ISSUE_TEMPLATE', 'feature_request.yml'),
    `name: "Feature request"
description: "Suggest an idea or enhancement"
labels: [enhancement]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for your suggestion. Please provide enough context to evaluate the request.
  - type: textarea
    id: problem
    attributes:
      label: "Problem / motivation"
      description: "What problem does this solve?"
      placeholder: "I'm frustrated when ..."
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: "Proposed solution"
      description: "What would you like to happen?"
      placeholder: "It would be great if ..."
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: "Alternatives considered"
      placeholder: "Other approaches you've tried or considered"
    validations:
      required: false
  - type: textarea
    id: additional
    attributes:
      label: "Additional context"
      placeholder: "Links, screenshots, related issues, etc."
    validations:
      required: false
`
  );

  writeFile(
    path.join('.github', 'ISSUE_TEMPLATE', 'config.yml'),
    `blank_issues_enabled: false
contact_links:
  - name: "Security reports"
    url: "https://github.com/${process.env.GITHUB_REPOSITORY || 'OWNER/REPO'}/security/policy"
    about: "Please report security vulnerabilities responsibly."
`
  );

  // Action to close empty issues (body missing/whitespace) and label.
  // Works for non-form issues and prevents "No description provided." type issues from staying open.
  writeFile(
    path.join('.github', 'workflows', 'issue-triage.yml'),
    `name: Issue triage

on:
  issues:
    types: [opened, edited]

permissions:
  issues: write

jobs:
  close-empty-issues:
    runs-on: ubuntu-latest
    steps:
      - name: Close issue if body is empty
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            const body = (issue.body || '').trim();

            // Some integrations create issues with a placeholder like "No description provided."
            const placeholders = [
              'no description provided',
              'n/a',
              'na',
              'none'
            ];

            const normalized = body.toLowerCase();
            const isEffectivelyEmpty = !body || placeholders.includes(normalized);

            if (!isEffectivelyEmpty) {
              core.info('Issue has a non-empty body; no action needed.');
              return;
            }

            const owner = context.repo.owner;
            const repo = context.repo.repo;
            const issue_number = issue.number;

            // Add label for visibility
            try {
              await github.rest.issues.addLabels({
                owner,
                repo,
                issue_number,
                labels: ['needs-info']
              });
            } catch (e) {
              core.warning(`Could not add label needs-info: ${e.message}`);
            }

            // Comment with instructions
            await github.rest.issues.createComment({
              owner,
              repo,
              issue_number,
              body: [
                'This issue was automatically closed because it contains no description.',
                '',
                'Please reopen with:',
                '- A clear summary',
                '- Steps to reproduce (for bugs)',
                '- Expected vs. actual behavior',
                '- Relevant logs/versions'
              ].join('\n')
            });

            // Close issue
            await github.rest.issues.update({
              owner,
              repo,
              issue_number,
              state: 'closed'
            });

            core.info('Closed empty issue.');
`
  );

  // Optional: ensure label exists is outside scope; label will still be added if it exists.
  // Many repos already allow arbitrary labels via API; if not, maintainers can create it.

  console.log('Installed GitHub issue templates and issue triage workflow.');
}

if (require.main === module) {
  main();
}
