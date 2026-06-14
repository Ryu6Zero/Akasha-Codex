import { useEffect, useMemo, useState } from 'react';
import type { Character, Story, StoryCatalogMetadata, StoryCategory, StorySortMode } from '../../types';
import { createEmptyStory, deriveStoryLinkedCharacterIds, normalizeStory } from '../../storage/storyStore';
import {
  countStoriesByCategory,
  createStoryCategoryId,
  filterStoriesForArchive,
  findBrokenWikiLinks,
  getAvailableStoryTags,
} from '../../storage/storyQueries';
import { createLibraryHealthReport } from '../../storage/libraryHealth';
import { StoryCategoryManager } from './StoryCategoryManager';
import { LibraryHealthPanel } from './LibraryHealthPanel';
import { StoryContent } from './StoryContent';
import { StoryEditor } from './StoryEditor';
import { StoryList, formatStoryDate } from './StoryList';

type StoryArchiveViewProps = {
  storyCatalog: StoryCatalogMetadata;
  stories: Story[];
  characters: Character[];
  selectedStoryId: string | null;
  canImportImages: boolean;
  onSelectedStoryChange: (storyId: string) => void;
  onBackHome: () => void;
  onOpenCatalog: () => void;
  onSaveStory: (story: Story) => void | Promise<void>;
  onDeleteStory: (story: Story) => void | Promise<void>;
  onSaveStoryCatalog: (catalog: StoryCatalogMetadata) => void | Promise<void>;
  onImportStoryImage: (story: Story, blockId?: string) => Promise<Story>;
  onRemoveStoryImage: (story: Story, assetPath: string) => Promise<Story>;
  onOpenCharacter: (characterId: string) => void;
};

