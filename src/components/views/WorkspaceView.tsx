import React, { useState } from 'react';
import { WorkspaceViewProps } from '../../types';
import { IconPlus, IconTrash, IconDocument, IconChevronRight } from '../common/Icon';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    tasks,
    scratchpad,
    documents,
    projects,
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onScratchpadChange,
    setActiveView,
    onOpenProjectModal,
    handleAddNewEstimateForProject
}) => {
    const [newTaskText, setNewTaskText] = useState('');

    const handleAddTask = () => {
        if (newTaskText.trim()) {
            onAddTask(newTaskText.trim());
            setNewTaskText('');
        }
    };
    
    const recentDocuments = [...documents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
        <>
            <header className="workspace-header">
                <h1>Рабочий стол</h1>
            </header>
            <main className="workspace-container">
                {/* Quick Actions */}
                <div className="card quick-actions">
                    <button onClick={() => onOpenProjectModal()} className="btn btn-primary">+ Новый проект</button>
                    <button onClick={() => {
                        handleAddNewEstimateForProject();
                        setActiveView('estimate');
                    }} className="btn btn-secondary">+ Новая смета</button>
                    <button onClick={() => setActiveView('projects')} className="btn btn-secondary">Все проекты <IconChevronRight /></button>
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
                                <button onClick={() => onDeleteTask(task.id)}><IconTrash/></button>
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
                
                {/* Recent Documents */}
                <div className="card">
                    <h2>Последние документы</h2>
                    <ul className="document-list">
                        {recentDocuments.map(doc => {
                            const project = projects.find(p => p.id === doc.projectId);
                            return (
                                <li key={doc.id}>
                                    <a href={doc.dataUrl} download={doc.name}>
                                        <IconDocument />
                                        <div className="doc-info">
                                            <span>{doc.name}</span>
                                            <small>Проект: {project?.name || 'Неизвестно'}</small>
                                        </div>
                                    </a>
                                </li>
                            );
                        })}
                        {recentDocuments.length === 0 && <p className="empty-list-message">Документов пока нет.</p>}
                    </ul>
                </div>
            </main>
        </>
    );
};
