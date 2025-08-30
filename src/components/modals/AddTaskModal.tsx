import React, { useState } from 'react';
import { Project } from '../../types';
import { IconClose } from '../common/Icon';

interface AddTaskModalProps {
    onClose: () => void;
    onSave: (title: string, projectId: string | number | null) => void;
    projects: Project[];
    initialProjectId?: string | number | null;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onSave, projects, initialProjectId }) => {
    const [title, setTitle] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(initialProjectId || null);

    const handleSave = () => {
        if (!title.trim()) {
            alert('Введите название задачи');
            return;
        }
        onSave(title.trim(), selectedProjectId);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Новая задача</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose /></button>
                </div>
                <div className="modal-body" style={{ gap: '16px' }}>
                    <div className="meta-field">
                        <label htmlFor="task-title">Название</label>
                        <input
                            type="text"
                            id="task-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Что нужно сделать?"
                        />
                    </div>
                    <div className="meta-field">
                        <label htmlFor="project-select">Проект (необязательно)</label>
                        <select
                            id="project-select"
                            value={selectedProjectId || ''}
                            onChange={e => setSelectedProjectId(e.target.value || null)}
                        >
                            <option value="">Без проекта</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};