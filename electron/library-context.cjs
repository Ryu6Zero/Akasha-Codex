const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const voiceExtensions = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac']);
const modelExtensions = new Set(['.glb', '.gltf', '.pmx', '.fbx', '.obj']);

function createLibraryContext(app) {
  const projectRoot = path.join(__dirname, '..');
  const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR
    || (process.env.PORTABLE_EXECUTABLE_FILE ? path.dirname(process.env.PORTABLE_EXECUTABLE_FILE) : '');
  const executableRoot = app.isPackaged ? (portableExecutableDir || path.dirname(process.execPath)) : projectRoot;
  const dataRoot = app.isPackaged ? resolvePackagedDataRoot(executableRoot) : projectRoot;
  const defaultLibraryRoot = path.join(dataRoot, 'library');
  const settingsRoot = path.join(dataRoot, 'config');
  const settingsPath = path.join(settingsRoot, 'acgplan-settings.json');

  function ensureDirectory(directoryPath) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  function hasLocalDataRoot(rootPath) {
    return Boolean(rootPath)
      && (fs.existsSync(path.join(rootPath, 'library')) || fs.existsSync(path.join(rootPath, 'config')));
  }

  function resolvePackagedDataRoot(packageRoot) {
    const explicitRoot = process.env.ACGPLAN_WORKSPACE_ROOT;
    if (hasLocalDataRoot(explicitRoot)) return explicitRoot;

    const unpackedReleaseRoot = path.basename(packageRoot).toLowerCase() === 'win-unpacked'
      ? path.dirname(packageRoot)
      : '';
    const releaseRoot = path.basename(packageRoot).toLowerCase() === 'release' ? packageRoot : unpackedReleaseRoot;
    const releaseParentRoot = releaseRoot && path.basename(releaseRoot).toLowerCase() === 'release'
      ? path.dirname(releaseRoot)
      : '';
    if (hasLocalDataRoot(releaseParentRoot)) return releaseParentRoot;
    if (hasLocalDataRoot(releaseRoot)) return releaseRoot;
    if (hasLocalDataRoot(packageRoot)) return packageRoot;

    return releaseRoot || packageRoot;
  }

  function readJsonFile(filePath, fallback) {
    try {
      if (!fs.existsSync(filePath)) return fallback;
      return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      console.error(`Failed to read ${filePath}`, error);
      return fallback;
    }
  }

  function readSettings() {
    ensureDirectory(settingsRoot);
    const settings = readJsonFile(settingsPath, { libraryRoot: defaultLibraryRoot });
    const configuredLibraryRoot = typeof settings.libraryRoot === 'string' ? settings.libraryRoot.trim() : '';
    if (configuredLibraryRoot && fs.existsSync(configuredLibraryRoot)) {
      return { libraryRoot: configuredLibraryRoot };
    }

    if (configuredLibraryRoot && configuredLibraryRoot !== defaultLibraryRoot) {
      writeSettingsFile(defaultLibraryRoot);
    }

    return {
      libraryRoot: defaultLibraryRoot,
    };
  }

  function writeSettingsFile(libraryRoot) {
    ensureDirectory(settingsRoot);
    fs.writeFileSync(settingsPath, JSON.stringify({ libraryRoot: libraryRoot || defaultLibraryRoot }, null, 2), 'utf8');
  }

  function writeSettings(settings) {
    writeSettingsFile(settings.libraryRoot || defaultLibraryRoot);
    return getSettingsPayload();
  }

  function getLibraryRoot() {
    return readSettings().libraryRoot;
  }

  function getCharactersRoot() {
    return path.join(getLibraryRoot(), 'characters');
  }

  function getStoriesRoot() {
    return path.join(getLibraryRoot(), 'stories');
  }

  function getCatalogPath() {
    return path.join(getLibraryRoot(), 'catalog.json');
  }

  function getStoryCatalogPath() {
    return path.join(getLibraryRoot(), 'story-catalog.json');
  }

  function getSettingsPayload() {
    return { ...readSettings(), defaultLibraryRoot, configPath: settingsPath };
  }

  function ensureCharacterDirectories(characterDirectory) {
    ['avatar', 'portraits', 'voices', 'attachments', 'models'].forEach((folder) =>
      ensureDirectory(path.join(characterDirectory, folder)),
    );
  }

  function ensureStoryDirectories(storyDirectory) {
    ['images'].forEach((folder) => ensureDirectory(path.join(storyDirectory, folder)));
  }

  function ensureLibraryStructure() {
    ensureDirectory(getCharactersRoot());
    ensureDirectory(getStoriesRoot());
    ensureDirectory(path.join(getLibraryRoot(), 'catalog-assets', 'wallpapers'));
    ensureDirectory(path.join(getLibraryRoot(), 'catalog-assets', 'icons'));
  }

  function toAssetUrl(filePath) {
    return filePath ? pathToFileURL(filePath).toString() : undefined;
  }

  function createUniqueTargetPath(targetDirectory, fileName) {
    const parsed = path.parse(fileName);
    let targetPath = path.join(targetDirectory, fileName);
    let index = 1;

    while (fs.existsSync(targetPath)) {
      targetPath = path.join(targetDirectory, `${parsed.name}-${index}${parsed.ext}`);
      index += 1;
    }

    return targetPath;
  }

  function listFilesRecursive(directoryPath) {
    return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      return entry.isDirectory() ? listFilesRecursive(entryPath) : entry.isFile() ? [entryPath] : [];
    });
  }

  function isInside(parentPath, targetPath) {
    const relativePath = path.relative(path.resolve(parentPath), path.resolve(targetPath));
    return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  }

  function safeDeleteFile(parentPath, targetPath) {
    if (targetPath && fs.existsSync(targetPath) && isInside(parentPath, targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }
  }

  function createSlug(value) {
    return String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 48);
  }

  return {
    fs,
    path,
    imageExtensions,
    voiceExtensions,
    modelExtensions,
    ensureDirectory,
    readJsonFile,
    writeSettings,
    getLibraryRoot,
    getCharactersRoot,
    getStoriesRoot,
    getCatalogPath,
    getStoryCatalogPath,
    getSettingsPayload,
    ensureCharacterDirectories,
    ensureStoryDirectories,
    ensureLibraryStructure,
    toAssetUrl,
    createUniqueTargetPath,
    listFilesRecursive,
    isInside,
    safeDeleteFile,
    createSlug,
  };
}

module.exports = { createLibraryContext };
