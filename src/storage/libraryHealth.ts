import type { Character, LibraryHealthIssue, LibraryHealthReport, Story, StoryCatalogMetadata } from '../types';
import { getStoryBacklinks } from './storyStore';
import { duplicateStoryCategoryNames, findBrokenWikiLinks } from './storyQueries';

export function createLibraryHealthReport(
  characters: Character[],
  stories: Story[],
  storyCatalog: StoryCatalogMetadata,
): LibraryHealthReport {
  const issues: LibraryHealthIssue[] = [];
  const brokenWikiLinks = findBrokenWikiLinks(stories, characters);
  const duplicateCategoryNames = duplicateStoryCategoryNames(storyCatalog);
  const storiesByCategory = new Map<string, number>();

  storyCatalog.categories.forEach((category) => {
    if (category.id === 'all') return;
    storiesByCategory.set(
      category.id,
      stories.filter((story) => story.categoryIds.includes(category.id) || category.tagRules.some((rule) => story.tags.includes(rule))).length,
    );
  });

  brokenWikiLinks.forEach((link) => {
    issues.push({
      id: `broken-wiki-${link.storyId}-${link.blockId}-${link.label}`,
      severity: 'warning',
      kind: 'broken-wiki-link',
      title: `未解析词条：${link.label}`,
      detail: `${link.storyTitle} 引用了 [[${link.label}]]，但没有找到匹配的图鉴词条。`,
      storyId: link.storyId,
      label: link.label,
    });
  });

  characters
    .filter((character) => !getStoryBacklinks(character, stories, characters).length)
    .forEach((character) => {
      issues.push({
        id: `orphan-character-${character.id}`,
        severity: 'info',
        kind: 'orphan-character',
        title: `暂无故事反链：${character.name || character.id}`,
        detail: '这个角色暂未被任何故事记录引用。',
        characterId: character.id,
      });
    });

  stories
    .filter((story) => !story.categoryIds.length)
    .forEach((story) => {
      issues.push({
      id: `uncategorized-story-${story.id}`,
      severity: 'info',
      kind: 'uncategorized-story',
      title: `未分类故事：${story.title || story.id}`,
      detail: '这个故事还没有手动分配分类。',
      storyId: story.id,
      });
    });

  storiesByCategory.forEach((count, categoryId) => {
    if (count > 0) return;
    const category = storyCatalog.categories.find((item) => item.id === categoryId);
    issues.push({
      id: `empty-story-category-${categoryId}`,
      severity: 'info',
      kind: 'empty-story-category',
      title: `空故事分类：${category?.name || categoryId}`,
      detail: '这个故事分类目前没有匹配故事。',
    });
  });

  duplicateCategoryNames.forEach((name) => {
    issues.push({
      id: `duplicate-story-category-${name}`,
      severity: 'warning',
      kind: 'duplicate-story-category',
      title: `重复故事分类：${name}`,
      detail: '故事分类名称应保持唯一，方便筛选和维护。',
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      characterCount: characters.length,
      storyCount: stories.length,
      issueCount: issues.length,
      warningCount: issues.filter((issue) => issue.severity === 'warning' && issue.kind !== 'orphan-character').length,
    },
    brokenWikiLinks,
    issues,
  };
}
