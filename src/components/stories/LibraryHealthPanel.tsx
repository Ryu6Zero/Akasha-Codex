import { useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import type { LibraryHealthIssue, LibraryHealthReport } from '../../types';

const MIN_HEALTH_PANEL_HEIGHT = 112;
const MAX_HEALTH_PANEL_HEIGHT = 430;

function getBoundedHealthPanelHeight(value: number): number {
  const viewportMax =
    typeof window === 'undefined'
      ? MAX_HEALTH_PANEL_HEIGHT
      : Math.max(MIN_HEALTH_PANEL_HEIGHT, Math.min(MAX_HEALTH_PANEL_HEIGHT, window.innerHeight - 260));
  return Math.min(Math.max(value, MIN_HEALTH_PANEL_HEIGHT), viewportMax);
}

type LibraryHealthPanelProps = {
  report: LibraryHealthReport;
  onOpenStory: (storyId: string) => void;
  onOpenCharacter: (characterId: string) => void;
};

export function LibraryHealthPanel({ report, onOpenStory, onOpenCharacter }: LibraryHealthPanelProps) {
  const [isOrphanExpanded, setIsOrphanExpanded] = useState(false);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const orphanIssues = report.issues.filter((issue) => issue.kind === 'orphan-character');
  const orphanCharacterCount = orphanIssues.length;
  const actionableIssues = report.issues.filter((issue) => issue.kind !== 'orphan-character');
  const visibleIssues = actionableIssues.slice(0, 5);
  const visibleOrphanIssues = orphanIssues.slice(0, 18);
  const hiddenOrphanCount = Math.max(0, orphanIssues.length - visibleOrphanIssues.length);

  const getOrphanTitle = (issue: LibraryHealthIssue) =>
    issue.label ?? issue.title.replace(/^暂无故事反链：/, '').replace(/^No story backlinks:\s*/i, '');

  const beginPanelResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panelRef.current?.getBoundingClientRect().height ?? MIN_HEALTH_PANEL_HEIGHT;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const resizePanel = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      setPanelHeight(getBoundedHealthPanelHeight(startHeight + moveEvent.clientY - startY));
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', resizePanel);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', resizePanel);
    window.addEventListener('pointerup', stopResize, { once: true });
  };

  const resizePanelWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentHeight = panelHeight ?? panelRef.current?.getBoundingClientRect().height ?? MIN_HEALTH_PANEL_HEIGHT;
    if (event.key === 'Home') {
      setPanelHeight(MIN_HEALTH_PANEL_HEIGHT);
      return;
    }
    if (event.key === 'End') {
      setPanelHeight(getBoundedHealthPanelHeight(MAX_HEALTH_PANEL_HEIGHT));
      return;
    }
    setPanelHeight(getBoundedHealthPanelHeight(currentHeight + (event.key === 'ArrowDown' ? 24 : -24)));
  };

  return (
    <section
      className="library-health-panel glass-panel"
      ref={panelRef}
      style={panelHeight ? { height: `${panelHeight}px` } : undefined}
    >
      <header>
        <div>
          <p>Library Health</p>
          <h2>知识库健康</h2>
        </div>
        <div className="health-stats">
          <span>{report.summary.characterCount} 角色</span>
          <span>{report.summary.storyCount} 故事</span>
          <span className={report.summary.warningCount ? 'warning-pill' : ''}>{report.summary.warningCount} 链接/分类警告</span>
        </div>
      </header>

      {orphanCharacterCount ? (
        <div className="health-summary-group">
          <button
            type="button"
            className="health-summary-toggle"
            aria-expanded={isOrphanExpanded}
            onClick={() => setIsOrphanExpanded((value) => !value)}
          >
            <span>
              <strong>{orphanCharacterCount} 个角色暂未被故事引用</strong>
              <small>已折叠为统计项，点击查看部分未引用词条。</small>
            </span>
            <span className="health-summary-action">{isOrphanExpanded ? '收起' : '展开'}</span>
          </button>

          {isOrphanExpanded ? (
            <div className="health-collapsible-panel">
              <p>先显示前 {visibleOrphanIssues.length} 个未引用角色，点击可直接打开对应词条。</p>
              <div className="health-orphan-grid">
                {visibleOrphanIssues.map((issue) => (
                  <button
                    type="button"
                    key={issue.id}
                    onClick={() => issue.characterId && onOpenCharacter(issue.characterId)}
                  >
                    {getOrphanTitle(issue)}
                  </button>
                ))}
              </div>
              {hiddenOrphanCount ? <small>还有 {hiddenOrphanCount} 个未展开显示。</small> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {visibleIssues.length ? (
        <div className="health-issue-list">
          {visibleIssues.map((issue) => (
            <article className={`health-issue health-issue-${issue.severity}`} key={issue.id}>
              <div>
                <strong>{issue.title}</strong>
                <small>{issue.detail}</small>
              </div>
              {issue.storyId ? (
                <button type="button" onClick={() => onOpenStory(issue.storyId as string)}>
                  查看故事
                </button>
              ) : null}
              {issue.characterId ? (
                <button type="button" onClick={() => onOpenCharacter(issue.characterId as string)}>
                  查看词条
                </button>
              ) : null}
            </article>
          ))}
          {actionableIssues.length > visibleIssues.length ? <p className="muted">还有 {actionableIssues.length - visibleIssues.length} 条链接或分类问题未显示。</p> : null}
        </div>
      ) : (
        <p className="muted">当前没有发现需要立刻处理的失效链接或分类问题。</p>
      )}
      <button
        type="button"
        className="library-health-resize-handle"
        aria-label="调整知识库健康面板高度"
        onPointerDown={beginPanelResize}
        onKeyDown={resizePanelWithKeyboard}
      >
        <span aria-hidden="true" />
      </button>
    </section>
  );
}
