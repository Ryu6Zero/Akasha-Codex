import type { Character } from '../types';

const now = new Date().toISOString();

export const sampleCharacters: Character[] = [
  {
    id: 'sample-character',
    name: '示例角色',
    sourceTitle: '本地收藏',
    aliases: ['样例词条'],
    tags: ['示例', '模型预览'],
    collectionIds: [],
    profileFields: [
      { id: 'sample-origin', group: '基础', label: '来源类型', value: '本地示例' },
      { id: 'sample-role', group: '维护', label: '用途', value: '布局检查' },
    ],
    description: '用于检查图鉴和详情页布局的初始词条。',
    notes: '你可以编辑它，或导入自己的头像、立绘、语音和附件。',
    voicePaths: [],
    voiceAssets: [],
    attachmentPaths: [],
    createdAt: now,
    updatedAt: now,
  },
];
