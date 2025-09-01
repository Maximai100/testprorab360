import React, { useState, useRef, useEffect } from 'react';
import { AddToolModalProps, ToolCondition } from '../../types';
import { IconClose } from '../common/Icon';

const conditionMap: Record<ToolCondition, string> = {
    excellent: 'Отличное',
    needs_service: 'Требует обслуживания',
    in_repair: 'В ремонте',
};

export const AddToolModal: React.FC<AddToolModalProps> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [condition, setCondition] = useState<ToolCondition>('excellent');
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
        if (!name.trim()) {
            // Or show an alert
            return;
        }
        onSave({ name, location: 'on_base', condition });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
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
                    <label>Состояние</label>
                    <select value={condition} onChange={(e) => setCondition(e.target.value as ToolCondition)}>
                        {Object.entries(conditionMap).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};