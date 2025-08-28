import React, { useState, useRef, useEffect } from 'react';
import { WorkStageModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const WorkStageModal: React.FC<WorkStageModalProps> = ({ stage, onClose, onSave, showAlert }) => {
    const [name, setName] = useState(stage?.name || '');
    const [startDate, setStartDate] = useState(stage?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(stage?.endDate || new Date().toISOString().split('T')[0]);
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
            showAlert('Введите название этапа.');
            return;
        }
        if (!startDate || !endDate) {
            showAlert('Укажите даты начала и окончания.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showAlert('Дата начала не может быть позже даты окончания.');
            return;
        }
        onSave({ name: name.trim(), startDate, endDate });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>{stage?.id ? 'Редактировать этап' : 'Новый этап работ'}</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label>Название этапа</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, 'Черновые работы'" />
                    <label>Дата начала</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <label>Дата окончания</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};