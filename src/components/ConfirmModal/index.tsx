import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './confirmModal.css';

/* ------------------------------------------------------------------ *
 * Tasdiqlash modali — `window.confirm` o'rniga.
 * Qaytarib bo'lmaydigan amallardan oldin ishlatiladi.
 * ------------------------------------------------------------------ */

type Tone = 'danger' | 'success' | 'primary';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Tasdiqlash tugmasi rangi — amalning xarakteriga qarab. */
  tone?: Tone;
  /** So'rov ketayotganda ikkala tugma ham bloklanadi. */
  busy?: boolean;
  /** Sabab maydonini ko'rsatadi va to'ldirilmaguncha tasdiqlashni bloklaydi. */
  reasonRequired?: boolean;
  reasonLabel?: string;
  /** Sabab so'ralgan bo'lsa, kiritilgan matn bilan chaqiriladi. */
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  busy = false,
  reasonRequired = false,
  reasonLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');

  // Escape bilan yopish — ModalPattern'dagi xulq-atvor bilan bir xil.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onCancel]);

  // Har ochilishda sabab tozalanadi — oldingi amalning matni qolib ketmasin.
  // Effekt emas, render fazasida (cascading render bo'lmasligi uchun):
  // https://react.dev/learn/you-might-not-need-an-effect
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason('');
  }

  if (!open) return null;

  const confirmDisabled = busy || (reasonRequired && !reason.trim());

  return (
    <div className="cm-overlay" onClick={() => !busy && onCancel()}>
      <div
        className="cm-container"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-header">
          <h2 className="cm-title">{title}</h2>
          <button
            className="cm-close-btn"
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label={t('modalPattern.close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="cm-body">
          {message}
          {reasonRequired && (
            <div className="cm-reason">
              <label className="cm-reason-label">
                {reasonLabel}
                <span className="cm-req">*</span>
              </label>
              <textarea
                className="cm-reason-input"
                value={reason}
                disabled={busy}
                autoFocus
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="cm-actions">
          <button className="cm-btn cm-btn--cancel" type="button" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`cm-btn cm-btn--${tone}`}
            type="button"
            disabled={confirmDisabled}
            onClick={() => onConfirm(reasonRequired ? reason.trim() : undefined)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
