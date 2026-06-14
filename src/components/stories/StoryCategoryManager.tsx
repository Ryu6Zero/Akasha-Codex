import type { StoryCategory } from '../../types';

type StoryCategoryManagerProps = {
  categories: StoryCategory[];
  onAddCategory: () => void;
  onUpdateCategory: (categoryId: string, patch: Partial<StoryCategory>) => void;
  onRemoveCategory: (categoryId: string) => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
};

export function StoryCategoryManager({
  categories,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onCancel,
  onSave,
}: StoryCategoryManagerProps) {
  return (
    <div className="story-editor-overlay" role="dialog" aria-modal="true" aria-label="故事分类管理">
      <section className="story-editor-panel story-category-panel">
        <header className="editor-header">
          <div>
            <p>Story Groups</p>
            <h2>故事分类</h2>
          </div>
          <div className="detail-actions">
            <button type="button" onClick={onCancel}>取消</button>
            <button className="primary-button" type="button" onClick={onSave}>保存</button>
          </div>
        </header>
        <button type="button" onClick={onAddCategory}>新增分类</button>
        <div className="category-editor-list">
          {categories.filter((category) => category.id !== 'all').map((category) => (
            <article className="category-editor-card story-category-card" key={category.id}>
              <label>
                分类名
                <input value={category.name} onChange={(event) => onUpdateCategory(category.id, { name: event.target.value })} />
              </label>
              <label>
                说明
                <input value={category.description} onChange={(event) => onUpdateCategory(category.id, { description: event.target.value })} />
              </label>
              <label>
                匹配标签
                <input
                  value={category.tagRules.join(', ')}
                  onChange={(event) => onUpdateCategory(category.id, { tagRules: event.target.value.split(',') })}
                  placeholder="用英文逗号分隔"
                />
              </label>
              <button className="danger-button" type="button" onClick={() => onRemoveCategory(category.id)}>
                删除
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
