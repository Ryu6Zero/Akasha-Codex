function createCharacterService(context, dialog) {
  const { fs, path, imageExtensions, voiceExtensions, modelExtensions } = context;

  function createCharacterId(name) {
    return `${Date.now()}-${context.createSlug(name) || 'character'}`;
  }

  function deriveCollectionIds(character) {
    return Array.from(new Set(character.collectionIds || []));
  }

  function normalizeVoiceAssets(character) {
    if (Array.isArray(character.voiceAssets)) {
      return character.voiceAssets
        .filter((voice) => voice?.filePath)
        .map((voice, index) => ({
          id: voice.id || `voice-${index + 1}`,
          label: voice.label || path.basename(voice.filePath),
          line: voice.line || '',
          subtitle: voice.subtitle || '',
          category: voice.category || '',
          sourceUrl: voice.sourceUrl || '',
          sourceIds: Array.isArray(voice.sourceIds) ? voice.sourceIds : [],
          conditionText: voice.conditionText || '',
          filePath: voice.filePath,
          fileName: voice.fileName || path.basename(voice.filePath),
        }));
    }

    return (character.voicePaths || []).map((voicePath, index) => ({
      id: `legacy-voice-${index + 1}`,
      label: path.basename(voicePath),
      line: '',
      subtitle: '',
      category: '',
      sourceUrl: '',
      sourceIds: [],
      conditionText: '',
      filePath: voicePath,
      fileName: path.basename(voicePath),
    }));
  }

  function normalizeCharacter(rawCharacter) {
    const tags = Array.isArray(rawCharacter.tags)
      ? rawCharacter.tags
      : String(rawCharacter.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
    const voiceAssets = normalizeVoiceAssets({ ...rawCharacter, tags });
    const portraitPaths = Array.isArray(rawCharacter.portraitPaths)
      ? rawCharacter.portraitPaths.filter(Boolean)
      : rawCharacter.portraitPath ? [rawCharacter.portraitPath] : [];
    const avatarPaths = Array.isArray(rawCharacter.avatarPaths)
      ? rawCharacter.avatarPaths.filter(Boolean)
      : rawCharacter.avatarPath ? [rawCharacter.avatarPath] : [];
    const portraitPath = rawCharacter.portraitPath || portraitPaths[0];
    const avatarPath = rawCharacter.avatarPath || avatarPaths[0] || portraitPath;
    const modelPaths = Array.isArray(rawCharacter.modelPaths)
      ? rawCharacter.modelPaths.filter(Boolean)
      : rawCharacter.modelPath ? [rawCharacter.modelPath] : [];

    return {
      aliases: [],
      tags,
      collectionIds: [],
      description: '',
      notes: '',
      avatarPaths,
      portraitPaths,
      voicePaths: voiceAssets.map((voice) => voice.filePath),
      voiceAssets,
      modelPaths,
      attachmentPaths: [],
      ...rawCharacter,
      tags,
      avatarPath,
      avatarPaths,
      portraitPath,
      portraitPaths,
      voiceAssets,
      modelPath: rawCharacter.modelPath || modelPaths[0],
      modelPaths,
      collectionIds: deriveCollectionIds({ ...rawCharacter, tags, collectionIds: rawCharacter.collectionIds || [] }),
      attachmentPaths: rawCharacter.attachmentPaths || [],
    };
  }

  function toCharacterPayload(characterDirectory, rawCharacter) {
    const character = normalizeCharacter(rawCharacter);
    const portraitPaths = character.portraitPaths?.length ? character.portraitPaths : character.portraitPath ? [character.portraitPath] : [];
    const avatarPaths = character.avatarPaths?.length ? character.avatarPaths : character.avatarPath ? [character.avatarPath] : [];
    const voiceAssets = character.voiceAssets.map((voice) => ({ ...voice, fileUrl: context.toAssetUrl(voice.filePath) }));
    const attachmentPaths = character.attachmentPaths || [];
    const modelPaths = character.modelPaths?.length ? character.modelPaths : character.modelPath ? [character.modelPath] : [];

    return {
      ...character,
      avatarPaths,
      portraitPaths,
      modelPaths,
      voicePaths: voiceAssets.map((voice) => voice.filePath),
      voiceAssets,
      attachmentPaths,
      avatarUrl: context.toAssetUrl(character.avatarPath || avatarPaths[0] || character.portraitPath || portraitPaths[0]),
      avatarUrls: avatarPaths.map(context.toAssetUrl),
      portraitUrl: context.toAssetUrl(character.portraitPath || portraitPaths[0]),
      portraitUrls: portraitPaths.map(context.toAssetUrl),
      modelUrls: modelPaths.map(context.toAssetUrl),
      voiceUrls: voiceAssets.map((voice) => voice.fileUrl),
      attachmentUrls: attachmentPaths.map(context.toAssetUrl),
      libraryDirectory: characterDirectory,
    };
  }

  function saveCharacterJson(rawCharacter) {
    context.ensureLibraryStructure();
    const character = normalizeCharacter(rawCharacter);
    const characterDirectory = character.libraryDirectory || path.join(context.getCharactersRoot(), character.id);
    context.ensureDirectory(characterDirectory);
    context.ensureCharacterDirectories(characterDirectory);

    const persistedCharacter = {
      ...character,
      libraryDirectory: characterDirectory,
      voicePaths: character.voiceAssets.map((voice) => voice.filePath),
      updatedAt: new Date().toISOString(),
    };

    ['avatarUrl', 'avatarUrls', 'portraitUrl', 'portraitUrls', 'voiceUrls', 'attachmentUrls', 'portraitDataUrl'].forEach((key) => {
      delete persistedCharacter[key];
    });
    persistedCharacter.voiceAssets = persistedCharacter.voiceAssets.map((voice) => {
      const { fileUrl, ...persistedVoice } = voice;
      return persistedVoice;
    });

    fs.writeFileSync(path.join(characterDirectory, 'character.json'), JSON.stringify(persistedCharacter, null, 2), 'utf8');
    return toCharacterPayload(characterDirectory, persistedCharacter);
  }

  function loadLibraryCharacters() {
    context.ensureLibraryStructure();
    return fs
      .readdirSync(context.getCharactersRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(context.getCharactersRoot(), entry.name))
      .filter((characterDirectory) => fs.existsSync(path.join(characterDirectory, 'character.json')))
      .map((characterDirectory) => {
        const character = context.readJsonFile(path.join(characterDirectory, 'character.json'), null);
        return character ? toCharacterPayload(characterDirectory, { ...character, libraryDirectory: characterDirectory }) : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function getAssetConfig(assetType) {
    const imageFilters = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }];
    if (assetType === 'avatar') return { directory: 'avatar', extensions: imageExtensions, filters: imageFilters, multi: false };
    if (assetType === 'portrait') return { directory: 'portraits', extensions: imageExtensions, filters: imageFilters, multi: true };
    if (assetType === 'voice') return { directory: 'voices', extensions: voiceExtensions, filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }], multi: true };
    if (assetType === 'model') return { directory: 'models', extensions: modelExtensions, filters: [{ name: 'Models', extensions: ['pmx', 'glb', 'gltf', 'fbx', 'obj'] }], multi: false };
    return { directory: 'attachments', extensions: null, filters: [{ name: 'All Files', extensions: ['*'] }], multi: true };
  }

  async function importAsset(rawCharacter, assetType) {
    const config = getAssetConfig(assetType);
    const result = await dialog.showOpenDialog({
      title: '选择资源文件',
      properties: config.multi ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: config.filters,
    });
    if (result.canceled || result.filePaths.length === 0) {
      return toCharacterPayload(rawCharacter.libraryDirectory || path.join(context.getCharactersRoot(), rawCharacter.id), rawCharacter);
    }
    return saveCharacterJson(copyImportedAsset(rawCharacter, assetType, config, result.filePaths));
  }

  async function selectImageForCrop() {
    const result = await dialog.showOpenDialog({
      title: '选择头像图片',
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

  function saveCroppedAvatar(rawCharacter, imageDataUrl, fileName) {
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(String(imageDataUrl || ''));
    if (!match) throw new Error('Invalid cropped avatar data');

    const character = normalizeCharacter(rawCharacter);
    const characterDirectory = character.libraryDirectory || path.join(context.getCharactersRoot(), character.id);
    context.ensureCharacterDirectories(characterDirectory);
    const avatarDirectory = path.join(characterDirectory, 'avatar');
    const safeBaseName = context.createSlug(path.basename(fileName || 'avatar', path.extname(fileName || 'avatar'))) || 'avatar';
    const targetPath = context.createUniqueTargetPath(avatarDirectory, `${safeBaseName}-cropped.png`);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));
    character.avatarPaths = [targetPath, ...(character.avatarPaths || []).filter((avatarPath) => avatarPath !== targetPath)];
    character.avatarPath = targetPath;
    character.avatarFileName = path.basename(targetPath);
    return saveCharacterJson({ ...character, libraryDirectory: characterDirectory });
  }

  function copyImportedAsset(rawCharacter, assetType, config, selectedPaths) {
    const character = normalizeCharacter(rawCharacter);
    const characterDirectory = character.libraryDirectory || path.join(context.getCharactersRoot(), character.id);
    context.ensureCharacterDirectories(characterDirectory);
    const targetDirectory = path.join(characterDirectory, config.directory);
    const copiedPaths = selectedPaths.flatMap((selectedPath) => {
      const extension = path.extname(selectedPath).toLowerCase();
      if (config.extensions && !config.extensions.has(extension)) return [];
      const targetPath = context.createUniqueTargetPath(targetDirectory, path.basename(selectedPath));
      fs.copyFileSync(selectedPath, targetPath);
      return [targetPath];
    });

    applyCopiedAssets(character, assetType, copiedPaths);
    return { ...character, libraryDirectory: characterDirectory };
  }

  function applyCopiedAssets(character, assetType, copiedPaths) {
    if (assetType === 'avatar' && copiedPaths[0]) {
      character.avatarPaths = [...copiedPaths, ...(character.avatarPaths || [])];
      character.avatarPath = copiedPaths[0];
      character.avatarFileName = path.basename(copiedPaths[0]);
    } else if (assetType === 'portrait') {
      character.portraitPaths = [...(character.portraitPaths || []), ...copiedPaths];
      character.portraitPath = character.portraitPath || copiedPaths[0];
      character.portraitFileName = character.portraitPath ? path.basename(character.portraitPath) : undefined;
    } else if (assetType === 'voice') {
      const now = Date.now();
      character.voiceAssets = [...character.voiceAssets, ...copiedPaths.map((voicePath, index) => ({
        id: `voice-${now}-${index}`,
        label: path.basename(voicePath, path.extname(voicePath)),
        line: '',
        filePath: voicePath,
        fileName: path.basename(voicePath),
      }))];
    } else if (assetType === 'model' && copiedPaths[0]) {
      character.modelPath = copiedPaths[0];
      character.modelPaths = [copiedPaths[0], ...(character.modelPaths || []).filter((modelPath) => modelPath !== copiedPaths[0])];
      character.modelFileName = path.basename(copiedPaths[0]);
      character.modelFormat = path.extname(copiedPaths[0]).slice(1).toLowerCase();
    } else if (assetType === 'attachment') {
      character.attachmentPaths = [...(character.attachmentPaths || []), ...copiedPaths];
    }
  }

  function removeAsset(rawCharacter, assetType, assetPath) {
    const character = normalizeCharacter(rawCharacter);
    const characterDirectory = character.libraryDirectory || path.join(context.getCharactersRoot(), character.id);
    context.safeDeleteFile(characterDirectory, assetPath);

    if (assetType === 'avatar') {
      character.avatarPaths = (character.avatarPaths || []).filter((avatarPath) => avatarPath !== assetPath);
      if (character.avatarPath === assetPath) {
        character.avatarPath = character.avatarPaths[0] || character.portraitPath || character.portraitPaths?.[0];
      }
      if (character.avatarPath) {
        character.avatarFileName = path.basename(character.avatarPath);
      } else {
        delete character.avatarPath;
        delete character.avatarFileName;
      }
    } else if (assetType === 'portrait') {
      character.portraitPaths = (character.portraitPaths || []).filter((portraitPath) => portraitPath !== assetPath);
      if (character.portraitPath === assetPath) character.portraitPath = character.portraitPaths[0];
      character.portraitFileName = character.portraitPath ? path.basename(character.portraitPath) : undefined;
      if (character.avatarPath === assetPath) {
        character.avatarPath = character.avatarPaths?.[0] || character.portraitPath || character.portraitPaths[0];
        character.avatarFileName = character.avatarPath ? path.basename(character.avatarPath) : undefined;
      }
    } else if (assetType === 'voice') {
      character.voiceAssets = character.voiceAssets.filter((voice) => voice.filePath !== assetPath);
      character.voicePaths = character.voiceAssets.map((voice) => voice.filePath);
    } else if (assetType === 'model') {
      character.modelPaths = (character.modelPaths || []).filter((modelPath) => modelPath !== assetPath);
      if (character.modelPath === assetPath) character.modelPath = character.modelPaths[0];
      character.modelFileName = character.modelPath ? path.basename(character.modelPath) : undefined;
      character.modelFormat = character.modelPath ? path.extname(character.modelPath).slice(1).toLowerCase() : undefined;
      if (!character.modelPath) {
        delete character.modelPath;
        delete character.modelFileName;
        delete character.modelFormat;
      }
    } else if (assetType === 'attachment') {
      character.attachmentPaths = (character.attachmentPaths || []).filter((attachmentPath) => attachmentPath !== assetPath);
    }

    return saveCharacterJson({ ...character, libraryDirectory: characterDirectory });
  }

  function deleteCharacter(rawCharacter) {
    const characterDirectory = rawCharacter.libraryDirectory || path.join(context.getCharactersRoot(), rawCharacter.id);
    if (fs.existsSync(characterDirectory) && context.isInside(context.getCharactersRoot(), characterDirectory)) {
      fs.rmSync(characterDirectory, { recursive: true, force: true });
    }
    return loadLibraryCharacters();
  }

  function importCharacterFolder(sourceDirectory) {
    context.ensureLibraryStructure();
    const files = context.listFilesRecursive(sourceDirectory);
    const modelFiles = files.filter((filePath) => modelExtensions.has(path.extname(filePath).toLowerCase()));
    const imageFiles = files.filter((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));
    const seeds = modelFiles.length > 0 ? modelFiles : imageFiles.slice(0, 6);
    return seeds.map((seedFile) => createImportedCharacter(sourceDirectory, seedFile, imageFiles));
  }

  function createImportedCharacter(sourceDirectory, seedFile, imageFiles) {
    const seedExtension = path.extname(seedFile).toLowerCase();
    const name = path.basename(seedFile, seedExtension);
    const sourceTitle = path.basename(sourceDirectory);
    const id = createCharacterId(name);
    const now = new Date().toISOString();
    const characterDirectory = path.join(context.getCharactersRoot(), id);
    context.ensureCharacterDirectories(characterDirectory);
    const { avatarPath, portraitPaths } = copyRelatedImages(imageFiles, path.dirname(seedFile), characterDirectory);
    const tags = ['导入', modelExtensions.has(seedExtension) ? seedExtension.slice(1).toUpperCase() : '图片'];

    return saveCharacterJson({
      id,
      name,
      sourceTitle,
      aliases: [],
      tags,
      collectionIds: deriveCollectionIds({ sourceTitle, tags, collectionIds: [] }),
      description: '',
      notes: '从本地目录导入。',
      avatarPath,
      avatarPaths: avatarPath ? [avatarPath] : [],
      avatarFileName: avatarPath ? path.basename(avatarPath) : undefined,
      portraitPath: portraitPaths[0],
      portraitPaths,
      portraitFileName: portraitPaths[0] ? path.basename(portraitPaths[0]) : undefined,
      voiceAssets: [],
      voicePaths: [],
      attachmentPaths: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  function copyRelatedImages(imageFiles, sourceDirectory, characterDirectory) {
    const portraitDirectory = path.join(characterDirectory, 'portraits');
    const avatarDirectory = path.join(characterDirectory, 'avatar');
    const relatedImages = imageFiles.filter((imageFile) => path.dirname(imageFile) === sourceDirectory);
    const portraitPaths = [];
    let avatarPath;

    for (const imageFile of relatedImages) {
      const portraitPath = context.createUniqueTargetPath(portraitDirectory, path.basename(imageFile));
      fs.copyFileSync(imageFile, portraitPath);
      portraitPaths.push(portraitPath);
      if (!avatarPath) {
        avatarPath = context.createUniqueTargetPath(avatarDirectory, path.basename(imageFile));
        fs.copyFileSync(imageFile, avatarPath);
      }
    }
    return { avatarPath, portraitPaths };
  }

  return {
    loadLibraryCharacters,
    saveCharacterJson,
    importAsset,
    selectImageForCrop,
    saveCroppedAvatar,
    removeAsset,
    deleteCharacter,
    importCharacterFolder,
  };
}

module.exports = { createCharacterService };
