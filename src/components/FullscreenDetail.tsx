import { useEffect, useMemo, useState } from 'react';
import type { AssetType, CatalogMetadata, Character, CropImageSelection, VoiceAsset } from '../types';
import type { LibraryClient } from '../platform/libraryClient';
import { normalizeCharacter } from '../storage/characterStore';
import { ImageCropper } from './ImageCropper';
import { ImageLightbox } from './ImageLightbox';

type DetailMode = 'view' | 'edit';

type FullscreenDetailProps = {
  catalog: CatalogMetadata;
  character: Character;
  mode: DetailMode;
  libraryClient: LibraryClient | null | undefined;
  onModeChange: (mode: DetailMode) => void;
  onSave: (character: Character) => void | Promise<void>;
  onCancelEdit: (character: Character) => void;
  onClose: () => void;
  onDelete: () => void;
};

type ImageAsset = {
  path: string;
  url?: string;
};

export function FullscreenDetail({
  catalog,
  character,
  mode,
  libraryClient,
  onModeChange,
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

function EditableProfile({
  catalog,
  draft,
  tagInput,
  onDraftChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onToggleCollection,
}: {
  catalog: CatalogMetadata;
  draft: Character;
  tagInput: string;
  onDraftChange: (patch: Partial<Character>) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: (value: string) => void;
  onRemoveTag: (tag: string) => void;
  onToggleCollection: (collectionId: string) => void;
}) {
  return (
    <>
      <section className="glass-panel editor-two-column">
        <label>
          来源
          <input value={draft.sourceTitle} onChange={(event) => onDraftChange({ sourceTitle: event.target.value })} placeholder="游戏、动画或收藏来源" />
        </label>
        <label>
          别名
          <input value={draft.aliases.join(', ')} onChange={(event) => onDraftChange({ aliases: event.target.value.split(',') })} placeholder="用英文逗号分隔" />
        </label>
      </section>

      <section className="glass-panel">
        <h2>分类</h2>
        <div className="collection-checks">
          {catalog.collections
            .filter((collection) => collection.id !== 'all')
            .map((collection) => (
              <label key={collection.id}>
                <input
                  type="checkbox"
                  checked={draft.collectionIds.includes(collection.id)}
                  onChange={() => onToggleCollection(collection.id)}
                />
                <span>{collection.name}</span>
              </label>
            ))}
        </div>
      </section>

      <section className="glass-panel">
        <h2>标签</h2>
        <div className="tag-composer">
          <input
            value={tagInput}
            onChange={(event) => onTagInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddTag(tagInput);
              }
            }}
            placeholder="输入标签后按 Enter"
          />
          <button type="button" onClick={() => onAddTag(tagInput)}>添加</button>
        </div>
        <div className="tag-row editable-tags">
          {draft.tags.length ? (
            draft.tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                {tag}
                <button type="button" aria-label={`删除标签 ${tag}`} onClick={() => onRemoveTag(tag)}>x</button>
              </span>
            ))
          ) : (
            <span>暂无标签</span>
          )}
        </div>
      </section>

      <section className="glass-panel long-text-editor">
        <h2>人物介绍</h2>
        <textarea value={draft.description} onChange={(event) => onDraftChange({ description: event.target.value })} placeholder="用于详情页展示的人物介绍" />
      </section>

      <section className="glass-panel long-text-editor">
        <h2>备注</h2>
        <textarea value={draft.notes} onChange={(event) => onDraftChange({ notes: event.target.value })} placeholder="个人备注、来源补充、维护记录" />
      </section>
    </>
  );
}

function ReadonlyProfile({ character }: { character: Character }) {
  return (
    <>
      <section className="glass-panel">
        <h2>人物介绍</h2>
        <FormattedText value={character.description} fallback="暂无介绍。" />
      </section>
      <section className="glass-panel">
        <h2>备注</h2>
        <FormattedText value={character.notes} fallback="暂无备注。" />
      </section>
      <section className="glass-panel">
        <h2>标签</h2>
        <div className="tag-row">
          {character.tags?.length ? character.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>暂无标签</span>}
        </div>
      </section>
    </>
  );
}

function FormattedText({ value, fallback }: { value: string; fallback: string }) {
  const blocks = value
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) return <p>{fallback}</p>;

  return (
    <div className="formatted-text">
      {blocks.map((block, index) => (
        <p key={`${index}-${block.slice(0, 16)}`}>{block}</p>
      ))}
    </div>
  );
}

