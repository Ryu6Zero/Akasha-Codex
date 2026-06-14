import { useState } from 'react';

type ConfirmDialogProps = {
  title: string;
  message: string;
  details?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  details = [],
  confirmLabel,
  cancelLabel = '取消',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isWorking, setIsWorking] = useState(false);

  async function confirm(): Promise<void> {
    setIsWorking(true);
    try {
      await onConfirm();
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="confirm-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <section className={`confirm-dialog glass-panel confirm-dialog-${tone}`}>
        <header>
          <p>{tone === 'danger' ? 'Danger Zone' : 'Confirm'}</p>
          <h2 id="confirm-dialog-title">{title}</h2>
        </header>
        <p>{message}</p>
        {details.length ? (
          <ul>
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        <div className="detail-actions">
          <button type="button" disabled={isWorking} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={tone === 'danger' ? 'danger-button' : 'primary-button'} type="button" disabled={isWorking} onClick={confirm}>
            {isWorking ? '处理中...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
