const path = require('path');

function createDefaultStoryCatalog() {
  return {
    defaultCategoryId: 'all',
    defaultSortMode: 'updatedAt',
    categories: [
      { id: 'all', name: '全部故事', description: '浏览当前资料库中的图文故事。', tagRules: [] },
    ],
  };
}

function normalizeStoryCatalog(rawCatalog = createDefaultStoryCatalog()) {
  const fallback = createDefaultStoryCatalog();
  const rawCategories = Array.isArray(rawCatalog.categories) && rawCatalog.categories.length
    ? rawCatalog.categories
    : fallback.categories;
  const normalizedCategories = rawCategories
    .filter((category) => category?.id && category?.name)
    .map((category) => ({
      id: String(category.id),
      name: String(category.name),
      description: String(category.description || ''),
      tagRules: Array.isArray(category.tagRules) ? category.tagRules.map(String).filter(Boolean) : [],
    }));
  const hasAll = normalizedCategories.some((category) => category.id === 'all');
  const categories = hasAll ? normalizedCategories : [fallback.categories[0], ...normalizedCategories];

  return {
    defaultCategoryId: typeof rawCatalog.defaultCategoryId === 'string'
      ? rawCatalog.defaultCategoryId
      : fallback.defaultCategoryId,
    defaultSortMode: ['updatedAt', 'createdAt', 'title'].includes(rawCatalog.defaultSortMode)
      ? rawCatalog.defaultSortMode
      : fallback.defaultSortMode,
    categories,
  };
}

function normalizeStory(rawStory) {
  const blocks = Array.isArray(rawStory.blocks) && rawStory.blocks.length
    ? rawStory.blocks.map(normalizeStoryBlock)
    : [normalizeStoryBlock({ id: `block-${Date.now()}`, type: 'paragraph', text: '' })];
  const firstImageBlock = blocks.find((block) => block.imagePath);

  return {
    subtitle: '',
    summary: '',
    categoryIds: [],
    tags: [],
    linkedCharacterIds: [],
    blocks,
    ...rawStory,
    title: rawStory.title || '',
    subtitle: rawStory.subtitle || '',
    summary: rawStory.summary || '',
    categoryIds: Array.isArray(rawStory.categoryIds) ? rawStory.categoryIds.filter(Boolean) : [],
    tags: Array.isArray(rawStory.tags) ? rawStory.tags.map(String).filter(Boolean) : [],
    linkedCharacterIds: Array.isArray(rawStory.linkedCharacterIds)
      ? rawStory.linkedCharacterIds.map(String).filter(Boolean)
      : [],
    blocks,
    coverImagePath: rawStory.coverImagePath || firstImageBlock?.imagePath,
    coverImageFileName: rawStory.coverImageFileName || fileName(rawStory.coverImagePath || firstImageBlock?.imagePath),
    createdAt: rawStory.createdAt || new Date().toISOString(),
    updatedAt: rawStory.updatedAt || new Date().toISOString(),
  };
}

function normalizeStoryBlock(block) {
  return {
    id: block.id || `block-${Date.now()}`,
    type: ['heading', 'paragraph', 'quote', 'image'].includes(block.type) ? block.type : 'paragraph',
    text: block.text || '',
    imagePath: typeof block.imagePath === 'string' ? block.imagePath : undefined,
    imageFileName: block.imageFileName || fileName(block.imagePath),
    caption: block.caption || '',
  };
}

function stripStoryRuntimeUrls(story) {
  const { coverImageUrl, ...persistedStory } = story;
  return {
    ...persistedStory,
    blocks: persistedStory.blocks.map(({ imageUrl, ...block }) => block),
  };
}

function applyStoryImage(story, imagePath, blockId) {
  const imageBlock = {
    id: blockId || `image-${Date.now()}`,
    type: 'image',
    text: '',
    imagePath,
    imageFileName: path.basename(imagePath),
    caption: '',
  };

  const blocks = blockId
    ? story.blocks.map((block) =>
        block.id === blockId ? { ...block, type: 'image', imagePath, imageFileName: path.basename(imagePath) } : block,
      )
    : [...story.blocks, imageBlock];

  return {
    ...story,
    blocks,
    coverImagePath: story.coverImagePath || imagePath,
    coverImageFileName: story.coverImageFileName || path.basename(imagePath),
  };
}

function fileName(filePath) {
  return filePath ? path.basename(filePath) : undefined;
}

module.exports = {
  applyStoryImage,
  createDefaultStoryCatalog,
  fileName,
  normalizeStory,
  normalizeStoryCatalog,
  stripStoryRuntimeUrls,
};
