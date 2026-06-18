import type { CatalogMetadata, Character } from '../types';

export type TagGovernanceItem = {
  tag: string;
  characterCount: number;
  collectionRuleCount: number;
  characterIds: string[];
  collectionIds: string[];
  isInvalidRule: boolean;
};

export type TagGovernanceMutation = {
  characters: Character[];
  catalog: CatalogMetadata;
  changedCharacterIds: string[];
  changedCollectionIds: string[];
};

export function buildCharacterTagGovernanceIndex(
  characters: Character[],
  catalog: CatalogMetadata,
): TagGovernanceItem[] {
  const itemsByKey = new Map<string, TagGovernanceItem>();

  characters.forEach((character) => {
    const characterTags = uniqueTagList(character.tags || []);
    characterTags.forEach((tag) => {
      const item = ensureTagItem(itemsByKey, tag);
      item.characterCount += 1;
      item.characterIds.push(character.id);
    });
  });

  catalog.collections.forEach((collection) => {
    const tagRules = uniqueTagList(collection.tagRules || []);
    tagRules.forEach((tag) => {
      const item = ensureTagItem(itemsByKey, tag);
      item.collectionRuleCount += 1;
      item.collectionIds.push(collection.id);
    });
  });

  return [...itemsByKey.values()]
    .map((item) => ({
      ...item,
      characterIds: unique(item.characterIds),
      collectionIds: unique(item.collectionIds),
      isInvalidRule: item.characterCount === 0 && item.collectionRuleCount > 0,
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'zh-CN'));
}

export function applyTagMerge(
  characters: Character[],
  catalog: CatalogMetadata,
  sourceTag: string,
  targetTag: string,
): TagGovernanceMutation {
  const source = normalizeTagInput(sourceTag);
  const target = normalizeTagInput(targetTag);

  assertMergeInput(source, target);

  const changedCharacterIds: string[] = [];
  const nextCharacters = characters.map((character) => {
    const nextTags = replaceTag(character.tags || [], source, target);
    if (areSameList(nextTags, character.tags || [])) return character;

    changedCharacterIds.push(character.id);
    return {
      ...character,
      tags: nextTags,
      updatedAt: new Date().toISOString(),
    };
  });

  const changedCollectionIds: string[] = [];
  const nextCollections = catalog.collections.map((collection) => {
    const nextRules = replaceTag(collection.tagRules || [], source, target);
    if (areSameList(nextRules, collection.tagRules || [])) return collection;

    changedCollectionIds.push(collection.id);
    return { ...collection, tagRules: nextRules };
  });

  return {
    characters: nextCharacters,
    catalog: { ...catalog, collections: nextCollections },
    changedCharacterIds,
    changedCollectionIds,
  };
}

export function applyUnusedTagRuleDelete(
  characters: Character[],
  catalog: CatalogMetadata,
  tag: string,
): TagGovernanceMutation {
  const target = normalizeTagInput(tag);
  if (!target) throw new Error('标签不能为空');

  const indexItem = buildCharacterTagGovernanceIndex(characters, catalog).find(
    (item) => normalizeTagKey(item.tag) === normalizeTagKey(target),
  );
  if ((indexItem?.characterCount || 0) > 0) {
    throw new Error('仍被角色使用的标签不能删除');
  }

  const changedCollectionIds: string[] = [];
  const nextCollections = catalog.collections.map((collection) => {
    const nextRules = removeTag(collection.tagRules || [], target);
    if (areSameList(nextRules, collection.tagRules || [])) return collection;

    changedCollectionIds.push(collection.id);
    return { ...collection, tagRules: nextRules };
  });

  return {
    characters,
    catalog: { ...catalog, collections: nextCollections },
    changedCharacterIds: [],
    changedCollectionIds,
  };
}

function ensureTagItem(itemsByKey: Map<string, TagGovernanceItem>, tag: string): TagGovernanceItem {
  const key = normalizeTagKey(tag);
  const existing = itemsByKey.get(key);
  if (existing) return existing;

  const item: TagGovernanceItem = {
    tag,
    characterCount: 0,
    collectionRuleCount: 0,
    characterIds: [],
    collectionIds: [],
    isInvalidRule: false,
  };
  itemsByKey.set(key, item);
  return item;
}

function replaceTag(tags: string[], source: string, target: string): string[] {
  const sourceKey = normalizeTagKey(source);
  const targetKey = normalizeTagKey(target);
  const nextTags = tags.map((tag) => (normalizeTagKey(tag) === sourceKey || normalizeTagKey(tag) === targetKey ? target : tag));
  return uniqueTagList(nextTags);
}

function removeTag(tags: string[], tagToRemove: string): string[] {
  const removeKey = normalizeTagKey(tagToRemove);
  return uniqueTagList(tags.filter((tag) => normalizeTagKey(tag) !== removeKey));
}

function assertMergeInput(source: string, target: string): void {
  if (!source) throw new Error('源标签不能为空');
  if (!target) throw new Error('目标标签不能为空');
  if (normalizeTagKey(source) === normalizeTagKey(target)) throw new Error('源标签和目标标签必须不同');
}

function uniqueTagList(tags: string[]): string[] {
  const seenKeys = new Set<string>();
  const result: string[] = [];

  tags
    .map(normalizeTagInput)
    .filter(Boolean)
    .forEach((tag) => {
      const key = normalizeTagKey(tag);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      result.push(tag);
    });

  return result;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeTagInput(value: string): string {
  return value.trim();
}

function normalizeTagKey(value: string): string {
  return normalizeTagInput(value).toLowerCase();
}

function areSameList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
