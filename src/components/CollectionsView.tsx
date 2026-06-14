import type { CatalogMetadata } from '../types';

type CollectionsViewProps = {
  catalog: CatalogMetadata;
  collectionCounts: Map<string, number>;
  onBackHome: () => void;
  onSelectCollection: (collectionId: string) => void;
  onOpenStories: () => void;
  onOpenSettings: () => void;
};

export function CollectionsView({
  catalog,
  collectionCounts,
  onBackHome,
  onSelectCollection,
  onOpenStories,
  onOpenSettings,
}: CollectionsViewProps) {
  return (
    <section className="collections-view">
      <header className="top-nav">
        <button type="button" onClick={onBackHome}>
          返回首页
        </button>
        <div>
          <p>Collection Gate</p>
          <h1>选择图鉴分类</h1>
        </div>
        <button type="button" onClick={onOpenSettings}>
          设置
        </button>
        <button type="button" onClick={onOpenStories}>
          故事库
        </button>
      </header>

      <div className="collection-grid">
        {catalog.collections.map((collection) => (
          <button className="collection-tile" key={collection.id} type="button" onClick={() => onSelectCollection(collection.id)}>
            <div className="collection-icon">
              {collection.iconUrl ? <img src={collection.iconUrl} alt={collection.name} /> : <span>{collection.name.slice(0, 2)}</span>}
            </div>
            <strong>{collection.name}</strong>
            <p>{collection.description}</p>
            <small>{collectionCounts.get(collection.id) || 0} 个角色</small>
          </button>
        ))}
      </div>
    </section>
  );
}
