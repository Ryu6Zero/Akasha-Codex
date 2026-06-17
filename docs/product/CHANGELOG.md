# 绯典阁 Changelog

## 2026-06-16

- Added collection selection page scrolling for libraries with many catalog categories.
- Added right-click quick delete on catalog character cards, using the existing confirmation flow.
- Removed the experimental NIKKE skeletal animation preview and runtime dependency after local testing showed poor presentation quality.
- Stopped treating NIKKE raw atlas textures as portrait art in the import requirements; separated body-part atlases must be skipped and reported.

## 2026-06-15

- Added explicit large-library scale targets for `10,000` characters, `1,000` stories, and `100,000` local asset files.
- Added catalog performance requirements for virtualized card rendering, responsive search input, indexed filtering/sorting/counts, lazy image loading, and summary-first character loading.
- Added knowledge-base performance requirements for indexed wiki-link lookup, reusable story backlink indexes, and non-blocking library health checks.
- Added performance acceptance criteria covering `10,000` character catalog checks and indexed story backlink behavior.
- Added local test import rules requiring separate work-title collections, full-body portrait preference, 战双意识 three-portrait completeness, 深空之眼钥从 large art, retained 洛克人 Zero/ZX/ZXA imports, and additional 洛克人 X DiVE portrait sources with same-name merge behavior.

## 2026-06-12

- Expanded the app into a local knowledge base with separate encyclopedia and story archive modules.
- Added story categories, story CRUD, rich text blocks, story image imports, and local `story-catalog.json` / `stories/<id>/story.json` storage.
- Added `[[Character Name]]` story links that open encyclopedia detail windows.
- Added derived character backlinks showing which stories reference each encyclopedia entry.
- Added `Knowledge-Base-Development-Manual.md` for future story/backlink/MCP or skill work.

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
