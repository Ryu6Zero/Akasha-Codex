import { describe, expect, it } from 'vitest';
import {
  getNextVisibleSelectedIdAfterDelete,
  getSelectedVisibleItems,
  pruneSelectedIdsToItems,
  selectItemIds,
} from './batchSelection';

describe('batchSelection', () => {
  it('selects ids from the current visible items', () => {
    expect([...selectItemIds([{ id: 'amiya' }, { id: 'kaltsit' }])]).toEqual(['amiya', 'kaltsit']);
  });

  it('prunes selected ids that are no longer visible', () => {
    const selectedIds = new Set(['amiya', 'kaltsit', 'logos']);

    expect([...pruneSelectedIdsToItems(selectedIds, [{ id: 'kaltsit' }, { id: 'logos' }])]).toEqual([
      'kaltsit',
      'logos',
    ]);
  });

  it('keeps the same set reference when nothing changes', () => {
    const selectedIds = new Set(['amiya']);

    expect(pruneSelectedIdsToItems(selectedIds, [{ id: 'amiya' }])).toBe(selectedIds);
  });

  it('builds a delete target only from currently visible selected items', () => {
    const selectedIds = new Set(['amiya', 'hidden']);

    expect(getSelectedVisibleItems(selectedIds, [{ id: 'amiya' }, { id: 'kaltsit' }])).toEqual([{ id: 'amiya' }]);
  });

  it('keeps the current visible selection when it is not deleted', () => {
    expect(
      getNextVisibleSelectedIdAfterDelete([{ id: 'amiya' }, { id: 'kaltsit' }], new Set(['amiya']), 'kaltsit'),
    ).toBe('kaltsit');
  });

  it('moves to the next visible item after the current selection is deleted', () => {
    expect(
      getNextVisibleSelectedIdAfterDelete(
        [{ id: 'amiya' }, { id: 'kaltsit' }, { id: 'logos' }],
        new Set(['amiya', 'kaltsit']),
        'kaltsit',
      ),
    ).toBe('logos');
  });

  it('returns null when a batch delete clears the visible result set', () => {
    expect(getNextVisibleSelectedIdAfterDelete([{ id: 'amiya' }], new Set(['amiya']), 'amiya')).toBeNull();
  });
});
