import type { BrokenWikiLink, Character, Story, StoryCatalogMetadata, StoryCategory, StorySortMode } from '../types';
import { buildCharacterWikiIndex, collectWikiLinkLabels, findCharacterByWikiLabelFromIndex, storyText } from './storyStore';

export type StoryArchiveFilter = {
  stories: Story[];
  categories: StoryCategory[];
  searchQuery: string;
  selectedCategoryId: string;
  selectedTag: string;
  sortMode: StorySortMode;
};

export function getAvailableStoryTags(stories: Story[]): string[] {
  return [...new Set(stories.flatMap((story) => story.tags))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function filterStoriesForArchive({
  stories,
  categories,
  searchQuery,
  selectedCategoryId,
  selectedTag,
  sortMode,
}: StoryArchiveFilter): Story[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  return stories
    .filter((story) => {
      const categoryMatch =
        selectedCategoryId === 'all' ||
        story.categoryIds.includes(selectedCategoryId) ||
        Boolean(selectedCategory?.tagRules.some((rule) => story.tags.includes(rule)));
      const tagMatch = selectedTag ? story.tags.includes(selectedTag) : true;
      const queryMatch = normalizedQuery ? storyText(story).includes(normalizedQuery) : true;
      return categoryMatch && tagMatch && queryMatch;
    })
    .sort((a, b) => sortStories(a, b, sortMode));
}

export function countStoriesByCategory(categories: StoryCategory[], stories: Story[]): Map<string, number> {
  const counts = new Map<string, number>();
  categories.forEach((category) => {
    const count = category.id === 'all'
      ? stories.length
      : stories.filter((story) => story.categoryIds.includes(category.id) || category.tagRules.some((rule) => story.tags.includes(rule))).length;
    counts.set(category.id, count);
  });
  return counts;
}

export function sortStories(a: Story, b: Story, sortMode: StorySortMode): number {
  if (sortMode === 'title') return a.title.localeCompare(b.title, 'zh-CN');
  if (sortMode === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function createStoryCategoryId(categories: StoryCategory[], seed = Date.now().toString(36)): string {
  const existingIds = new Set(categories.map((category) => category.id));
  let id = `story-${seed}`;
  let index = 1;
  while (existingIds.has(id)) {
    id = `story-${seed}-${index}`;
    index += 1;
  }
  return id;
}

export function findBrokenWikiLinks(stories: Story[], characters: Character[]): BrokenWikiLink[] {
  return findBrokenWikiLinksWithIndex(stories, buildCharacterWikiIndex(characters));
}

export function findBrokenWikiLinksWithIndex(
  stories: Story[],
  characterWikiIndex: Map<string, Character>,
): BrokenWikiLink[] {
  return stories.flatMap((story) => {
    const links = story.blocks.flatMap((block) => [
      ...collectWikiLinkLabels(block.text).map((label) => ({ label, blockId: block.id, field: 'text' as const })),
      ...collectWikiLinkLabels(block.caption || '').map((label) => ({ label, blockId: block.id, field: 'caption' as const })),
    ]);

    return links
      .filter(({ label }) => !findCharacterByWikiLabelFromIndex(characterWikiIndex, label))
      .map(({ label, blockId, field }) => ({
        storyId: story.id,
        storyTitle: story.title || 'Untitled story',
        label,
        blockId,
        field,
      }));
  });
}

export function duplicateStoryCategoryNames(catalog: StoryCatalogMetadata): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  catalog.categories.forEach((category) => {
    const name = category.name.trim().toLowerCase();
    if (!name) return;
    if (seen.has(name)) duplicates.add(category.name.trim());
    seen.add(name);
  });
  return [...duplicates];
}
