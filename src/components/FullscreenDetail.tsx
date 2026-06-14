import { useEffect, useMemo, useState } from 'react';
import type { AssetType, CatalogMetadata, Character, CropImageSelection, StoryBacklink } from '../types';
import type { LibraryClient } from '../platform/libraryClient';
import { normalizeCharacter } from '../storage/characterStore';
import { AttachmentSection } from './detail/AttachmentSection';
import { ImageAssetGrid } from './detail/ImageAssetGrid';
import { EditableProfile, ReadonlyProfile } from './detail/ProfilePanels';
import { StoryBacklinksPanel } from './detail/StoryBacklinksPanel';
import { VoiceSection } from './detail/VoiceSection';
import type { ImageAsset } from './detail/detailUtils';
import { fileName, imageAssets } from './detail/detailUtils';
import { ImageCropper } from './ImageCropper';
import { ImageLightbox } from './ImageLightbox';

type DetailMode = 'view' | 'edit';

type FullscreenDetailProps = {
  catalog: CatalogMetadata;
  character: Character;
  mode: DetailMode;
  libraryClient: LibraryClient | null | undefined;
  storyBacklinks?: StoryBacklink[];
  onModeChange: (mode: DetailMode) => void;
  onOpenStory?: (storyId: string) => void;
  onSave: (character: Character) => void | Promise<void>;
  onCancelEdit: (character: Character) => void;
  onClose: () => void;
  onDelete: () => void;
};

