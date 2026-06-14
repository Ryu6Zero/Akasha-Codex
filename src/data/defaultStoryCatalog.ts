import type { StoryCatalogMetadata } from '../types';

export const defaultStoryCatalog: StoryCatalogMetadata = {
  defaultCategoryId: 'all',
  defaultSortMode: 'updatedAt',
  categories: [
    {
      id: 'all',
      name: '全部故事',
      description: '浏览当前资料库中保存的图文故事与设定记录。',
      tagRules: [],
    },
  ],
};
