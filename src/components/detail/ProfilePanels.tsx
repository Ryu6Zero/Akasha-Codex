import type { CatalogMetadata, Character, CharacterProfileField } from '../../types';

type EditableProfileProps = {
  catalog: CatalogMetadata;
  draft: Character;
  tagInput: string;
  onDraftChange: (patch: Partial<Character>) => void;
  onProfileFieldsChange: (profileFields: CharacterProfileField[]) => void;
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
  onProfileFieldsChange,
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

      <section className="glass-panel profile-field-editor">
        <div className="section-title-row">
          <h2>结构化资料</h2>
          <button
            type="button"
            onClick={() =>
              onProfileFieldsChange([
                ...(draft.profileFields || []),
                { id: `profile-${Date.now()}-${(draft.profileFields || []).length + 1}`, group: '', label: '', value: '' },
              ])
            }
          >
            添加字段
          </button>
        </div>
        <div className="profile-field-editor-list">
          {(draft.profileFields || []).length ? (
            draft.profileFields.map((field) => (
              <div className="profile-field-editor-row" key={field.id}>
                <input
                  value={field.group || ''}
                  onChange={(event) => updateProfileField(draft, field.id, { group: event.target.value }, onProfileFieldsChange)}
                  placeholder="分组"
                />
                <input
                  value={field.label}
                  onChange={(event) => updateProfileField(draft, field.id, { label: event.target.value }, onProfileFieldsChange)}
                  placeholder="字段名，如 CV、画师、稀有度"
                />
                <textarea
                  value={field.value}
                  onChange={(event) => updateProfileField(draft, field.id, { value: event.target.value }, onProfileFieldsChange)}
                  placeholder="字段内容"
                />
                <button type="button" onClick={() => removeProfileField(draft, field.id, onProfileFieldsChange)}>
                  删除
                </button>
              </div>
            ))
          ) : (
            <p className="empty-profile-fields">暂无结构化资料。</p>
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
        <h2>结构化资料</h2>
        <ProfileFieldList fields={character.profileFields || []} />
      </section>
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

function updateProfileField(
  draft: Character,
  fieldId: string,
  patch: Partial<CharacterProfileField>,
  onProfileFieldsChange: (profileFields: CharacterProfileField[]) => void,
) {
  onProfileFieldsChange(
    (draft.profileFields || []).map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
  );
}

function removeProfileField(
  draft: Character,
  fieldId: string,
  onProfileFieldsChange: (profileFields: CharacterProfileField[]) => void,
) {
  onProfileFieldsChange((draft.profileFields || []).filter((field) => field.id !== fieldId));
}

function ProfileFieldList({ fields }: { fields: CharacterProfileField[] }) {
  const visibleFields = fields.filter((field) => field.label.trim() && field.value.trim());

  if (!visibleFields.length) return <p>暂无结构化资料。</p>;

  return (
    <dl className="profile-field-list">
      {visibleFields.map((field) => (
        <div key={field.id}>
          <dt>
            {field.group ? <span>{field.group}</span> : null}
            {field.label}
          </dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
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
