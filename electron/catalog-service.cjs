function createDefaultCatalog() {
  return {
    wallpaperPath: undefined,
    wallpaperOpacity: 0.72,
    defaultCollectionId: 'all',
    defaultSortMode: 'updatedAt',
    collections: [
      { id: 'all', name: '全部角色', description: '浏览当前资料库的所有角色。', tagRules: [] },
    ],
  };
}

function createCatalogService(context, dialog) {
  const {
    fs,
    path,
    imageExtensions,
    ensureDirectory,
    ensureLibraryStructure,
    readJsonFile,
    getCatalogPath,
    getLibraryRoot,
    toAssetUrl,
    createUniqueTargetPath,
  } = context;

  function normalizeCatalog(rawCatalog = createDefaultCatalog()) {
    const fallback = createDefaultCatalog();
    const rawCollections = Array.isArray(rawCatalog.collections) && rawCatalog.collections.length
      ? rawCatalog.collections
      : fallback.collections;
    const normalizedCollections = rawCollections
      .filter((collection) => collection?.id && collection?.name)
      .map((collection) => ({
        id: String(collection.id),
        name: String(collection.name),
        description: String(collection.description || ''),
        iconPath: typeof collection.iconPath === 'string' ? collection.iconPath : undefined,
        tagRules: Array.isArray(collection.tagRules) ? collection.tagRules.map(String).filter(Boolean) : [],
      }));
    const hasAll = normalizedCollections.some((collection) => collection.id === 'all');
    const collections = hasAll ? normalizedCollections : [fallback.collections[0], ...normalizedCollections];

    return {
      wallpaperPath: typeof rawCatalog.wallpaperPath === 'string' ? rawCatalog.wallpaperPath : fallback.wallpaperPath,
      wallpaperOpacity: normalizeWallpaperOpacity(rawCatalog.wallpaperOpacity, fallback.wallpaperOpacity),
      defaultCollectionId: typeof rawCatalog.defaultCollectionId === 'string'
        ? rawCatalog.defaultCollectionId
        : fallback.defaultCollectionId,
      defaultSortMode: ['updatedAt', 'createdAt', 'name', 'sourceTitle'].includes(rawCatalog.defaultSortMode)
        ? rawCatalog.defaultSortMode
        : fallback.defaultSortMode,
      collections,
    };
  }

  function normalizeWallpaperOpacity(value, fallback) {
    const opacity = Number(value);
    if (!Number.isFinite(opacity)) return fallback;
    return Math.min(1, Math.max(0.18, opacity));
  }

  function toCatalogPayload(catalog) {
    return {
      ...catalog,
      wallpaperUrl: toAssetUrl(catalog.wallpaperPath),
      collections: catalog.collections.map((collection) => ({
        ...collection,
        iconUrl: toAssetUrl(collection.iconPath),
      })),
    };
  }

  function loadCatalog() {
    ensureLibraryStructure();
    const catalog = normalizeCatalog(readJsonFile(getCatalogPath(), createDefaultCatalog()));

    if (!fs.existsSync(getCatalogPath())) saveCatalog(catalog);
    return toCatalogPayload(catalog);
  }

  function saveCatalog(rawCatalog) {
    ensureLibraryStructure();
    const catalog = normalizeCatalog(rawCatalog);
    fs.writeFileSync(getCatalogPath(), JSON.stringify(catalog, null, 2), 'utf8');
    return toCatalogPayload(catalog);
  }

  async function importCatalogAsset(assetType, collectionId) {
    const catalog = normalizeCatalog(readJsonFile(getCatalogPath(), createDefaultCatalog()));
    const targetFolder = assetType === 'collectionIcon' ? 'icons' : 'wallpapers';
    const result = await dialog.showOpenDialog({
      title: assetType === 'collectionIcon' ? '选择分类图标' : '选择首页壁纸',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });

    if (result.canceled || result.filePaths.length === 0) return toCatalogPayload(catalog);
    const selectedPath = result.filePaths[0];
    if (!imageExtensions.has(path.extname(selectedPath).toLowerCase())) return toCatalogPayload(catalog);

    const targetDirectory = path.join(getLibraryRoot(), 'catalog-assets', targetFolder);
    ensureDirectory(targetDirectory);
    const targetPath = createUniqueTargetPath(targetDirectory, path.basename(selectedPath));
    fs.copyFileSync(selectedPath, targetPath);

    if (assetType === 'collectionIcon' && collectionId) {
      catalog.collections = catalog.collections.map((collection) =>
        collection.id === collectionId ? { ...collection, iconPath: targetPath } : collection,
      );
    } else {
      catalog.wallpaperPath = targetPath;
    }

    return saveCatalog(catalog);
  }

  async function selectImageForCrop() {
    const result = await dialog.showOpenDialog({
      title: '选择图片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedPath = result.filePaths[0];
    if (!imageExtensions.has(path.extname(selectedPath).toLowerCase())) return null;
    const extension = path.extname(selectedPath).slice(1).toLowerCase() || 'png';
    const mimeType = extension === 'jpg' ? 'jpeg' : extension;
    const data = fs.readFileSync(selectedPath).toString('base64');
    return { fileName: path.basename(selectedPath), dataUrl: `data:image/${mimeType};base64,${data}` };
  }

  function saveCroppedWallpaper(imageDataUrl, fileName) {
    const match = parseImageDataUrl(imageDataUrl, 'Invalid cropped wallpaper data');
    const catalog = normalizeCatalog(readJsonFile(getCatalogPath(), createDefaultCatalog()));
    const targetDirectory = path.join(getLibraryRoot(), 'catalog-assets', 'wallpapers');
    ensureDirectory(targetDirectory);
    const baseName = context.createSlug(path.basename(fileName || 'wallpaper', path.extname(fileName || 'wallpaper'))) || 'wallpaper';
    const targetPath = createUniqueTargetPath(targetDirectory, `${baseName}-cropped.png`);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));
    catalog.wallpaperPath = targetPath;
    return saveCatalog(catalog);
  }

  function saveCollectionIcon(collectionId, imageDataUrl, fileName) {
    if (!collectionId) throw new Error('Missing collection id');
    const match = parseImageDataUrl(imageDataUrl, 'Invalid collection icon data');
    const catalog = normalizeCatalog(readJsonFile(getCatalogPath(), createDefaultCatalog()));
    const targetDirectory = path.join(getLibraryRoot(), 'catalog-assets', 'icons');
    ensureDirectory(targetDirectory);
    const baseName = context.createSlug(path.basename(fileName || collectionId, path.extname(fileName || collectionId))) || collectionId;
    const targetPath = createUniqueTargetPath(targetDirectory, `${baseName}-icon.png`);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));

    catalog.collections = catalog.collections.map((collection) =>
      collection.id === collectionId ? { ...collection, iconPath: targetPath } : collection,
    );
    return saveCatalog(catalog);
  }

  function parseImageDataUrl(imageDataUrl, errorMessage) {
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(String(imageDataUrl || ''));
    if (!match) throw new Error(errorMessage);
    return match;
  }

  return { loadCatalog, saveCatalog, importCatalogAsset, saveCollectionIcon, selectImageForCrop, saveCroppedWallpaper };
}

module.exports = { createCatalogService };
