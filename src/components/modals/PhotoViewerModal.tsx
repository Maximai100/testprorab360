import React, { useRef, useEffect } from 'react';
import { PhotoViewerModalProps } from '../../types';
import { IconClose, IconTrash } from '../common/Icon';

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDelete }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            if (firstElement) {
                firstElement.focus();
            }
        }
    }, []);

    return (
        <div className="modal-overlay photo-viewer-overlay" onClick={onClose}>
            <div className="photo-viewer-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <img src={photo.image} alt={photo.caption || 'Фото из отчета'} />
                {photo.caption && <p className="photo-viewer-caption">{photo.caption}</p>}
                <div className="photo-viewer-actions">
                     <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                     <button onClick={() => onDelete(photo.id)} className="delete-photo-btn" aria-label="Удалить"><IconTrash/></button>
                </div>
            </div>
        </div>
    );
};