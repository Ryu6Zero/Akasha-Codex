# Contributing

感谢愿意改进 绯典阁。这个项目的原则很简单：应用代码开源，用户资料库和第三方素材不进仓库。

## 本地开发

```bash
npm install
npm run build
npm run desktop
```

## 提交前检查

```bash
node --check electron/main.cjs
node --check electron/preload.cjs
node --check electron/catalog-service.cjs
node --check electron/character-service.cjs
npm run build
```

## 不要提交

- `library/`
- `config/`
- `release/`
- `dist/`
- `.local-appdata/`
- `.npm-cache/`
- 下载后的第三方素材、用户头像、用户立绘、个人语音

## 功能取舍

- 图鉴应用内只做浏览、编辑、筛选和本地资产管理。
- 大批量外部数据导入不要作为公开仓库默认功能提交。
- 新功能优先保持本地优先，不默认上传用户资料。
