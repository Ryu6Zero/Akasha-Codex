import { describe, expect, it } from 'vitest';
import type { Character, Story, StoryCategory } from '../types';
import {
  countStoriesByCategory,
  createStoryCategoryId,
  filterStoriesForArchive,
  findBrokenWikiLinks,
  getAvailableStoryTags,
} from './storyQueries';

const categories: StoryCategory[] = [
  { id: 'all', name: 'All', description: '', tagRules: [] },
  { id: 'main', name: 'Main', description: '', tagRules: ['plot'] },
  { id: 'side', name: 'Side', description: '', tagRules: [] },
];

const stories: Story[] = [
  {
    id: 'story-new',
    title: 'New Plot',
    subtitle: '',
    summary: 'main line',
    categoryIds: [],
    tags: ['plot'],
    linkedCharacterIds: [],
    blocks: [{ id: 'block-new', type: 'paragraph', text: 'Hello [[Known]] and [[Missing]]' }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
  {
    id: 'story-old',
    title: 'Old Side',
    subtitle: '',
    summary: '',
    categoryIds: ['side'],
    tags: ['side'],
    linkedCharacterIds: [],
    blocks: [{ id: 'block-old', type: 'paragraph', text: 'Side note' }],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

const characters: Character[] = [
  {
    id: 'known',
    name: 'Known',
    sourceTitle: '',
    aliases: [],
    tags: [],
    collectionIds: [],
    description: '',
    notes: '',
    voicePaths: [],
    voiceAssets: [],
    attachmentPaths: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('storyQueries', () => {
  it('returns available tags in a stable order', () => {
    expect(getAvailableStoryTags(stories)).toEqual(['plot', 'side']);
  });

  it('filters by category tag rules and sorts by updated time', () => {
    const filtered = filterStoriesForArchive({
      stories,
      categories,
      searchQuery: '',
      selectedCategoryId: 'main',
      selectedTag: '',
      sortMode: 'updatedAt',
    });

    expect(filtered.map((story) => story.id)).toEqual(['story-new']);
  });

  it('counts stories by manual category and tag rules', () => {
    const counts = countStoriesByCategory(categories, stories);
    expect(counts.get('all')).toBe(2);
    expect(counts.get('main')).toBe(1);
    expect(counts.get('side')).toBe(1);
  });

  it('creates unique category ids', () => {
    expect(createStoryCategoryId(categories, 'main')).toBe('story-main');
    expect(createStoryCategoryId([{ ...categories[0], id: 'story-main' }], 'main')).toBe('story-main-1');
  });

  it('finds broken wiki links without reporting known entries', () => {
    const brokenLinks = findBrokenWikiLinks(stories, characters);
    expect(brokenLinks).toEqual([
      {
        storyId: 'story-new',
        storyTitle: 'New Plot',
        label: 'Missing',
        blockId: 'block-new',
        field: 'text',
      },
    ]);
  });
});
