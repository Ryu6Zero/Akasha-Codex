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

## Phase 8: Catalog Scale And Performance

Status: benchmarked; pending final review.

Implemented:

- Added `@tanstack/react-virtual` and a virtualized catalog grid component for bounded card mounting.
- Added character catalog index helpers for searchable text, collection membership, tag lookup, filtering, sorting, and collection counts.
- Wired catalog search through React deferred values so text input can stay responsive while large result sets update.
- Added lazy image loading on catalog cards.
- Added indexed query tests, including a `10,000` character summary fixture.
- Added reusable story link indexes for wiki-label lookup, story-to-character ids, and character backlinks.
- Routed character detail backlinks, story linked-character display, broken-link checks, and library health through the shared story link index.
- Added desktop and mobile character summary APIs plus detail-by-id loading.
- Switched initial library load and post-delete refresh to character summaries.
- Loaded full character detail on preview expansion, edit, delete confirmation, and story-link detail navigation.
- Limited mobile character summaries to one preview image URL instead of eagerly converting every character asset to base64.
- Added a generated `10,000` character benchmark covering representative tags, collections, descriptions, notes, collection counts, search, tag filtering, collection filtering, and sorting. Each measured catalog operation is required to stay under `200ms`.

Key files:

- `package.json` — add the virtual list dependency if using TanStack Virtual.
- `src/App.tsx` — use deferred catalog inputs/results and pass indexed data into catalog and story surfaces.
- `src/components/CatalogView.tsx` — replace direct `characters.map` grid rendering with virtualized card rendering and lazy card images.
- `src/storage/characterQueries.ts` — introduce character search/index helpers, indexed filtering, sorting, tag extraction, and collection counts.
- `src/storage/storyStore.ts` — introduce wiki-label and backlink index builders.
- `src/storage/storyQueries.ts` — route broken-link lookup through the shared story/character indexes.
- `src/storage/libraryHealth.ts` — consume backlink and story-category indexes instead of recomputing full cross-products during render.
- `src/hooks/useLibraryData.ts` — load list summaries first and expose detail-loading paths when the platform supports them.
- `electron/character-service.cjs` — add summary list and detail-by-id APIs while keeping existing full-load APIs compatible during migration.
- `electron/preload.cjs` — expose the new desktop library summary/detail APIs.
- `src/platform/libraryClient.ts` — extend the shared client contract for summary/detail loading.
- `src/platform/mobileLibraryClient.ts` — return lightweight character summaries for list screens and lazy-load asset data URLs only for preview/detail surfaces.
- `src/storage/characterQueries.test.ts` — add correctness and scale tests for indexed catalog filtering, sorting, and counts.
- `src/storage/storyStore.test.ts` — add correctness tests for label and backlink indexes.
- `src/storage/storyQueries.test.ts` — add broken-link and health lookup tests using indexed paths.

Acceptance criteria:

- `npm test` passes, including generated or fixture-backed checks with at least `10,000` character summaries.
- `npm run build` passes in an environment with the required shell tools.
- Catalog search, tag filter, collection filter, and sort changes present updated visible results within `200ms` on a typical desktop development machine with `10,000` characters.
- The search input remains editable without visible keystroke lag during large-library filtering.
- The catalog grid keeps mounted card DOM nodes bounded by viewport size and overscan, not by total matching character count.
- Opening preview/detail/edit for one character does not reload or recompute the entire library.
- Mobile character list loading does not eagerly convert all character assets into base64 data URLs.
- Story backlinks and library health no longer perform `characters x stories x labels` scans during normal screen render.

## Phase 9: Tag Governance Center

Status: implemented.

Scope:

- Add a reusable character tag governance module that builds one tag index from character `tags[]` and catalog collection `tagRules[]`.
- Add operations for renaming/merging tags across character JSON and collection rules, with per-character de-duplication.
- Add an unused-tag cleanup operation that removes zero-character tags from collection rules.
- Surface tag governance inside settings with usage counts, invalid-rule status, merge/rename controls, and cleanup actions.
- Persist affected character records and catalog metadata through the existing local library APIs.

Key files:

- `src/storage/tagGovernance.ts` — build the tag index and apply tag rename/merge/delete mutations.
- `src/storage/tagGovernance.test.ts` — cover usage counts, invalid rules, merge behavior, and unused-rule cleanup.
- `src/App.tsx` — own persistence for bulk tag governance operations and refresh selected tag/collection state.
- `src/components/SettingsPanel.tsx` — add the tag governance UI beside existing collection rule management.
- `src/styles/overlays.css` and `src/styles/responsive.css` — keep the settings surface dense, readable, and responsive.

Acceptance criteria:

- Settings shows all character tags and collection-rule-only tags with character count and rule count.
- Collection tag rules that point at no character-used tag are visibly marked as invalid.
- Merging tag A into tag B updates all affected characters, all collection tag rules, and catalog filtering without leaving duplicate tags.
- Renaming tag A to a new tag name produces the same consistent state as a merge.
- Deleting an unused tag removes it from collection rules and does not allow deleting a tag still used by characters.
- `npm test`, `npm run build`, `npm run prepare:open-source`, and `npm run release:check` pass or report only documented environment warnings.
