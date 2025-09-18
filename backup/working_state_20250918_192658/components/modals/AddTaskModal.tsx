import React, { useState } from 'react';
import { Project, TaskPriority } from '../../types';
import { IconClose } from '../common/Icon';

interface AddTaskModalProps {
    onClose: () => void;
    onSave: (title: string, projectId: string | number | null, priority?: TaskPriority, dueDate?: string | null) => void;
    projects: Project[];
    initialProjectId?: string | number | null;
    initialTitle?: string;
    initialPriority?: TaskPriority;
    initialDueDate?: string | null;
    hideProjectSelect?: boolean; // Новый проп для скрытия поля выбора проекта
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
    onClose, 
    onSave, 
    projects, 
    initialProjectId, 
    initialTitle = '', 
    initialPriority = 'medium', 
    initialDueDate = null,
    hideProjectSelect = false 
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(initialProjectId || null);
    const [priority, setPriority] = useState<TaskPriority>(initialPriority);
    const [dueDate, setDueDate] = useState<string>(initialDueDate || '');

    const handleSave = () => {
        if (!title.trim()) {
            alert('Введите название задачи');
            return;
        }
        onSave(title.trim(), selectedProjectId, priority, dueDate || null);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialTitle ? 'Редактировать задачу' : 'Новая задача'}</h2>
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
                    {!hideProjectSelect && (
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
                    )}
                    <div className="meta-field">
                        <label htmlFor="priority-select">Приоритет</label>
                        <select
                            id="priority-select"
                            value={priority}
                            onChange={e => setPriority(e.target.value as TaskPriority)}
                        >
                            <option value="low">Низкий</option>
                            <option value="medium">Средний</option>
                            <option value="high">Высокий</option>
                            <option value="urgent">Срочный</option>
                        </select>
                    </div>
                    <div className="meta-field">
                        <label htmlFor="due-date">Срок выполнения (необязательно)</label>
                        <input
                            type="date"
                            id="due-date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};