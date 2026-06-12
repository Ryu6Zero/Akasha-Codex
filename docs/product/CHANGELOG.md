# 绯典阁 Changelog

## 2026-06-10

- Reworked fullscreen detail into inline view/edit modes and removed the blocked editor-overlay flow.
- Added multi-avatar support with a primary avatar, and cover portrait selection for portrait galleries.
- Added a shared library client layer and Capacitor Android project with an independent app-data library.
- Improved glass-panel styling, hover/press motion, responsive toolbar wrapping, and Windows scaling behavior.
- Planned and implemented the composite game-style catalog flow: home, collection entrance, catalog grid, preview drawer, fullscreen detail, and editor.
- Added `catalog.json` as the local catalog metadata owner.
- Scoped voice support to local library playback and metadata management.
- Removed unused 3D preview scope from the active product direction.

## 2026-06-09

- Reframed 绯典阁 as a local character catalog and entry database.
- Kept model files as optional attachments instead of the main experience.
- Added product documentation under `docs/product/`.
- Integrated the product manager skill pack into Codex personal skills with `pm-` prefixes.
- Planned and implemented tag composer, image lightbox, configurable library root, search, and tag filtering.

## Earlier 2026-06-09

- Created the initial Electron/Vite/React desktop app.
- Imported 大梵天1.0 and 小梵天1.0 from local resources.
- Added local library folders for avatars, portraits, voices, attachments, and models.
- Built `release/绯典阁 0.1.0.exe`.
