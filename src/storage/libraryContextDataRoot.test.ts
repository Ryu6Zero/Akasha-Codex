import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createLibraryContext } = require('../../electron/library-context.cjs') as {
  createLibraryContext: (app: { isPackaged: boolean }) => {
    getSettingsPayload: () => { defaultLibraryRoot: string; configPath: string };
  };
};

const previousPortableExecutableFile = process.env.PORTABLE_EXECUTABLE_FILE;
const previousPortableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
const previousWorkspaceRoot = process.env.ACGPLAN_WORKSPACE_ROOT;

afterEach(() => {
  restoreEnv('PORTABLE_EXECUTABLE_FILE', previousPortableExecutableFile);
  restoreEnv('PORTABLE_EXECUTABLE_DIR', previousPortableExecutableDir);
  restoreEnv('ACGPLAN_WORKSPACE_ROOT', previousWorkspaceRoot);
});

describe('library context packaged data root', () => {
  it('uses the release parent data root for timestamped *-win-unpacked builds', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'acgplan-context-'));
    const releaseRoot = path.join(workspaceRoot, 'release');
    const packageRoot = path.join(releaseRoot, 'Akasha-Codex-0.1.1-dev.9-20260618-win-unpacked');
    fs.mkdirSync(path.join(workspaceRoot, 'library'), { recursive: true });
    fs.mkdirSync(path.join(workspaceRoot, 'config'), { recursive: true });
    fs.mkdirSync(packageRoot, { recursive: true });

    delete process.env.PORTABLE_EXECUTABLE_DIR;
    delete process.env.ACGPLAN_WORKSPACE_ROOT;
    process.env.PORTABLE_EXECUTABLE_FILE = path.join(packageRoot, 'Akasha Codex.exe');

    const context = createLibraryContext({ isPackaged: true });

    expect(context.getSettingsPayload().defaultLibraryRoot).toBe(path.join(workspaceRoot, 'library'));
    expect(context.getSettingsPayload().configPath).toBe(path.join(workspaceRoot, 'config', 'acgplan-settings.json'));
  });

  it('does not overwrite a configured custom root when that path is temporarily unavailable', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'acgplan-context-'));
    const configRoot = path.join(workspaceRoot, 'config');
    const unavailableLibraryRoot = path.join(workspaceRoot, 'external-drive', 'library');
    const settingsPath = path.join(configRoot, 'acgplan-settings.json');
    fs.mkdirSync(configRoot, { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify({ libraryRoot: unavailableLibraryRoot }, null, 2), 'utf8');

    delete process.env.PORTABLE_EXECUTABLE_DIR;
    delete process.env.PORTABLE_EXECUTABLE_FILE;
    process.env.ACGPLAN_WORKSPACE_ROOT = workspaceRoot;

    const context = createLibraryContext({ isPackaged: true });

    expect(context.getSettingsPayload().defaultLibraryRoot).toBe(path.join(workspaceRoot, 'library'));
    expect(JSON.parse(fs.readFileSync(settingsPath, 'utf8')).libraryRoot).toBe(unavailableLibraryRoot);
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
