import type { CatalogCollection, Character, SortMode } from '../types';

export type CharacterCatalogIndexItem = {
  character: Character;
  searchableText: string;
  collectionIds: Set<string>;
  collectionRuleValues: Set<string>;
  tags: Set<string>;
};

export function buildCharacterCatalogIndex(characters: Character[]): CharacterCatalogIndexItem[] {
  return characters.map((character) => {
    const tags = character.tags || [];
    const collectionIds = character.collectionIds || [];
    const profileFields = character.profileFields || [];

    return {
      character,
      searchableText: [
        character.name,
        character.sourceTitle,
        character.description,
        character.notes,
        ...(character.aliases || []),
        ...tags,
        ...profileFields.flatMap((field) => [field.group, field.label, field.value]),
      ]
        .join(' ')
        .toLowerCase(),
      collectionIds: new Set(collectionIds),
      collectionRuleValues: new Set([...tags, ...collectionIds].map(normalizeRule)),
      tags: new Set(tags),
    };
  });
}

export function getAvailableCharacterTags(characters: Character[]): string[] {
  return getAvailableCharacterTagsFromIndex(buildCharacterCatalogIndex(characters));
}

export function getAvailableCharacterTagsFromIndex(index: CharacterCatalogIndexItem[]): string[] {
  const tags = index.flatMap((item) => item.character.tags || []).filter(Boolean);
  return [...new Set(tags)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function filterCharactersForCatalog({
  characters,
  collections,
  searchQuery,
  selectedCollectionId,
  selectedTag,
  sortMode,
}: {
  characters: Character[];
  collections: CatalogCollection[];
  searchQuery: string;
  selectedCollectionId: string;
  selectedTag: string;
  sortMode: SortMode;
}): Character[] {
  return filterCharacterIndexForCatalog({
    index: buildCharacterCatalogIndex(characters),
    collections,
    searchQuery,
    selectedCollectionId,
    selectedTag,
    sortMode,
  });
}

export function filterCharacterIndexForCatalog({
  index,
  collections,
  searchQuery,
  selectedCollectionId,
  selectedTag,
  sortMode,
}: {
  index: CharacterCatalogIndexItem[];
  collections: CatalogCollection[];
  searchQuery: string;
  selectedCollectionId: string;
  selectedTag: string;
  sortMode: SortMode;
}): Character[] {
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const selectedRules = (selectedCollection?.tagRules || []).map(normalizeRule).filter(Boolean);

  return index
    .filter((item) => {
      const collectionMatch =
        selectedCollectionId === 'all' ||
        item.collectionIds.has(selectedCollectionId) ||
        selectedRules.some((rule) => item.collectionRuleValues.has(rule));
      const tagMatch = selectedTag ? item.tags.has(selectedTag) : true;
      const queryMatch = normalizedQuery ? item.searchableText.includes(normalizedQuery) : true;
      return collectionMatch && tagMatch && queryMatch;
    })
    .sort((a, b) => sortCharacters(a.character, b.character, sortMode))
    .map((item) => item.character);
}

export function countCharactersByCollection(
  collections: CatalogCollection[],
  characters: Character[],
): Map<string, number> {
  return countCharactersByCollectionFromIndex(collections, buildCharacterCatalogIndex(characters));
}

export function countCharactersByCollectionFromIndex(
  collections: CatalogCollection[],
  index: CharacterCatalogIndexItem[],
): Map<string, number> {
  const counts = new Map<string, number>();
  const matchers = collections.map((collection) => ({
    collection,
    rules: collection.tagRules.map(normalizeRule).filter(Boolean),
  }));

  collections.forEach((collection) => counts.set(collection.id, collection.id === 'all' ? index.length : 0));
  index.forEach((item) => {
    matchers.forEach(({ collection, rules }) => {
      if (collection.id === 'all') return;
      if (item.collectionIds.has(collection.id) || rules.some((rule) => item.collectionRuleValues.has(rule))) {
        counts.set(collection.id, (counts.get(collection.id) || 0) + 1);
      }
    });
  });

  return counts;
}

function normalizeRule(value: string): string {
  return value.trim().toLowerCase();
}

function sortCharacters(a: Character, b: Character, sortMode: SortMode): number {
  if (sortMode === 'name') return a.name.localeCompare(b.name, 'zh-CN');
  if (sortMode === 'sourceTitle') return a.sourceTitle.localeCompare(b.sourceTitle, 'zh-CN');
  if (sortMode === 'createdAt' || sortMode === 'createdAtDesc') return b.createdAt.localeCompare(a.createdAt);
  return b.updatedAt.localeCompare(a.updatedAt);
}
