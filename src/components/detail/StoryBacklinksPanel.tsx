import type { StoryBacklink } from '../../types';

type StoryBacklinksPanelProps = {
  backlinks: StoryBacklink[];
  onOpenStory?: (storyId: string) => void;
};

export function StoryBacklinksPanel({ backlinks, onOpenStory }: StoryBacklinksPanelProps) {
  return (
    <section className="glass-panel story-backlinks-panel">
      <h2>被故事引用</h2>
      {backlinks.length ? (
        <div className="story-backlink-list">
          {backlinks.map((backlink) => (
            <button key={backlink.storyId} type="button" onClick={() => onOpenStory?.(backlink.storyId)}>
              <strong>{backlink.storyTitle}</strong>
              {backlink.excerpt ? <span>{backlink.excerpt}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <p>暂无故事引用这个词条。</p>
      )}
    </section>
  );
}
