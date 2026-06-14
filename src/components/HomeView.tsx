import type { CSSProperties } from 'react';
import type { CatalogMetadata } from '../types';

type HomeViewProps = {
  catalog: CatalogMetadata;
  isLoading: boolean;
  onEnter: () => void;
  onEnterStories: () => void;
  onOpenSettings: () => void;
  onPlaySound: () => void;
};

export function HomeView({ catalog, isLoading, onEnter, onEnterStories, onOpenSettings, onPlaySound }: HomeViewProps) {
  function enterCatalog(): void {
    onPlaySound();
    onEnter();
  }

  function enterStories(): void {
    onPlaySound();
    onEnterStories();
  }

  return (
    <section
      className="home-view"
      style={{ '--wallpaper-opacity': String(catalog.wallpaperOpacity ?? 0.72) } as CSSProperties & Record<string, string>}
    >
      {catalog.wallpaperUrl ? <div className="home-wallpaper" style={{ backgroundImage: `url(${catalog.wallpaperUrl})` }} /> : null}
      <button className="ghost-icon-button home-settings" type="button" onClick={onOpenSettings} aria-label="设置">
        ⚙
      </button>
      <div className="home-identity">
        <p>Akasha Codex</p>
        <h1>绯典阁</h1>
        <span>本地角色典藏</span>
      </div>
      <button className="enter-catalog-button" type="button" onClick={enterCatalog} disabled={isLoading}>
        <span className="enter-catalog-symbol" aria-hidden="true">图</span>
        <span>{isLoading ? '读取中' : '进入图鉴'}</span>
      </button>
      <button className="enter-catalog-button secondary-entry-button" type="button" onClick={enterStories} disabled={isLoading}>
        <span className="enter-catalog-symbol" aria-hidden="true">文</span>
        <span>{isLoading ? '读取中' : '故事库'}</span>
      </button>
    </section>
  );
}
