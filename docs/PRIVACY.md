# Privacy Notes

绯典阁 is designed as a local-first catalog application.

## Local Data

- Character libraries are stored in local `library/` directories.
- App configuration is stored in local `config/` directories.
- The application does not provide a cloud sync service.
- The repository must not include user libraries, private notes, screenshots with personal paths, or generated release artifacts.

## Asset Sources

- Imported images, audio, models, and attachments are user-managed local assets.
- Third-party assets and imported catalog data remain local to the user's selected library folder.
- Full third-party asset packs should not be committed to this repository.

## Open Source Boundary

Code, documentation, and reproducible tooling belong in the repository.
Private catalogs, generated builds, downloaded copyrighted assets, API keys, and machine-specific configuration do not.
