import type { CatalogMetadata, Character } from '../../types';

type EditableProfileProps = {
  catalog: CatalogMetadata;
  draft: Character;
  tagInput: string;
  onDraftChange: (patch: Partial<Character>) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (value: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleCollection: (collectionId: string) => void;
};

export function EditableProfile({
  catalog,
  draft,
  tagInput,
  onDraftChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onToggleCollection,
}: EditableProfileProps) {
  return (
    <>
      <section className="glass-panel editor-two-column">
        <label>
          来源
          <input value={draft.sourceTitle} onChange={(event) => onDraftChange({ sourceTitle: event.target.value })} placeholder="游戏、动画或收藏来源" />
        </label>
        <label>
          别名
          <input value={draft.aliases.join(', ')} onChange={(event) => onDraftChange({ aliases: event.target.value.split(',') })} placeholder="用英文逗号分隔" />
        </label>
      </section>

      <section className="glass-panel">
        <h2>分类</h2>
        <div className="collection-checks">
          {catalog.collections
            .filter((collection) => collection.id !== 'all')
            .map((collection) => (
              <label key={collection.id}>
                <input
                  type="checkbox"
                  checked={draft.collectionIds.includes(collection.id)}
                  onChange={() => onToggleCollection(collection.id)}
                />
                <span>{collection.name}</span>
              </label>
            ))}
        </div>
      </section>

      <section className="glass-panel">
        <h2>标签</h2>
        <div className="tag-composer">
          <input
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddTag(tagInput);
              }
            }}
            placeholder="输入标签后按 Enter"
          />
          <button type="button" onClick={() => onAddTag(tagInput)}>添加</button>
        </div>
        <div className="tag-row editable-tags">
          {draft.tags.length ? (
            draft.tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                {tag}
                <button type="button" aria-label={`删除标签 ${tag}`} onClick={() => onRemoveTag(tag)}>x</button>
              </span>
            ))
          ) : (
            <span>暂无标签</span>
          )}
        </div>
      </section>

      <section className="glass-panel long-text-editor">
        <h2>人物介绍</h2>
        <textarea value={draft.description} onChange={(event) => onDraftChange({ description: event.target.value })} placeholder="用于详情页展示的人物介绍" />
      </section>

      <section className="glass-panel long-text-editor">
        <h2>备注</h2>
        <textarea value={draft.notes} onChange={(event) => onDraftChange({ notes: event.target.value })} placeholder="个人备注、来源补充、维护记录" />
      </section>
    </>
  );
}

export function ReadonlyProfile({ character }: { character: Character }) {
  return (
    <>
      <section className="glass-panel">
        <h2>人物介绍</h2>
        <FormattedText value={character.description} fallback="暂无介绍。" />
      </section>
      <section className="glass-panel">
        <h2>备注</h2>
        <FormattedText value={character.notes} fallback="暂无备注。" />
      </section>
      <section className="glass-panel">
        <h2>标签</h2>
        <div className="tag-row">
          {character.tags?.length ? character.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
        </div>
      </section>
    </>
  );
}

function FormattedText({ value, fallback }: { value: string; fallback: string }) {
  const blocks = value
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return <p>{fallback}</p>;

  return (
    <div className="formatted-text">
      {blocks.map((block, index) => (
        <p key={`${index}-${block.slice(0, 16)}`}>{block}</p>
      ))}
    </div>
  );
}
