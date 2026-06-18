# Changelog

All notable project-level changes are tracked here. Product planning history remains in `docs/product/CHANGELOG.md`.

## 0.1.1-dev.4 - Catalog Scale And Release Guardrails

### Added

- Virtualized catalog card rendering for large character libraries.
- Indexed catalog search, filtering, sorting, tag lookup, and collection counts.
- Summary-first character loading with lazy detail loading on preview, edit, delete, and story-link flows.
- Indexed story wiki-link and backlink lookup paths for story archive and library health checks.
- A generated `10,000` character performance test covering catalog search, filters, sorting, and counts.
- Open-source boundary checks for local import tools and Ryu6 workflow files.

### Changed

- Local import scripts are treated as private test-data utilities unless explicitly reviewed for public release.
- Missing GitHub CLI now reports as a local release verification warning instead of a source release blocker.

## 0.1.0 - Initial Open Source Release

### Added

- Local-first Electron + React character catalog.
- Home wallpaper, wallpaper crop flow, and adjustable wallpaper opacity.
- Collection shortcuts backed by selectable tag rules.
- Catalog grid with search, tag filtering, sorting, preview drawer, and fullscreen detail.
- Inline detail editing for names, source, aliases, tags, descriptions, notes, avatars, portraits, voices, models, and attachments.
- Multi-avatar support, main avatar selection, multi-portrait support, and cover portrait selection.
- Image lightbox with zoom, drag, reset, and gallery navigation.
- Avatar and wallpaper cropper.
- Desktop library settings and configurable local library root.
- Capacitor Android project scaffold with an independent app-data library.
- Open-source guardrails: privacy notes, contribution guide, issue templates, PR template, CI, Windows portable packaging workflow, and open-source audit script.

### Notes

- The repository does not include user libraries, generated builds, API keys, downloaded copyrighted asset packs, or bulk-import results.
- The Windows portable executable is produced as a release artifact, not committed to Git.
