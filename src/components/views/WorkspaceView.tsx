import React, { useState } from 'react';
import { WorkspaceViewProps } from '../../types';
import { IconPlus, IconTrash, IconDocument, IconDownload, IconExternalLink } from '../common/Icon';

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
    onOpenScratchpad,
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
                {/* Tasks */}
                <div className="card">
                    <h2>Мои задачи</h2>
                    <div className="task-input-container">
                        <textarea 
                            value={newTaskText} 
                            onChange={(e) => setNewTaskText(e.target.value)} 
                            placeholder="Добавить новую задачу..." 
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddTask();
                                }
                            }}
                            rows={1}
                            style={{ overflowY: 'hidden', resize: 'none', minHeight: '24px' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                            }}
                        />
                        <button onClick={handleAddTask} className="add-task-btn"><IconPlus/></button>
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
                <div className="card scratchpad-card">
                    <div className="card-header">
                        <h2>Блокнот</h2>
                        <button onClick={onOpenScratchpad} className="expand-btn" aria-label="Развернуть блокнот">
                            <IconExternalLink />
                        </button>
                    </div>
                    <textarea 
                        value={scratchpad} 
                        onChange={(e) => onScratchpadChange(e.target.value)} 
                        placeholder="Место для быстрых заметок..."
                        rows={6}
                    />
                </div>

                {/* My Documents */}
                <div className="card">
                    <div className="card-header">
                        <h2>Мои документы</h2>
                        <button onClick={onOpenGlobalDocumentModal} className="btn btn-secondary add-document-btn">+ Добавить</button>
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
                                    <a href={doc.dataUrl} download={doc.name} className="btn-icon" aria-label="Скачать" rel="noopener noreferrer"><IconDownload /></a>
                                    <button onClick={() => onDeleteGlobalDocument(doc.id)} className="btn-icon" aria-label="Удалить"><IconTrash /></button>
                                </div>
                            </li>
                        ))}
                        {globalDocuments.length === 0 && <p className="empty-list-message">Нет документов.</p>}
                    </ul>
                </div>
            </main>
        </>
    );
};
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
                {/* Tasks */}
                <div className="card">
                    <h2>Мои задачи</h2>
                    <div className="task-input-container">
                        <textarea 
                            value={newTaskText} 
                            onChange={(e) => setNewTaskText(e.target.value)} 
                            placeholder="Добавить новую задачу..." 
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddTask();
                                }
                            }}
                            rows={1}
                            style={{ overflowY: 'hidden', resize: 'none' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                            }}
                        />
                        <button onClick={handleAddTask} className="add-task-btn"><IconPlus/></button>
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
                <div className="card scratchpad-card">
                    <div className="card-header">
                        <h2>Блокнот</h2>
                        <button onClick={onOpenScratchpadModal} className="expand-btn" aria-label="Развернуть блокнот">
                            <IconExternalLink />
                        </button>
                    </div>
                    <textarea 
                        value={scratchpad} 
                        onChange={(e) => onScratchpadChange(e.target.value)} 
                        placeholder="Место для быстрых заметок..."
                        rows={6}
                    />
                </div>

                {/* My Documents */}
                <div className="card">
                    <div className="card-header">
                        <h2>Мои документы</h2>
                        <button onClick={onOpenGlobalDocumentModal} className="btn btn-secondary add-document-btn">+ Добавить</button>
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
                                    <a href={doc.dataUrl} download={doc.name} className="btn-icon" aria-label="Скачать" rel="noopener noreferrer"><IconDownload /></a>
                                    <button onClick={() => onDeleteGlobalDocument(doc.id)} className="btn-icon" aria-label="Удалить"><IconTrash /></button>
                                </div>
                            </li>
                        ))}
                        {globalDocuments.length === 0 && <p className="empty-list-message">Нет документов.</p>}
                    </ul>
                </div>
            </main>
        </>
    );
};