import React, { useRef, useEffect } from 'react';
import { Project, NewProjectModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ project, onClose, onProjectChange, onSave, onInputFocus }) => {
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
            <div className="modal-header">
                <h2>{project?.id ? 'Редактировать проект' : 'Новый проект'}</h2>
                <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
            </div>
            <div className="modal-body">
                <label>Название проекта</label>
                <input type="text" value={project?.name || ''} onChange={(e) => onProjectChange(p => ({...p!, name: e.target.value}))} onFocus={onInputFocus} placeholder="Название или тип работ" />
                <label>Клиент</label>
                <input type="text" value={project?.client || ''} onChange={(e) => onProjectChange(p => ({...p!, client: e.target.value}))} onFocus={onInputFocus} placeholder="Имя клиента" />
                <label>Адрес объекта</label>
                <textarea value={project?.address || ''} onChange={(e) => onProjectChange(p => ({...p!, address: e.target.value}))} onFocus={onInputFocus} placeholder="Адрес" rows={2} />
                {project?.id && <>
                    <label>Статус</label>
                    <select value={project.status} onChange={(e) => onProjectChange(p => ({...p!, status: e.target.value as Project['status']}))}>
                        <option value="planned">Запланирован</option>
                        <option value="in_progress">В работе</option>
                        <option value="on_hold">Приостановлен</option>
                        <option value="completed">Завершен</option>
                        <option value="cancelled">Отменен</option>
                    </select>
                </>}
            </div>
            <div className="modal-footer">
                <button onClick={onSave} className="btn btn-primary">Сохранить</button>
            </div>
        </div>
    </div>
    );
};