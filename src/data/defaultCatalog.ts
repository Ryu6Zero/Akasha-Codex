import type { CatalogMetadata } from '../types';

export const defaultCatalog: CatalogMetadata = {
  wallpaperOpacity: 0.72,
  defaultCollectionId: 'all',
  defaultSortMode: 'updatedAt',
  collections: [
    { id: 'all', name: '全部角色', description: '浏览当前资料库的所有角色。', tagRules: [] },
  ],
};
