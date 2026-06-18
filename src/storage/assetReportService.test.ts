// @ts-nocheck
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createAssetReportService } = require('../../electron/asset-report-service.cjs');

let tempRoot = '';

afterEach(() => {
  if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = '';
});

describe('asset report service', () => {
  it('generates JSON and Markdown reports for missing references and orphan files', () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'akasha-asset-report-'));
    const libraryRoot = path.join(tempRoot, 'library');
    const characterRoot = path.join(libraryRoot, 'characters', 'char-a');
    fs.mkdirSync(path.join(characterRoot, 'avatar'), { recursive: true });
    fs.mkdirSync(path.join(characterRoot, 'portraits'), { recursive: true });
    fs.mkdirSync(path.join(characterRoot, 'voices'), { recursive: true });

    const avatarPath = path.join(characterRoot, 'avatar', 'main.png');
    const voicePath = path.join(characterRoot, 'voices', 'line.mp3');
    const missingPortraitPath = path.join(characterRoot, 'portraits', 'missing.png');
    const orphanPath = path.join(characterRoot, 'portraits', 'orphan.png');
    fs.writeFileSync(avatarPath, 'avatar');
    fs.writeFileSync(voicePath, 'voice');
    fs.writeFileSync(orphanPath, 'orphan');
    fs.writeFileSync(
      path.join(characterRoot, 'character.json'),
      JSON.stringify({
        id: 'char-a',
        name: 'Amiya',
        sourceTitle: 'Arknights',
        tags: [],
        aliases: [],
        avatarPath,
        avatarPaths: [avatarPath],
        portraitPath: missingPortraitPath,
        portraitPaths: [missingPortraitPath],
        voiceAssets: [{ id: 'voice-a', label: 'Line', filePath: voicePath }],
        voicePaths: [voicePath],
        attachmentPaths: [],
        modelPaths: [],
        description: '',
        notes: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      'utf8',
    );

    const service = createAssetReportService(createTestContext(libraryRoot));
    const report = service.generateAssetCompletenessReport();

    expect(report.summary.characterCount).toBe(1);
    expect(report.summary.avatarCount).toBe(1);
    expect(report.summary.portraitCount).toBe(1);
    expect(report.summary.voiceCount).toBe(1);
    expect(report.summary.missingAssetReferenceCount).toBe(1);
    expect(report.summary.orphanFileCount).toBe(1);
    expect(report.characters[0].missingAssetReferences).toEqual([{ path: missingPortraitPath }]);
    expect(report.characters[0].orphanFiles[0]).toMatchObject({ path: orphanPath, sizeBytes: 6 });
    expect(fs.existsSync(report.outputPaths.json)).toBe(true);
    expect(fs.existsSync(report.outputPaths.markdown)).toBe(true);
    expect(fs.readFileSync(report.outputPaths.markdown, 'utf8')).toContain('最大体积角色 Top 20');
  });
});

function createTestContext(libraryRoot: string) {
  const charactersRoot = path.join(libraryRoot, 'characters');
  const storiesRoot = path.join(libraryRoot, 'stories');
  const listFilesRecursive = (directoryPath: string): string[] =>
    fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(entryPath);
      return entry.isFile() ? [entryPath] : [];
    });

  return {
    fs,
    path,
    ensureDirectory(directoryPath: string) {
      fs.mkdirSync(directoryPath, { recursive: true });
    },
    ensureLibraryStructure() {
      fs.mkdirSync(charactersRoot, { recursive: true });
      fs.mkdirSync(storiesRoot, { recursive: true });
    },
    getLibraryRoot: () => libraryRoot,
    getCharactersRoot: () => charactersRoot,
    readJsonFile(filePath: string, fallback: unknown) {
      if (!fs.existsSync(filePath)) return fallback;
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    },
    listFilesRecursive,
  };
}
