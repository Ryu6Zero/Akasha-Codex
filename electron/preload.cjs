const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('acgplan', {
  getLibraryInfo: () => ipcRenderer.invoke('library:getInfo'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setLibraryRoot: (libraryRoot) => ipcRenderer.invoke('settings:setLibraryRoot', libraryRoot),
  selectLibraryRoot: () => ipcRenderer.invoke('settings:selectLibraryRoot'),
  openLibraryRoot: () => ipcRenderer.invoke('library:openRoot'),
  getCatalog: () => ipcRenderer.invoke('catalog:get'),
  saveCatalog: (catalog) => ipcRenderer.invoke('catalog:save', catalog),
  importCatalogAsset: (assetType, collectionId) => ipcRenderer.invoke('catalog:importAsset', assetType, collectionId),
  saveCollectionIcon: (collectionId, imageDataUrl, fileName) =>
    ipcRenderer.invoke('catalog:saveCollectionIcon', collectionId, imageDataUrl, fileName),
  selectImageForCatalogCrop: () => ipcRenderer.invoke('catalog:selectImageForCrop'),
  saveCroppedWallpaper: (imageDataUrl, fileName) => ipcRenderer.invoke('catalog:saveCroppedWallpaper', imageDataUrl, fileName),
  getLibraryCharacters: () => ipcRenderer.invoke('library:getCharacters'),
  saveCharacter: (character) => ipcRenderer.invoke('library:saveCharacter', character),
  deleteCharacter: (character) => ipcRenderer.invoke('library:deleteCharacter', character),
  importAsset: (character, assetType) => ipcRenderer.invoke('library:importAsset', character, assetType),
  selectImageForCrop: () => ipcRenderer.invoke('library:selectImageForCrop'),
  saveCroppedAvatar: (character, imageDataUrl, fileName) =>
    ipcRenderer.invoke('library:saveCroppedAvatar', character, imageDataUrl, fileName),
  removeAsset: (character, assetType, assetPath) => ipcRenderer.invoke('library:removeAsset', character, assetType, assetPath),
  importCharacterDirectory: (sourceDirectory) => ipcRenderer.invoke('library:importCharacterDirectory', sourceDirectory),
});
