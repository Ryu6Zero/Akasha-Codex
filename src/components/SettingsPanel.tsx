import { useEffect, useState } from 'react';
import type { TagGovernanceItem } from '../storage/tagGovernance';
import type { AppPreferences, CatalogMetadata, LibrarySettings } from '../types';
import { CollectionManagerPanel } from './CollectionManagerPanel';
import { TagGovernancePanel } from './TagGovernancePanel';

type SettingsPanelProps = {
  settings: LibrarySettings | null;
  catalog: CatalogMetadata;
  appPreferences: AppPreferences;
  availableTags: string[];
  tagGovernanceItems: TagGovernanceItem[];
  onSelectLibraryRoot: () => void | Promise<void>;
  onOpenLibraryRoot: () => void | Promise<void>;
  onImportWallpaper: () => void | Promise<void>;
  onSaveCatalog: (catalog: CatalogMetadata) => void | Promise<void>;
  onSaveAppPreferences: (preferences: AppPreferences) => void | Promise<void>;
  onMergeCharacterTag: (sourceTag: string, targetTag: string) => void | Promise<void>;
  onDeleteUnusedCharacterTagRule: (tag: string) => void | Promise<void>;
  onImportCollectionIcon?: (collectionId: string) => void | Promise<void>;
  onClose: () => void;
};

export function SettingsPanel({
  settings,
  catalog,
  appPreferences,
  availableTags,
  tagGovernanceItems,
  onSelectLibraryRoot,
  onOpenLibraryRoot,
  onImportWallpaper,
  onSaveCatalog,
  onSaveAppPreferences,
  onMergeCharacterTag,
  onDeleteUnusedCharacterTagRule,
  onImportCollectionIcon,
  onClose,
}: SettingsPanelProps) {
  const [wallpaperOpacity, setWallpaperOpacity] = useState(catalog.wallpaperOpacity ?? 0.72);
  const [soundMode, setSoundMode] = useState<AppPreferences['soundMode']>(appPreferences.soundMode);
  const [soundVolume, setSoundVolume] = useState(appPreferences.soundVolume);
  const [status, setStatus] = useState('');
  const wallpaperOpacityPercent = Math.round(wallpaperOpacity * 100);
  const isWallpaperOpacityDirty = Math.abs(wallpaperOpacity - (catalog.wallpaperOpacity ?? 0.72)) > 0.001;

  useEffect(() => {
    setWallpaperOpacity(catalog.wallpaperOpacity ?? 0.72);
  }, [catalog.wallpaperOpacity]);

  useEffect(() => {
    setSoundMode(appPreferences.soundMode);
    setSoundVolume(appPreferences.soundVolume);
  }, [appPreferences]);

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

        <TagGovernancePanel
          tagGovernanceItems={tagGovernanceItems}
          onMergeCharacterTag={onMergeCharacterTag}
          onDeleteUnusedCharacterTagRule={onDeleteUnusedCharacterTagRule}
        />

        <CollectionManagerPanel
          catalog={catalog}
          availableTags={availableTags}
          onSaveCatalog={onSaveCatalog}
          onImportCollectionIcon={onImportCollectionIcon}
        />
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
