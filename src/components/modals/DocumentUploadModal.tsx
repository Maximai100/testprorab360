import React, { useState, useRef, useEffect } from 'react';
import { DocumentUploadModalProps } from '../../types';
import { IconClose } from '../common/Icon';
import { useFileStorage } from '../../hooks/useFileStorage';

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onSave, showAlert }) => {
    const [fileName, setFileName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadFile, createDocument, isUploading } = useFileStorage();

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
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            // Автоматически заполняем название документа именем файла
            if (!fileName.trim()) {
                setFileName(file.name);
            }
        }
    };

    const handleSave = async () => {
        if (!fileName.trim()) {
            showAlert('Введите название документа.');
            return;
        }

        if (!selectedFile) {
            showAlert('Выберите файл для загрузки.');
            return;
        }

        try {
            // Загружаем файл в Supabase Storage
            const uploadResult = await uploadFile('documents', selectedFile);
            
            if (uploadResult.error) {
                showAlert(`Ошибка загрузки файла: ${uploadResult.error}`);
                return;
            }

            // Создаем запись в базе данных
            const documentRecord = await createDocument({
                name: fileName.trim(),
                file_url: uploadResult.publicUrl,
                storage_path: uploadResult.path,
            });

            // Вызываем callback с данными документа
            onSave(documentRecord.name, documentRecord.file_url);
        } catch (error) {
            console.error('Ошибка при сохранении документа:', error);
            showAlert('Произошла ошибка при сохранении документа.');
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header"><h2>Загрузить документ</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label htmlFor="doc-name">Название документа</label>
                    <input 
                        id="doc-name" 
                        type="text" 
                        value={fileName} 
                        onChange={e => setFileName(e.target.value)} 
                        placeholder="Например, 'Договор'" 
                    />
                    
                    <label htmlFor="doc-file">Файл документа</label>
                    {selectedFile ? (
                        <div className="file-preview-container">
                            <div className="file-preview">
                                <span className="file-name">{selectedFile.name}</span>
                                <span className="file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} МБ)</span>
                            </div>
                            <button onClick={handleRemoveFile} className="remove-file-btn" type="button">
                                <IconClose />
                            </button>
                        </div>
                    ) : (
                        <input 
                            ref={fileInputRef}
                            id="doc-file" 
                            type="file" 
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                        />
                    )}
                    
                    <div className="file-info">
                        <small>Поддерживаемые форматы: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, JPEG, PNG</small>
                        <small>Максимальный размер файла: 10 МБ</small>
                    </div>
                </div>
                <div className="modal-footer">
                    <button 
                        onClick={handleSave} 
                        className="btn btn-primary" 
                        disabled={!fileName.trim() || !selectedFile || isUploading}
                    >
                        {isUploading ? 'Загрузка...' : 'Сохранить'}
                    </button>
                </div>
            </div>
        </div>
    );
};