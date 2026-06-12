import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { FilePicker, type PickedFile } from '@capawesome/capacitor-file-picker';
import { defaultCatalog } from '../data/defaultCatalog';
import { normalizeCharacter } from '../storage/characterStore';
import type { AssetType, CatalogAssetType, CatalogMetadata, Character, CropImageSelection, LibrarySettings } from '../types';
import type { LibraryClient } from './libraryClient';

const ROOT = 'library';
const CHARACTERS_ROOT = `${ROOT}/characters`;
const CATALOG_PATH = `${ROOT}/catalog.json`;

const IMAGE_TYPES = ['image/*'];
const VOICE_TYPES = ['audio/*'];
const MODEL_TYPES = ['model/*', 'application/octet-stream'];

type StoredFile = {
  data: string;
  name: string;
  mimeType: string;
};

export function createMobileLibraryClient(): LibraryClient {
  return {
    platform: 'mobile',
    getLibraryInfo,
    getSettings,
    setLibraryRoot: getSettings,
    selectLibraryRoot: getSettings,
    openLibraryRoot: async () => 'Android app data/library',
    getCatalog,
    saveCatalog,
    importCatalogAsset,
    saveCollectionIcon,
    getLibraryCharacters,
    saveCharacter,
    deleteCharacter,
    importAsset,
    selectImageForCrop,
    saveCroppedAvatar,
    selectImageForCatalogCrop: selectImageForCrop,
    saveCroppedWallpaper,
    removeAsset,
    importCharacterDirectory: async () => [],
  };
}

async function getLibraryInfo() {
  await ensureLibraryStructure();
  return { libraryRoot: ROOT, charactersRoot: CHARACTERS_ROOT };
}

async function getSettings(): Promise<LibrarySettings> {
  await ensureLibraryStructure();
  return {
    libraryRoot: 'Android app data/library',
    defaultLibraryRoot: 'Android app data/library',
    configPath: 'Capacitor Preferences + Filesystem Data',
  };
}

async function getCatalog(): Promise<CatalogMetadata> {
  await ensureLibraryStructure();
  const catalog = normalizeCatalog(await readJson<CatalogMetadata>(CATALOG_PATH, defaultCatalog));
  await writeJson(CATALOG_PATH, stripCatalogUrls(catalog));
  return toCatalogPayload(catalog);
}

async function saveCatalog(catalog: CatalogMetadata): Promise<CatalogMetadata> {
  await ensureLibraryStructure();
  const normalized = normalizeCatalog(catalog);
  await writeJson(CATALOG_PATH, stripCatalogUrls(normalized));
  return toCatalogPayload(normalized);
}

async function importCatalogAsset(assetType: CatalogAssetType, collectionId?: string): Promise<CatalogMetadata> {
  const picked = await pickStoredFiles(IMAGE_TYPES, false);
  if (!picked.length) return getCatalog();
  const catalog = await getCatalog();
  const folder = assetType === 'collectionIcon' ? 'icons' : 'wallpapers';
  const targetPath = await writeUniqueBase64(`${ROOT}/catalog-assets/${folder}`, picked[0], assetType);

  if (assetType === 'collectionIcon' && collectionId) {
    catalog.collections = catalog.collections.map((collection) =>
      collection.id === collectionId ? { ...collection, iconPath: targetPath } : collection,
    );
  } else {
    catalog.wallpaperPath = targetPath;
  }

  return saveCatalog(catalog);
}

async function saveCollectionIcon(collectionId: string, imageDataUrl: string, fileName: string): Promise<CatalogMetadata> {
  const catalog = await getCatalog();
  const parsed = parseDataUrl(imageDataUrl, fileName || `${collectionId}.png`);
  const iconPath = await writeUniqueBase64(`${ROOT}/catalog-assets/icons`, parsed, 'collection-icon');
  catalog.collections = catalog.collections.map((collection) =>
    collection.id === collectionId ? { ...collection, iconPath } : collection,
  );
  return saveCatalog(catalog);
}

