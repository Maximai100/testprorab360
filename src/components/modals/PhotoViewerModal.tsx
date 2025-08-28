import React from 'react';
import { PhotoViewerModalProps } from '../../types';
import { IconClose, IconTrash } from '../common/Icon';

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDelete }) => {
    return (
        <div className="modal-overlay photo-viewer-overlay" onClick={onClose}>
            <div className="photo-viewer-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
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