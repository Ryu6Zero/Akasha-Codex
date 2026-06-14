import { useMemo, useState } from 'react';
import { CatalogView } from './components/CatalogView';
import { CollectionsView } from './components/CollectionsView';
import { ConfirmDialog } from './components/ConfirmDialog';
import { FullscreenDetail } from './components/FullscreenDetail';
import { HomeView } from './components/HomeView';
import { ImageCropper } from './components/ImageCropper';
import { SettingsPanel } from './components/SettingsPanel';
import { StoryArchiveView } from './components/stories/StoryArchiveView';
import { useCharacterActions } from './hooks/useCharacterActions';
import { useLibraryData } from './hooks/useLibraryData';
import { useSound } from './hooks/useSound';
import { useStoryActions } from './hooks/useStoryActions';
import { LanguageProvider } from './i18n/LanguageContext';
import { loadAppPreferences, saveAppPreferences } from './storage/appPreferences';
import { countCharactersByCollection, filterCharactersForCatalog, getAvailableCharacterTags } from './storage/characterQueries';
import { deriveStoryLinkedCharacterIds, getStoryBacklinks } from './storage/storyStore';
import type {
  AppPreferences,
  CatalogMetadata,
  Character,
  CropImageSelection,
  Story,
  StoryCatalogMetadata,
} from './types';

