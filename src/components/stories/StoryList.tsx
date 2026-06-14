import type { Story } from '../../types';

type StoryListProps = {
  stories: Story[];
  selectedStoryId?: string;
  brokenLinkCounts: Map<string, number>;
  onSelectStory: (storyId: string) => void;
};

export function StoryList({ stories, selectedStoryId, brokenLinkCounts, onSelectStory }: StoryListProps) {
  if (!stories.length) {
    return (
      <div className="empty-grid">
        <h2>没有匹配故事</h2>
        <p>调整搜索、标签或分类后再试。</p>
      </div>
    );
  }

  return (
    <>
      {stories.map((story) => (
        <button
          className={selectedStoryId === story.id ? 'story-card selected' : 'story-card'}
          key={story.id}
          type="button"
          onClick={() => onSelectStory(story.id)}
        >
          {story.coverImageUrl ? <img src={story.coverImageUrl} alt="" /> : <span>{story.title.slice(0, 1) || '?'}</span>}
          <strong>{story.title || '未命名故事'}</strong>
          <small>{story.summary || story.subtitle || '暂无摘要'}</small>
          <div className="story-card-meta">
            <span>{formatStoryDate(story.updatedAt)}</span>
            {brokenLinkCounts.get(story.id) ? <span className="warning-pill">{brokenLinkCounts.get(story.id)} 个失效词条</span> : null}
          </div>
        </button>
      ))}
    </>
  );
}

export function formatStoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
