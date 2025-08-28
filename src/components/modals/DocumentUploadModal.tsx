import React, { useState } from 'react';
import { DocumentUploadModalProps } from '../../types';
import { IconClose } from '../common/Icon';
import { readFileAsDataURL } from '../../utils';

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onSave, showAlert }) => {
    const [file, setFile] = useState<File | null>(null);
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            try {
                const url = await readFileAsDataURL(selectedFile);
                setDataUrl(url);
            } catch (error) {
                showAlert('Не удалось прочитать файл.');
                setFile(null);
                setDataUrl(null);
            }
        }
    };

    const handleSave = () => {
        if (file && dataUrl) {
            onSave(file.name, dataUrl);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal-header"><h2>Загрузить документ</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Выберите файл</label>
                    <input type="file" onChange={handleFileChange} />
                    {file && (
                        <div className="document-preview">
                            <p><strong>Файл:</strong> {file.name}</p>
                            <p><strong>Размер:</strong> {(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary" disabled={!file}>Сохранить</button>
                </div>
            </div>
        </div>
    );
};