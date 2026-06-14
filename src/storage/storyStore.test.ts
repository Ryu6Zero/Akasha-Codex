import { describe, expect, it } from 'vitest';
import type { Character, Story } from '../types';
import {
  collectWikiLinkLabels,
  deriveStoryLinkedCharacterIds,
  getStoryBacklinks,
  normalizeStory,
} from './storyStore';

const baseCharacter: Character = {
  id: 'char-a',
  name: 'Mash',
  sourceTitle: 'FGO',
  aliases: ['Shielder'],
  tags: [],
  collectionIds: [],
  description: '',
  notes: '',
  voicePaths: [],
  voiceAssets: [],
  attachmentPaths: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseStory: Story = {
  id: 'story-a',
  title: 'Singularity',
  subtitle: '',
  summary: '',
  categoryIds: [],
  tags: [],
  linkedCharacterIds: [],
  blocks: [
    {
      id: 'block-a',
      type: 'paragraph',
      text: 'A story about [[Shielder]].',
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('storyStore knowledge links', () => {
  it('normalizes story lists and derives cover data from the first image block', () => {
    const story = normalizeStory({
      ...baseStory,
      tags: [' lore ', 'lore', ''],
      linkedCharacterIds: ['char-a', 'char-a', ''],
      blocks: [
        ...baseStory.blocks,
        { id: 'image-a', type: 'image', text: '', imagePath: 'library/stories/story-a/images/a.png' },
      ],
    });

    expect(story.tags).toEqual(['lore']);
    expect(story.linkedCharacterIds).toEqual(['char-a']);
    expect(story.coverImagePath).toBe('library/stories/story-a/images/a.png');
  });

  it('collects wiki labels and derives linked character ids from aliases', () => {
    expect(collectWikiLinkLabels('[[Mash]] and [[ Shielder ]]')).toEqual(['Mash', 'Shielder']);
    expect(deriveStoryLinkedCharacterIds(baseStory, [baseCharacter])).toEqual(['char-a']);
  });

  it('builds backlinks from inline wiki links', () => {
    const backlinks = getStoryBacklinks(baseCharacter, [baseStory], [baseCharacter]);
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0]).toMatchObject({ storyId: 'story-a', storyTitle: 'Singularity' });
    expect(backlinks[0].excerpt).toContain('[[Shielder]]');
  });
});
