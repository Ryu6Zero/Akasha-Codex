const {
  applyStoryImage,
  createDefaultStoryCatalog,
  fileName,
  normalizeStory,
  normalizeStoryCatalog,
  stripStoryRuntimeUrls,
} = require('./story-normalizer.cjs');

function createStoryService(context, dialog) {
  const { fs, path, imageExtensions } = context;

  function toStoryPayload(storyDirectory, rawStory) {
    const story = normalizeStory(rawStory);
    return {
      ...story,
      libraryDirectory: storyDirectory,
      coverImageUrl: context.toAssetUrl(story.coverImagePath),
      blocks: story.blocks.map((block) => ({
        ...block,
        imageUrl: context.toAssetUrl(block.imagePath),
      })),
    };
  }

  function loadStoryCatalog() {
    context.ensureLibraryStructure();
    const catalog = normalizeStoryCatalog(context.readJsonFile(context.getStoryCatalogPath(), createDefaultStoryCatalog()));
    if (!fs.existsSync(context.getStoryCatalogPath())) saveStoryCatalog(catalog);
    return catalog;
  }

  function saveStoryCatalog(rawCatalog) {
    context.ensureLibraryStructure();
    const catalog = normalizeStoryCatalog(rawCatalog);
    fs.writeFileSync(context.getStoryCatalogPath(), JSON.stringify(catalog, null, 2), 'utf8');
    return catalog;
  }

  function loadStories() {
    context.ensureLibraryStructure();
    return fs
      .readdirSync(context.getStoriesRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(context.getStoriesRoot(), entry.name))
      .filter((storyDirectory) => fs.existsSync(path.join(storyDirectory, 'story.json')))
      .map((storyDirectory) => {
        const story = context.readJsonFile(path.join(storyDirectory, 'story.json'), null);
        return story ? toStoryPayload(storyDirectory, { ...story, libraryDirectory: storyDirectory }) : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function saveStoryJson(rawStory) {
    context.ensureLibraryStructure();
    const story = normalizeStory(rawStory);
    const storyDirectory = story.libraryDirectory || path.join(context.getStoriesRoot(), story.id);
    context.ensureDirectory(storyDirectory);
    context.ensureStoryDirectories(storyDirectory);

    const persistedStory = stripStoryRuntimeUrls({
      ...story,
      libraryDirectory: storyDirectory,
      updatedAt: new Date().toISOString(),
    });

    fs.writeFileSync(path.join(storyDirectory, 'story.json'), JSON.stringify(persistedStory, null, 2), 'utf8');
    return toStoryPayload(storyDirectory, persistedStory);
  }

  async function importStoryImage(rawStory, blockId) {
    const story = normalizeStory(rawStory);
    const storyDirectory = story.libraryDirectory || path.join(context.getStoriesRoot(), story.id);
    context.ensureStoryDirectories(storyDirectory);

    const result = await dialog.showOpenDialog({
      title: '选择故事图片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return toStoryPayload(storyDirectory, story);

    const selectedPath = result.filePaths[0];
    if (!imageExtensions.has(path.extname(selectedPath).toLowerCase())) return toStoryPayload(storyDirectory, story);

    const targetDirectory = path.join(storyDirectory, 'images');
    context.ensureDirectory(targetDirectory);
    const targetPath = context.createUniqueTargetPath(targetDirectory, path.basename(selectedPath));
    fs.copyFileSync(selectedPath, targetPath);

    const nextStory = applyStoryImage(story, targetPath, blockId);
    return saveStoryJson({ ...nextStory, libraryDirectory: storyDirectory });
  }

  function removeStoryImage(rawStory, assetPath) {
    const story = normalizeStory(rawStory);
    const storyDirectory = story.libraryDirectory || path.join(context.getStoriesRoot(), story.id);
    context.safeDeleteFile(storyDirectory, assetPath);

    story.blocks = story.blocks.map((block) =>
      block.imagePath === assetPath ? { ...block, imagePath: undefined, imageFileName: undefined } : block,
    );
    if (story.coverImagePath === assetPath) {
      const nextCoverBlock = story.blocks.find((block) => block.imagePath);
      story.coverImagePath = nextCoverBlock?.imagePath;
      story.coverImageFileName = fileName(nextCoverBlock?.imagePath);
    }

    return saveStoryJson({ ...story, libraryDirectory: storyDirectory });
  }

  function deleteStory(rawStory) {
    const storyDirectory = rawStory.libraryDirectory || path.join(context.getStoriesRoot(), rawStory.id);
    if (fs.existsSync(storyDirectory) && context.isInside(context.getStoriesRoot(), storyDirectory)) {
      fs.rmSync(storyDirectory, { recursive: true, force: true });
    }
    return loadStories();
  }

  return {
    loadStoryCatalog,
    saveStoryCatalog,
    loadStories,
    saveStoryJson,
    importStoryImage,
    removeStoryImage,
    deleteStory,
  };
}

module.exports = { createStoryService };