type AppScreen = 'home' | 'collections' | 'catalog' | 'stories';
type DetailMode = 'view' | 'edit';
type DeleteTarget = { type: 'character'; character: Character } | { type: 'story'; story: Story };

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const {
    libraryClient,
    catalog,
    setCatalog,
    characters,
    setCharacters,
    storyCatalog,
    setStoryCatalog,
    stories,
    setStories,
    settings,
    setSettings,
    selectedCharacterId,
    setSelectedCharacterId,
    selectedStoryId,
    setSelectedStoryId,
    sortMode,
    setSortMode,
    isLoading,
    reloadLibrary,
  } = useLibraryData();
  const [screen, setScreen] = useState<AppScreen>('home');
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>('view');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [wallpaperCropSelection, setWallpaperCropSelection] = useState<CropImageSelection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [appPreferences, setAppPreferences] = useState<AppPreferences>(() => loadAppPreferences());
  const characterActions = useCharacterActions({ libraryClient, setCharacters, setSelectedCharacterId });
  const storyActions = useStoryActions({ libraryClient, setStories, setStoryCatalog, setSelectedStoryId });
  const playSound = useSound(appPreferences);

  const availableTags = useMemo(() => getAvailableCharacterTags(characters), [characters]);

  const filteredCharacters = useMemo(() => {
    return filterCharactersForCatalog({
      characters,
      collections: catalog.collections,
      searchQuery,
      selectedCollectionId,
      selectedTag,
      sortMode,
    });
  }, [catalog.collections, characters, searchQuery, selectedCollectionId, selectedTag, sortMode]);

  const selectedCharacter = useMemo(() => characters.find((character) => character.id === selectedCharacterId) ?? filteredCharacters[0] ?? null, [characters, filteredCharacters, selectedCharacterId]);
  const fullscreenCharacter = detailCharacter ?? selectedCharacter;
  const fullscreenStoryBacklinks = useMemo(
    () => (fullscreenCharacter ? getStoryBacklinks(fullscreenCharacter, stories, characters) : []),
    [characters, fullscreenCharacter, stories],
  );

  const collectionCounts = useMemo(() => countCharactersByCollection(catalog.collections, characters), [catalog.collections, characters]);
  const deleteDialog = useMemo(() => {
    if (!deleteTarget) return null;
    if (deleteTarget.type === 'character') {
      const character = deleteTarget.character;
      const backlinkCount = getStoryBacklinks(character, stories, characters).length;
      return {
        title: `删除角色「${character.name || '未命名角色'}」？`,
        message: '这个操作会删除资料库中的角色文件夹和托管资源。',
        details: [
          `图片 ${countCharacterImages(character)} 张`,
          `语音 ${character.voiceAssets.length} 条`,
          `附件 ${countCharacterAttachments(character)} 个`,
          `故事引用 ${backlinkCount} 条`,
        ],
        confirmLabel: '确认删除角色',
      };
    }

    const story = deleteTarget.story;
    const linkedCharacterCount = deriveStoryLinkedCharacterIds(story, characters).length;
    return {
      title: `删除故事「${story.title || '未命名故事'}」？`,
      message: '这个操作会删除故事记录和故事目录中的托管图片。',
      details: [
        `图片 ${story.blocks.filter((block) => block.imagePath).length} 张`,
        `关联词条 ${linkedCharacterCount} 个`,
        `正文块 ${story.blocks.length} 个`,
      ],
      confirmLabel: '确认删除故事',
    };
  }, [characters, deleteTarget, stories]);

  function enterCollection(collectionId: string): void {
    playSound('navigation');
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
    const character = characterActions.createCharacter(selectedCollectionId);
    setDetailCharacter(character);
    setSelectedCharacterId(character.id);
    setDetailMode('edit');
    setIsFullscreenOpen(true);
    setIsSettingsOpen(false);
  }

  async function handleSaveCharacter(character: Character): Promise<void> {
    await characterActions.saveCharacter(character);
    playSound('save');
    setDetailCharacter(null);
    setDetailMode('view');
    setIsFullscreenOpen(true);
  }

  function requestDeleteCharacter(character: Character): void {
    setDeleteTarget({ type: 'character', character });
  }

  async function confirmDeleteTarget(): Promise<void> {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'character') {
      await characterActions.deleteCharacter(deleteTarget.character);
      playSound('save');
      setDetailCharacter(null);
      setIsFullscreenOpen(false);
    } else {
      await storyActions.deleteStory(deleteTarget.story);
      playSound('save');
    }
    setDeleteTarget(null);
  }

  async function handleImportDirectory(): Promise<void> {
    await characterActions.importDirectory();
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
    playSound('save');
    setSelectedCollectionId((currentId) =>
      persistedCatalog.collections.some((collection) => collection.id === currentId) ? currentId : 'all',
    );
  }

  async function handleSaveStoryCatalog(nextCatalog: StoryCatalogMetadata): Promise<void> {
    await storyActions.saveStoryCatalog(nextCatalog);
    playSound('save');
  }

  async function handleSaveStory(story: Story): Promise<void> {
    await storyActions.saveStory(story);
    playSound('save');
  }

  function requestDeleteStory(story: Story): void {
    setDeleteTarget({ type: 'story', story });
  }

  async function handleImportStoryImage(story: Story, blockId?: string): Promise<Story> {
    return storyActions.importStoryImage(story, blockId);
  }

  async function handleRemoveStoryImage(story: Story, assetPath: string): Promise<Story> {
    return storyActions.removeStoryImage(story, assetPath);
  }

  function openCharacterDetail(characterId: string): void {
    const character = characters.find((currentCharacter) => currentCharacter.id === characterId);
    if (!character) return;
    playSound('link');
    setSelectedCharacterId(character.id);
    setDetailCharacter(null);
    setDetailMode('view');
    setIsFullscreenOpen(true);
  }

  function openStoryFromBacklink(storyId: string): void {
    playSound('link');
    setSelectedStoryId(storyId);
    setScreen('stories');
    setIsFullscreenOpen(false);
  }

  async function handleImportCollectionIcon(collectionId: string): Promise<void> {
    if (!libraryClient) return;
    setCatalog(await libraryClient.importCatalogAsset('collectionIcon', collectionId));
  }

  async function handleSaveCollectionIcon(collectionId: string, imageDataUrl: string, fileName: string): Promise<void> {
    if (!libraryClient) return;
    setCatalog(await libraryClient.saveCollectionIcon(collectionId, imageDataUrl, fileName));
    playSound('save');
  }

  function cancelDetailEdit(character: Character): void {
    const isPersisted = characters.some((currentCharacter) => currentCharacter.id === character.id);
    setDetailCharacter(null);
    setDetailMode('view');
    if (!isPersisted) setIsFullscreenOpen(false);
  }

  function handleSaveAppPreferences(nextPreferences: AppPreferences): void {
    setAppPreferences(saveAppPreferences(nextPreferences));
    playSound('save');
  }

  return (
    <main className={`app-root screen-${screen}`}>
      {screen === 'home' ? (
        <HomeView
          catalog={catalog}
          isLoading={isLoading}
          onEnter={() => setScreen('collections')}
          onEnterStories={() => setScreen('stories')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onPlaySound={() => playSound('navigation')}
        />
      ) : null}

      {screen === 'collections' ? (
        <CollectionsView
          catalog={catalog}
          collectionCounts={collectionCounts}
          onBackHome={() => setScreen('home')}
          onSelectCollection={enterCollection}
          onOpenStories={() => setScreen('stories')}
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
          onOpenStories={() => setScreen('stories')}
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
          onDeleteCharacter={requestDeleteCharacter}
          onImportDirectory={libraryClient?.platform === 'desktop' ? handleImportDirectory : undefined}
          onSaveCollectionIcon={libraryClient ? handleSaveCollectionIcon : undefined}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : null}

      {screen === 'stories' ? (
        <StoryArchiveView
          storyCatalog={storyCatalog}
          stories={stories}
          characters={characters}
          selectedStoryId={selectedStoryId}
          canImportImages={Boolean(libraryClient)}
          onSelectedStoryChange={setSelectedStoryId}
          onBackHome={() => setScreen('home')}
          onOpenCatalog={() => setScreen('collections')}
          onSaveStory={handleSaveStory}
          onDeleteStory={requestDeleteStory}
          onSaveStoryCatalog={handleSaveStoryCatalog}
          onImportStoryImage={handleImportStoryImage}
          onRemoveStoryImage={handleRemoveStoryImage}
          onOpenCharacter={openCharacterDetail}
        />
      ) : null}

      {isFullscreenOpen && fullscreenCharacter ? (
        <FullscreenDetail
          catalog={catalog}
          character={fullscreenCharacter}
          storyBacklinks={fullscreenStoryBacklinks}
          mode={detailMode}
          libraryClient={libraryClient}
          onOpenStory={openStoryFromBacklink}
          onModeChange={setDetailMode}
          onSave={handleSaveCharacter}
          onCancelEdit={cancelDetailEdit}
          onClose={() => {
            setDetailCharacter(null);
            setDetailMode('view');
            setIsFullscreenOpen(false);
          }}
          onDelete={() => requestDeleteCharacter(fullscreenCharacter)}
        />
      ) : null}

      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          catalog={catalog}
          appPreferences={appPreferences}
          availableTags={availableTags}
          onSelectLibraryRoot={handleSelectLibraryRoot}
          onOpenLibraryRoot={async () => {
            await libraryClient?.openLibraryRoot();
          }}
          onImportWallpaper={handleImportWallpaper}
          onSaveCatalog={handleSaveCatalog}
          onSaveAppPreferences={handleSaveAppPreferences}
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

      {deleteDialog ? (
        <ConfirmDialog
          tone="danger"
          title={deleteDialog.title}
          message={deleteDialog.message}
          details={deleteDialog.details}
          confirmLabel={deleteDialog.confirmLabel}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteTarget}
        />
      ) : null}
    </main>
  );
}

function countCharacterImages(character: Character): number {
  return new Set([
    ...(character.avatarPaths || []),
    ...(character.portraitPaths || []),
    character.avatarPath,
    character.portraitPath,
  ].filter(Boolean)).size;
}

function countCharacterAttachments(character: Character): number {
  return (character.modelPaths?.length || (character.modelPath ? 1 : 0)) + (character.attachmentPaths?.length || 0);
}
