import type { StoryBlock } from '../../types';

type StoryBlockEditorProps = {
  block: StoryBlock;
  index: number;
  blockCount: number;
  canImportImages: boolean;
  onPatch: (blockId: string, patch: Partial<StoryBlock>) => void;
  onTextChange: (blockId: string, value: string) => void;
  onDelete: (blockId: string) => void;
  onOpenReferencePicker: (blockId: string) => void;
  onImportImage: (blockId: string) => void | Promise<void>;
  onRemoveImage: (assetPath: string) => void | Promise<void>;
};

export function StoryBlockEditor({
  block,
  index,
  blockCount,
  canImportImages,
  onPatch,
  onTextChange,
  onDelete,
  onOpenReferencePicker,
  onImportImage,
  onRemoveImage,
}: StoryBlockEditorProps) {
  return (
    <article className={`story-block-editor story-block-${block.type}`}>
      <div className="story-block-toolbar">
        <strong>{blockLabel(block.type, index)}</strong>
        <select value={block.type} onChange={(event) => onPatch(block.id, { type: event.target.value as StoryBlock['type'] })}>
          <option value="paragraph">段落</option>
          <option value="heading">标题</option>
          <option value="quote">引用</option>
          <option value="image">图片</option>
        </select>
        {block.type !== 'image' ? (
          <button className="reference-trigger-button" type="button" onClick={() => onOpenReferencePicker(block.id)}>
            @ 引用
          </button>
        ) : null}
        <button className="danger-button" type="button" disabled={blockCount <= 1} onClick={() => onDelete(block.id)}>
          删除
        </button>
      </div>

      {block.type === 'image' ? (
        <div className="story-image-editor">
          {block.imageUrl ? <img src={block.imageUrl} alt={block.caption || block.imageFileName || ''} /> : <p>尚未选择图片</p>}
          <div className="detail-actions">
            <button type="button" disabled={!canImportImages} onClick={() => onImportImage(block.id)}>选择图片</button>
            {block.imagePath ? (
              <button className="danger-button" type="button" onClick={() => onRemoveImage(block.imagePath as string)}>
                移除图片
              </button>
            ) : null}
          </div>
          <input value={block.caption || ''} onChange={(event) => onPatch(block.id, { caption: event.target.value })} placeholder="图片说明" />
        </div>
      ) : (
        <textarea
          className="story-prose-input"
          value={block.text}
          onChange={(event) => onTextChange(block.id, event.target.value)}
          onFocus={() => onOpenReferencePicker(block.id)}
          placeholder="像写博客一样输入正文。输入 @ 可以搜索并插入图鉴引用。"
        />
      )}
    </article>
  );
}

function blockLabel(type: StoryBlock['type'], index: number): string {
  if (type === 'heading') return `标题 ${index + 1}`;
  if (type === 'quote') return `引用 ${index + 1}`;
  if (type === 'image') return `图片 ${index + 1}`;
  return `段落 ${index + 1}`;
}
