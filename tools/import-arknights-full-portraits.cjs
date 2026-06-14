const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const defaultSourceRoot = '/tmp/arkassets2-cn/assets/dyn/arts/characters';
const sourceRoot = path.resolve(process.argv[2] || defaultSourceRoot);
const libraryRoot = path.resolve(process.argv[3] || path.join(workspaceRoot, 'library'));
const charactersRoot = path.join(libraryRoot, 'characters');
const previousReportPath = path.join(libraryRoot, 'arknights-import-report.json');
const reportPath = path.join(libraryRoot, 'arknights-full-portrait-import-report.json');
const now = new Date().toISOString();

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Source root not found: ${sourceRoot}`);
}

if (!fs.existsSync(charactersRoot)) {
  throw new Error(`Characters root not found: ${charactersRoot}`);
}

function listFilesRecursive(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    console.warn(`Failed to read ${filePath}: ${error.message}`);
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function basenameAny(value) {
  return String(value || '').split(/[\\/]/).pop() || '';
}

function dirnameAny(value) {
  const text = String(value || '');
  const index = Math.max(text.lastIndexOf('/'), text.lastIndexOf('\\'));
  return index >= 0 ? text.slice(0, index) : '';
}

function joinStoredPath(directoryPath, fileName) {
  if (!directoryPath) return fileName;
  const separator = directoryPath.includes('\\') ? '\\' : '/';
  return `${directoryPath.replace(/[\\/]+$/, '')}${separator}${fileName}`;
}

function toFsPath(storedPath) {
  const text = String(storedPath || '');
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(text);
  if (!match) return text;
  return path.join('/mnt', match[1].toLowerCase(), match[2].replace(/\\/g, '/'));
}

function toStoredPath(fsPath, templatePath) {
  if (templatePath && /^[A-Za-z]:[\\/]/.test(templatePath)) {
    const match = /^\/mnt\/([A-Za-z])\/(.*)$/.exec(fsPath.replace(/\\/g, '/'));
    if (match) return `${match[1].toUpperCase()}:\\${match[2].replace(/\//g, '\\')}`;
  }
  return fsPath;
}

function isArknightsCharacter(characterDirectory, character) {
  if (path.basename(characterDirectory).startsWith('arknights-')) return true;
  return (character.externalRefs || []).some((ref) => ref?.provider === 'arkapi' || ref?.provider === 'arknights-assets');
}

function createSourceIndex() {
  const duplicates = [];
  const filesByName = new Map();
  const filesByLowerName = new Map();
  for (const filePath of listFilesRecursive(sourceRoot)) {
    if (path.extname(filePath).toLowerCase() !== '.png') continue;
    const fileName = path.basename(filePath);
    if (filesByName.has(fileName)) duplicates.push(fileName);
    filesByName.set(fileName, filePath);
    if (!filesByLowerName.has(fileName.toLowerCase())) filesByLowerName.set(fileName.toLowerCase(), filePath);
  }
  return { filesByName, filesByLowerName, duplicates };
}

function missingImagesByGameId() {
  const report = readJson(previousReportPath, {});
  const result = new Map();
  for (const item of report.missingImages || []) {
    if (!item?.gameId || !item?.portraitId) continue;
    const items = result.get(item.gameId) || [];
    items.push(item);
    result.set(item.gameId, items);
  }
  return result;
}

function getGameId(character) {
  const ref = (character.externalRefs || []).find((item) => item?.gameId);
  return ref?.gameId || character.id?.replace(/^arknights-/, '');
}

function copyIfNeeded(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const sourceSize = fs.statSync(sourcePath).size;
  const targetSize = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : -1;
  if (sourceSize === targetSize) return 'skipped';
  fs.copyFileSync(sourcePath, targetPath);
  return targetSize >= 0 ? 'replaced' : 'created';
}

const { filesByName, filesByLowerName, duplicates } = createSourceIndex();
const missingByGameId = missingImagesByGameId();
const summary = {
  importedAt: now,
  sourceRoot,
  libraryRoot,
  arknightsCharacters: 0,
  sourceImagesIndexed: filesByName.size,
  exactPortraitsSeen: 0,
  imagesReplaced: 0,
  imagesCreated: 0,
  imagesSkipped: 0,
  missingImagesAdded: 0,
  missingSourceImages: [],
  duplicateSourceNames: duplicates,
  updatedCharacters: [],
};

