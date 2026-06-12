import { PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

type ImageLightboxProps = {
  images: string[];
  currentIndex: number;
  title: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 6;

export function ImageLightbox({ images, currentIndex, title, onClose, onNavigate }: ImageLightboxProps) {
  const { t } = useLanguage();
  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);

  const imageStyle = useMemo(
    () => ({ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }),
    [offset.x, offset.y, scale],
  );

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragStart(null);
  }, [currentIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasMultipleImages) onNavigate((currentIndex - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight' && hasMultipleImages) onNavigate((currentIndex + 1) % images.length);
      if (event.key === '+' || event.key === '=') zoomBy(0.25);
      if (event.key === '-') zoomBy(-0.25);
      if (event.key === '0') resetView();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasMultipleImages, images.length, onClose, onNavigate, scale]);

  if (!currentImage) return null;

  function resetView(): void {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function zoomBy(delta: number): void {
    setScale((currentScale) => {
      const nextScale = clampScale(currentScale + delta);
      setOffset((currentOffset) => clampOffset(currentOffset, nextScale, canvasRef.current));
      return nextScale;
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.2 : 0.2);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (scale <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: offset.x, originY: offset.y });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;
    setOffset(clampOffset({
      x: dragStart.originX + event.clientX - dragStart.x,
      y: dragStart.originY + event.clientY - dragStart.y,
    }, scale, canvasRef.current));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (dragStart?.pointerId === event.pointerId) setDragStart(null);
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={t('imagePreview')} onMouseDown={onClose}>
      <div className="lightbox-frame" onMouseDown={(event) => event.stopPropagation()}>
        <header className="lightbox-toolbar">
          <span>
            {title} · {currentIndex + 1}/{images.length} · {Math.round(scale * 100)}%
          </span>
          <div className="lightbox-tools">
            <button type="button" onClick={() => zoomBy(-0.25)} aria-label="缩小">-</button>
            <button type="button" onClick={resetView} aria-label="重置">1:1</button>
            <button type="button" onClick={() => zoomBy(0.25)} aria-label="放大">+</button>
            <button type="button" onClick={onClose} aria-label={t('close')}>×</button>
          </div>
        </header>

        <div
          ref={canvasRef}
          className={`lightbox-canvas${scale > 1 ? ' is-draggable' : ''}`}
          onWheel={handleWheel}
          onDoubleClick={() => {
            if (scale > 1) resetView();
            else zoomBy(1);
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img src={currentImage} alt={title} draggable={false} style={imageStyle} />
        </div>

        {hasMultipleImages ? (
          <div className="lightbox-navigation">
            <button type="button" onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}>
              {t('previousImage')}
            </button>
            <button type="button" onClick={() => onNavigate((currentIndex + 1) % images.length)}>
              {t('nextImage')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(2))));
}

function clampOffset(offset: { x: number; y: number }, scale: number, canvas: HTMLDivElement | null): { x: number; y: number } {
  if (!canvas || scale <= 1) return { x: 0, y: 0 };
  const maxX = (canvas.clientWidth * (scale - 1)) / 2;
  const maxY = (canvas.clientHeight * (scale - 1)) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}
