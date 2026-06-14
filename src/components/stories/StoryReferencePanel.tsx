import type { Character } from '../../types';

type StoryReferencePanelProps = {
  isOpen: boolean;
  search: string;
  candidates: Character[];
  referencedCharacters: Character[];
  explicitLinkedIds: string[];
  onSearchChange: (value: string) => void;
  onOpenPicker: () => void;
  onInsert: (character: Character) => void;
  onRemove: (characterId: string) => void;
};

export function StoryReferencePanel({
  isOpen,
  search,
  candidates,
  referencedCharacters,
  explicitLinkedIds,
  onSearchChange,
  onOpenPicker,
  onInsert,
  onRemove,
}: StoryReferencePanelProps) {
  return (
    <section className="story-inspector-card">
      <div className="story-inspector-heading">
        <strong>图鉴引用</strong>
        <button type="button" onClick={onOpenPicker}>@ 添加</button>
      </div>
      {isOpen ? (
        <div className="reference-picker">
          <input
            autoFocus
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索角色名、别名或作品"
          />
          <div className="reference-picker-list">
            {candidates.length ? (
              candidates.map((character) => (
                <button key={character.id} type="button" onClick={() => onInsert(character)}>
                  {character.avatarUrl || character.portraitUrl ? <img src={character.avatarUrl || character.portraitUrl} alt="" /> : null}
                  <span>{character.name || '未命名角色'}</span>
                  <small>{character.sourceTitle || '未知来源'}</small>
                </button>
              ))
            ) : (
              <p>没有匹配词条</p>
            )}
          </div>
        </div>
      ) : null}
      <div className="reference-chip-list">
        {referencedCharacters.length ? (
          referencedCharacters.map((character) => (
            <span className="reference-chip" key={character.id}>
              {character.name || character.id}
              {explicitLinkedIds.includes(character.id) ? (
                <button type="button" onClick={() => onRemove(character.id)} aria-label={`移除引用 ${character.name}`}>
                  x
                </button>
              ) : null}
            </span>
          ))
        ) : (
          <p className="muted">正文输入 @，或点击上方按钮添加引用。</p>
        )}
      </div>
    </section>
  );
}
