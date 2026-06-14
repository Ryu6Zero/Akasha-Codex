import type { CatalogCollection, Character, SortMode } from '../types';

export function getAvailableCharacterTags(characters: Character[]): string[] {
  const tags = characters.flatMap((character) => character.tags || []).filter(Boolean);
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
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return characters
    .filter((character) => {
      const collectionMatch =
        selectedCollectionId === 'all' ||
        character.collectionIds?.includes(selectedCollectionId) ||
        selectedCollection?.tagRules.some((rule) => characterMatchesCollectionRule(character, rule));
      const tagMatch = selectedTag ? character.tags?.includes(selectedTag) : true;
      const queryMatch = normalizedQuery ? characterMatchesText(character, normalizedQuery) : true;
      return collectionMatch && tagMatch && queryMatch;
    })
    .sort((a, b) => sortCharacters(a, b, sortMode));
}

export function countCharactersByCollection(
  collections: CatalogCollection[],
  characters: Character[],
): Map<string, number> {
  const counts = new Map<string, number>();
  collections.forEach((collection) => {
    const count =
      collection.id === 'all'
        ? characters.length
        : characters.filter(
            (character) =>
              character.collectionIds?.includes(collection.id) ||
              collection.tagRules.some((rule) => characterMatchesCollectionRule(character, rule)),
          ).length;
    counts.set(collection.id, count);
  });
  return counts;
}

function characterMatchesText(character: Character, normalizedQuery: string): boolean {
  const searchableText = [
    character.name,
    character.sourceTitle,
    character.description,
    character.notes,
    ...(character.aliases || []),
    ...(character.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function characterMatchesCollectionRule(character: Character, rule: string): boolean {
  const normalizedRule = rule.trim().toLowerCase();
  if (!normalizedRule) return false;
  return [...(character.tags || []), ...(character.collectionIds || [])].some((value) =>
    value.toLowerCase() === normalizedRule,
  );
}

function sortCharacters(a: Character, b: Character, sortMode: SortMode): number {
  if (sortMode === 'name') return a.name.localeCompare(b.name, 'zh-CN');
  if (sortMode === 'sourceTitle') return a.sourceTitle.localeCompare(b.sourceTitle, 'zh-CN');
  if (sortMode === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
  return b.updatedAt.localeCompare(a.updatedAt);
}
