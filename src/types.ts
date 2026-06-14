export type AssetType = 'avatar' | 'portrait' | 'voice' | 'model' | 'attachment';

export type CatalogAssetType = 'wallpaper' | 'collectionIcon';

export type SortMode = 'updatedAt' | 'createdAt' | 'createdAtDesc' | 'name' | 'sourceTitle';

export type StorySortMode = 'updatedAt' | 'createdAt' | 'title';

export type StoryBlockType = 'heading' | 'paragraph' | 'quote' | 'image';

export type VoiceAsset = {
  id: string;
  label: string;
  line?: string;
  subtitle?: string;
  category?: string;
  sourceUrl?: string;
  sourceIds?: string[];
  conditionText?: string;
  filePath: string;
  fileUrl?: string;
  fileName?: string;
};

export type CharacterExternalRefs = {
  provider: string;
  region?: string;
  servantId?: number;
  collectionNo?: number;
  sourceUrl?: string;
};

export type CharacterImportMeta = {
  source?: string;
  importedAt?: string;
  dataRegion?: string;
  isJpFallback?: boolean;
  translationStatus?: 'none' | 'translated' | 'pending' | 'failed';
  officialFields?: string[];
};

export type CatalogCollection = {
  id: string;
  name: string;
  description: string;
  iconPath?: string;
  iconUrl?: string;
  tagRules: string[];
};

export type CatalogMetadata = {
  wallpaperPath?: string;
  wallpaperUrl?: string;
  wallpaperOpacity?: number;
  defaultCollectionId: string;
  defaultSortMode: SortMode;
  collections: CatalogCollection[];
};

export type StoryCategory = {
  id: string;
  name: string;
  description: string;
  tagRules: string[];
};

export type StoryCatalogMetadata = {
  defaultCategoryId: string;
  defaultSortMode: StorySortMode;
  categories: StoryCategory[];
};

export type StoryBlock = {
  id: string;
  type: StoryBlockType;
  text: string;
  imagePath?: string;
  imageUrl?: string;
  imageFileName?: string;
  caption?: string;
};

export type Story = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  categoryIds: string[];
  tags: string[];
  linkedCharacterIds: string[];
  blocks: StoryBlock[];
  coverImagePath?: string;
  coverImageUrl?: string;
  coverImageFileName?: string;
  libraryDirectory?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoryBacklink = {
  storyId: string;
  storyTitle: string;
  excerpt: string;
};

export type AppPreferences = {
  soundMode: 'off' | 'soft' | 'full';
  soundVolume: number;
};

export type BrokenWikiLink = {
  storyId: string;
  storyTitle: string;
  label: string;
  blockId?: string;
  field: 'text' | 'caption';
};

export type LibraryHealthIssue = {
  id: string;
  severity: 'info' | 'warning';
  kind:
    | 'broken-wiki-link'
    | 'orphan-character'
    | 'uncategorized-story'
    | 'empty-story-category'
    | 'duplicate-story-category';
  title: string;
  detail: string;
  characterId?: string;
  storyId?: string;
  label?: string;
};

export type LibraryHealthReport = {
  generatedAt: string;
  summary: {
    characterCount: number;
    storyCount: number;
    issueCount: number;
    warningCount: number;
  };
  brokenWikiLinks: BrokenWikiLink[];
  issues: LibraryHealthIssue[];
};

export type Character = {
  id: string;
  name: string;
  sourceTitle: string;
  aliases: string[];
  tags: string[];
  collectionIds: string[];
  description: string;
  notes: string;
  avatarPath?: string;
  avatarUrl?: string;
  avatarPaths?: string[];
  avatarUrls?: string[];
  avatarFileName?: string;
  portraitDataUrl?: string;
  portraitPath?: string;
  portraitUrl?: string;
  portraitUrls?: string[];
  portraitPaths?: string[];
  portraitFileName?: string;
  voicePaths: string[];
  voiceUrls?: string[];
  voiceAssets: VoiceAsset[];
  modelPath?: string;
  modelPaths?: string[];
  modelUrls?: string[];
  modelFileName?: string;
  modelFormat?: string;
  attachmentPaths: string[];
  attachmentUrls?: string[];
  libraryDirectory?: string;
  externalRefs?: CharacterExternalRefs[];
  importMeta?: CharacterImportMeta;
  createdAt: string;
  updatedAt: string;
};

export type LibraryInfo = {
  libraryRoot: string;
  charactersRoot: string;
  storiesRoot: string;
};

export type LibrarySettings = {
  libraryRoot: string;
  defaultLibraryRoot: string;
  configPath: string;
};

export type CropImageSelection = {
  fileName: string;
  dataUrl: string;
};

export type AcgplanDesktopApi = {
  getLibraryInfo: () => Promise<LibraryInfo>;
  getSettings: () => Promise<LibrarySettings>;
  setLibraryRoot: (libraryRoot: string) => Promise<LibrarySettings>;
  selectLibraryRoot: () => Promise<LibrarySettings>;
  openLibraryRoot: () => Promise<string>;
  getCatalog: () => Promise<CatalogMetadata>;
  saveCatalog: (catalog: CatalogMetadata) => Promise<CatalogMetadata>;
  importCatalogAsset: (assetType: CatalogAssetType, collectionId?: string) => Promise<CatalogMetadata>;
  saveCollectionIcon: (collectionId: string, imageDataUrl: string, fileName: string) => Promise<CatalogMetadata>;
  getStoryCatalog: () => Promise<StoryCatalogMetadata>;
  saveStoryCatalog: (catalog: StoryCatalogMetadata) => Promise<StoryCatalogMetadata>;
  getStories: () => Promise<Story[]>;
  saveStory: (story: Story) => Promise<Story>;
  deleteStory: (story: Story) => Promise<Story[]>;
  importStoryImage: (story: Story, blockId?: string) => Promise<Story>;
  removeStoryImage: (story: Story, assetPath: string) => Promise<Story>;
  getLibraryCharacters: () => Promise<Character[]>;
  saveCharacter: (character: Character) => Promise<Character>;
  deleteCharacter: (character: Character) => Promise<Character[]>;
  importAsset: (character: Character, assetType: AssetType) => Promise<Character>;
  selectImageForCrop: () => Promise<CropImageSelection | null>;
  saveCroppedAvatar: (character: Character, imageDataUrl: string, fileName: string) => Promise<Character>;
  selectImageForCatalogCrop: () => Promise<CropImageSelection | null>;
  saveCroppedWallpaper: (imageDataUrl: string, fileName: string) => Promise<CatalogMetadata>;
  removeAsset: (character: Character, assetType: AssetType, assetPath: string) => Promise<Character>;
  importCharacterDirectory: (sourceDirectory?: string) => Promise<Character[]>;
};

declare global {
  interface Window {
    acgplan?: AcgplanDesktopApi;
  }
}
