import { useDeferredValue, useMemo, useState } from 'react';
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
import {
  buildCharacterCatalogIndex,
  countCharactersByCollectionFromIndex,
  filterCharacterIndexForCatalog,
  getAvailableCharacterTagsFromIndex,
} from './storage/characterQueries';
import {
  applyTagMerge,
  applyUnusedTagRuleDelete,
  buildCharacterTagGovernanceIndex,
} from './storage/tagGovernance';
import { buildStoryLinkIndex } from './storage/storyStore';
import type {
  AppPreferences,
  AssetCompletenessReport,
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
    loadCharacterDetail,
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

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const characterIndex = useMemo(() => buildCharacterCatalogIndex(characters), [characters]);
  const characterById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters]);
  const storyLinkIndex = useMemo(() => buildStoryLinkIndex(stories, characters), [characters, stories]);
  const availableTags = useMemo(() => getAvailableCharacterTagsFromIndex(characterIndex), [characterIndex]);
  const tagGovernanceItems = useMemo(
    () => buildCharacterTagGovernanceIndex(characters, catalog),
    [catalog, characters],
  );

  const filteredCharacters = useMemo(() => {
    return filterCharacterIndexForCatalog({
      index: characterIndex,
      collections: catalog.collections,
      searchQuery: deferredSearchQuery,
      selectedCollectionId,
      selectedTag,
      sortMode,
    });
  }, [catalog.collections, characterIndex, deferredSearchQuery, selectedCollectionId, selectedTag, sortMode]);

  const selectedCharacter = useMemo(() => (selectedCharacterId ? characterById.get(selectedCharacterId) : null) ?? filteredCharacters[0] ?? null, [characterById, filteredCharacters, selectedCharacterId]);
  const fullscreenCharacter = detailCharacter ?? selectedCharacter;
  const fullscreenStoryBacklinks = useMemo(
    () => (fullscreenCharacter ? storyLinkIndex.backlinksByCharacterId.get(fullscreenCharacter.id) || [] : []),
    [fullscreenCharacter, storyLinkIndex],
  );

  const collectionCounts = useMemo(() => countCharactersByCollectionFromIndex(catalog.collections, characterIndex), [catalog.collections, characterIndex]);
  const deleteDialog = useMemo(() => {
    if (!deleteTarget) return null;
    if (deleteTarget.type === 'character') {
      const character = deleteTarget.character;
      const backlinkCount = storyLinkIndex.backlinksByCharacterId.get(character.id)?.length || 0;
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
    const linkedCharacterCount = storyLinkIndex.storyLinkedCharacterIds.get(story.id)?.length || 0;
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
  }, [deleteTarget, storyLinkIndex]);

  function enterCollection(collectionId: string): void {
    playSound('navigation');
    setSelectedCollectionId(collectionId);
    setScreen('catalog');
    setIsSettingsOpen(false);
    setDetailCharacter(null);
  }

  async function openFullscreen(mode: DetailMode, character = fullscreenCharacter): Promise<void> {
    const currentCharacter = character;
    if (currentCharacter) {
      const loadedCharacter = await loadCharacterDetail(currentCharacter.id);
      setDetailCharacter(loadedCharacter || currentCharacter);
    } else {
      setDetailCharacter(null);
    }
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

  async function requestDeleteCharacter(character: Character): Promise<void> {
    const loadedCharacter = await loadCharacterDetail(character.id);
    setDeleteTarget({ type: 'character', character: loadedCharacter || character });
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
    const character = characterById.get(characterId);
    if (!character) return;
    playSound('link');
    setSelectedCharacterId(character.id);
    setDetailCharacter(character);
    setDetailMode('view');
    setIsFullscreenOpen(true);
    loadCharacterDetail(character.id).then((loadedCharacter) => {
      if (loadedCharacter) setDetailCharacter(loadedCharacter);
    });
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

  async function handleGenerateAssetCompletenessReport(): Promise<AssetCompletenessReport> {
    if (!libraryClient) throw new Error('素材完整性报告需要桌面资料库。');
    const report = await libraryClient.generateAssetCompletenessReport();
    playSound('save');
    return report;
  }

  async function handleMergeCharacterTag(sourceTag: string, targetTag: string): Promise<void> {
    const previewMutation = applyTagMerge(characters, catalog, sourceTag, targetTag);

    if (libraryClient) {
      for (const characterId of previewMutation.changedCharacterIds) {
        const fullCharacter = await libraryClient.getCharacter(characterId);
        if (!fullCharacter) continue;
        const nextCharacter = applyTagMerge([fullCharacter], catalog, sourceTag, targetTag).characters[0];
        await libraryClient.saveCharacter(nextCharacter);
      }
      await libraryClient.saveCatalog(previewMutation.catalog);
      await reloadLibrary();
    } else {
      setCharacters(previewMutation.characters);
      setCatalog(previewMutation.catalog);
    }

    setSelectedTag((currentTag) =>
      currentTag && normalizeTagKey(currentTag) === normalizeTagKey(sourceTag) ? targetTag.trim() : currentTag,
    );
    playSound('save');
  }

  async function handleDeleteUnusedCharacterTagRule(tag: string): Promise<void> {
    const mutation = applyUnusedTagRuleDelete(characters, catalog, tag);

    if (libraryClient) {
      await libraryClient.saveCatalog(mutation.catalog);
      await reloadLibrary();
    } else {
      setCatalog(mutation.catalog);
    }

    setSelectedTag((currentTag) =>
      currentTag && normalizeTagKey(currentTag) === normalizeTagKey(tag) ? '' : currentTag,
    );
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
            openFullscreen('edit', character);
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
          storyLinkIndex={storyLinkIndex}
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
          tagGovernanceItems={tagGovernanceItems}
          onSelectLibraryRoot={handleSelectLibraryRoot}
          onOpenLibraryRoot={async () => {
            await libraryClient?.openLibraryRoot();
          }}
          onImportWallpaper={handleImportWallpaper}
          onSaveCatalog={handleSaveCatalog}
          onSaveAppPreferences={handleSaveAppPreferences}
          onGenerateAssetCompletenessReport={handleGenerateAssetCompletenessReport}
          onMergeCharacterTag={handleMergeCharacterTag}
          onDeleteUnusedCharacterTagRule={handleDeleteUnusedCharacterTagRule}
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

function normalizeTagKey(value: string): string {
  return value.trim().toLowerCase();
}
