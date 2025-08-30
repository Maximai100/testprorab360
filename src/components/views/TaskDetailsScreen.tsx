import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { IconChevronRight, IconClose } from '../common/Icon';

interface TaskDetailsScreenProps {
    task: Task;
    onSave: (updatedTask: Task) => void;
    onBack: () => void;
}

export const TaskDetailsScreen: React.FC<TaskDetailsScreenProps> = ({ task, onSave, onBack }) => {
    const [editableTask, setEditableTask] = useState<Task>(task);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        setEditableTask(task);
    }, [task]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableTask(prevTask => ({
            ...prevTask,
            [name]: value,
        }));
    };

    const handleAddTag = () => {
        if (newTag && !editableTask.tags?.includes(newTag)) {
            setEditableTask(prev => ({ ...prev, tags: [...(prev.tags || []), newTag]}));
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setEditableTask(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tagToRemove) || [] }));
    };

    const handleSave = () => {
        onSave(editableTask);
    };

    return (
        <>
            <header className="project-detail-header">
                 <button onClick={onBack} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
                <h1>Детали задачи</h1>
            </header>
            <main>
                <div className="card">
                    <div className="project-section-body" style={{ gap: '16px' }}>
                        <div className="meta-field">
                            <label htmlFor="title">Название задачи</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={editableTask.title || ''}
                                onChange={handleInputChange}
                                placeholder="Название задачи..."
                            />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="description">Описание</label>
                            <textarea
                                id="description"
                                name="description"
                                value={editableTask.description || ''}
                                onChange={handleInputChange}
                                placeholder="Подробное описание..."
                                rows={6}
                            />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="dueDate">Срок выполнения</label>
                            <input
                                type="date"
                                id="dueDate"
                                name="dueDate"
                                value={editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split('T')[0] : ''}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="priority">Приоритет</label>
                            <select
                                id="priority"
                                name="priority"
                                value={editableTask.priority || 'medium'}
                                onChange={handleInputChange}
                            >
                                <option value="low">Низкий</option>
                                <option value="medium">Средний</option>
                                <option value="high">Высокий</option>
                            </select>
                        </div>

                        <div className="meta-field">
                            <label>Теги</label>
                            <div className="tags-container">
                                {editableTask.tags?.map(tag => (
                                    <div key={tag} className="tag-item">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(tag)} className="remove-tag-btn"><IconClose /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="add-tag-form">
                                <input 
                                    type="text" 
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    placeholder="Новый тег..."
                                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                                />
                                <button onClick={handleAddTag} className="btn btn-secondary">Добавить</button>
                            </div>
                        </div>

                        <button onClick={handleSave} className="btn btn-primary">
                            Сохранить
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
};