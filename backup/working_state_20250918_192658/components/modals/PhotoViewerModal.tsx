import React, { useRef, useEffect, useState } from 'react';
import { PhotoViewerModalProps } from '../../types';
import { IconClose, IconTrash, IconChevronLeft, IconChevronRight } from '../common/Icon';

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDelete }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

    const currentPhoto = photo.photos[currentPhotoIndex];

    const handlePrevious = () => {
        setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : photo.photos.length - 1);
    };

    const handleNext = () => {
        setCurrentPhotoIndex(prev => prev < photo.photos.length - 1 ? prev + 1 : 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            handlePrevious();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="modal-overlay photo-viewer-overlay" onClick={onClose}>
            <div className="photo-viewer-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef} onKeyDown={handleKeyDown}>
                <div className="photo-viewer-header">
                    <h3>{photo.title}</h3>
                    <span className="photo-counter">
                        {currentPhotoIndex + 1} из {photo.photos.length}
                    </span>
                </div>
                
                <div className="photo-viewer-main">
                    {photo.photos.length > 1 && (
                        <button 
                            className="photo-nav-btn prev-btn" 
                            onClick={handlePrevious}
                            aria-label="Предыдущее фото"
                        >
                            <IconChevronLeft />
                        </button>
                    )}
                    
                    <div className="photo-container">
                        <img src={currentPhoto.url} alt={currentPhoto.caption || 'Фото из отчета'} />
                        {currentPhoto.caption && (
                            <p className="photo-viewer-caption">{currentPhoto.caption}</p>
                        )}
                    </div>
                    
                    {photo.photos.length > 1 && (
                        <button 
                            className="photo-nav-btn next-btn" 
                            onClick={handleNext}
                            aria-label="Следующее фото"
                        >
                            <IconChevronRight />
                        </button>
                    )}
                </div>

                {photo.photos.length > 1 && (
                    <div className="photo-thumbnails">
                        {photo.photos.map((photoItem, index) => (
                            <button
                                key={index}
                                className={`photo-thumbnail-btn ${index === currentPhotoIndex ? 'active' : ''}`}
                                onClick={() => setCurrentPhotoIndex(index)}
                            >
                                <img src={photoItem.url} alt={photoItem.caption || `Фото ${index + 1}`} />
                            </button>
                        ))}
                    </div>
                )}

                <div className="photo-viewer-actions">
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                    <button onClick={() => onDelete(photo.id)} className="delete-photo-btn" aria-label="Удалить фотоотчет"><IconTrash/></button>
                </div>
            </div>
        </div>
    );
};