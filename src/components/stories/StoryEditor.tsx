import { useMemo, useState } from 'react';
import type { Character, Story, StoryBlock, StoryCatalogMetadata } from '../../types';
import { createStoryBlock, deriveStoryLinkedCharacterIds, normalizeStory } from '../../storage/storyStore';
import { filterReferenceCandidates, replaceTrailingMention, trailingMention } from '../../storage/storyReferences';
import { StoryBlockEditor } from './StoryBlockEditor';
import { StoryReferencePanel } from './StoryReferencePanel';

type StoryEditorProps = {
  story: Story;
  storyCatalog: StoryCatalogMetadata;
  characters: Character[];
  canImportImages: boolean;
  onChange: (story: Story) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onImportImage: (blockId?: string) => void | Promise<void>;
  onRemoveImage: (assetPath: string) => void | Promise<void>;
};

export function StoryEditor({
  story,
  storyCatalog,
  characters,
  canImportImages,
  onChange,
  onSave,
  onCancel,
  onImportImage,
  onRemoveImage,
}: StoryEditorProps) {
  const [tagInput, setTagInput] = useState('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [referenceBlockId, setReferenceBlockId] = useState<string | null>(null);
  const [isReferencePanelOpen, setIsReferencePanelOpen] = useState(false);
  const referencedIds = useMemo(() => deriveStoryLinkedCharacterIds(story, characters), [characters, story]);
  const referencedCharacters = useMemo(
    () => referencedIds.flatMap((id) => characters.find((character) => character.id === id) || []),
    [characters, referencedIds],
  );
  const referenceCandidates = useMemo(
    () => filterReferenceCandidates(characters, referenceSearch).slice(0, 8),
    [characters, referenceSearch],
  );

  function updateStory(patch: Partial<Story>): void {
    onChange(normalizeStory({ ...story, ...patch }));
  }

  function updateBlock(blockId: string, patch: Partial<StoryBlock>): void {
    updateStory({
      blocks: story.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    });
  }

  function updateBlockText(blockId: string, value: string): void {
    updateBlock(blockId, { text: value });
    const mention = trailingMention(value);
    if (mention) {
      setReferenceBlockId(blockId);
      setReferenceSearch(mention.query);
      setIsReferencePanelOpen(true);
    } else if (referenceBlockId === blockId) {
      setIsReferencePanelOpen(false);
    }
  }

  function addTag(): void {
    const nextTag = tagInput.trim();
    if (!nextTag || story.tags.includes(nextTag)) return;
    updateStory({ tags: [...story.tags, nextTag] });
    setTagInput('');
  }

  function removeTag(tag: string): void {
    updateStory({ tags: story.tags.filter((item) => item !== tag) });
  }

  function toggleCategory(categoryId: string): void {
    if (categoryId === 'all') return;
    const categoryIds = story.categoryIds.includes(categoryId)
      ? story.categoryIds.filter((id) => id !== categoryId)
      : [...story.categoryIds, categoryId];
    updateStory({ categoryIds });
  }

  function openReferencePicker(blockId?: string): void {
    setReferenceBlockId(blockId || null);
    setReferenceSearch('');
    setIsReferencePanelOpen(true);
  }

  function insertReference(character: Character): void {
    const characterName = character.name || character.id;
    const linkedCharacterIds = story.linkedCharacterIds.includes(character.id)
      ? story.linkedCharacterIds
      : [...story.linkedCharacterIds, character.id];

    if (referenceBlockId) {
      const targetBlock = story.blocks.find((block) => block.id === referenceBlockId);
      const currentText = targetBlock?.text || '';
      const text = replaceTrailingMention(currentText, `[[${characterName}]]`);
      updateStory({
        linkedCharacterIds,
        blocks: story.blocks.map((block) => (block.id === referenceBlockId ? { ...block, text } : block)),
      });
    } else {
      updateStory({ linkedCharacterIds });
    }

    setReferenceSearch('');
    setReferenceBlockId(null);
    setIsReferencePanelOpen(false);
  }

  function removeReference(characterId: string): void {
    updateStory({ linkedCharacterIds: story.linkedCharacterIds.filter((id) => id !== characterId) });
  }

  function addBlock(type: StoryBlock['type']): void {
    updateStory({ blocks: [...story.blocks, createStoryBlock(type)] });
  }

  return (
    <div className="story-editor-overlay" role="dialog" aria-modal="true" aria-label="故事编辑器">
      <section className="story-editor-panel blog-editor-panel">
        <header className="story-editor-topbar">
          <div>
            <p>Story Editor</p>
            <h2>{story.title.trim() || '新建故事'}</h2>
          </div>
          <div className="detail-actions">
            <button type="button" onClick={onCancel}>取消</button>
            <button className="primary-button" type="button" onClick={onSave}>保存</button>
          </div>
        </header>

        <div className="story-editor-layout">
          <main className="story-writing-surface">
            <input
              className="story-title-input"
              value={story.title}
              onChange={(event) => updateStory({ title: event.target.value })}
              placeholder="写一个故事标题"
            />
            <input
              className="story-subtitle-input"
              value={story.subtitle}
              onChange={(event) => updateStory({ subtitle: event.target.value })}
              placeholder="副标题或来源说明"
            />
            <textarea
              className="story-summary-input"
              value={story.summary}
              onChange={(event) => updateStory({ summary: event.target.value })}
              placeholder="给这篇记录写一段摘要"
            />

            <div className="story-compose-toolbar" aria-label="正文工具栏">
              <button type="button" onClick={() => addBlock('heading')}>标题</button>
              <button type="button" onClick={() => addBlock('paragraph')}>段落</button>
              <button type="button" onClick={() => addBlock('quote')}>引用</button>
              <button type="button" disabled={!canImportImages} onClick={() => onImportImage()}>图片</button>
            </div>

            <section className="story-block-stack">
              {story.blocks.map((block, index) => (
                <StoryBlockEditor
                  block={block}
                  blockCount={story.blocks.length}
                  canImportImages={canImportImages}
                  index={index}
                  key={block.id}
                  onDelete={(blockId) => updateStory({ blocks: story.blocks.filter((item) => item.id !== blockId) })}
                  onImportImage={onImportImage}
                  onOpenReferencePicker={openReferencePicker}
                  onPatch={updateBlock}
                  onRemoveImage={onRemoveImage}
                  onTextChange={updateBlockText}
                />
              ))}
            </section>
          </main>

          <aside className="story-inspector">
            <StoryReferencePanel
              candidates={referenceCandidates}
              explicitLinkedIds={story.linkedCharacterIds}
              isOpen={isReferencePanelOpen}
              referencedCharacters={referencedCharacters}
              search={referenceSearch}
              onInsert={insertReference}
              onOpenPicker={() => openReferencePicker()}
              onRemove={removeReference}
              onSearchChange={setReferenceSearch}
            />

            <section className="story-inspector-card">
              <strong>故事分类</strong>
              <div className="collection-checks compact-checks">
                {storyCatalog.categories
                  .filter((category) => category.id !== 'all')
                  .map((category) => (
                    <label key={category.id}>
                      <input
                        type="checkbox"
                        checked={story.categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
              </div>
            </section>

            <section className="story-inspector-card">
              <strong>标签</strong>
              <div className="tag-composer compact-tag-composer">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="输入标签"
                />
                <button type="button" onClick={addTag}>添加</button>
              </div>
              <div className="tag-row editable-tags">
                {story.tags.length ? (
                  story.tags.map((tag) => (
                    <span className="tag-chip" key={tag}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>x</button>
                    </span>
                  ))
                ) : (
                  <span>暂无标签</span>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
