# GitHub 开源发布检查清单

## 发布前必须完成

1. 确认 `.gitignore` 没有漏掉用户资料、构建产物和下载素材。
2. 确认 `README.md` 包含项目定位、开发命令、打包命令和开源边界。
3. 确认 `LICENSE` 已存在。
4. 确认 `CONTRIBUTING.md` 已说明哪些文件不能提交。
5. 确认 `docs/PRIVACY.md` 已说明本地资料库和第三方素材边界。
6. 确认 `npm run build` 通过。
7. 确认 `npm run prepare:open-source` 通过。
8. 确认 `npm run audit:open-source` 通过。
9. 确认创建 GitHub 仓库、添加 `origin` 并登录 `gh` 后，`npm run release:check` 通过。
10. 确认 `.github/` 下的 Issue/PR 模板存在。
11. 确认 `.github/workflows/ci.yml` 和 `.github/workflows/windows-portable.yml` 存在。
12. 确认 `CHANGELOG.md`、`docs/RELEASE-GUIDE.md` 和当前版本 Release Notes 已更新。
13. 确认没有 API Key、个人路径截图、用户资料库内容被加入 Git。

## 建议补充

1. 应用截图：建议放在 `docs/assets/`，只使用可公开的示例素材。
2. 隐私说明：解释资料库默认保存在本地，不上传用户数据。
3. 数据来源说明：说明第三方素材需要用户自行确认授权，不把全量素材或批量抓取结果内置进开源仓库。
4. Release 流程：确认是否发布 zip 目录包、portable exe，还是二者都提供。
5. GitHub 仓库设置：启用 Issues，首个 Release 附上 portable exe，不把本地 `library/` 作为附件上传。
6. 推送第一个正式版本时使用 `v0.1.0` 这类 tag，触发 Windows portable Release 工作流。
