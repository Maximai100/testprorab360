import React, { useState } from 'react';
import { PhotoReportModalProps } from '../../types';
import { IconClose } from '../common/Icon';
import { resizeImage } from '../../utils';

export const PhotoReportModal: React.FC<PhotoReportModalProps> = ({ onClose, onSave, showAlert }) => {
    const [image, setImage] = useState<string | null>(null);
    const [caption, setCaption] = useState('');

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resized = await resizeImage(file, 1200); // Larger size for reports
                setImage(resized);
            } catch (error) {
                showAlert('Не удалось обработать фото.');
            }
        }
    };
    
    const handleSave = () => {
        if (!image) {
            showAlert('Пожалуйста, выберите фото.');
            return;
        }
        onSave({ image, caption, date: new Date().toISOString() });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal-header"><h2>Добавить фото</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Фотография</label>
                     {image ? (
                        <div className="image-preview-container large-preview">
                            <img src={image} alt="Предпросмотр" className="image-preview" />
                            <button onClick={() => setImage(null)} className="remove-image-btn"><IconClose/></button>
                        </div>
                    ) : (
                        <input type="file" accept="image/*" onChange={handleImageChange} />
                    )}
                    <label>Подпись</label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Например, 'Укладка плитки в ванной'" rows={3} />
                </div>
                <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary" disabled={!image}>Сохранить</button></div>
            </div>
        </div>
    );
};