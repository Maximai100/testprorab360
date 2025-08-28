import React from 'react';
import { Project, NewProjectModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ project, onClose, onProjectChange, onSave, onInputFocus }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content card" onClick={e => e.stopPropagation()}>
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
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершен</option>
                    </select>
                </>}
            </div>
            <div className="modal-footer">
                <button onClick={onSave} className="btn btn-primary">Сохранить</button>
            </div>
        </div>
    </div>
);