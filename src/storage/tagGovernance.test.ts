import { describe, expect, it } from 'vitest';
import type { CatalogMetadata, Character } from '../types';
import {
  applyTagMerge,
  applyUnusedTagRuleDelete,
  buildCharacterTagGovernanceIndex,
} from './tagGovernance';

const baseCharacter: Character = {
  id: 'char-a',
  name: 'Amiya',
  sourceTitle: 'Arknights',
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

const catalog: CatalogMetadata = {
  defaultCollectionId: 'all',
  defaultSortMode: 'updatedAt',
  collections: [
    { id: 'all', name: '全部角色', description: '', tagRules: [] },
    { id: 'fire', name: 'Fire', description: '', tagRules: ['Fire', 'unused'] },
    { id: 'caster', name: 'Caster', description: '', tagRules: ['caster'] },
  ],
};

describe('tagGovernance', () => {
  it('builds tag usage counts and marks collection-rule-only tags as invalid', () => {
    const index = buildCharacterTagGovernanceIndex(
      [
        { ...baseCharacter, id: 'char-a', tags: ['fire', 'caster'] },
        { ...baseCharacter, id: 'char-b', tags: ['Fire', 'lead'] },
      ],
      catalog,
    );

    expect(index.find((item) => item.tag === 'fire')).toMatchObject({
      characterCount: 2,
      collectionRuleCount: 1,
      isInvalidRule: false,
    });
    expect(index.find((item) => item.tag === 'unused')).toMatchObject({
      characterCount: 0,
      collectionRuleCount: 1,
      isInvalidRule: true,
    });
  });

  it('merges tags across characters and collection rules without duplicates', () => {
    const result = applyTagMerge(
      [
        { ...baseCharacter, id: 'char-a', tags: ['fire', 'lead'] },
        { ...baseCharacter, id: 'char-b', tags: ['Fire', '火', 'support'] },
      ],
      catalog,
      'Fire',
      '火',
    );

    expect(result.changedCharacterIds).toEqual(['char-a', 'char-b']);
    expect(result.changedCollectionIds).toEqual(['fire']);
    expect(result.characters.map((character) => character.tags)).toEqual([
      ['火', 'lead'],
      ['火', 'support'],
    ]);
    expect(result.catalog.collections.find((collection) => collection.id === 'fire')?.tagRules).toEqual(['火', 'unused']);
  });

  it('deletes only unused collection tag rules', () => {
    const characters = [{ ...baseCharacter, id: 'char-a', tags: ['fire'] }];
    const result = applyUnusedTagRuleDelete(characters, catalog, 'unused');

    expect(result.changedCharacterIds).toEqual([]);
    expect(result.changedCollectionIds).toEqual(['fire']);
    expect(result.catalog.collections.find((collection) => collection.id === 'fire')?.tagRules).toEqual(['Fire']);
  });

  it('blocks deletion of character-used tags', () => {
    expect(() =>
      applyUnusedTagRuleDelete([{ ...baseCharacter, id: 'char-a', tags: ['fire'] }], catalog, 'fire'),
    ).toThrow('仍被角色使用的标签不能删除');
  });

  it('rejects empty or same merge targets', () => {
    expect(() => applyTagMerge([], catalog, 'fire', ' fire ')).toThrow('源标签和目标标签必须不同');
    expect(() => applyTagMerge([], catalog, 'fire', ' ')).toThrow('目标标签不能为空');
  });
});
