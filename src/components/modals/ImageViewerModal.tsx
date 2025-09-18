import React, { useState, useEffect } from 'react';
import './ImageViewerModal.css';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  alt?: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  alt = 'Изображение'
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `receipt_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-viewer-header">
          <h3 className="image-viewer-title">{title}</h3>
          <div className="image-viewer-controls">
            <button
              className="image-viewer-btn"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Уменьшить"
            >
              −
            </button>
            <span className="image-viewer-scale">{Math.round(scale * 100)}%</span>
            <button
              className="image-viewer-btn"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              title="Увеличить"
            >
              +
            </button>
            <button
              className="image-viewer-btn"
              onClick={handleResetZoom}
              title="Сбросить масштаб"
            >
              1:1
            </button>
            <button
              className="image-viewer-btn"
              onClick={handleDownload}
              title="Скачать"
            >
              ⬇
            </button>
            <button
              className="image-viewer-btn image-viewer-close"
              onClick={onClose}
              title="Закрыть"
            >
              ×
            </button>
          </div>
        </div>

        <div className="image-viewer-content">
          {isLoading && (
            <div className="image-viewer-loading">
              <div className="image-viewer-spinner"></div>
              <p>Загрузка изображения...</p>
            </div>
          )}

          {hasError && (
            <div className="image-viewer-error">
              <div className="image-viewer-error-icon">❌</div>
              <p>Не удалось загрузить изображение</p>
              <button
                className="image-viewer-btn image-viewer-btn-primary"
                onClick={handleOpenInNewTab}
              >
                Открыть в новой вкладке
              </button>
            </div>
          )}

          {!isLoading && !hasError && (
            <div
              className="image-viewer-image-container"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
            >
              <img
                src={imageUrl}
                alt={alt}
                className="image-viewer-image"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transformOrigin: 'center center'
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
