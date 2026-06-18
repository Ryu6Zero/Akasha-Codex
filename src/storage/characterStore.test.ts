import { describe, expect, it } from 'vitest';
import { normalizeCharacter, normalizeProfileFields } from './characterStore';

describe('characterStore', () => {
  it('normalizes structured profile fields and removes empty or duplicate rows', () => {
    expect(
      normalizeProfileFields([
        { id: '', group: '官方', label: ' CV ', value: ' 田中理惠 ' },
        { id: 'duplicate', group: '来源', label: 'cv', value: '田中理惠' },
        { id: 'missing-value', label: '画师', value: '' },
        { id: 'rarity', label: '稀有度', value: 'SSR' },
      ]),
    ).toEqual([
      { id: 'profile-1', group: '官方', label: 'CV', value: '田中理惠' },
      { id: 'rarity', label: '稀有度', value: 'SSR' },
    ]);
  });

  it('keeps user description and notes separate from structured profile fields', () => {
    const character = normalizeCharacter({
      id: 'alice',
      name: 'Alice',
      sourceTitle: 'Wonder Archive',
      description: '用户手写简介，不应被官方字段覆盖。',
      notes: '个人维护备注。',
      profileFields: [
        { id: 'cv', group: '官方', label: 'CV', value: '示例声优' },
        { id: 'artist', group: '制作', label: '画师', value: '示例画师' },
      ],
    });

    expect(character.description).toBe('用户手写简介，不应被官方字段覆盖。');
    expect(character.notes).toBe('个人维护备注。');
    expect(character.profileFields).toEqual([
      { id: 'cv', group: '官方', label: 'CV', value: '示例声优' },
      { id: 'artist', group: '制作', label: '画师', value: '示例画师' },
    ]);
  });
});
