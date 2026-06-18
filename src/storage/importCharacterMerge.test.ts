import { describe, expect, it } from 'vitest';

declare function require(path: string): unknown;

type ProfileField = {
  id: string;
  label: string;
  value: string;
  group?: string;
};

type ImportCharacterMerge = {
  createProfileFields: (group: string, entries: string[][], prefix?: string) => ProfileField[];
  mergeImportedCharacter: (existingCharacter: Record<string, unknown> | null, incomingCharacter: Record<string, unknown>) => Record<string, unknown>;
  mergeProfileFields: (existingFields: ProfileField[], incomingFields: ProfileField[]) => ProfileField[];
};

const {
  createProfileFields,
  mergeImportedCharacter,
  mergeProfileFields,
} = require('../../tools/character-import-merge.cjs') as ImportCharacterMerge;

describe('importCharacterMerge', () => {
  it('preserves user description and notes while merging imported metadata', () => {
    const merged = mergeImportedCharacter(
      {
        id: 'amiya',
        description: '用户手写简介',
        notes: '用户维护备注',
        tags: ['手动标签'],
        collectionIds: ['manual'],
        portraitPaths: ['old.png'],
        profileFields: [{ id: 'custom-field', label: '个人评价', value: '喜欢' }],
        externalRefs: [{ provider: 'manual', gameId: 'local' }],
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'amiya',
        description: '导入简介',
        notes: '导入备注',
        tags: ['导入标签'],
        collectionIds: ['arknights'],
        portraitPaths: ['old.png', 'new.png'],
        profileFields: [{ id: 'imported-official-cv', group: '官方', label: 'CV', value: '黑泽朋世' }],
        externalRefs: [{ provider: 'bwiki', gameId: 'amiya' }],
        updatedAt: '2026-02-01T00:00:00.000Z',
      },
    );

    expect(merged.description).toBe('用户手写简介');
    expect(merged.notes).toBe('用户维护备注');
    expect(merged.tags).toEqual(['手动标签', '导入标签']);
    expect(merged.collectionIds).toEqual(['manual', 'arknights']);
    expect(merged.portraitPaths).toEqual(['old.png', 'new.png']);
    expect(merged.profileFields).toEqual([
      { id: 'custom-field', label: '个人评价', value: '喜欢' },
      { id: 'imported-official-cv', group: '官方', label: 'CV', value: '黑泽朋世' },
    ]);
    expect(merged.externalRefs).toEqual([
      { provider: 'manual', gameId: 'local' },
      { provider: 'bwiki', gameId: 'amiya' },
    ]);
    expect(merged.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(merged.updatedAt).toBe('2026-02-01T00:00:00.000Z');
  });

  it('refreshes imported fields by stable id and keeps custom fields', () => {
    expect(
      mergeProfileFields(
        [
          { id: 'imported-official-rarity', group: '官方', label: '稀有度', value: 'SR' },
          { id: 'custom-comment', label: '自定义', value: '保留' },
        ],
        [
          { id: 'imported-official-rarity', group: '官方', label: '稀有度', value: 'SSR' },
          { id: 'imported-official-cv', group: '官方', label: 'CV', value: '示例声优' },
        ],
      ),
    ).toEqual([
      { id: 'imported-official-rarity', group: '官方', label: '稀有度', value: 'SSR' },
      { id: 'custom-comment', label: '自定义', value: '保留' },
      { id: 'imported-official-cv', group: '官方', label: 'CV', value: '示例声优' },
    ]);
  });

  it('creates stable imported profile field ids', () => {
    expect(createProfileFields('官方', [['CV', '示例声优'], ['空字段', '']], 'nikke')).toEqual([
      { id: 'imported-nikke-cv', group: '官方', label: 'CV', value: '示例声优' },
    ]);
  });
});
