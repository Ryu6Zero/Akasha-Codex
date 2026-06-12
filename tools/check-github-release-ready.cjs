const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const expectedTag = `v${packageJson.version}`;
const productName = packageJson.build?.productName || packageJson.name;
const forbiddenTrackedPattern = /^(library\/|config\/|release\/|dist\/|node_modules\/|\.env|\.local-appdata\/|\.npm-cache\/|android\/app\/src\/main\/assets\/public\/|docs\/progress\.md|docs\/project-memory\.md)/;

const failures = [];
const warnings = [];

checkGitRepository();
checkWorkingTree();
checkTrackedFiles();
checkOrigin();
checkVersionTag();
checkGitHubCli();
checkReleaseArtifact();

if (warnings.length) {
  console.log('GitHub release readiness warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (failures.length) {
  console.error('GitHub release readiness failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('GitHub release readiness passed.');

function checkGitRepository() {
  const result = run('git', ['rev-parse', '--is-inside-work-tree'], { optional: true });
  if (result.stdout.trim() !== 'true') failures.push('Current directory is not inside a Git repository.');
}

function checkWorkingTree() {
  const result = run('git', ['status', '--porcelain'], { optional: true });
  if (result.status !== 0) return;
  if (result.stdout.trim()) failures.push('Working tree has uncommitted changes.');
}

function checkTrackedFiles() {
  const result = run('git', ['ls-files'], { optional: true });
  if (result.status !== 0) return;
  const forbidden = result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((filePath) => forbiddenTrackedPattern.test(filePath));
  if (forbidden.length) {
    failures.push(`Forbidden local/generated paths are tracked: ${forbidden.slice(0, 8).join(', ')}`);
  }
}

function checkOrigin() {
  const result = run('git', ['remote', 'get-url', 'origin'], { optional: true });
  if (result.status !== 0 || !result.stdout.trim()) {
    failures.push('Missing Git remote "origin". Add it after creating the GitHub repository.');
  }
}

function checkVersionTag() {
  const tagResult = run('git', ['rev-parse', `${expectedTag}^{commit}`], { optional: true });
  if (tagResult.status !== 0) {
    failures.push(`Missing version tag ${expectedTag}.`);
    return;
  }

  const headResult = run('git', ['rev-parse', 'HEAD'], { optional: true });
  if (headResult.status !== 0) return;
  if (tagResult.stdout.trim() !== headResult.stdout.trim()) {
    failures.push(`Tag ${expectedTag} does not point at HEAD.`);
  }
}

function checkGitHubCli() {
  const versionResult = run('gh', ['--version'], { optional: true });
  if (versionResult.status !== 0) {
    failures.push('GitHub CLI "gh" is not installed or not on PATH.');
    return;
  }

  const authResult = run('gh', ['auth', 'status'], { optional: true });
  if (authResult.status !== 0) {
    failures.push('GitHub CLI is not logged in. Run "gh auth login" before pushing or creating releases.');
  }
}

function checkReleaseArtifact() {
  const artifactPath = path.join(root, 'release', `${productName} ${packageJson.version}.exe`);
  if (!fs.existsSync(artifactPath)) {
    warnings.push(`Local release artifact is missing: ${path.relative(root, artifactPath)}`);
  }
}

function run(command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '';
    const stderr = error.stderr ? String(error.stderr) : error.message;
    if (!options.optional) throw error;
    return { status: error.status || 1, stdout, stderr };
  }
}
