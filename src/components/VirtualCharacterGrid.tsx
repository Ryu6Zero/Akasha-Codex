import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, RefObject } from 'react';
import type { Character } from '../types';

const MIN_CARD_WIDTH = 156;
const CARD_HEIGHT = 222;
const GRID_GAP = 14;
const ROW_HEIGHT = CARD_HEIGHT + GRID_GAP;

type VirtualCharacterGridProps = {
  characters: Character[];
  selectedCharacter: Character | null;
  isBatchSelectMode: boolean;
  selectedIds: Set<string>;
  onSelectCharacter: (id: string) => void;
  onToggleCharacter: (id: string) => void;
  onDeleteCharacter: (character: Character) => void | Promise<void>;
};

type CharacterContextMenu = {
  x: number;
  y: number;
  character: Character;
};

export function VirtualCharacterGrid({
  characters,
  selectedCharacter,
  isBatchSelectMode,
  selectedIds,
  onSelectCharacter,
  onToggleCharacter,
  onDeleteCharacter,
}: VirtualCharacterGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<CharacterContextMenu | null>(null);
  const gridWidth = useElementWidth(parentRef);
  const columnCount = useMemo(() => getColumnCount(gridWidth), [gridWidth]);
  const rowCount = Math.ceil(characters.length / columnCount);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const scrollElement = parentRef.current;

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', closeMenu);
    scrollElement?.addEventListener('scroll', closeMenu, { passive: true });

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', closeMenu);
      scrollElement?.removeEventListener('scroll', closeMenu);
    };
  }, [contextMenu]);

  function openContextMenu(event: MouseEvent<HTMLButtonElement>, character: Character) {
    event.preventDefault();
    event.stopPropagation();
    onSelectCharacter(character.id);
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 188)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 64)),
      character,
    });
  }

  async function deleteFromContextMenu(character: Character) {
    setContextMenu(null);
    await onDeleteCharacter(character);
  }

  if (!characters.length) {
    return (
      <div className="character-grid" aria-label="角色图鉴">
        <div className="empty-grid">
          <h2>没有匹配角色</h2>
          <p>调整搜索、标签或分类筛选后再试。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="character-grid virtualized-character-grid" ref={parentRef} aria-label="角色图鉴">
      <div className="virtual-character-grid-inner" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowCharacters = characters.slice(startIndex, startIndex + columnCount);

          return (
            <div
              className="virtual-character-row"
              key={virtualRow.key}
              style={{
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowCharacters.map((character) => (
                <CharacterCard
                  character={character}
                  isBatchSelectMode={isBatchSelectMode}
                  isBatchSelected={selectedIds.has(character.id)}
                  isSelected={selectedCharacter?.id === character.id}
                  key={character.id}
                  onOpenContextMenu={openContextMenu}
                  onSelectCharacter={onSelectCharacter}
                  onToggleCharacter={onToggleCharacter}
                />
              ))}
            </div>
          );
        })}
      </div>
      {contextMenu ? (
        <div
          className="catalog-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button className="danger-button" role="menuitem" type="button" onClick={() => deleteFromContextMenu(contextMenu.character)}>
            删除角色
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CharacterCard({
  character,
  isBatchSelectMode,
  isBatchSelected,
  isSelected,
  onOpenContextMenu,
  onSelectCharacter,
  onToggleCharacter,
}: {
  character: Character;
  isBatchSelectMode: boolean;
  isBatchSelected: boolean;
  isSelected: boolean;
  onOpenContextMenu: (event: MouseEvent<HTMLButtonElement>, character: Character) => void;
  onSelectCharacter: (id: string) => void;
  onToggleCharacter: (id: string) => void;
}) {
  return (
    <button
      className={[
        'catalog-card',
        isSelected ? 'selected' : '',
        isBatchSelectMode ? 'batch-mode' : '',
        isBatchSelected ? 'batch-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      type="button"
      aria-pressed={isBatchSelectMode ? isBatchSelected : undefined}
      onClick={() => {
        if (isBatchSelectMode) onToggleCharacter(character.id);
        else onSelectCharacter(character.id);
      }}
      onContextMenu={(event) => onOpenContextMenu(event, character)}
    >
      {isBatchSelectMode ? (
        <span className="catalog-select-box" aria-hidden="true">
          {isBatchSelected ? '已选' : ''}
        </span>
      ) : null}
      <div className="catalog-avatar">
        {character.avatarUrl || character.portraitUrl ? (
          <img
            src={character.avatarUrl || character.portraitUrl}
            alt={character.name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span>{character.name.slice(0, 1) || '?'}</span>
        )}
      </div>
      <strong>{character.name || '未命名角色'}</strong>
      <span>{character.sourceTitle || '未知来源'}</span>
      <small>{character.tags?.slice(0, 3).join(' / ') || '暂无标签'}</small>
    </button>
  );
}

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function getColumnCount(width: number): number {
  if (!width) return 1;
  return Math.max(1, Math.floor((width + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP)));
}