async function getLibraryCharacters(): Promise<Character[]> {
  await ensureLibraryStructure();
  const entries = await safeReadDir(CHARACTERS_ROOT);
  const characters = await Promise.all(
    entries.map(async (entryName) => {
      const directory = `${CHARACTERS_ROOT}/${entryName}`;
      const character = await readJson<Character | null>(`${directory}/character.json`, null);
      return character ? toCharacterPayload(directory, { ...character, libraryDirectory: directory }) : null;
    }),
  );

  return characters
    .filter((character): character is Character => Boolean(character))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveCharacter(character: Character): Promise<Character> {
  await ensureLibraryStructure();
  const normalized = normalizeCharacter(character);
  const directory = normalized.libraryDirectory?.startsWith(CHARACTERS_ROOT)
    ? normalized.libraryDirectory
    : `${CHARACTERS_ROOT}/${normalized.id}`;
  await ensureCharacterDirectories(directory);

  const persisted = stripCharacterUrls({
    ...normalized,
    libraryDirectory: directory,
    voicePaths: normalized.voiceAssets.map((voice) => voice.filePath),
    updatedAt: new Date().toISOString(),
  });
  await writeJson(`${directory}/character.json`, persisted);
  return toCharacterPayload(directory, persisted);
}

async function deleteCharacter(character: Character): Promise<Character[]> {
  const directory = character.libraryDirectory || `${CHARACTERS_ROOT}/${character.id}`;
  await safeRemoveDirectory(directory);
  return getLibraryCharacters();
}

async function importAsset(character: Character, assetType: AssetType): Promise<Character> {
  const files = await pickFilesForAsset(assetType);
  if (!files.length) return character;

  const normalized = normalizeCharacter(character);
  const directory = normalized.libraryDirectory || `${CHARACTERS_ROOT}/${normalized.id}`;
  await ensureCharacterDirectories(directory);
  const folder = assetFolder(assetType);
  const savedPaths: string[] = [];

  for (const file of files) {
    savedPaths.push(await writeUniqueBase64(`${directory}/${folder}`, file, assetType));
  }

  if (assetType === 'avatar') {
    normalized.avatarPaths = [...savedPaths, ...(normalized.avatarPaths || [])];
    normalized.avatarPath = savedPaths[0];
    normalized.avatarFileName = basename(savedPaths[0]);
  } else if (assetType === 'portrait') {
    normalized.portraitPaths = [...(normalized.portraitPaths || []), ...savedPaths];
    normalized.portraitPath = normalized.portraitPath || savedPaths[0];
    normalized.portraitFileName = normalized.portraitPath ? basename(normalized.portraitPath) : undefined;
  } else if (assetType === 'voice') {
    const now = Date.now();
    normalized.voiceAssets = [
      ...normalized.voiceAssets,
      ...savedPaths.map((filePath, index) => ({
        id: `voice-${now}-${index}`,
        label: basename(filePath, extname(filePath)),
        line: '',
        filePath,
        fileName: basename(filePath),
      })),
    ];
  } else if (assetType === 'model' && savedPaths[0]) {
    normalized.modelPath = savedPaths[0];
    normalized.modelPaths = [savedPaths[0], ...(normalized.modelPaths || []).filter((path) => path !== savedPaths[0])];
    normalized.modelFileName = basename(savedPaths[0]);
    normalized.modelFormat = extname(savedPaths[0]).slice(1).toLowerCase();
  } else if (assetType === 'attachment') {
    normalized.attachmentPaths = [...(normalized.attachmentPaths || []), ...savedPaths];
  }

  return saveCharacter({ ...normalized, libraryDirectory: directory });
}

async function selectImageForCrop(): Promise<CropImageSelection | null> {
  const picked = await pickStoredFiles(IMAGE_TYPES, false);
  if (!picked.length) return null;
  return { fileName: picked[0].name, dataUrl: `data:${picked[0].mimeType};base64,${picked[0].data}` };
}

async function saveCroppedAvatar(character: Character, imageDataUrl: string, fileName: string): Promise<Character> {
  const normalized = normalizeCharacter(character);
  const directory = normalized.libraryDirectory || `${CHARACTERS_ROOT}/${normalized.id}`;
  await ensureCharacterDirectories(directory);
  const parsed = parseDataUrl(imageDataUrl, fileName);
  const targetPath = await writeUniqueBase64(`${directory}/avatar`, parsed, 'avatar');
  normalized.avatarPaths = [targetPath, ...(normalized.avatarPaths || []).filter((path) => path !== targetPath)];
  normalized.avatarPath = targetPath;
  normalized.avatarFileName = basename(targetPath);
  return saveCharacter({ ...normalized, libraryDirectory: directory });
}

async function saveCroppedWallpaper(imageDataUrl: string, fileName: string): Promise<CatalogMetadata> {
  const catalog = await getCatalog();
  const parsed = parseDataUrl(imageDataUrl, fileName);
  catalog.wallpaperPath = await writeUniqueBase64(`${ROOT}/catalog-assets/wallpapers`, parsed, 'wallpaper');
  return saveCatalog(catalog);
}

async function removeAsset(character: Character, assetType: AssetType, assetPath: string): Promise<Character> {
  const normalized = normalizeCharacter(character);
  await safeDeleteFile(assetPath);

  if (assetType === 'avatar') {
    normalized.avatarPaths = (normalized.avatarPaths || []).filter((path) => path !== assetPath);
    normalized.avatarPath = normalized.avatarPath === assetPath
      ? normalized.avatarPaths[0] || normalized.portraitPath || normalized.portraitPaths?.[0]
      : normalized.avatarPath;
    normalized.avatarFileName = normalized.avatarPath ? basename(normalized.avatarPath) : undefined;
  } else if (assetType === 'portrait') {
    normalized.portraitPaths = (normalized.portraitPaths || []).filter((path) => path !== assetPath);
    normalized.portraitPath = normalized.portraitPath === assetPath ? normalized.portraitPaths[0] : normalized.portraitPath;
    normalized.portraitFileName = normalized.portraitPath ? basename(normalized.portraitPath) : undefined;
    if (normalized.avatarPath === assetPath) {
      normalized.avatarPath = normalized.avatarPaths?.[0] || normalized.portraitPath || normalized.portraitPaths[0];
      normalized.avatarFileName = normalized.avatarPath ? basename(normalized.avatarPath) : undefined;
    }
  } else if (assetType === 'voice') {
    normalized.voiceAssets = normalized.voiceAssets.filter((voice) => voice.filePath !== assetPath);
    normalized.voicePaths = normalized.voiceAssets.map((voice) => voice.filePath);
  } else if (assetType === 'model') {
    normalized.modelPaths = (normalized.modelPaths || []).filter((path) => path !== assetPath);
    if (normalized.modelPath === assetPath) normalized.modelPath = normalized.modelPaths[0];
    normalized.modelFileName = normalized.modelPath ? basename(normalized.modelPath) : undefined;
    normalized.modelFormat = normalized.modelPath ? extname(normalized.modelPath).slice(1).toLowerCase() : undefined;
    if (!normalized.modelPath) {
      delete normalized.modelPath;
      delete normalized.modelFileName;
      delete normalized.modelFormat;
    }
  } else if (assetType === 'attachment') {
    normalized.attachmentPaths = (normalized.attachmentPaths || []).filter((path) => path !== assetPath);
  }

  return saveCharacter(normalized);
}

async function toCatalogPayload(catalog: CatalogMetadata): Promise<CatalogMetadata> {
  return {
    ...catalog,
    wallpaperUrl: await toAssetUrl(catalog.wallpaperPath),
    collections: await Promise.all(
      catalog.collections.map(async (collection) => ({
        ...collection,
        iconUrl: await toAssetUrl(collection.iconPath),
      })),
    ),
  };
}

async function toCharacterPayload(directory: string, character: Character): Promise<Character> {
  const normalized = normalizeCharacter(character);
  const portraitPaths = normalized.portraitPaths?.length ? normalized.portraitPaths : normalized.portraitPath ? [normalized.portraitPath] : [];
  const avatarPaths = normalized.avatarPaths?.length ? normalized.avatarPaths : normalized.avatarPath ? [normalized.avatarPath] : [];
  const voiceAssets = await Promise.all(
    normalized.voiceAssets.map(async (voice) => ({ ...voice, fileUrl: await toAssetUrl(voice.filePath) })),
  );
  const avatarUrls = onlyStrings(await Promise.all(avatarPaths.map(toAssetUrl)));
  const portraitUrls = onlyStrings(await Promise.all(portraitPaths.map(toAssetUrl)));
  const voiceUrls = onlyStrings(voiceAssets.map((voice) => voice.fileUrl));
  const modelPaths = normalized.modelPaths?.length ? normalized.modelPaths : normalized.modelPath ? [normalized.modelPath] : [];
  const modelUrls = onlyStrings(await Promise.all(modelPaths.map(toAssetUrl)));
  const attachmentUrls = onlyStrings(await Promise.all((normalized.attachmentPaths || []).map(toAssetUrl)));

  return {
    ...normalized,
    libraryDirectory: directory,
    avatarPaths,
    portraitPaths,
    avatarUrl: await toAssetUrl(normalized.avatarPath || avatarPaths[0] || normalized.portraitPath || portraitPaths[0]),
    avatarUrls,
    portraitUrl: await toAssetUrl(normalized.portraitPath || portraitPaths[0]),
    portraitUrls,
    modelPaths,
    modelUrls,
    voiceAssets,
    voicePaths: voiceAssets.map((voice) => voice.filePath),
    voiceUrls,
    attachmentUrls,
  };
}

async function pickFilesForAsset(assetType: AssetType): Promise<StoredFile[]> {
  if (assetType === 'avatar') return pickStoredFiles(IMAGE_TYPES, false);
  if (assetType === 'portrait') return pickStoredFiles(IMAGE_TYPES, true);
  if (assetType === 'voice') return pickStoredFiles(VOICE_TYPES, true);
  if (assetType === 'model') return pickStoredFiles(MODEL_TYPES, false);
  return pickStoredFiles(undefined, true);
}

async function pickStoredFiles(types: string[] | undefined, multiple: boolean): Promise<StoredFile[]> {
  try {
    const result = types?.length === 1 && types[0] === 'image/*'
      ? await FilePicker.pickImages({ limit: multiple ? 0 : 1, readData: true })
      : await FilePicker.pickFiles({ types, limit: multiple ? 0 : 1, readData: true });
    return result.files.flatMap(toStoredFile);
  } catch {
    return [];
  }
}

function toStoredFile(file: PickedFile): StoredFile[] {
  if (!file.data) return [];
  return [{ data: file.data, name: file.name || `asset-${Date.now()}`, mimeType: file.mimeType || mimeFromPath(file.name) }];
}

async function ensureLibraryStructure(): Promise<void> {
  await Promise.all([
    ensureDirectory(ROOT),
    ensureDirectory(CHARACTERS_ROOT),
    ensureDirectory(`${ROOT}/catalog-assets/wallpapers`),
    ensureDirectory(`${ROOT}/catalog-assets/icons`),
  ]);
}

async function ensureCharacterDirectories(directory: string): Promise<void> {
  await Promise.all(['avatar', 'portraits', 'voices', 'attachments', 'models'].map((folder) => ensureDirectory(`${directory}/${folder}`)));
}

async function ensureDirectory(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch {
    // Existing directories are fine.
  }
}

async function safeReadDir(path: string): Promise<string[]> {
  try {
    const result = await Filesystem.readdir({ path, directory: Directory.Data });
    return result.files.map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const result = await Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 });
    const text = typeof result.data === 'string' ? result.data : await result.data.text();
    return JSON.parse(text.replace(/^\uFEFF/, '')) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await Filesystem.writeFile({
    path,
    directory: Directory.Data,
    data: JSON.stringify(value, null, 2),
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

async function writeUniqueBase64(directory: string, file: StoredFile, prefix: string): Promise<string> {
  await ensureDirectory(directory);
  const extension = extensionFromMime(file.mimeType) || extname(file.name) || '.bin';
  const baseName = slug(basename(file.name, extname(file.name))) || prefix;
  let targetPath = `${directory}/${baseName}${extension}`;
  let index = 1;

  while (await exists(targetPath)) {
    targetPath = `${directory}/${baseName}-${index}${extension}`;
    index += 1;
  }

  await Filesystem.writeFile({ path: targetPath, directory: Directory.Data, data: file.data, recursive: true });
  return targetPath;
}

async function toAssetUrl(filePath?: string): Promise<string | undefined> {
  if (!filePath) return undefined;
  try {
    const result = await Filesystem.readFile({ path: filePath, directory: Directory.Data });
    const data = typeof result.data === 'string' ? result.data : await blobToBase64(result.data);
    return `data:${mimeFromPath(filePath)};base64,${data}`;
  } catch {
    return undefined;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

async function safeDeleteFile(path: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // Missing files are already removed from the user's perspective.
  }
}

async function safeRemoveDirectory(path: string): Promise<void> {
  try {
    await Filesystem.rmdir({ path, directory: Directory.Data, recursive: true });
  } catch {
    // Missing directories are already removed from the user's perspective.
  }
}

function normalizeCatalog(catalog: CatalogMetadata): CatalogMetadata {
  const collections = catalog.collections?.length ? catalog.collections : defaultCatalog.collections;
  const hasAll = collections.some((collection) => collection.id === 'all');
  const wallpaperOpacity = Number.isFinite(Number(catalog.wallpaperOpacity))
    ? Math.min(1, Math.max(0.18, Number(catalog.wallpaperOpacity)))
    : defaultCatalog.wallpaperOpacity;
  return {
    ...defaultCatalog,
    ...catalog,
    wallpaperOpacity,
    collections: hasAll ? collections : [defaultCatalog.collections[0], ...collections],
  };
}

function stripCatalogUrls(catalog: CatalogMetadata): CatalogMetadata {
  return {
    ...catalog,
    wallpaperUrl: undefined,
    collections: catalog.collections.map(({ iconUrl, ...collection }) => collection),
  };
}

function stripCharacterUrls(character: Character): Character {
  const { avatarUrl, avatarUrls, portraitUrl, portraitUrls, voiceUrls, modelUrls, attachmentUrls, portraitDataUrl, ...persisted } = character;
  return {
    ...persisted,
    voiceAssets: persisted.voiceAssets.map(({ fileUrl, ...voice }) => voice),
  };
}

function parseDataUrl(dataUrl: string, fileName: string): StoredFile {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error('Invalid image data');
  return { data: match[2], mimeType: match[1], name: fileName || `image-${Date.now()}.png` };
}

function assetFolder(assetType: AssetType): string {
  if (assetType === 'avatar') return 'avatar';
  if (assetType === 'portrait') return 'portraits';
  if (assetType === 'voice') return 'voices';
  if (assetType === 'model') return 'models';
  return 'attachments';
}

function basename(filePath: string, extension = ''): string {
  const name = filePath.split('/').pop() || filePath;
  return extension && name.endsWith(extension) ? name.slice(0, -extension.length) : name;
}

function extname(filePath: string): string {
  const name = basename(filePath);
  const index = name.lastIndexOf('.');
  return index > -1 ? name.slice(index) : '';
}

function slug(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 48);
}

function mimeFromPath(filePath: string): string {
  const extension = extname(filePath).toLowerCase();
  if (['.jpg', '.jpeg'].includes(extension)) return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.mp3') return 'audio/mpeg';
  if (extension === '.wav') return 'audio/wav';
  if (extension === '.ogg') return 'audio/ogg';
  if (extension === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

function extensionFromMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'audio/mpeg') return '.mp3';
  if (mimeType === 'audio/wav') return '.wav';
  if (mimeType === 'audio/ogg') return '.ogg';
  if (mimeType === 'audio/mp4') return '.m4a';
  return '';
}

function onlyStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