for (const entry of fs.readdirSync(charactersRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const characterDirectory = path.join(charactersRoot, entry.name);
  const characterPath = path.join(characterDirectory, 'character.json');
  const character = readJson(characterPath, null);
  if (!character || !isArknightsCharacter(characterDirectory, character)) continue;

  summary.arknightsCharacters += 1;
  const originalJson = JSON.stringify(character);
  const portraitPaths = Array.isArray(character.portraitPaths)
    ? character.portraitPaths.filter(Boolean)
    : character.portraitPath
      ? [character.portraitPath]
      : [];
  const existingNames = new Set(portraitPaths.map(basenameAny));
  const firstPortraitPath = portraitPaths[0] || '';
  const storedPortraitDirectory = dirnameAny(firstPortraitPath);
  const fsPortraitDirectory = firstPortraitPath
    ? path.dirname(toFsPath(firstPortraitPath))
    : path.join(characterDirectory, 'portraits');
  const addedPaths = [];

  for (const storedPath of portraitPaths) {
    const fileName = basenameAny(storedPath);
    const sourcePath = filesByName.get(fileName) || filesByLowerName.get(fileName.toLowerCase());
    summary.exactPortraitsSeen += 1;
    if (!sourcePath) {
      summary.missingSourceImages.push({ characterId: character.id, name: character.name, fileName });
      continue;
    }

    const targetPath = toFsPath(storedPath);
    const result = copyIfNeeded(sourcePath, targetPath);
    if (result === 'replaced') summary.imagesReplaced += 1;
    if (result === 'created') summary.imagesCreated += 1;
    if (result === 'skipped') summary.imagesSkipped += 1;
  }

  const gameId = getGameId(character);
  for (const missingImage of missingByGameId.get(gameId) || []) {
    const fileName = `${missingImage.portraitId}.png`;
    if (existingNames.has(fileName)) continue;
    const sourcePath = filesByName.get(fileName) || filesByLowerName.get(fileName.toLowerCase());
    if (!sourcePath) {
      summary.missingSourceImages.push({
        characterId: character.id,
        name: character.name,
        fileName,
        previousReason: missingImage.reason,
      });
      continue;
    }

    const targetPath = path.join(fsPortraitDirectory, fileName);
    const result = copyIfNeeded(sourcePath, targetPath);
    if (result === 'replaced') summary.imagesReplaced += 1;
    if (result === 'created') summary.imagesCreated += 1;
    if (result === 'skipped') summary.imagesSkipped += 1;

    const storedPath = storedPortraitDirectory
      ? joinStoredPath(storedPortraitDirectory, fileName)
      : toStoredPath(targetPath, firstPortraitPath);
    character.portraitPaths = [...portraitPaths, ...addedPaths, storedPath];
    existingNames.add(fileName);
    addedPaths.push(storedPath);
    summary.missingImagesAdded += 1;
  }

  if (addedPaths.length > 0) {
    if (!character.portraitPath) character.portraitPath = addedPaths[0];
    if (!character.portraitFileName && character.portraitPath) character.portraitFileName = basenameAny(character.portraitPath);
  }

  if (JSON.stringify(character) !== originalJson) {
    character.updatedAt = now;
    character.importMeta = {
      ...(character.importMeta || {}),
      source: 'arkapi+arknights-game-data+arknights-assets-full',
      importedAt: now,
      dataRegion: character.importMeta?.dataRegion || 'CN',
      officialFields: Array.from(new Set([...(character.importMeta?.officialFields || []), 'portraits'])),
    };
    writeJson(characterPath, character);
    summary.updatedCharacters.push({ id: character.id, name: character.name, addedPortraits: addedPaths.length });
  }
}

summary.missingSourceImages = summary.missingSourceImages.slice(0, 500);
writeJson(reportPath, summary);

console.log(JSON.stringify(summary, null, 2));