export function StoryArchiveView({
  storyCatalog,
  stories,
  characters,
  selectedStoryId,
  canImportImages,
  onSelectedStoryChange,
  onBackHome,
  onOpenCatalog,
  onSaveStory,
  onDeleteStory,
  onSaveStoryCatalog,
  onImportStoryImage,
  onRemoveStoryImage,
  onOpenCharacter,
}: StoryArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(storyCatalog.defaultCategoryId || 'all');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortMode, setSortMode] = useState<StorySortMode>(storyCatalog.defaultSortMode || 'updatedAt');
  const [isEditingCategories, setIsEditingCategories] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState(storyCatalog.categories);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  useEffect(() => {
    setSortMode(storyCatalog.defaultSortMode || 'updatedAt');
    setCategoryDrafts(storyCatalog.categories);
    setSelectedCategoryId((currentId) =>
      storyCatalog.categories.some((category) => category.id === currentId)
        ? currentId
        : storyCatalog.defaultCategoryId || 'all',
    );
  }, [storyCatalog]);

  const availableTags = useMemo(() => getAvailableStoryTags(stories), [stories]);
  const filteredStories = useMemo(
    () =>
      filterStoriesForArchive({
        stories,
        categories: storyCatalog.categories,
        searchQuery,
        selectedCategoryId,
        selectedTag,
        sortMode,
      }),
    [searchQuery, selectedCategoryId, selectedTag, sortMode, stories, storyCatalog.categories],
  );
  const selectedStory = stories.find((story) => story.id === selectedStoryId) || filteredStories[0] || null;
  const categoryCounts = useMemo(() => countStoriesByCategory(storyCatalog.categories, stories), [stories, storyCatalog.categories]);
  const brokenWikiLinks = useMemo(() => findBrokenWikiLinks(stories, characters), [characters, stories]);
  const healthReport = useMemo(() => createLibraryHealthReport(characters, stories, storyCatalog), [characters, stories, storyCatalog]);
  const brokenLinkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    brokenWikiLinks.forEach((link) => counts.set(link.storyId, (counts.get(link.storyId) || 0) + 1));
    return counts;
  }, [brokenWikiLinks]);
  const selectedStoryBrokenLinks = selectedStory ? brokenWikiLinks.filter((link) => link.storyId === selectedStory.id) : [];
  const linkedCharacters = useMemo(() => {
    if (!selectedStory) return [];
    const ids = deriveStoryLinkedCharacterIds(selectedStory, characters);
    return ids.flatMap((id) => characters.find((character) => character.id === id) || []);
  }, [characters, selectedStory]);

  function createStory(): void {
    setEditingStory(createEmptyStory(selectedCategoryId));
  }

  async function saveEditingStory(): Promise<void> {
    if (!editingStory) return;
    await onSaveStory({
      ...editingStory,
      title: editingStory.title.trim() || '未命名故事',
      subtitle: editingStory.subtitle.trim(),
      summary: editingStory.summary.trim(),
      tags: editingStory.tags.map((tag) => tag.trim()).filter(Boolean),
      linkedCharacterIds: deriveStoryLinkedCharacterIds(editingStory, characters),
    });
    setEditingStory(null);
  }

  async function importStoryImage(blockId?: string): Promise<void> {
    if (!editingStory) return;
    setEditingStory(await onImportStoryImage(editingStory, blockId));
  }

  async function removeStoryImage(assetPath: string): Promise<void> {
    if (!editingStory) return;
    setEditingStory(await onRemoveStoryImage(editingStory, assetPath));
  }

  async function saveCategories(): Promise<void> {
    const allCategory = categoryDrafts.find((category) => category.id === 'all') || {
      id: 'all',
      name: '全部故事',
      description: '浏览当前资料库中的图文故事。',
      tagRules: [],
    };
    const nextCatalog = {
      ...storyCatalog,
      defaultCategoryId: selectedCategoryId,
      defaultSortMode: sortMode,
      categories: [
        { ...allCategory, id: 'all', tagRules: [] },
        ...categoryDrafts
          .filter((category) => category.id !== 'all')
          .map((category) => ({
            ...category,
            name: category.name.trim() || '未命名分类',
            description: category.description.trim(),
            tagRules: [...new Set(category.tagRules.map((rule) => rule.trim()).filter(Boolean))],
          })),
      ],
    };
    await onSaveStoryCatalog(nextCatalog);
    setIsEditingCategories(false);
  }

  function addCategory(): void {
    const id = createStoryCategoryId(categoryDrafts);
    setCategoryDrafts([
      ...categoryDrafts,
      { id, name: '新故事分类', description: '按标签或手动归档的一组故事。', tagRules: [] },
    ]);
  }

  function updateCategory(categoryId: string, patch: Partial<StoryCategory>): void {
    setCategoryDrafts((categories) => categories.map((category) => (category.id === categoryId ? { ...category, ...patch } : category)));
  }

  return (
    <section className="story-view">
      <header className="catalog-toolbar">
        <button type="button" onClick={onBackHome}>返回首页</button>
        <button type="button" onClick={onOpenCatalog}>图鉴</button>
        <label className="search-box">
          <span>搜索故事</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="标题、正文、标签、摘要" />
        </label>
        <label>
          <span>标签</span>
          <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
            <option value="">全部标签</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </label>
        <label>
          <span>排序</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as StorySortMode)}>
            <option value="updatedAt">最近更新</option>
            <option value="createdAt">创建时间</option>
            <option value="title">标题</option>
          </select>
        </label>
        <button type="button" onClick={createStory}>新建故事</button>
      </header>

      <div className="quick-filter-row">
        {storyCatalog.categories.map((category) => (
          <button
            className={category.id === selectedCategoryId ? 'active' : ''}
            key={category.id}
            type="button"
            onClick={() => setSelectedCategoryId(category.id)}
          >
            <span>{category.name}</span>
            <small>{categoryCounts.get(category.id) || 0}</small>
          </button>
        ))}
        <button type="button" onClick={() => {
          setCategoryDrafts(storyCatalog.categories);
          setIsEditingCategories(true);
        }}>
          分类管理
        </button>
      </div>

      <LibraryHealthPanel report={healthReport} onOpenStory={onSelectedStoryChange} onOpenCharacter={onOpenCharacter} />

      <div className="story-workspace">
        <aside className="story-list">
          <StoryList
            brokenLinkCounts={brokenLinkCounts}
            selectedStoryId={selectedStory?.id}
            stories={filteredStories}
            onSelectStory={onSelectedStoryChange}
          />
        </aside>

        <section className="story-reader glass-panel">
          {selectedStory ? (
            <>
              <div className="story-reader-header">
                <div>
                  <p>{selectedStory.subtitle || 'Story'}</p>
                  <h1>{selectedStory.title || '未命名故事'}</h1>
                  {selectedStory.summary ? <span>{selectedStory.summary}</span> : null}
                  <small className="story-updated-at">最近更新 {formatStoryDate(selectedStory.updatedAt)}</small>
                </div>
                <div className="detail-actions">
                  <button type="button" onClick={() => setEditingStory(normalizeStory(selectedStory))}>编辑</button>
                  <button className="danger-button" type="button" onClick={() => onDeleteStory(selectedStory)}>删除</button>
                </div>
              </div>
              <div className="tag-row">
                {selectedStory.tags.length ? selectedStory.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
              </div>
              {selectedStoryBrokenLinks.length ? (
                <div className="story-link-health">
                  <strong>未解析词条</strong>
                  <div className="tag-row">
                    {selectedStoryBrokenLinks.map((link) => (
                      <span className="warning-pill" key={`${link.storyId}-${link.blockId}-${link.label}`}>
                        [[{link.label}]]
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="story-linked-characters">
                <strong>关联图鉴</strong>
                <div className="tag-row">
                  {linkedCharacters.length ? (
                    linkedCharacters.map((character) => (
                      <button className="story-character-link" key={character.id} type="button" onClick={() => onOpenCharacter(character.id)}>
                        {character.name || '未命名角色'}
                      </button>
                    ))
                  ) : (
                    <span>暂无关联词条</span>
                  )}
                </div>
              </div>
              <StoryContent story={selectedStory} characters={characters} onOpenCharacter={onOpenCharacter} />
            </>
          ) : (
            <div className="empty-grid">
              <h2>还没有故事</h2>
              <p>新建一篇图文记录，然后用 [[角色名]] 连接图鉴词条。</p>
            </div>
          )}
        </section>
      </div>

      {editingStory ? (
        <StoryEditor
          story={editingStory}
          storyCatalog={storyCatalog}
          characters={characters}
          canImportImages={canImportImages}
          onChange={setEditingStory}
          onSave={saveEditingStory}
          onCancel={() => setEditingStory(null)}
          onImportImage={importStoryImage}
          onRemoveImage={removeStoryImage}
        />
      ) : null}

      {isEditingCategories ? (
        <StoryCategoryManager
          categories={categoryDrafts}
          onAddCategory={addCategory}
          onCancel={() => setIsEditingCategories(false)}
          onRemoveCategory={(categoryId) => setCategoryDrafts((categories) => categories.filter((item) => item.id !== categoryId))}
          onSave={saveCategories}
          onUpdateCategory={updateCategory}
        />
      ) : null}
    </section>
  );
}
