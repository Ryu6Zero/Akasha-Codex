import { describe, expect, it } from 'vitest';
import type { CatalogCollection, Character } from '../types';
import {
  buildCharacterCatalogIndex,
  countCharactersByCollectionFromIndex,
  filterCharacterIndexForCatalog,
  filterCharactersForCatalog,
  getAvailableCharacterTagsFromIndex,
} from './characterQueries';

const collections: CatalogCollection[] = [
  { id: 'all', name: 'All', description: '', tagRules: [] },
  { id: 'manual', name: 'Manual', description: '', tagRules: [] },
  { id: 'rule-fire', name: 'Fire', description: '', tagRules: ['fire'] },
];

const performanceCollections: CatalogCollection[] = [
  { id: 'all', name: 'All', description: '', tagRules: [] },
  { id: 'manual', name: 'Manual', description: '', tagRules: [] },
  { id: 'source-even', name: 'Even Source', description: '', tagRules: ['even-source'] },
  { id: 'source-odd', name: 'Odd Source', description: '', tagRules: ['odd-source'] },
  { id: 'element-fire', name: 'Fire', description: '', tagRules: ['fire'] },
  { id: 'element-ice', name: 'Ice', description: '', tagRules: ['ice'] },
  { id: 'role-lead', name: 'Lead', description: '', tagRules: ['lead'] },
  { id: 'role-support', name: 'Support', description: '', tagRules: ['support'] },
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

  it('filters and counts through a reusable character index', () => {
    const characters: Character[] = [
      {
        ...baseCharacter,
        id: 'amiya',
        name: 'Amiya',
        sourceTitle: 'Arknights',
        aliases: ['Leader'],
        tags: ['caster', 'fire'],
        collectionIds: [],
        notes: 'Rhodes Island',
      },
      {
        ...baseCharacter,
        id: 'mash',
        name: 'Mash',
        sourceTitle: 'FGO',
        tags: ['shield'],
        collectionIds: ['manual'],
      },
    ];
    const index = buildCharacterCatalogIndex(characters);

    expect(getAvailableCharacterTagsFromIndex(index)).toEqual(['caster', 'fire', 'shield']);
    expect(countCharactersByCollectionFromIndex(collections, index).get('rule-fire')).toBe(1);
    expect(countCharactersByCollectionFromIndex(collections, index).get('manual')).toBe(1);
    expect(
      filterCharacterIndexForCatalog({
        index,
        collections,
        searchQuery: 'rhodes',
        selectedCollectionId: 'rule-fire',
        selectedTag: 'caster',
        sortMode: 'updatedAt',
      }).map((character) => character.id),
    ).toEqual(['amiya']);
  });

  it('keeps indexed catalog queries correct with 10000 character summaries', () => {
    const characters = createLargeCharacterFixture();
    const index = buildCharacterCatalogIndex(characters);

    expect(countCharactersByCollectionFromIndex(collections, index).get('all')).toBe(10000);
    expect(countCharactersByCollectionFromIndex(collections, index).get('manual')).toBe(400);
    expect(
      filterCharacterIndexForCatalog({
        index,
        collections,
        searchQuery: 'needle',
        selectedCollectionId: 'all',
        selectedTag: '',
        sortMode: 'updatedAt',
      }).map((character) => character.id),
    ).toEqual(['character-9999']);
  });

  it('keeps representative 10000 character catalog operations under 200ms', () => {
    const characters = createLargeCharacterFixture();
    const index = buildCharacterCatalogIndex(characters);

    const collectionCountMs = measure(() => countCharactersByCollectionFromIndex(performanceCollections, index));
    const searchMs = measure(() =>
      filterCharacterIndexForCatalog({
        index,
        collections: performanceCollections,
        searchQuery: 'needle',
        selectedCollectionId: 'all',
        selectedTag: '',
        sortMode: 'updatedAt',
      }),
    );
    const tagFilterMs = measure(() =>
      filterCharacterIndexForCatalog({
        index,
        collections: performanceCollections,
        searchQuery: '',
        selectedCollectionId: 'all',
        selectedTag: 'fire',
        sortMode: 'updatedAt',
      }),
    );
    const collectionFilterMs = measure(() =>
      filterCharacterIndexForCatalog({
        index,
        collections: performanceCollections,
        searchQuery: '',
        selectedCollectionId: 'source-even',
        selectedTag: '',
        sortMode: 'name',
      }),
    );

    expect(collectionCountMs).toBeLessThan(200);
    expect(searchMs).toBeLessThan(200);
    expect(tagFilterMs).toBeLessThan(200);
    expect(collectionFilterMs).toBeLessThan(200);
  });
});

function createLargeCharacterFixture(): Character[] {
  return Array.from({ length: 10000 }, (_, index): Character => {
    const isEven = index % 2 === 0;
    const isFire = index % 10 === 0;
    const role = index % 3 === 0 ? 'lead' : 'support';

    return {
      ...baseCharacter,
      id: `character-${index}`,
      name: `Character ${String(index).padStart(5, '0')}`,
      sourceTitle: isEven ? 'Even Source' : 'Odd Source',
      aliases: [`Alias ${index}`, `Codename ${index % 500}`],
      tags: [
        isEven ? 'even-source' : 'odd-source',
        isFire ? 'fire' : 'ice',
        role,
        index % 7 === 0 ? 'target' : 'background',
      ],
      collectionIds: index % 25 === 0 ? ['manual'] : [],
      description: `Representative profile text ${index} with faction ${index % 13}`,
      notes: index === 9999 ? 'needle entry' : `relationship note ${index % 29}`,
      createdAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      updatedAt: `2026-02-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
    };
  });
}

function measure(callback: () => unknown): number {
  const start = performance.now();
  callback();
  return performance.now() - start;
}
