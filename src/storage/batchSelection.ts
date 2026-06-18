type SelectableItem = {
  id: string;
};

export function selectItemIds(items: SelectableItem[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

export function pruneSelectedIdsToItems(selectedIds: Set<string>, visibleItems: SelectableItem[]): Set<string> {
  const visibleIds = selectItemIds(visibleItems);
  const nextIds = new Set([...selectedIds].filter((id) => visibleIds.has(id)));
  return nextIds.size === selectedIds.size ? selectedIds : nextIds;
}

export function getSelectedVisibleItems<T extends SelectableItem>(selectedIds: Set<string>, visibleItems: T[]): T[] {
  return visibleItems.filter((item) => selectedIds.has(item.id));
}

export function getNextVisibleSelectedIdAfterDelete(
  visibleItems: SelectableItem[],
  deletedIds: Set<string>,
  currentSelectedId: string | null,
): string | null {
  if (currentSelectedId && !deletedIds.has(currentSelectedId)) {
    const currentStillVisible = visibleItems.some((item) => item.id === currentSelectedId);
    if (currentStillVisible) return currentSelectedId;
  }

  return visibleItems.find((item) => !deletedIds.has(item.id))?.id ?? null;
}
