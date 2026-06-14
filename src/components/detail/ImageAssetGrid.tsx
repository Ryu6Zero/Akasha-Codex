import type { ImageAsset } from './detailUtils';
import { fileName } from './detailUtils';

type ImageAssetGridProps = {
  assets: ImageAsset[];
  activePath?: string;
  emptyText: string;
  isEditing: boolean;
  activeLabel: string;
  setLabel: string;
  onPreview: (imageUrl?: string) => void;
  onSetActive: (asset: ImageAsset) => void;
  onRemove: (assetPath: string) => void;
};

export function ImageAssetGrid({
  assets,
  activePath,
  emptyText,
  isEditing,
  activeLabel,
  setLabel,
  onPreview,
  onSetActive,
  onRemove,
}: ImageAssetGridProps) {
  if (!assets.length) return <p>{emptyText}</p>;

  return (
    <div className="portrait-gallery editable-gallery">
      {assets.map((asset) => (
        <article className={asset.path === activePath ? 'asset-tile active' : 'asset-tile'} key={asset.path}>
          <button type="button" onClick={() => onPreview(asset.url)}>
            {asset.url ? <img src={asset.url} alt={fileName(asset.path)} /> : <span>{fileName(asset.path)}</span>}
          </button>
          <div className="asset-tile-actions">
            {asset.path === activePath ? <small>{activeLabel}</small> : null}
            {isEditing && asset.path !== activePath ? <button type="button" onClick={() => onSetActive(asset)}>{setLabel}</button> : null}
            {isEditing ? <button className="danger-button" type="button" onClick={() => onRemove(asset.path)}>删除</button> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
