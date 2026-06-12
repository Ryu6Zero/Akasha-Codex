import { useCallback, useEffect, useMemo, useState } from 'react';
import { CatalogView } from './components/CatalogView';
import { CollectionsView } from './components/CollectionsView';
import { FullscreenDetail } from './components/FullscreenDetail';
import { HomeView } from './components/HomeView';
import { ImageCropper } from './components/ImageCropper';
import { SettingsPanel } from './components/SettingsPanel';
import { defaultCatalog } from './data/defaultCatalog';
import { sampleCharacters } from './data/sampleCharacters';
import { LanguageProvider } from './i18n/LanguageContext';
import { createLibraryClient, type LibraryClient } from './platform/libraryClient';
import { createEmptyCharacter, mergeCharacters } from './storage/characterStore';
import type { CatalogMetadata, Character, CropImageSelection, LibrarySettings, SortMode } from './types';

type AppScreen = 'home' | 'collections' | 'catalog';
type DetailMode = 'view' | 'edit';

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const [libraryClient, setLibraryClient] = useState<LibraryClient | null | undefined>(undefined);
  const [screen, setScreen] = useState<AppScreen>('home');
  const [catalog, setCatalog] = useState<CatalogMetadata>(defaultCatalog);
  const [characters, setCharacters] = useState<Character[]>(sampleCharacters);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>('view');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [wallpaperCropSelection, setWallpaperCropSelection] = useState<CropImageSelection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('updatedAt');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    createLibraryClient().then((client) => {
      if (isMounted) setLibraryClient(client);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const reloadLibrary = useCallback(async (): Promise<void> => {
    if (libraryClient === undefined) return;
    setIsLoading(true);

    if (!libraryClient) {
      setCatalog(defaultCatalog);
      setCharacters(sampleCharacters);
      setSelectedCharacterId(sampleCharacters[0]?.id ?? null);
      setIsLoading(false);
      return;
    }

    const [nextSettings, nextCatalog, nextCharacters] = await Promise.all([
      libraryClient.getSettings(),
      libraryClient.getCatalog(),
      libraryClient.getLibraryCharacters(),
    ]);

    setSettings(nextSettings);
    setCatalog(nextCatalog);
    setSortMode(nextCatalog.defaultSortMode);
    setCharacters(nextCharacters);
    setSelectedCharacterId((currentId) => {
      if (currentId && nextCharacters.some((character) => character.id === currentId)) return currentId;
      return nextCharacters[0]?.id ?? null;
    });
    setIsLoading(false);
  }, [libraryClient]);

  useEffect(() => {
    reloadLibrary();
  }, [reloadLibrary]);

  const availableTags = useMemo(() => {
    const tags = characters.flatMap((character) => character.tags || []).filter(Boolean);
    return [...new Set(tags)].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const selectedCollection = catalog.collections.find((collection) => collection.id === selectedCollectionId);
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return characters
      .filter((character) => {
        const collectionMatch =
          selectedCollectionId === 'all' ||
          character.collectionIds?.includes(selectedCollectionId) ||
          selectedCollection?.tagRules.some((rule) => characterMatchesCollectionRule(character, rule));
        const tagMatch = selectedTag ? character.tags?.includes(selectedTag) : true;
        const queryMatch = normalizedQuery ? characterMatchesText(character, normalizedQuery) : true;
        return collectionMatch && tagMatch && queryMatch;
      })
      .sort((a, b) => sortCharacters(a, b, sortMode));
  }, [catalog.collections, characters, searchQuery, selectedCollectionId, selectedTag, sortMode]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? filteredCharacters[0] ?? null,
    [characters, filteredCharacters, selectedCharacterId],
  );
  const fullscreenCharacter = detailCharacter ?? selectedCharacter;

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    catalog.collections.forEach((collection) => {
      const count =
        collection.id === 'all'
          ? characters.length
          : characters.filter(
              (character) =>
                character.collectionIds?.includes(collection.id) ||
                collection.tagRules.some((rule) => characterMatchesCollectionRule(character, rule)),
            ).length;
      counts.set(collection.id, count);
    });
    return counts;
  }, [catalog.collections, characters]);

  function enterCollection(collectionId: string): void {
    setSelectedCollectionId(collectionId);
    setScreen('catalog');
    setIsSettingsOpen(false);
    setDetailCharacter(null);
  }

  function openFullscreen(mode: DetailMode): void {
    setDetailCharacter(null);
    setDetailMode(mode);
    setIsFullscreenOpen(true);
  }

  function handleCreateCharacter(): void {
    const character = {
      ...createEmptyCharacter(),
      collectionIds: selectedCollectionId === 'all' ? [] : [selectedCollectionId],
    };
    setDetailCharacter(character);
    setSelectedCharacterId(character.id);
    setDetailMode('edit');
    setIsFullscreenOpen(true);
    setIsSettingsOpen(false);
  }

  async function handleSaveCharacter(character: Character): Promise<void> {
    const savedCharacter = { ...character, updatedAt: new Date().toISOString() };
    const persistedCharacter = libraryClient ? await libraryClient.saveCharacter(savedCharacter) : savedCharacter;

    setCharacters((currentCharacters) => {
      const exists = currentCharacters.some((currentCharacter) => currentCharacter.id === persistedCharacter.id);
      return exists
        ? currentCharacters.map((currentCharacter) =>
            currentCharacter.id === persistedCharacter.id ? persistedCharacter : currentCharacter,
          )
        : [persistedCharacter, ...currentCharacters];
    });
    setSelectedCharacterId(persistedCharacter.id);
    setDetailCharacter(null);
    setDetailMode('view');
    setIsFullscreenOpen(true);
  }

  async function handleDeleteCharacter(character: Character): Promise<void> {
    if (!window.confirm(`删除“${character.name || '未命名角色'}”？这个操作会删除资料库中的角色文件夹。`)) return;

    if (libraryClient) {
      const nextCharacters = await libraryClient.deleteCharacter(character);
      setCharacters(nextCharacters);
      setSelectedCharacterId(nextCharacters[0]?.id ?? null);
    } else {
      setCharacters((currentCharacters) => currentCharacters.filter((currentCharacter) => currentCharacter.id !== character.id));
    }
    setDetailCharacter(null);
    setIsFullscreenOpen(false);
  }

  async function handleImportDirectory(): Promise<void> {
    if (!libraryClient) return;
    const importedCharacters = await libraryClient.importCharacterDirectory();
    if (!importedCharacters.length) return;
    setCharacters((currentCharacters) => mergeCharacters(importedCharacters, currentCharacters));
    setSelectedCharacterId(importedCharacters[0].id);
  }

  async function handleSelectLibraryRoot(): Promise<void> {
    if (!libraryClient) return;
    const nextSettings = await libraryClient.selectLibraryRoot();
    setSettings(nextSettings);
    await reloadLibrary();
  }

  async function handleImportWallpaper(): Promise<void> {
    if (!libraryClient) return;
    setWallpaperCropSelection(await libraryClient.selectImageForCatalogCrop());
  }

  async function handleSaveWallpaper(imageDataUrl: string, fileName: string): Promise<void> {
    if (!libraryClient) return;
    setCatalog(await libraryClient.saveCroppedWallpaper(imageDataUrl, fileName));
    setWallpaperCropSelection(null);
  }

  async function handleSaveCatalog(nextCatalog: CatalogMetadata): Promise<void> {
    const persistedCatalog = libraryClient ? await libraryClient.saveCatalog(nextCatalog) : nextCatalog;
    setCatalog(persistedCatalog);
    setSelectedCollectionId((currentId) =>
      persistedCatalog.collections.some((collection) => collection.id === currentId) ? currentId : 'all',
    );
  }

  async function handleImportCollectionIcon(collectionId: string): Promise<void> {
    if (!libraryClient) return;
    setCatalog(await libraryClient.importCatalogAsset('collectionIcon', collectionId));
  }

  async function handleSaveCollectionIcon(collectionId: string, imageDataUrl: string, fileName: string): Promise<void> {
    if (!libraryClient) return;
    setCatalog(await libraryClient.saveCollectionIcon(collectionId, imageDataUrl, fileName));
  }

  function cancelDetailEdit(character: Character): void {
    const isPersisted = characters.some((currentCharacter) => currentCharacter.id === character.id);
    setDetailCharacter(null);
    setDetailMode('view');
    if (!isPersisted) setIsFullscreenOpen(false);
  }

  return (
    <main className={`app-root screen-${screen}`}>
      {screen === 'home' ? (
        <HomeView
          catalog={catalog}
          isLoading={isLoading}
          onEnter={() => setScreen('collections')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : null}

      {screen === 'collections' ? (
        <CollectionsView
          catalog={catalog}
          collectionCounts={collectionCounts}
          onBackHome={() => setScreen('home')}
          onSelectCollection={enterCollection}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : null}

      {screen === 'catalog' ? (
        <CatalogView
          catalog={catalog}
          characters={filteredCharacters}
          availableTags={availableTags}
          collectionCounts={collectionCounts}
          selectedCollectionId={selectedCollectionId}
          selectedCharacter={selectedCharacter}
          searchQuery={searchQuery}
          selectedTag={selectedTag}
          sortMode={sortMode}
          onBackCollections={() => setScreen('collections')}
          onSelectCollection={setSelectedCollectionId}
          onSearchQueryChange={setSearchQuery}
          onSelectedTagChange={setSelectedTag}
          onSortModeChange={setSortMode}
          onSelectCharacter={setSelectedCharacterId}
          onOpenFullscreen={() => openFullscreen('view')}
          onCreateCharacter={handleCreateCharacter}
          onEditCharacter={(character) => {
            setSelectedCharacterId(character.id);
            openFullscreen('edit');
          }}
          onDeleteCharacter={handleDeleteCharacter}
          onImportDirectory={libraryClient?.platform === 'desktop' ? handleImportDirectory : undefined}
          onSaveCollectionIcon={libraryClient ? handleSaveCollectionIcon : undefined}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : null}

      {isFullscreenOpen && fullscreenCharacter ? (
        <FullscreenDetail
          catalog={catalog}
          character={fullscreenCharacter}
          mode={detailMode}
          libraryClient={libraryClient}
          onModeChange={setDetailMode}
          onSave={handleSaveCharacter}
          onCancelEdit={cancelDetailEdit}
          onClose={() => {
            setDetailCharacter(null);
            setDetailMode('view');
            setIsFullscreenOpen(false);
          }}
          onDelete={() => handleDeleteCharacter(fullscreenCharacter)}
        />
      ) : null}

      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          catalog={catalog}
          availableTags={availableTags}
          onSelectLibraryRoot={handleSelectLibraryRoot}
          onOpenLibraryRoot={async () => {
            await libraryClient?.openLibraryRoot();
          }}
          onImportWallpaper={handleImportWallpaper}
          onSaveCatalog={handleSaveCatalog}
          onImportCollectionIcon={libraryClient ? handleImportCollectionIcon : undefined}
          onClose={() => setIsSettingsOpen(false)}
        />
      ) : null}

      {wallpaperCropSelection ? (
        <ImageCropper
          selection={wallpaperCropSelection}
          title="裁切首页壁纸"
          confirmLabel="保存壁纸"
          aspectRatio={16 / 9}
          outputWidth={1920}
          outputHeight={1080}
          previewMode="wallpaper"
          onCancel={() => setWallpaperCropSelection(null)}
          onConfirm={handleSaveWallpaper}
        />
      ) : null}
    </main>
  );
}

function characterMatchesText(character: Character, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const searchableText = [
    character.name,
    character.sourceTitle,
    character.description,
    character.notes,
    ...(character.aliases || []),
    ...(character.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function characterMatchesCollectionRule(character: Character, rule: string): boolean {
  const normalizedRule = rule.trim().toLowerCase();
  if (!normalizedRule) return false;
  return [...(character.tags || []), ...(character.collectionIds || [])].some((value) =>
    value.toLowerCase() === normalizedRule,
  );
}

function sortCharacters(a: Character, b: Character, sortMode: SortMode): number {
  if (sortMode === 'name') return a.name.localeCompare(b.name, 'zh-CN');
  if (sortMode === 'sourceTitle') return a.sourceTitle.localeCompare(b.sourceTitle, 'zh-CN');
  if (sortMode === 'createdAt') return b.createdAt.localeCompare(a.createdAt);
  return b.updatedAt.localeCompare(a.updatedAt);
}
