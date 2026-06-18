const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const { createAssetReportService } = require('./asset-report-service.cjs');
const { createCatalogService } = require('./catalog-service.cjs');
const { createCharacterService } = require('./character-service.cjs');
const { createLibraryContext } = require('./library-context.cjs');
const { createStoryService } = require('./story-service.cjs');

const context = createLibraryContext(app);
const assetReportService = createAssetReportService(context);
const catalogService = createCatalogService(context, dialog);
const characterService = createCharacterService(context, dialog);
const storyService = createStoryService(context, dialog);

function registerIpcHandlers() {
  ipcMain.handle('catalog:get', () => catalogService.loadCatalog());
  ipcMain.handle('catalog:save', (_event, catalog) => catalogService.saveCatalog(catalog));
  ipcMain.handle('catalog:importAsset', (_event, assetType, collectionId) =>
    catalogService.importCatalogAsset(assetType, collectionId),
  );
  ipcMain.handle('catalog:saveCollectionIcon', (_event, collectionId, imageDataUrl, fileName) =>
    catalogService.saveCollectionIcon(collectionId, imageDataUrl, fileName),
  );
  ipcMain.handle('catalog:selectImageForCrop', () => catalogService.selectImageForCrop());
  ipcMain.handle('catalog:saveCroppedWallpaper', (_event, imageDataUrl, fileName) =>
    catalogService.saveCroppedWallpaper(imageDataUrl, fileName),
  );
  ipcMain.handle('stories:getCatalog', () => storyService.loadStoryCatalog());
  ipcMain.handle('stories:saveCatalog', (_event, catalog) => storyService.saveStoryCatalog(catalog));
  ipcMain.handle('stories:getAll', () => storyService.loadStories());
  ipcMain.handle('stories:save', (_event, story) => storyService.saveStoryJson(story));
  ipcMain.handle('stories:delete', (_event, story) => storyService.deleteStory(story));
  ipcMain.handle('stories:importImage', (_event, story, blockId) => storyService.importStoryImage(story, blockId));
  ipcMain.handle('stories:removeImage', (_event, story, assetPath) => storyService.removeStoryImage(story, assetPath));
  ipcMain.handle('library:getCharacters', () => characterService.loadLibraryCharacters());
  ipcMain.handle('library:getCharacterSummaries', () => characterService.loadLibraryCharacterSummaries());
  ipcMain.handle('library:getCharacter', (_event, characterId) => characterService.loadCharacter(characterId));
  ipcMain.handle('library:saveCharacter', (_event, character) => characterService.saveCharacterJson(character));
  ipcMain.handle('library:deleteCharacter', (_event, character) => characterService.deleteCharacter(character));
  ipcMain.handle('library:getInfo', () => ({
    libraryRoot: context.getLibraryRoot(),
    charactersRoot: context.getCharactersRoot(),
    storiesRoot: context.getStoriesRoot(),
  }));
  ipcMain.handle('library:generateAssetCompletenessReport', () => assetReportService.generateAssetCompletenessReport());
  ipcMain.handle('library:openRoot', async () => {
    const libraryRoot = context.getLibraryRoot();
    context.ensureDirectory(libraryRoot);
    return shell.openPath(libraryRoot);
  });
  ipcMain.handle('library:importAsset', (_event, character, assetType) =>
    characterService.importAsset(character, assetType),
  );
  ipcMain.handle('library:selectImageForCrop', () => characterService.selectImageForCrop());
  ipcMain.handle('library:saveCroppedAvatar', (_event, character, imageDataUrl, fileName) =>
    characterService.saveCroppedAvatar(character, imageDataUrl, fileName),
  );
  ipcMain.handle('library:removeAsset', (_event, character, assetType, assetPath) =>
    characterService.removeAsset(character, assetType, assetPath),
  );
  ipcMain.handle('library:importCharacterDirectory', async (_event, sourceDirectory) => {
    const selectedDirectory = sourceDirectory || (await selectCharacterDirectory());
    return selectedDirectory ? characterService.importCharacterFolder(selectedDirectory) : [];
  });
  ipcMain.handle('settings:get', () => context.getSettingsPayload());
  ipcMain.handle('settings:setLibraryRoot', (_event, libraryRoot) => {
    const nextLibraryRoot = typeof libraryRoot === 'string' && libraryRoot.trim() ? libraryRoot.trim() : context.getLibraryRoot();
    const settings = context.writeSettings({ libraryRoot: nextLibraryRoot });
    context.ensureLibraryStructure();
    return settings;
  });
  ipcMain.handle('settings:selectLibraryRoot', async () => {
    const result = await dialog.showOpenDialog({ title: '选择资料库目录', properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return context.getSettingsPayload();
    const settings = context.writeSettings({ libraryRoot: result.filePaths[0] });
    context.ensureLibraryStructure();
    return settings;
  });
}

async function selectCharacterDirectory() {
  const result = await dialog.showOpenDialog({ title: '选择角色资源目录', properties: ['openDirectory'] });
  return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths[0];
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 760,
    minHeight: 620,
    title: '绯典阁',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'brand', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  context.ensureLibraryStructure();
  catalogService.loadCatalog();
  storyService.loadStoryCatalog();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
