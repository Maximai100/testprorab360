import React, { useState, useRef, useEffect } from 'react';
import { NoteModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const NoteModal: React.FC<NoteModalProps> = ({ note, onClose, onSave, showAlert }) => {
    const [text, setText] = useState(note?.text || '');
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
        if (!text.trim()) {
            showAlert('Текст заметки не может быть пустым.');
            return;
        }
        onSave(text.trim());
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>{note?.id ? 'Редактировать заметку' : 'Новая заметка'}</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        placeholder="Введите текст заметки..."
                        className="note-textarea"
                        rows={8}
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};