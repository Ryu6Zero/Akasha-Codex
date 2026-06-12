import type { CSSProperties } from 'react';
import type { CatalogMetadata } from '../types';

type HomeViewProps = {
  catalog: CatalogMetadata;
  isLoading: boolean;
  onEnter: () => void;
  onOpenSettings: () => void;
};

export function HomeView({ catalog, isLoading, onEnter, onOpenSettings }: HomeViewProps) {
  function enterCatalog(): void {
    playUiSound();
    onEnter();
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
    </section>
  );
}

function playUiSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(860, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.13);
    window.setTimeout(() => void context.close(), 180);
  } catch {
    // Sound is optional; blocked audio should never block navigation.
  }
}
