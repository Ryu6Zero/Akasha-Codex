import type { Character, Story, StoryBacklink, StoryBlock, StoryCatalogMetadata } from '../types';

export function createStoryBlock(type: StoryBlock['type'] = 'paragraph'): StoryBlock {
  return {
    id: crypto.randomUUID(),
    type,
    text: '',
  };
}

export function createEmptyStory(categoryId = 'all'): Story {
  const now = new Date().toISOString();

  return normalizeStory({
    id: crypto.randomUUID(),
    title: '',
    subtitle: '',
    summary: '',
    categoryIds: categoryId === 'all' ? [] : [categoryId],
    tags: [],
    linkedCharacterIds: [],
    blocks: [createStoryBlock('paragraph')],
    createdAt: now,
    updatedAt: now,
  });
}

export function normalizeStory(story: Partial<Story> & Pick<Story, 'id'>): Story {
  const blocks = Array.isArray(story.blocks) && story.blocks.length
    ? story.blocks.map(normalizeStoryBlock)
    : [createStoryBlock('paragraph')];

  return {
    ...story,
    id: story.id,
    title: story.title || '',
    subtitle: story.subtitle || '',
    summary: story.summary || '',
    categoryIds: Array.isArray(story.categoryIds) ? story.categoryIds.filter(Boolean) : [],
    tags: normalizeList(story.tags),
    linkedCharacterIds: normalizeList(story.linkedCharacterIds),
    blocks,
    coverImagePath: story.coverImagePath || firstImagePath(blocks),
    coverImageFileName: story.coverImageFileName || fileName(story.coverImagePath || firstImagePath(blocks) || ''),
    createdAt: story.createdAt || new Date().toISOString(),
    updatedAt: story.updatedAt || new Date().toISOString(),
  };
}

export function normalizeStoryCatalog(catalog: StoryCatalogMetadata): StoryCatalogMetadata {
  const categories = Array.isArray(catalog.categories) && catalog.categories.length
    ? catalog.categories
    : [{ id: 'all', name: '全部故事', description: '', tagRules: [] }];
  const hasAll = categories.some((category) => category.id === 'all');
  const normalizedCategories = (hasAll ? categories : [{ id: 'all', name: '全部故事', description: '', tagRules: [] }, ...categories])
    .filter((category) => category.id && category.name)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || '',
      tagRules: normalizeList(category.tagRules),
    }));

  return {
    defaultCategoryId: catalog.defaultCategoryId || 'all',
    defaultSortMode: catalog.defaultSortMode || 'updatedAt',
    categories: normalizedCategories,
  };
}

export function deriveStoryLinkedCharacterIds(story: Story, characters: Character[]): string[] {
  const linkedIds = new Set(normalizeList(story.linkedCharacterIds));
  const labels = story.blocks.flatMap((block) => [
    ...collectWikiLinkLabels(block.text),
    ...collectWikiLinkLabels(block.caption || ''),
  ]);

  labels.forEach((label) => {
    const character = findCharacterByWikiLabel(characters, label);
    if (character) linkedIds.add(character.id);
  });

  return [...linkedIds].filter((id) => characters.some((character) => character.id === id));
}

export function collectWikiLinkLabels(value = ''): string[] {
  const labels: string[] = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    const label = match[1].trim();
    if (label) labels.push(label);
  }

  return labels;
}

export function findCharacterByWikiLabel(characters: Character[], label: string): Character | undefined {
  const normalizedLabel = normalizeLabel(label);
  return characters.find((character) => {
    const labels = [character.id, character.name, ...(character.aliases || [])].map(normalizeLabel);
    return labels.includes(normalizedLabel);
  });
}

export function getStoryBacklinks(character: Character, stories: Story[], characters: Character[]): StoryBacklink[] {
  return stories
    .filter((story) => deriveStoryLinkedCharacterIds(story, characters).includes(character.id))
    .map((story) => ({
      storyId: story.id,
      storyTitle: story.title || '未命名故事',
      excerpt: storyReferenceExcerpt(story, character),
    }));
}

export function storyText(story: Story): string {
  return [
    story.title,
    story.subtitle,
    story.summary,
    ...(story.tags || []),
    ...story.blocks.flatMap((block) => [block.text, block.caption || '']),
  ]
    .join(' ')
    .toLowerCase();
}

export function stripStoryUrls(story: Story): Story {
  const { coverImageUrl, ...persisted } = story;
  return {
    ...persisted,
    blocks: persisted.blocks.map(({ imageUrl, ...block }) => block),
  };
}

export function applyStoryImage(story: Story, imagePath: string, blockId?: string): Story {
  const imageBlock: StoryBlock = {
    id: blockId || crypto.randomUUID(),
    type: 'image',
    text: '',
    imagePath,
    imageFileName: fileName(imagePath),
    caption: '',
  };

  const blocks = blockId
    ? story.blocks.map((block) =>
        block.id === blockId ? { ...block, type: 'image' as const, imagePath, imageFileName: fileName(imagePath) } : block,
      )
    : [...story.blocks, imageBlock];

  return {
    ...story,
    blocks,
    coverImagePath: story.coverImagePath || imagePath,
    coverImageFileName: story.coverImageFileName || fileName(imagePath),
  };
}

function normalizeStoryBlock(block: StoryBlock): StoryBlock {
  return {
    ...block,
    id: block.id || crypto.randomUUID(),
    type: block.type || 'paragraph',
    text: block.text || '',
    caption: block.caption || '',
    imageFileName: block.imageFileName || fileName(block.imagePath || ''),
  };
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))];
}

function firstImagePath(blocks: StoryBlock[]): string | undefined {
  return blocks.find((block) => block.imagePath)?.imagePath;
}

function storyReferenceExcerpt(story: Story, character: Character): string {
  const labels = [character.name, ...(character.aliases || [])].filter(Boolean);
  const block = story.blocks.find((candidate) =>
    labels.some((label) => candidate.text.includes(`[[${label}]]`) || (candidate.caption || '').includes(`[[${label}]]`)),
  );
  const source = block?.text || block?.caption || story.summary || story.subtitle || '';
  return source.replace(/\s+/g, ' ').slice(0, 120);
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function fileName(filePath: string): string | undefined {
  if (!filePath) return undefined;
  return filePath.split(/[\\/]/).pop() || filePath;
}
