import type { AssetType, Character } from '../../types';
import { fileName } from './detailUtils';

type AttachmentSectionProps = {
  character: Character;
  isEditing: boolean;
  canImport: boolean;
  onImport: (assetType: AssetType) => void;
  onRemove: (assetType: AssetType, assetPath: string) => void;
};

export function AttachmentSection({
  character,
  isEditing,
  canImport,
  onImport,
  onRemove,
}: AttachmentSectionProps) {
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
