import type { Character } from '../types';

type PreviewDrawerProps = {
  character: Character | null;
  onOpenFullscreen: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (character: Character) => void | Promise<void>;
};

export function PreviewDrawer({ character, onOpenFullscreen, onEditCharacter, onDeleteCharacter }: PreviewDrawerProps) {
  if (!character) {
    return (
      <aside className="preview-drawer empty-preview">
        <h2>选择角色</h2>
        <p>点击左侧图鉴卡片后，这里会显示立绘和简介。</p>
      </aside>
    );
  }

  const previewImage = character.portraitUrl || character.avatarUrl;

  return (
    <aside className="preview-drawer">
      <button className="drawer-stage" type="button" onClick={onOpenFullscreen}>
        {previewImage ? <img src={previewImage} alt={character.name} /> : <span>{character.name.slice(0, 1) || '?'}</span>}
      </button>
      <div className="drawer-copy">
        <p>{character.sourceTitle || '未知来源'}</p>
        <h2>{character.name || '未命名角色'}</h2>
        <div className="tag-row compact-tags">
          {character.tags?.length ? character.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
        </div>
        <p className="drawer-description">{character.description || character.notes || '暂无人物介绍。'}</p>
      </div>
      <div className="drawer-actions">
        <button type="button" onClick={onOpenFullscreen}>
          详情
        </button>
        <button type="button" onClick={() => onEditCharacter(character)}>
          编辑
        </button>
        <button className="danger-button" type="button" onClick={() => onDeleteCharacter(character)}>
          删除
        </button>
      </div>
    </aside>
  );
}
