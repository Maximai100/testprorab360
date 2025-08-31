import React, { useState, useRef, useEffect } from 'react';
import { DocumentUploadModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onSave, showAlert }) => {
    const [fileName, setFileName] = useState('');
    const [fileUrl, setFileUrl] = useState('');
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

    const handleSave = () => {
        if (fileName.trim() && fileUrl.trim()) {
            try {
                new URL(fileUrl.trim()); // Validate URL
                onSave(fileName.trim(), fileUrl.trim());
            } catch (error) {
                showAlert('Введите корректный URL-адрес.');
            }
        } else {
            showAlert('Заполните все поля.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header"><h2>Добавить документ</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label htmlFor="doc-name">Название документа</label>
                    <input id="doc-name" type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Например, 'Договор'" />
                    <label htmlFor="doc-url">URL-адрес документа</label>
                    <input id="doc-url" type="text" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://example.com/document.pdf" />
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary" disabled={!fileName.trim() || !fileUrl.trim()}>Сохранить</button>
                </div>
            </div>
        </div>
    );
};