export function FullscreenDetail({
  catalog,
  character,
  mode,
  libraryClient,
  storyBacklinks = [],
  onModeChange,
  onOpenStory,
  onSave,
  onCancelEdit,
  onClose,
  onDelete,
}: FullscreenDetailProps) {
  const [draft, setDraft] = useState<Character>(() => normalizeCharacter(character));
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cropSelection, setCropSelection] = useState<CropImageSelection | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isEditing = mode === 'edit';
  const visibleCharacter = isEditing ? draft : character;
  const avatarAssets = useMemo(() => imageAssets(visibleCharacter.avatarPaths, visibleCharacter.avatarUrls), [visibleCharacter]);
  const portraitAssets = useMemo(() => imageAssets(visibleCharacter.portraitPaths, visibleCharacter.portraitUrls), [visibleCharacter]);
  const previewImages = useMemo(() => {
    const allImages = [...avatarAssets, ...portraitAssets].map((asset) => asset.url).filter(Boolean) as string[];
    return [...new Set(allImages)];
  }, [avatarAssets, portraitAssets]);
  const heroImage = visibleCharacter.portraitUrl || visibleCharacter.avatarUrl;

  useEffect(() => {
    setDraft(normalizeCharacter(character));
    setError(null);
    setTagInput('');
  }, [character.id, character.updatedAt]);

  function updateDraft(patch: Partial<Character>): void {
    setDraft((currentDraft) => normalizeCharacter({ ...currentDraft, ...patch }));
  }

  function openLightbox(imageUrl?: string): void {
    if (!imageUrl) return;
    const index = previewImages.indexOf(imageUrl);
    setLightboxIndex(index >= 0 ? index : 0);
  }

  function addTag(value: string): void {
    const nextTag = value.trim();
    if (!nextTag) return;
    setDraft((currentDraft) => {
      if (currentDraft.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) return currentDraft;
      return { ...currentDraft, tags: [...currentDraft.tags, nextTag] };
    });
    setTagInput('');
  }

  function removeTag(tag: string): void {
    setDraft((currentDraft) => ({ ...currentDraft, tags: currentDraft.tags.filter((currentTag) => currentTag !== tag) }));
  }

  function toggleCollection(collectionId: string): void {
    if (collectionId === 'all') return;
    setDraft((currentDraft) => {
      const collectionIds = currentDraft.collectionIds.includes(collectionId)
        ? currentDraft.collectionIds.filter((id) => id !== collectionId)
        : [...currentDraft.collectionIds, collectionId];
      return { ...currentDraft, collectionIds };
    });
  }

  function setMainAvatar(asset: ImageAsset): void {
    updateDraft({ avatarPath: asset.path, avatarUrl: asset.url, avatarFileName: fileName(asset.path) });
  }

  function setCoverPortrait(asset: ImageAsset): void {
    updateDraft({ portraitPath: asset.path, portraitUrl: asset.url, portraitFileName: fileName(asset.path) });
  }

  async function importAsset(assetType: AssetType): Promise<void> {
    if (!libraryClient) return;
    if (assetType === 'avatar') {
      setCropSelection(await libraryClient.selectImageForCrop());
      return;
    }
    setDraft(await libraryClient.importAsset(draft, assetType));
    setError(null);
  }

  async function saveCroppedAvatar(imageDataUrl: string, fileName: string): Promise<void> {
    if (!libraryClient) return;
    setDraft(await libraryClient.saveCroppedAvatar(draft, imageDataUrl, fileName));
    setCropSelection(null);
    setError(null);
  }

  async function removeAsset(assetType: AssetType, assetPath: string): Promise<void> {
    if (!libraryClient) return;
    setDraft(await libraryClient.removeAsset(draft, assetType, assetPath));
    setError(null);
  }

  function updateVoice(voiceId: string, field: 'label' | 'line', value: string): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      voiceAssets: currentDraft.voiceAssets.map((voice) => (voice.id === voiceId ? { ...voice, [field]: value } : voice)),
    }));
  }

  async function saveDraft(): Promise<void> {
    if (!draft.name.trim()) {
      setError('必须填写角色名称。');
      return;
    }

    await onSave({
      ...draft,
      name: draft.name.trim(),
      sourceTitle: draft.sourceTitle.trim(),
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      aliases: draft.aliases.map((alias) => alias.trim()).filter(Boolean),
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
      voiceAssets: draft.voiceAssets.map((voice) => ({
        ...voice,
        label: voice.label.trim() || voice.fileName || '未命名语音',
        line: voice.line?.trim() || '',
      })),
    });
  }

  return (
    <section className={`fullscreen-detail detail-mode-${mode}`} role="dialog" aria-modal="true" aria-label={visibleCharacter.name || '角色详情'}>
      <header className="detail-topbar glass-panel">
        <button type="button" onClick={isEditing ? () => onCancelEdit(draft) : onClose}>
          {isEditing ? '取消' : '关闭'}
        </button>
        <div className="detail-title-block">
          <p>{visibleCharacter.sourceTitle || '未知来源'}</p>
          {isEditing ? (
            <input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} placeholder="角色名称" />
          ) : (
            <h1>{visibleCharacter.name || '未命名角色'}</h1>
          )}
        </div>
        <div className="detail-actions">
          {isEditing ? (
            <button className="primary-button" type="button" onClick={saveDraft}>保存</button>
          ) : (
            <button type="button" onClick={() => onModeChange('edit')}>编辑</button>
          )}
          <button className="danger-button" type="button" onClick={onDelete}>删除</button>
        </div>
      </header>

      {error ? <p className="form-error detail-error">{error}</p> : null}

      <div className="detail-body">
        <div className="detail-hero glass-panel">
          {heroImage ? (
            <button type="button" onClick={() => openLightbox(heroImage)}>
              <img src={heroImage} alt={visibleCharacter.name} />
            </button>
          ) : (
            <span>{visibleCharacter.name.slice(0, 1) || '?'}</span>
          )}
        </div>

        <div className="detail-info">
          {isEditing ? (
            <EditableProfile
              catalog={catalog}
              draft={draft}
              tagInput={tagInput}
              onDraftChange={updateDraft}
              onTagInputChange={setTagInput}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onToggleCollection={toggleCollection}
            />
          ) : (
            <ReadonlyProfile character={visibleCharacter} />
          )}

          <StoryBacklinksPanel backlinks={storyBacklinks} onOpenStory={onOpenStory} />

          <section className="glass-panel">
            <h2>头像</h2>
            <div className="asset-import-grid">
              {isEditing ? <button type="button" disabled={!libraryClient} onClick={() => importAsset('avatar')}>导入并裁切头像</button> : null}
            </div>
            <ImageAssetGrid
              assets={avatarAssets}
              activePath={visibleCharacter.avatarPath}
              emptyText="暂无头像。"
              isEditing={isEditing}
              activeLabel="主头像"
              setLabel="设为主头像"
              onPreview={openLightbox}
              onSetActive={setMainAvatar}
              onRemove={(assetPath) => removeAsset('avatar', assetPath)}
            />
          </section>

          <section className="glass-panel">
            <h2>立绘</h2>
            <div className="asset-import-grid">
              {isEditing ? <button type="button" disabled={!libraryClient} onClick={() => importAsset('portrait')}>导入立绘</button> : null}
            </div>
            <ImageAssetGrid
              assets={portraitAssets}
              activePath={visibleCharacter.portraitPath}
              emptyText="暂无立绘。"
              isEditing={isEditing}
              activeLabel="封面"
              setLabel="设为封面"
              onPreview={openLightbox}
              onSetActive={setCoverPortrait}
              onRemove={(assetPath) => removeAsset('portrait', assetPath)}
            />
          </section>

          <VoiceSection
            voices={visibleCharacter.voiceAssets}
            isEditing={isEditing}
            canImport={Boolean(libraryClient)}
            onImport={() => importAsset('voice')}
            onUpdateVoice={updateVoice}
            onRemove={(assetPath) => removeAsset('voice', assetPath)}
          />

          <AttachmentSection
            character={visibleCharacter}
            isEditing={isEditing}
            canImport={Boolean(libraryClient)}
            onImport={importAsset}
            onRemove={removeAsset}
          />
        </div>
      </div>

      {cropSelection ? (
        <ImageCropper
          selection={cropSelection}
          title="裁切头像"
          confirmLabel="保存头像"
          aspectRatio={1}
          outputWidth={512}
          outputHeight={512}
          previewMode="avatar"
          onCancel={() => setCropSelection(null)}
          onConfirm={saveCroppedAvatar}
        />
      ) : null}

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={previewImages}
          currentIndex={lightboxIndex}
          title={visibleCharacter.name || '图片预览'}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}
    </section>
  );
}
