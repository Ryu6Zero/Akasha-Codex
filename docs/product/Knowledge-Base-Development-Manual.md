# ACGPlan Knowledge Base Development Manual

## Product Shape

ACGPlan is a local-first knowledge base for ACG collections. The encyclopedia module owns character entries, portraits, local assets, notes, and character-focused story material. The story archive module owns illustrated rich text records, article-like notes, lore summaries, and cross-links back to encyclopedia entries.

Do not collapse these two modules into one page. The split is the product: entries are stable nouns; stories are authored records that cite those nouns.

## Data Rules

- Character entries live in `library/characters/<character-id>/character.json`.
- Story entries live in `library/stories/<story-id>/story.json`.
- Story categories live in `library/story-catalog.json`.
- Imported story images are copied into `library/stories/<story-id>/images/`.
- Renderable image URLs are payload-only. Do not persist `imageUrl`, `coverImageUrl`, or other file URL fields.
- Backlinks are derived from story records at read time. Do not duplicate backlink arrays into character JSON.

## Link Rules

- Inline encyclopedia links use `[[Character Name]]`.
- Story editing should add links through searchable `@` insertion or a compact reference picker, not by rendering every encyclopedia entry as a checkbox list.
- Matching checks character id, character name, and aliases.
- A story can also use `linkedCharacterIds[]` when the relation should exist without inline body text.
- Clicking a story link opens the existing full-screen character detail window.
- Clicking a character backlink opens the story archive and selects the source story.

## UI Rules

- Keep the home screen as a module gateway: encyclopedia and story archive are peer destinations.
- Keep the encyclopedia grid optimized for scanning characters.
- Keep the story archive optimized for reading and editing long-form records.
- Story category controls should feel like encyclopedia collections: quick filters first, category management second.
- Do not put a 3D or model workbench into story or character detail surfaces.

## Future Skill Or MCP Boundary

Build a project-specific Codex skill only after there are repeated agent tasks, such as bulk story import, backlink audits, library repair, or schema migrations. A useful first skill would route agents to:

- inspect `Product-Spec.md`, `DEV-PLAN.md`, and this manual first;
- preserve the file-based library layout;
- derive backlinks instead of persisting them;
- run `npx tsc --noEmit`, `node --check electron/story-service.cjs`, and `npm run build` after feature work.

Build an MCP server only if an external tool needs live access to the local ACGPlan library. The MCP should expose read-only story/character search first, then add write tools only after schema validation and backup behavior are defined.
