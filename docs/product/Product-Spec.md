# 绯典阁 Product Spec

## Goal

绯典阁 is a local character encyclopedia for anime/game-style collections. The core experience is a game-catalog browsing flow: custom wallpaper home screen, collection entrance, rectangular character grid, right-side preview drawer, full-screen character detail with inline editing, and local asset management.

The desktop app remains a local file-based Electron product. The Android app uses Capacitor and keeps an independent local app-data library. The product does not scrape online data, upload assets, or generate/clone voices in this phase.

## Target User

The target user collects character images, portraits, voice files, tags, source metadata, and personal notes. They want a polished catalog that feels closer to a game encyclopedia than a plain CRUD database, while keeping the files readable and portable on disk.

## Current Scope

- Custom home wallpaper.
- Collection/folder entrance between home and catalog.
- Catalog grid with avatar, name, source, tags, search, sorting, tag filtering, and collection shortcut filters.
- Right-side character preview drawer.
- Full-screen character detail with inline view/edit modes, multiple portraits, description, notes, voice playback, and attachment metadata.
- Character editing for classification, tags, multiple avatars, cover portrait, voices, notes, and attachments.
- Tag governance for character tags and collection tag rules.
- Local `catalog.json` for wallpaper, collection definitions, icons, and tag rules.
- Local `character.json` files for every character entry.
- Windows Electron package.
- Android Capacitor package with an independent local library and no bundled third-party asset packs.

## Non-Goals

- No voice cloning or cloud voice generation in this phase.
- No online asset scraping.
- No automatic use of copyrighted game assets.
- No 3D model workbench, animation editor, rigging, pose editor, or PMX preview surface.
- No bundled Live2D/Cubism runtime or skeletal animation preview surface in the main catalog.
- No account system or remote sync.
- No cloud database, remote indexing service, or account-bound search backend for large local libraries.
- No AI tag auto-classification or remote taxonomy service in the first tag-governance release.
- No bulk deletion of tags that are still used by characters without an explicit future preview/confirmation design.

## Functional Requirements

- The user can start at a wallpaper home screen and enter the catalog through a central button.
- The user can select a collection such as `全部角色`, a work title, an artist group, or any custom tag-rule group.
- The catalog shows rectangular character cards with avatar and name.
- The catalog can search by name, source, alias, tag, description, or note.
- The catalog can filter by tag and collection.
- The catalog can sort by updated time, created time, name, or source.
- Clicking a character opens the right-side preview drawer without leaving the grid.
- Clicking the preview drawer expands into full-screen detail.
- Clicking Edit in detail switches the detail page into inline edit mode.
- Avatar and portrait images open a larger lightbox preview with zoom and drag.
- Multiple avatars can be imported, and one avatar can be marked as the primary avatar.
- Multiple portraits can be imported, and one portrait can be marked as the cover portrait.
- Voices are local assets with label, optional line text, file path, and audio playback.
- The inline editor can save character metadata and import avatar, portrait, voice, model, or generic attachments.
- The inline editor can remove avatar, portrait, voice, model, and generic attachment references from the local library entry.
- The app copies imported assets into the active library and never references arbitrary source paths as the canonical asset.
- The app stores settings in `config/acgplan-settings.json`.

## Tag Governance Requirements

Character tags are shared product data, not loose decoration. The app must expose a tag governance surface inside settings so the user can keep character tags, collection rules, and catalog filters consistent as the library grows.

MVP scope:

- Show one unified character tag index derived from all character `tags[]` plus all catalog collection `tagRules[]`.
- For every tag, show character usage count, collection-rule usage count, and whether the tag is an invalid rule that no character currently uses.
- Merge one source tag into one target tag. The operation must update every affected character `tags[]`, de-duplicate tags per character, update every matching collection `tagRules[]`, and refresh catalog filters and collection counts from the same resulting index.
- Rename a tag by applying the same data mutation as a merge into a new target tag name.
- Delete an unused tag rule. MVP deletion is limited to tags with zero character usage; it removes that tag from collection `tagRules[]` so invisible conditions do not stay behind.
- Prevent no-op or dangerous operations: empty target tag, same source/target tag, deleting a character-used tag, and creating duplicate tags inside one character.
- Persist all affected character JSON files and `catalog.json` through the existing local library save path.

Non-goals for this release:

- Story tags and story category rules stay outside this pass.
- Tag synonyms, aliases, hierarchical taxonomy, batch import mapping, and AI tagging stay in backlog.
- Destructive deletion of character-used tags requires a later preview screen and is not part of MVP.

## Local Test Import Requirements

External game/wiki import scripts are local test-data utilities, not shipped online scraping features. Imported third-party assets must stay in the local `library/` and out of public builds.

- Each imported work title must have its own catalog collection when it is used as a test source, including `二重螺旋`, `洛克人 Zero/ZX/ZXA`, and `洛克人 X DiVE`.
- `DNF`, `鸣潮`, and `胜利女神：NIKKE` test imports must store one or more local portrait images plus a local character introduction/description for every imported entry when the source exposes them.
- Test import scripts must set `collectionIds[]` to the matching work collection instead of relying only on broad tags.
- Character portrait imports should prefer full-body official/key-art style images. Half-body close-ups, thumbnails, square icons, and UI item icons are acceptable only as explicit fallbacks and must be reported as such.
- NIKKE `l2d` raw atlas PNG files must not be imported as portraits because they contain separated body parts.
- NIKKE importer must keep only safe static avatars/profile metadata and report skipped raw atlas assets.
- `战双帕弥什` weapon图鉴 is out of scope for the current test data. 战双意识 imports should include only entries where the source page exposes all three full-body awareness portraits.
- `深空之眼` weapon/钥从 imports should use detail-page large portrait art, not list-page avatar icons.
- `洛克人` test imports should keep the older Zero/ZX/ZXA wiki category images and also import `Mega Man X DiVE` / `Rockman X DiVE` character portrait sources. Same-name Zero/ZX/ZXA portraits should be merged into the existing X DiVE entry as additional portraits instead of creating duplicate same-name entries.

