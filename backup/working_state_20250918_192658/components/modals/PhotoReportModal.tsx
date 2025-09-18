import React, { useState, useRef, useEffect } from 'react';
import { PhotoReportModalProps } from '../../types';
import { IconClose } from '../common/Icon';
import { useFileStorage } from '../../hooks/useFileStorage';

interface PhotoItem {
    file: File;
    preview: string;
    caption: string;
}

export const PhotoReportModal: React.FC<PhotoReportModalProps> = ({ onClose, onSave, showAlert, projectId }) => {
    const [title, setTitle] = useState('');
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFileWithFallback, createPhotoReport, isUploading } = useFileStorage();

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = e.target?.result as string;
                    setPhotos(prev => [...prev, {
                        file,
                        preview,
                        caption: ''
                    }]);
                };
                reader.readAsDataURL(file);
            }
        });

        // Очищаем input для возможности повторного выбора тех же файлов
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCaptionChange = (index: number, caption: string) => {
        setPhotos(prev => prev.map((photo, i) => 
            i === index ? { ...photo, caption } : photo
        ));
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            showAlert('Введите заголовок фотоотчета.');
            return;
        }

        if (photos.length === 0) {
            showAlert('Выберите хотя бы одну фотографию.');
            return;
        }

        try {
            // Проверяем размер всех фотографий перед загрузкой
            const maxFileSize = 10 * 1024 * 1024; // 10MB
            const oversizedFiles = photos.filter(photo => photo.file.size > maxFileSize);
            
            if (oversizedFiles.length > 0) {
                const fileSizeMB = (oversizedFiles[0].file.size / (1024 * 1024)).toFixed(2);
                showAlert(`Файл "${oversizedFiles[0].file.name}" слишком большой: ${fileSizeMB}MB. Максимальный размер: 10MB`);
                return;
            }

            // Загружаем все фотографии с fallback на base64
            const uploadPromises = photos.map(async (photo, index) => {
                try {
                    const uploadResult = await uploadFileWithFallback('photos', photo.file);
                    if (uploadResult.error) {
                        throw new Error(`Ошибка загрузки фото "${photo.file.name}": ${uploadResult.error}`);
                    }
                    return {
                        url: uploadResult.publicUrl,
                        path: uploadResult.path,
                        caption: photo.caption.trim() || 'Без подписи',
                        isBase64: uploadResult.path.startsWith('base64://')
                    };
                } catch (error) {
                    console.error(`Ошибка загрузки фото ${index + 1}:`, error);
                    throw error;
                }
            });

            const uploadedPhotos = await Promise.all(uploadPromises);

            // Проверяем, есть ли файлы сохраненные как base64
            const base64Count = uploadedPhotos.filter(photo => photo.isBase64).length;
            if (base64Count > 0) {
                console.log(`📝 ${base64Count} из ${uploadedPhotos.length} фотографий сохранены как base64 из-за проблем с Storage`);
            }

            // Создаем фотоотчет в базе данных
            const photoReportRecord = await createPhotoReport({
                project_id: projectId,
                title: title.trim(),
                photos: uploadedPhotos,
            });

            // Вызываем callback с данными фотоотчета
            onSave({
                id: photoReportRecord.id,
                title: photoReportRecord.title,
                photos: uploadedPhotos,
                date: photoReportRecord.date
            });
        } catch (error) {
            console.error('Ошибка при сохранении фотоотчета:', error);
            
            // Показываем более информативное сообщение об ошибке
            const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при сохранении фотоотчета.';
            showAlert(errorMessage);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card photo-report-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Создать фотоотчет</h2>
                    <button onClick={onClose} className="close-btn"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label htmlFor="photo-title">Заголовок фотоотчета</label>
                    <input 
                        id="photo-title" 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        placeholder="Например, 'Завершение отделки ванной комнаты'" 
                    />
                    
                    <label htmlFor="photo-files">Фотографии</label>
                    <input 
                        ref={fileInputRef}
                        id="photo-files" 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleFileChange}
                    />
                    
                    {photos.length > 0 && (
                        <div className="photos-preview-container">
                            <h4>Выбранные фотографии ({photos.length})</h4>
                            <div className="photos-grid">
                                {photos.map((photo, index) => (
                                    <div key={index} className="photo-item">
                                        <div className="photo-preview">
                                            <img src={photo.preview} alt={`Фото ${index + 1}`} />
                                            <button 
                                                onClick={() => handleRemovePhoto(index)} 
                                                className="remove-photo-btn"
                                                type="button"
                                            >
                                                <IconClose />
                                            </button>
                                        </div>
                                        <textarea
                                            value={photo.caption}
                                            onChange={e => handleCaptionChange(index, e.target.value)}
                                            placeholder="Подпись к фото..."
                                            rows={2}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="file-info">
                        <small>Поддерживаемые форматы: JPG, JPEG, PNG</small>
                        <small>Максимальный размер файла: 5 МБ</small>
                        <small>Можно выбрать несколько фотографий одновременно</small>
                    </div>
                </div>
                <div className="modal-footer">
                    <button 
                        onClick={handleSave} 
                        className="btn btn-primary" 
                        disabled={!title.trim() || photos.length === 0 || isUploading}
                    >
                        {isUploading ? 'Загрузка...' : 'Создать фотоотчет'}
                    </button>
                </div>
            </div>
        </div>
    );
};