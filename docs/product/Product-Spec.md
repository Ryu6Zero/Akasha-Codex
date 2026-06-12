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
- Local `catalog.json` for wallpaper, collection definitions, icons, and tag rules.
- Local `character.json` files for every character entry.
- Windows Electron package.
- Android Capacitor package with an independent local library and no bundled third-party asset packs.

## Non-Goals

- No voice cloning or cloud voice generation in this phase.
- No online asset scraping.
- No automatic use of copyrighted game assets.
- No 3D model workbench, animation editor, rigging, pose editor, or PMX preview surface.
- No account system or remote sync.

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
