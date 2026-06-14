import type { Story } from '../types';

const now = new Date().toISOString();

export const sampleStories: Story[] = [
  {
    id: 'sample-story',
    title: '示例故事记录',
    subtitle: '图文知识库样例',
    summary: '用于检查故事库、富文本块、图鉴链接和反向引用的初始记录。',
    categoryIds: [],
    tags: ['示例', '故事'],
    linkedCharacterIds: ['sample-character'],
    blocks: [
      {
        id: 'sample-heading',
        type: 'heading',
        text: '一次可以连接图鉴词条的故事记录',
      },
      {
        id: 'sample-paragraph',
        type: 'paragraph',
        text: '在正文中写入 [[示例角色]] 这样的链接，阅读时可以直接打开对应图鉴词条。',
      },
      {
        id: 'sample-quote',
        type: 'quote',
        text: '反向引用会让角色知道自己被哪些故事提到。',
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
];