function ImageAssetGrid({
  assets,
  activePath,
  emptyText,
  isEditing,
  activeLabel,
  setLabel,
  onPreview,
  onSetActive,
  onRemove,
}: {
  assets: ImageAsset[];
  activePath?: string;
  emptyText: string;
  isEditing: boolean;
  activeLabel: string;
  setLabel: string;
  onPreview: (imageUrl?: string) => void;
  onSetActive: (asset: ImageAsset) => void;
  onRemove: (assetPath: string) => void;
}) {
  if (!assets.length) return <p>{emptyText}</p>;

  return (
    <div className="portrait-gallery editable-gallery">
      {assets.map((asset) => (
        <article className={asset.path === activePath ? 'asset-tile active' : 'asset-tile'} key={asset.path}>
          <button type="button" onClick={() => onPreview(asset.url)}>
            {asset.url ? <img src={asset.url} alt={fileName(asset.path)} /> : <span>{fileName(asset.path)}</span>}
          </button>
          <div className="asset-tile-actions">
            {asset.path === activePath ? <small>{activeLabel}</small> : null}
            {isEditing && asset.path !== activePath ? <button type="button" onClick={() => onSetActive(asset)}>{setLabel}</button> : null}
            {isEditing ? <button className="danger-button" type="button" onClick={() => onRemove(asset.path)}>删除</button> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function VoiceSection({
  voices,
  isEditing,
  canImport,
  onImport,
  onUpdateVoice,
  onRemove,
}: {
  voices: VoiceAsset[];
  isEditing: boolean;
  canImport: boolean;
  onImport: () => void;
  onUpdateVoice: (voiceId: string, field: 'label' | 'line', value: string) => void;
  onRemove: (assetPath: string) => void;
}) {
  return (
    <section className="glass-panel">
      <h2>语音</h2>
      {isEditing ? <button type="button" disabled={!canImport} onClick={onImport}>导入语音</button> : null}
      <div className="voice-panel-list">
        {voices.length ? (
          voices.map((voice) => (
            <article key={voice.id}>
              {isEditing ? (
                <div className="voice-editor-row">
                  <input value={voice.label} onChange={(event) => onUpdateVoice(voice.id, 'label', event.target.value)} placeholder="语音名称" />
                  <input value={voice.line || ''} onChange={(event) => onUpdateVoice(voice.id, 'line', event.target.value)} placeholder="台词文本" />
                  <button className="danger-button" type="button" onClick={() => onRemove(voice.filePath)}>删除</button>
                </div>
              ) : (
                <>
                  <strong>{voice.label}</strong>
                  {voice.line || voice.subtitle ? <p>{voice.line || voice.subtitle}</p> : null}
                  <audio controls src={voice.fileUrl} />
                </>
              )}
            </article>
          ))
        ) : (
          <p>暂无语音。</p>
        )}
      </div>
    </section>
  );
}

function AttachmentSection({
  character,
  isEditing,
  canImport,
  onImport,
  onRemove,
}: {
  character: Character;
  isEditing: boolean;
  canImport: boolean;
  onImport: (assetType: AssetType) => void;
  onRemove: (assetType: AssetType, assetPath: string) => void;
}) {
  return (
    <section className="glass-panel">
      <h2>附件</h2>
      {isEditing ? (
        <div className="asset-import-grid">
          <button type="button" disabled={!canImport} onClick={() => onImport('model')}>导入模型附件</button>
          <button type="button" disabled={!canImport} onClick={() => onImport('attachment')}>导入其他附件</button>
        </div>
      ) : null}
      <div className="asset-list">
        {(character.modelPaths?.length ? character.modelPaths : character.modelPath ? [character.modelPath] : []).map((modelPath) => (
          <article key={modelPath}>
            <strong>模型附件：{fileName(modelPath)}</strong>
            {isEditing ? <button className="danger-button" type="button" onClick={() => onRemove('model', modelPath)}>删除</button> : null}
          </article>
        ))}
        {character.attachmentPaths?.map((attachmentPath) => (
          <article key={attachmentPath}>
            <strong>{fileName(attachmentPath)}</strong>
            {isEditing ? <button className="danger-button" type="button" onClick={() => onRemove('attachment', attachmentPath)}>删除</button> : null}
          </article>
        ))}
        {!character.modelPath && !character.modelPaths?.length && !character.attachmentPaths?.length ? <p>暂无附件。</p> : null}
      </div>
    </section>
  );
}

function imageAssets(paths: string[] | undefined, urls: string[] | undefined): ImageAsset[] {
  return (paths || []).map((path, index) => ({ path, url: urls?.[index] })).filter((asset) => asset.path);
}

function fileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
}
