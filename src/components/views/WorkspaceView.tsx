import React, { useState } from 'react';
import { WorkspaceViewProps } from '../../types';
import { IconPlus, IconTrash, IconDocument, IconDownload } from '../common/Icon';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    tasks,
    scratchpad,
    globalDocuments,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onScratchpadChange,
    onOpenGlobalDocumentModal,
    onDeleteGlobalDocument,
}) => {
    const [newTaskText, setNewTaskText] = useState('');

    const handleAddTask = () => {
        if (newTaskText.trim()) {
            onAddTask(newTaskText.trim());
            setNewTaskText('');
        }
    };

    return (
        <>
            <header className="workspace-header">
                <h1>Рабочий стол</h1>
            </header>
            <main className="workspace-container">
                {/* My Documents */}
                <div className="card">
                    <div className="card-header">
                        <h2>Мои документы</h2>
                        <button onClick={onOpenGlobalDocumentModal} className="btn btn-secondary">+ Добавить</button>
                    </div>
                    <ul className="document-list">
                        {globalDocuments.map(doc => (
                            <li key={doc.id} className="document-list-item">
                                <IconDocument />
                                <div className="doc-info">
                                    <span>{doc.name}</span>
                                    <small>{new Date(doc.date).toLocaleDateString('ru-RU')}</small>
                                </div>
                                <div className="doc-actions">
                                    <a href={doc.dataUrl} download={doc.name} className="btn-icon" aria-label="Скачать"><IconDownload /></a>
                                    <button onClick={() => onDeleteGlobalDocument(doc.id)} className="btn-icon" aria-label="Удалить"><IconTrash /></button>
                                </div>
                            </li>
                        ))}
                        {globalDocuments.length === 0 && <p className="empty-list-message">Нет документов.</p>}
                    </ul>
                </div>

                {/* Tasks */}
                <div className="card">
                    <h2>Мои задачи</h2>
                    <div className="task-input-container">
                        <input 
                            type="text" 
                            value={newTaskText} 
                            onChange={(e) => setNewTaskText(e.target.value)} 
                            placeholder="Добавить новую задачу..." 
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                        />
                        <button onClick={handleAddTask}><IconPlus/></button>
                    </div>
                    <ul className="task-list">
                        {tasks.map(task => (
                            <li key={task.id} className={task.completed ? 'completed' : ''}>
                                <span onClick={() => onToggleTask(task.id)}>{task.text}</span>
                                <button onClick={() => onDeleteTask(task.id)}><IconTrash /></button>
                            </li>
                        ))}
                         {tasks.length === 0 && <p className="empty-list-message">Задач пока нет.</p>}
                    </ul>
                </div>

                {/* Scratchpad */}
                <div className="card">
                    <h2>Блокнот</h2>
                    <textarea 
                        value={scratchpad} 
                        onChange={(e) => onScratchpadChange(e.target.value)} 
                        placeholder="Место для быстрых заметок..."
                        rows={6}
                    />
                </div>
            </main>
        </>
    );
};