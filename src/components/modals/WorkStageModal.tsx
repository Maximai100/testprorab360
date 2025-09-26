import React, { useState, useRef, useEffect } from 'react';
import { WorkStageModalProps, WorkStageStatus } from '../../types';
import { IconClose } from '../common/Icon';

export const WorkStageModal: React.FC<WorkStageModalProps> = ({ stage, onClose, onSave, showAlert }) => {
    const [title, setTitle] = useState(stage?.title || '');
    const [startDate, setStartDate] = useState(stage?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(stage?.endDate || new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<WorkStageStatus>(stage?.status || 'planned');
    const [progress, setProgress] = useState(stage?.progress || 0);
    const modalRef = useRef<HTMLDivElement>(null);

    // Автоматически обновляем статус при достижении 100% прогресса
    useEffect(() => {
        if (progress === 100 && status !== 'completed') {
            setStatus('completed');
        }
    }, [progress, status]);

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
        if (!title.trim()) {
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
        onSave({ title: title.trim(), description: '', startDate, endDate, status, progress });
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
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, 'Черновые работы'" />
                    <label>Дата начала</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <label>Дата окончания</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    
                    <label>Статус этапа</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as WorkStageStatus)}>
                        <option value="planned">Запланирован</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершен</option>
                    </select>
                    
                    <label>Прогресс выполнения</label>
                    <div className="progress-input-container">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={progress} 
                            onChange={(e) => setProgress(Number(e.target.value))}
                            className="progress-slider"
                        />
                        <span className="progress-value">{progress}%</span>
                    </div>
                    
                    {/* Автоматическое обновление статуса при 100% прогрессе */}
                    {progress === 100 && status !== 'completed' && (
                        <div className="auto-status-update">
                            <small>💡 Прогресс 100% - статус автоматически изменится на "Завершен"</small>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};