# 绯典阁

绯典阁（Akasha Codex）是一个本地优先的 ACG 角色图鉴桌面应用。它用 Electron + React + Vite 构建，资料库默认保存在本机文件夹中，适合整理角色头像、立绘、介绍、标签、语音、模型附件和个人备注。

## 功能

- 首页壁纸，可裁切并调节透明度
- 自定义分类分组，本质是“标签筛选预设”，支持图标和快捷筛选
- 角色矩阵，支持搜索、标签筛选、排序和右侧预览
- 全屏详情，支持详情查看与原位编辑
- 多头像、多立绘，支持设置主头像和封面立绘
- 大图预览支持缩放、拖拽、切图和重置
- 本地语音、附件、模型文件归档
- Capacitor Android 工程骨架，移动端使用独立本地资料库

## 数据结构

默认资料库位于：

```text
library/
  catalog.json
  catalog-assets/
  characters/
    <character-id>/
      character.json
      avatar/
      portraits/
      voices/
      models/
      attachments/
```

打包后的应用会优先使用运行目录附近的 `library` 和 `config`。如果找不到，会在可执行文件目录下创建新的本地资料库。

## 开发

```bash
npm install
npm run build
npm run desktop
```

## 打包

```bash
npm run package:win
```

如果 portable 单文件打包在本机环境卡住，可以先分发 `release/win-unpacked` 目录压缩包。

## 开源审计

发布到 GitHub 前请先运行：

```bash
npm run audit:open-source
```

这个命令会检查 `.gitignore`、构建残留、资料库目录、本机绝对路径和常见密钥格式。它不会删除文件，只负责拦截明显不该进入开源仓库的内容。

建议在正式推送前运行完整准备命令：

```bash
npm run prepare:open-source
npm run release:check
```

`prepare:open-source` 会执行 Node/Electron 脚本语法检查、前端构建、清理 `dist`，并再次运行开源审计。`release:check` 会检查 Git 状态、`origin`、版本 tag、GitHub CLI 登录状态，以及本地 release 产物。

GitHub Actions 已包含两条工作流：

- `CI`：在 PR 和主分支 push 时运行 `npm run prepare:open-source`
- `Windows Portable`：手动触发或推送 `v*` tag 时打包 Windows portable exe，并在 tag 构建时附加到 GitHub Release

## 开源前注意

- 不要提交 `library/`，这里通常包含用户个人资料和大量素材
- 不要提交 `release/`、`dist/`、`.local-appdata/`、`.npm-cache/`
- 不要提交 `android/app/src/main/assets/public/`，它是 Capacitor 同步生成的 Web 资产
- 不要提交任何 API Key、私有配置或下载后的版权素材
- 不要把个人图鉴资料库、第三方素材包或批量抓取结果内置进仓库
- GitHub Issue 和 PR 模板已经放在 `.github/`，提交前请按模板检查隐私和生成文件

隐私边界见 `docs/PRIVACY.md`，开源检查清单见 `docs/OPEN-SOURCE-CHECKLIST.md`。下一轮产品讨论见 `docs/IMPROVEMENT-BACKLOG.md`。发布流程见 `docs/RELEASE-GUIDE.md`，首版变更见 `CHANGELOG.md`。

## License

本项目代码使用 MIT License。正式开源前请确认第三方素材与数据来源的授权边界。
