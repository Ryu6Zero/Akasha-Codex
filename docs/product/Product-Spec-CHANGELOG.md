# Product Spec Changelog

## 2026-06-18

- Added the character tag governance center scope: unified tag index, usage counts, invalid collection-rule detection, tag merge/rename, and unused-rule cleanup.
- Kept story tags, AI tagging, synonyms, taxonomy, and destructive deletion of character-used tags out of the MVP.
- Added a read-only character asset completeness report scope that exports JSON and Markdown reports with missing references, orphan files, size totals, and largest character folders.
- Added structured character profile fields so official/source facts are displayed and edited separately from user-written introductions and notes.
- Added import/re-import protection rules: official facts map into structured fields, while existing user-written introductions and notes survive metadata refreshes.
- Added catalog batch-selection deletion requirements and local-only `Project Neural Cloud` test import scope.

## 2026-06-16

- Removed the experimental NIKKE skeletal animation preview scope after local testing showed poor presentation quality.
- Removed local animation triple downloads from the NIKKE importer; it now keeps only static avatar/profile metadata and skipped-atlas reporting.
- Required the collection selection page to stay scrollable when catalog categories exceed one screen.
- Added a character-card right-click quick delete requirement that must reuse the existing delete confirmation flow.
- Required raw NIKKE `l2d` atlas PNG files to be skipped and reported because they are separated body-part textures, not composed portrait sources.

## 2026-06-15

- Added local test import scope for `DNF`, `鸣潮`, and `胜利女神：NIKKE`.
- Required these imports to persist character portraits and character introductions locally, under their own catalog collections.
