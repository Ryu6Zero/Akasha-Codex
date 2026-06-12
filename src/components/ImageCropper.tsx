import { PointerEvent, useMemo, useState } from 'react';
import type { CropImageSelection } from '../types';

type ImageCropperProps = {
  selection: CropImageSelection;
  title: string;
  confirmLabel: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
  previewMode?: 'avatar' | 'wallpaper';
  onCancel: () => void;
  onConfirm: (imageDataUrl: string, fileName: string) => void | Promise<void>;
};

const STAGE_WIDTH = 360;

export function ImageCropper({
  selection,
  title,
  confirmLabel,
  aspectRatio,
  outputWidth,
  outputHeight,
  previewMode = 'avatar',
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const stageHeight = Math.round(STAGE_WIDTH / aspectRatio);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);

  const baseScale = useMemo(
    () => Math.max(STAGE_WIDTH / imageSize.width, stageHeight / imageSize.height),
    [imageSize.height, imageSize.width, stageHeight],
  );
  const displayWidth = imageSize.width * baseScale * zoom;
  const displayHeight = imageSize.height * baseScale * zoom;
  const transform = `translate(${offset.x}px, ${offset.y}px)`;

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    setOffset({
      x: dragStart.originX + event.clientX - dragStart.x,
      y: dragStart.originY + event.clientY - dragStart.y,
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (dragStart?.pointerId === event.pointerId) setDragStart(null);
  }

  async function confirmCrop(): Promise<void> {
    const image = new Image();
    image.src = selection.dataUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratioX = outputWidth / STAGE_WIDTH;
    const ratioY = outputHeight / stageHeight;
    const dx = (STAGE_WIDTH / 2 - displayWidth / 2 + offset.x) * ratioX;
    const dy = (stageHeight / 2 - displayHeight / 2 + offset.y) * ratioY;
    context.fillStyle = '#101018';
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.drawImage(image, dx, dy, displayWidth * ratioX, displayHeight * ratioY);
    await onConfirm(canvas.toDataURL('image/png'), selection.fileName);
  }

  function reset(): void {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div className="cropper-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <section className={`cropper-panel cropper-panel-${previewMode}`}>
        <header className="lightbox-toolbar">
          <strong>{title}</strong>
          <button type="button" onClick={onCancel} aria-label="关闭">×</button>
        </header>

        <div
          className={`cropper-stage cropper-stage-${previewMode}`}
          style={{ width: STAGE_WIDTH, height: stageHeight }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={selection.dataUrl}
            alt={title}
            draggable={false}
            onLoad={(event) => {
              setImageSize({
                width: event.currentTarget.naturalWidth || 1,
                height: event.currentTarget.naturalHeight || 1,
              });
            }}
            style={{ width: `${displayWidth}px`, height: `${displayHeight}px`, transform }}
          />
          <div className="cropper-frame" />
          {previewMode === 'wallpaper' ? (
            <div className="wallpaper-crop-preview">
              <span>绯典阁</span>
              <button type="button" tabIndex={-1}>进入图鉴</button>
            </div>
          ) : null}
        </div>

        <label className="cropper-zoom">
          缩放
          <input min="1" max="4" step="0.05" type="range" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <div className="detail-actions">
          <button type="button" onClick={reset}>重置</button>
          <button type="button" onClick={onCancel}>取消</button>
          <button className="primary-button" type="button" onClick={confirmCrop}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
