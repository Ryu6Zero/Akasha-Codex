import { describe, expect, it } from 'vitest';
import type { CatalogCollection, Character } from '../types';
import { filterCharactersForCatalog } from './characterQueries';

const collections: CatalogCollection[] = [
  { id: 'all', name: 'All', description: '', tagRules: [] },
];

const baseCharacter: Character = {
  id: 'base',
  name: 'Base',
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
};

describe('characterQueries', () => {
  it('sorts characters by creation time descending', () => {
    const characters: Character[] = [
      {
        ...baseCharacter,
        id: 'old',
        name: 'Old',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        ...baseCharacter,
        id: 'new',
        name: 'New',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
      {
        ...baseCharacter,
        id: 'middle',
        name: 'Middle',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ];

    const filtered = filterCharactersForCatalog({
      characters,
      collections,
      searchQuery: '',
      selectedCollectionId: 'all',
      selectedTag: '',
      sortMode: 'createdAtDesc',
    });

    expect(filtered.map((character) => character.id)).toEqual(['new', 'middle', 'old']);
  });
});