## Performance And Scale Requirements

The local encyclopedia must stay usable when the user's library grows from test data into a real collection. The scale target is:

- At least `10,000` character entries.
- At least `1,000` story entries.
- At least `100,000` locally managed asset files across avatars, portraits, voices, models, attachments, story images, wallpapers, and icons.

Catalog browsing requirements:

- The catalog grid must not mount every matching character card at once. It must render only the visible range plus a small overscan buffer.
- Typing in catalog search must keep the input responsive while search results update in the background.
- Search, tag filtering, collection filtering, and sorting must run against precomputed character search/index metadata instead of rebuilding searchable text for every character on every keystroke.
- Collection and tag counts must be derived in one indexed pass over the library data instead of scanning the full character array once per collection.
- Character list rows/cards must use lightweight summary data. Full character detail payloads and complete asset lists should be loaded or expanded only when the user opens preview/detail/edit surfaces.
- Catalog card images should load lazily and should prefer thumbnails or the smallest available preview asset when a platform can provide one.
- Collection selection must remain reachable when the collection list exceeds one screen. Mouse-wheel scrolling on the collection selection page is required; pagination may be added later if the list becomes too dense.
- Character cards must expose a right-click context menu with a quick delete action that reuses the existing delete confirmation flow.

Knowledge-base requirements:

- Story wiki-link lookup must use a precomputed label index keyed by character id, name, and aliases.
- Story backlinks must be derived through a reusable `characterId -> backlinks` index instead of recomputing all story links for every character render.
- Library health checks must avoid `characters x stories x labels` scans during normal screen render. Expensive checks should run from cached indexes or an explicit refresh path.

Performance acceptance targets:

- With `10,000` characters and representative tags, collections, descriptions, and notes, changing catalog search text, tag filter, collection filter, or sort mode should present updated visible results within `200ms` on a typical desktop development machine.
- The catalog input should remain editable without visible keystroke lag while filtering `10,000` characters.
- The catalog grid should keep mounted character card DOM nodes bounded by viewport size and overscan, not by total match count.
- Opening a character preview/detail should not require reloading or recomputing the entire character library.
- Mobile runtime must not eagerly convert every library asset into base64 data URLs when loading the character list.

## Data Structure

```text
library/
  catalog.json
  catalog-assets/
    wallpapers/
    icons/
  characters/
    <character-id>/
      character.json
      avatar/
      portraits/
      voices/
      attachments/
      models/
```

`catalog.json` stores:

- `wallpaperPath`
- `collections[]` with id, name, description, icon path, and tag rules
- default sort and quick filter defaults

`character.json` stores:

- base fields: id, name, source, aliases, tags, description, notes
- `collectionIds[]`
- primary avatar, all avatar paths, cover portrait, and all portrait paths
- `voiceAssets[]`
- attachment and model paths
- created/updated timestamps

Legacy `voicePaths[]` and model fields remain readable.

## Success Criteria

- `node --check electron/main.cjs` passes.
- `node --check electron/preload.cjs` passes.
- `npm run build` passes.
- `npm run android:sync` passes when the Android toolchain is available.
- Home screen shows a wallpaper and a central catalog entry button.
- Collection screen contains `全部角色` and at least one test collection.
- Catalog grid search, sort, tag filter, and collection shortcut filter work.
- Character preview drawer and full-screen detail work.
- Image lightbox and voice playback work for local assets.
- Removing a character or asset persists to disk.
- Three.js preview dependencies are removed from runtime dependencies.
- A generated or fixture-backed `10,000` character performance check proves catalog filtering, sorting, collection counts, and visible-grid rendering stay within the scale targets.
- Story backlinks and library health checks use indexed lookup paths and do not recompute every story link for every character during normal screen render.

## Knowledge Base Expansion

The encyclopedia is now one module inside a broader local knowledge base. Its responsibility remains character entries, portraits, local assets, notes, and character story material. A separate story archive module stores rich text records such as game-story summaries, lore notes, and illustrated article-like entries.

The story archive must support:

- Story categories with the same mental model as encyclopedia collections: manual category assignment plus tag-rule matching.
- Story search across title, subtitle, summary, tags, body text, captions, and linked entry names.
- Rich text blocks for headings, paragraphs, quotes, and images.
- Inline wiki links written as `[[Character Name]]`; clicking the rendered link opens the matching encyclopedia entry detail window.
- Explicit linked encyclopedia entries for cases where a story should reference a character even without an inline mention.
- Derived backlinks on encyclopedia entries showing which stories cite the entry, similar to an Obsidian backlink panel.

Story data is local-first and file based:

```text
library/
  story-catalog.json
  stories/
    <story-id>/
      story.json
      images/
```

`story-catalog.json` stores story categories and default story sorting. `story.json` stores title, subtitle, summary, tags, `categoryIds[]`, `linkedCharacterIds[]`, rich text `blocks[]`, cover image path, and timestamps. Story image imports are copied into the story folder and never referenced from arbitrary source paths as canonical assets.
