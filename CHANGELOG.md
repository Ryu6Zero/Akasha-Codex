# Changelog

All notable project-level changes are tracked here. Product planning history remains in `docs/product/CHANGELOG.md`.

## 0.1.1-dev.9 - Batch Delete And Neural Cloud Import Prep

### Added

- Added catalog batch selection mode with select-current, clear, and danger-confirmed batch deletion.
- Added selection-state tests for filtered batch selection boundaries.
- Prepared a local-only Project Neural Cloud import utility for private library use.

### Changed

- Product spec and development plan now define batch destructive cleanup and local-only Project Neural Cloud import scope.

## 0.1.1-dev.8 - Import-Safe Structured Profiles

### Added

- Added a shared import merge helper for import-safe character metadata refreshes.
- Added tests that prove re-imports preserve user-written descriptions and notes.
- Added profile-field merge behavior that refreshes stable imported fields while keeping user-created fields.

### Changed

- Product spec and development plan now define import/re-import protection for structured character facts.
- Local private import scripts can use the shared helper to map official facts into `profileFields[]` without overwriting user prose.

## 0.1.1-dev.7 - Structured Character Profiles

### Added

- Character records now support structured `profileFields[]` for official/source facts.
- Fullscreen detail now shows structured profile facts separately from the user-written introduction and personal notes.
- Detail edit mode can add, update, and remove structured profile fields inline.
- Catalog search now includes structured profile field groups, labels, and values.
- Added normalization tests that preserve user descriptions while cleaning empty and duplicate profile rows.

### Changed

- Product spec and development plan now define the structured profile field MVP boundary.

## 0.1.1-dev.6 - Asset Completeness Report

### Added

- Settings now includes a read-only character asset completeness report generator.
- Desktop report generation writes JSON and Markdown reports under `library/reports/`.
- Reports include asset counts, missing references, orphan files, total managed asset size, and largest character folders Top 20.
- Added a filesystem-backed test for report generation with missing references and orphan files.

### Changed

- Product spec and development plan now define the asset-report MVP boundary and non-goals.

## 0.1.1-dev.5 - Tag Governance Center

### Added

- Settings now includes a character tag governance surface with usage counts and invalid collection-rule detection.
- Added tag merge/rename logic that updates affected character tags and collection tag rules together.
- Added unused tag-rule cleanup for tags no character currently uses.
- Added unit tests for tag usage indexing, invalid rules, merge behavior, and cleanup guards.

### Changed

- Product spec and development plan now define the tag governance MVP boundary.

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
