import React, { useState } from 'react';
import { AddToolModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const AddToolModal: React.FC<AddToolModalProps> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');

    const handleSave = () => {
        if (!name.trim()) {
            // Or show an alert
            return;
        }
        onSave({ name, location: 'На базе' });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal-header">
                    <h2>Добавить инструмент</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose /></button>
                </div>
                <div className="modal-body">
                    <label>Название инструмента</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, 'Перфоратор Bosch'"
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};