import type { DragEvent } from 'react';
import type { CatalogMetadata, Character, SortMode } from '../types';
import { PreviewDrawer } from './PreviewDrawer';
import { VirtualCharacterGrid } from './VirtualCharacterGrid';

type CatalogViewProps = {
  catalog: CatalogMetadata;
  characters: Character[];
  availableTags: string[];
  collectionCounts: Map<string, number>;
  selectedCollectionId: string;
  selectedCharacter: Character | null;
  searchQuery: string;
  selectedTag: string;
  sortMode: SortMode;
  onBackCollections: () => void;
  onOpenStories: () => void;
  onSelectCollection: (collectionId: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSelectedTagChange: (value: string) => void;
  onSortModeChange: (value: SortMode) => void;
  onSelectCharacter: (id: string) => void;
  onOpenFullscreen: () => void;
  onCreateCharacter: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (character: Character) => void | Promise<void>;
  onImportDirectory?: () => void;
  onSaveCollectionIcon?: (collectionId: string, imageDataUrl: string, fileName: string) => void | Promise<void>;
  onOpenSettings: () => void;
};

export function CatalogView({
  catalog,
  characters,
  availableTags,
  collectionCounts,
  selectedCollectionId,
  selectedCharacter,
  searchQuery,
  selectedTag,
  sortMode,
  onBackCollections,
  onOpenStories,
  onSelectCollection,
  onSearchQueryChange,
  onSelectedTagChange,
  onSortModeChange,
  onSelectCharacter,
  onOpenFullscreen,
  onCreateCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onImportDirectory,
  onSaveCollectionIcon,
  onOpenSettings,
}: CatalogViewProps) {
  async function handleCollectionIconDrop(event: DragEvent<HTMLButtonElement>, collectionId: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith('image/'));
    if (!file || !onSaveCollectionIcon) return;
    onSelectCollection(collectionId);
    await onSaveCollectionIcon(collectionId, await readFileAsDataUrl(file), file.name);
  }

  return (
    <section className="catalog-view">
      <header className="catalog-toolbar">
        <button type="button" onClick={onBackCollections}>
          分类
        </button>
        <label className="search-box">
          <span>搜索</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="名称、来源、别名、标签、备注"
          />
        </label>
        <label>
          <span>标签</span>
          <select value={selectedTag} onChange={(event) => onSelectedTagChange(event.target.value)}>
            <option value="">全部标签</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>排序</span>
          <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as SortMode)}>
            <option value="updatedAt">最近更新</option>
            <option value="createdAtDesc">创建时间倒序</option>
            <option value="createdAt" hidden>
              创建时间倒序
            </option>
            <option value="name">名称</option>
            <option value="sourceTitle">来源</option>
          </select>
        </label>
        <button type="button" onClick={onCreateCharacter}>
          新建
        </button>
        {onImportDirectory ? (
          <button type="button" onClick={onImportDirectory}>
            导入
          </button>
        ) : null}
        <button type="button" onClick={onOpenSettings}>
          设置
        </button>
        <button type="button" onClick={onOpenStories}>
          故事库
        </button>
      </header>

      <div className="quick-filter-row">
        {catalog.collections.map((collection) => (
          <button
            className={collection.id === selectedCollectionId ? 'active' : ''}
            key={collection.id}
            type="button"
            title="点击筛选；拖入图片可更换分组图标"
            onDragOver={(event) => {
              if (!onSaveCollectionIcon) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(event) => handleCollectionIconDrop(event, collection.id)}
            onClick={() => onSelectCollection(collection.id)}
          >
            {collection.iconUrl ? <img src={collection.iconUrl} alt="" /> : null}
            <span>{collection.name}</span>
            <small>{collectionCounts.get(collection.id) || 0}</small>
          </button>
        ))}
      </div>

      <div className="catalog-workspace">
        <VirtualCharacterGrid
          characters={characters}
          selectedCharacter={selectedCharacter}
          onDeleteCharacter={onDeleteCharacter}
          onSelectCharacter={onSelectCharacter}
        />

        <PreviewDrawer
          character={selectedCharacter}
          onOpenFullscreen={onOpenFullscreen}
          onEditCharacter={onEditCharacter}
          onDeleteCharacter={onDeleteCharacter}
        />
      </div>
    </section>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
