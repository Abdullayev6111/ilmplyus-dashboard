import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import { queryClient } from '../../main';
import './DeleteConfirmModal.css';

interface DeleteConfirmationModalProps {
  lidId: number;
  onClose: () => void;
}

export const DeleteConfirmationModal = ({ lidId, onClose }: DeleteConfirmationModalProps) => {
  const { t } = useTranslation();
  const overlayRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation<void, Error, number>({
    mutationFn: (id) => API.delete(`/lids/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lids'] });
      onClose();
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  const handleConfirm = useCallback(() => {
    mutation.mutate(lidId);
  }, [lidId, mutation]);

  return (
    <div
      className="dcm-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="dcm-title"
    >
      <div className="dcm-modal">
        <h2 className="dcm-modal__title" id="dcm-title">
          {t('lid.modals.confirmDelete')}
        </h2>
        <div className="dcm-modal__actions">
          <button
            type="button"
            className="dcm-btn dcm-btn--cancel"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t('lid.modals.cancel')}
          </button>
          <button
            type="button"
            className="dcm-btn dcm-btn--confirm"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {t('lid.modals.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
