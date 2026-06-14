# 绯典阁 Development Plan

## Phase 1: Product Documents

Status: complete.

- Reframe the app as a game-style local character encyclopedia.
- Add the design brief.
- Define the composite navigation flow and local-only voice scope.

## Phase 2: Data And Desktop APIs

Status: complete.

- Add `catalog.json` and catalog asset folders.
- Add collection metadata, wallpaper opacity, collection icons, and tag rules.
- Add structured voice assets while reading legacy `voicePaths`.
- Add desktop APIs for catalog metadata, wallpaper/icon import, character deletion, and asset removal.
- Ensure imported files get unique names and stay inside the active library.

## Phase 3: Composite Catalog UI

Status: complete.

- Build Home, Collections, Catalog, Preview Drawer, Fullscreen Detail, inline edit, and Settings views.
- Add collection shortcuts, tag filters, search, and sorting.
- Keep image preview and voice playback visible in detail surfaces.
- Add image lightbox zoom and drag interactions.

## Phase 4: Asset Editing And Test Data

Status: complete.

- Add editor controls for collection assignment and voice metadata.
- Add remove controls for avatar, portraits, voices, model attachments, and generic attachments.
- Add avatar crop and wallpaper crop flows.
- Keep user-provided test data outside the open-source repository.

## Phase 5: External Data Boundary

Status: complete.

- Keep public builds focused on local browsing, editing, filtering, and asset management.
- Keep bulk external data importers outside the public repository unless their data source and license are explicitly approved.
- Document that imported third-party assets and generated libraries are local-only user data.
- Use JP sprite model data as fallback when CN static model manifests are missing.
- Keep full external assets out of the open-source repository.

## Phase 6: Cleanup And Open-Source Readiness

Status: in progress.

- Remove unused 3D preview code and Three.js dependencies.
- Clean historical `dist` and `release` output before builds.
- Add README, MIT license, contribution guide, open-source checklist, and audit script.
- Run syntax checks, production build, open-source audit, and desktop smoke checks before publishing.

## Phase 7: Knowledge Base And Story Archive

Status: implemented.

- Add `story-catalog.json` and `stories/<story-id>/story.json` local library files.
- Add desktop IPC and mobile client methods for story catalog, story CRUD, story image import, and story image removal.
- Add a story archive module with category filters, tag filters, search, sorting, story reader, and story editor.
- Add rich text blocks for headings, paragraphs, quotes, and images.
- Render `[[Character Name]]` wiki links inside story text and open encyclopedia detail windows from those links.
- Replace the expanded all-character checklist with a blog-style editor and searchable `@` reference insertion.
- Add explicit story-to-character links and derived backlinks on character detail.
- Keep story backlinks derived from story records instead of duplicating reference state into character JSON.
