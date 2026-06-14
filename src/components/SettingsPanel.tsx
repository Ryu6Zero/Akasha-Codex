import { useEffect, useMemo, useState } from 'react';
import type { AppPreferences, CatalogCollection, CatalogMetadata, LibrarySettings } from '../types';

type SettingsPanelProps = {
  settings: LibrarySettings | null;
  catalog: CatalogMetadata;
  appPreferences: AppPreferences;
  availableTags: string[];
  onSelectLibraryRoot: () => void | Promise<void>;
  onOpenLibraryRoot: () => void | Promise<void>;
  onImportWallpaper: () => void | Promise<void>;
  onSaveCatalog: (catalog: CatalogMetadata) => void | Promise<void>;
  onSaveAppPreferences: (preferences: AppPreferences) => void | Promise<void>;
  onImportCollectionIcon?: (collectionId: string) => void | Promise<void>;
  onClose: () => void;
};

export function SettingsPanel({
  settings,
  catalog,
  appPreferences,
  availableTags,
  onSelectLibraryRoot,
  onOpenLibraryRoot,
  onImportWallpaper,
  onSaveCatalog,
  onSaveAppPreferences,
  onImportCollectionIcon,
  onClose,
}: SettingsPanelProps) {
  const [draftCollections, setDraftCollections] = useState<CatalogCollection[]>(() => catalog.collections);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(catalog.wallpaperOpacity ?? 0.72);
  const [soundMode, setSoundMode] = useState<AppPreferences['soundMode']>(appPreferences.soundMode);
  const [soundVolume, setSoundVolume] = useState(appPreferences.soundVolume);
  const [status, setStatus] = useState('');

  const sortedTags = useMemo(
    () => [...new Set(availableTags)].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [availableTags],
  );
  const validTags = useMemo(() => new Set(sortedTags), [sortedTags]);
  const wallpaperOpacityPercent = Math.round(wallpaperOpacity * 100);
  const isWallpaperOpacityDirty = Math.abs(wallpaperOpacity - (catalog.wallpaperOpacity ?? 0.72)) > 0.001;

  useEffect(() => {
    setDraftCollections(catalog.collections);
    setWallpaperOpacity(catalog.wallpaperOpacity ?? 0.72);
  }, [catalog.collections, catalog.wallpaperOpacity]);

  useEffect(() => {
    setSoundMode(appPreferences.soundMode);
    setSoundVolume(appPreferences.soundVolume);
  }, [appPreferences]);

  function updateCollection(collectionId: string, patch: Partial<CatalogCollection>): void {
    setDraftCollections((collections) =>
      collections.map((collection) => (collection.id === collectionId ? { ...collection, ...patch } : collection)),
    );
    setStatus('');
  }

  function addCollection(): void {
    const id = createCollectionId('自定义分组', draftCollections);
    setDraftCollections((collections) => [
      ...collections,
      {
        id,
        name: '自定义分组',
        description: '按标签筛选的一组角色。',
        tagRules: [],
      },
    ]);
    setStatus('');
  }

  function removeCollection(collectionId: string): void {
    if (collectionId === 'all') return;
    setDraftCollections((collections) => collections.filter((collection) => collection.id !== collectionId));
    setStatus('');
  }

  function toggleTagRule(collection: CatalogCollection, tag: string): void {
    const hasTag = collection.tagRules.includes(tag);
    updateCollection(collection.id, {
      tagRules: hasTag ? collection.tagRules.filter((rule) => rule !== tag) : unique([...collection.tagRules, tag]),
    });
  }

  function removeMissingRules(collection: CatalogCollection): void {
    updateCollection(collection.id, { tagRules: collection.tagRules.filter((rule) => validTags.has(rule)) });
  }

  function buildNextCatalog(): CatalogMetadata {
    const allCollection = draftCollections.find((collection) => collection.id === 'all') || {
      id: 'all',
      name: '全部角色',
      description: '浏览当前资料库的所有角色。',
      tagRules: [],
    };
    const collections = [
      { ...allCollection, id: 'all', tagRules: [] },
      ...draftCollections
        .filter((collection) => collection.id !== 'all')
        .map((collection) => ({
          ...collection,
          name: collection.name.trim() || '未命名分组',
          description: collection.description.trim(),
          tagRules: unique(
            collection.tagRules
              .map((rule) => rule.trim())
              .filter((rule) => rule && (!validTags.size || validTags.has(rule))),
          ),
        })),
    ];

    return {
      ...catalog,
      wallpaperOpacity,
      collections,
    };
  }

  async function saveSettings(): Promise<void> {
    await onSaveCatalog(buildNextCatalog());
    setStatus('设置已保存');
  }

  async function saveWallpaperSettings(): Promise<void> {
    await onSaveCatalog({
      ...catalog,
      wallpaperOpacity,
    });
    setStatus('壁纸设置已保存');
  }

  async function importWallpaper(): Promise<void> {
    if (isWallpaperOpacityDirty) await saveWallpaperSettings();
    await onImportWallpaper();
  }

  async function importIcon(collectionId: string): Promise<void> {
    await saveSettings();
    await onImportCollectionIcon?.(collectionId);
  }

  async function saveSoundSettings(): Promise<void> {
    await onSaveAppPreferences({ soundMode, soundVolume });
    setStatus('音效设置已保存');
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="设置">
      <section className="settings-panel">
        <header className="editor-header">
          <div>
            <p>Settings</p>
            <h2>资料库设置</h2>
          </div>
          <button type="button" onClick={onClose}>关闭</button>
        </header>

        <div className="settings-grid">
          <InfoRow label="当前资料库路径" value={settings?.libraryRoot || '-'} />
          <InfoRow label="默认资料库路径" value={settings?.defaultLibraryRoot || '-'} />
          <InfoRow label="配置文件" value={settings?.configPath || '-'} />
          <InfoRow label="首页壁纸" value={catalog.wallpaperPath || '未设置，使用内置背景'} />
        </div>

        <section className="settings-category-manager glass-panel">
          <div className="settings-section-title">
            <div>
              <p>Wallpaper</p>
              <h3>首页壁纸</h3>
            </div>
            <div className="settings-section-actions">
              <button type="button" onClick={saveWallpaperSettings} disabled={!isWallpaperOpacityDirty}>
                保存壁纸设置
              </button>
              <button type="button" onClick={importWallpaper}>导入并裁切壁纸</button>
            </div>
          </div>
          <label className="wallpaper-opacity-control">
            <span>壁纸透明度 {wallpaperOpacityPercent}%{isWallpaperOpacityDirty ? '（未保存）' : ''}</span>
            <input
              min="0.18"
              max="1"
              step="0.01"
              type="range"
              value={wallpaperOpacity}
              onChange={(event) => {
                setWallpaperOpacity(Number(event.target.value));
                setStatus('');
              }}
            />
          </label>
        </section>

        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={onSelectLibraryRoot}>选择资料库目录</button>
          <button type="button" onClick={onOpenLibraryRoot}>打开当前资料库</button>
        </div>

        <section className="settings-category-manager glass-panel">
          <div className="settings-section-title">
            <div>
              <p>Sound</p>
              <h3>界面音效</h3>
            </div>
            <button type="button" onClick={saveSoundSettings}>保存音效设置</button>
          </div>
          <div className="sound-settings-grid">
            <label>
              模式
              <select value={soundMode} onChange={(event) => {
                setSoundMode(event.target.value as AppPreferences['soundMode']);
                setStatus('');
              }}>
                <option value="off">关闭</option>
                <option value="soft">轻量</option>
                <option value="full">完整</option>
              </select>
            </label>
            <label>
              音量 {Math.round(soundVolume * 100)}%
              <input
                min="0"
                max="1"
                step="0.01"
                type="range"
                value={soundVolume}
                onChange={(event) => {
                  setSoundVolume(Number(event.target.value));
                  setStatus('');
                }}
              />
            </label>
          </div>
        </section>

        <section className="settings-category-manager glass-panel">
          <div className="settings-section-title">
            <div>
              <p>Tag Groups</p>
              <h3>分类分组</h3>
            </div>
            <button type="button" onClick={addCollection}>新增分组</button>
          </div>
          <p className="muted">
            分类就是一组预设标签筛选。匹配标签只能从当前资料库已存在的标签里选择，标签被角色删除后会标记为失效并可一键清理。
          </p>

          <div className="category-editor-list">
            {draftCollections
              .filter((collection) => collection.id !== 'all')
              .map((collection) => {
                const missingRules = collection.tagRules.filter((rule) => !validTags.has(rule));
                const selectableTags = sortedTags.filter((tag) => !collection.tagRules.includes(tag));

                return (
                  <article className="category-editor-card" key={collection.id}>
                    <div className="category-editor-icon">
                      {collection.iconUrl ? <img src={collection.iconUrl} alt={collection.name} /> : <span>{collection.name.slice(0, 2)}</span>}
                    </div>
                    <label>
                      分组名
                      <input
                        value={collection.name}
                        onChange={(event) => updateCollection(collection.id, { name: event.target.value })}
                      />
                    </label>
                    <label>
                      说明
                      <input
                        value={collection.description}
                        onChange={(event) => updateCollection(collection.id, { description: event.target.value })}
                      />
                    </label>
                    <div className="category-rules-field">
                      <strong>匹配标签</strong>
                      <div className="tag-rule-picker selected-rules">
                        {collection.tagRules.length ? (
                          collection.tagRules.map((tag) => (
                            <button
                              className={validTags.has(tag) ? 'tag-rule-chip active' : 'tag-rule-chip missing'}
                              key={tag}
                              type="button"
                              onClick={() => toggleTagRule(collection, tag)}
                              title={validTags.has(tag) ? '点击移除这个匹配标签' : '这个标签已经不存在，点击移除'}
                            >
                              {tag}
                              {!validTags.has(tag) ? <small>失效</small> : null}
                            </button>
                          ))
                        ) : (
                          <span className="muted">尚未选择标签</span>
                        )}
                      </div>
                      <div className="tag-rule-picker available-rules">
                        {selectableTags.length ? (
                          selectableTags.map((tag) => (
                            <button key={tag} type="button" onClick={() => toggleTagRule(collection, tag)}>
                              {tag}
                            </button>
                          ))
                        ) : (
                          <span className="muted">没有更多可选标签</span>
                        )}
                      </div>
                      {missingRules.length ? (
                        <button type="button" onClick={() => removeMissingRules(collection)}>清理失效标签</button>
                      ) : null}
                    </div>
                    <div className="category-editor-actions">
                      <button type="button" disabled={!onImportCollectionIcon} onClick={() => importIcon(collection.id)}>选择图标</button>
                      <button className="danger-button" type="button" onClick={() => removeCollection(collection.id)}>删除分组</button>
                    </div>
                  </article>
                );
              })}
          </div>

          <div className="detail-actions">
            <button className="primary-button" type="button" onClick={saveSettings}>保存设置</button>
            {status ? <span className="settings-save-status">{status}</span> : null}
          </div>
        </section>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-row">
      <strong>{label}</strong>
      <code>{value}</code>
    </div>
  );
}

function createCollectionId(name: string, collections: CatalogCollection[]): string {
  const base = slug(name) || 'group';
  const existingIds = new Set(collections.map((collection) => collection.id));
  let id = base;
  let index = 1;
  while (existingIds.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
