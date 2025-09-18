import React, { useState, useMemo } from 'react';
import { Task, Project, ProjectTasksScreenProps } from '../../types';
import { IconPlus, IconFilter, IconChevronRight, IconTrash } from '../common/Icon';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import { formatDueDate } from '../../utils';
import { TaskFilterModal } from '../modals/TaskFilterModal';
import { AddTaskModal } from '../modals/AddTaskModal';

const priorityMap: Record<string, { color: string, name: string }> = {
    low: { color: '#808080', name: 'Низкий' },
    medium: { color: '#ffc107', name: 'Средний' },
    high: { color: '#e53935', name: 'Высокий' },
    urgent: { color: '#d32f2f', name: 'Срочный' },
};

const TaskItem: React.FC<{ 
    task: Task, 
    projectName: string, 
    onToggle: (id: string | number) => void, 
    onSelect: (task: Task) => void,
    onDelete: (id: string) => void
}> = ({ task, projectName, onToggle, onSelect, onDelete }) => (
    <li className={task.isCompleted ? 'completed' : ''}>
        <input
            type="checkbox"
            checked={task.isCompleted}
            onChange={() => onToggle(task.id)}
        />
        <div className="task-info" onClick={() => onSelect(task)}>
            <span className="task-title">{task.title}</span>
            <div className="task-meta">
                <span className="task-project">{projectName || 'Без проекта'}</span>
                {task.dueDate && <span className="task-duedate">{formatDueDate(task.dueDate)}</span>}
                {task.priority && <span className="priority-dot" style={{ backgroundColor: priorityMap[task.priority].color }}></span>}
            </div>
        </div>
        <div className="task-actions">
            <button 
                className="task-action-btn delete" 
                onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Удалить задачу?')) {
                        onDelete(task.id);
                    }
                }}
                aria-label="Удалить задачу"
            >
                <IconTrash />
            </button>
        </div>
    </li>
);

export const ProjectTasksScreen: React.FC<ProjectTasksScreenProps> = ({ tasks, projects, projectId, onAddTask, onUpdateTask, onToggleTask, onDeleteTask, onBack }) => {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState<{ projectId: string | null; tag: string | null; }>({ projectId: null, tag: null });

    const handleSaveTask = (title: string, selectedProjectId: string | number | null, priority?: string, dueDate?: string | null) => {
        onAddTask(title, selectedProjectId, priority, dueDate);
    };

    const handleSelectTaskForEdit = (task: Task) => {
        setEditingTask(task);
    };

    const handleUpdateTask = (updatedTask: Task) => {
        onUpdateTask(updatedTask);
        setEditingTask(null);
    };

    const availableProjects = useMemo(() => {
        const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))];
        return projectIds.map(projectId => {
            const project = projects.find(p => p.id === projectId);
            return { id: projectId!, name: project?.name || `Проект ${projectId}` };
        });
    }, [tasks, projects]);
    const availableTags = useMemo(() => [...new Set(tasks.flatMap(t => t.tags || []))], [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const projectMatch = !activeFilters.projectId || task.projectId === activeFilters.projectId;
            const tagMatch = !activeFilters.tag || (task.tags && task.tags.includes(activeFilters.tag));
            return projectMatch && tagMatch;
        });
    }, [tasks, activeFilters]);

    const groupedTasks = useMemo(() => {
        const groups = {
            overdue: [] as Task[],
            today: [] as Task[],
            upcoming: [] as Task[],
            completed: [] as Task[],
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filteredTasks.forEach(task => {
            if (task.isCompleted) {
                groups.completed.push(task);
                return;
            }

            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                if (dueDate.getTime() < today.getTime()) {
                    groups.overdue.push(task);
                } else if (dueDate.getTime() === today.getTime()) {
                    groups.today.push(task);
                } else {
                    groups.upcoming.push(task);
                }
            } else {
                groups.upcoming.push(task);
            }
        });

        return groups;
    }, [filteredTasks]);

    if (editingTask) {
        return (
            <TaskDetailsScreen 
                task={editingTask} 
                onSave={handleUpdateTask} 
                onBack={() => setEditingTask(null)} 
            />
        );
    }

    return (
        <>
            <header className="projects-list-header">
                <div className="header-left">
                    {projectId && onBack && (
                        <button onClick={onBack} className="back-btn" aria-label="Назад">
                            <IconChevronRight style={{transform: 'rotate(180deg)'}} />
                        </button>
                    )}
                    <h1>{projectId ? `Задачи проекта "${projects.find(p => p.id === projectId)?.name || 'Неизвестный проект'}"` : 'Все задачи'}</h1>
                </div>
                <div className="header-actions">
                    <button onClick={() => setIsFilterModalOpen(true)} className="header-btn" aria-label="Фильтр"><IconFilter /></button>
                    <button onClick={() => setIsAddTaskModalOpen(true)} className="header-btn" aria-label="Новая задача"><IconPlus /></button>
                </div>
            </header>
            <main>
                <div className="card project-section">
                    <div className="project-section-body">
                        {filteredTasks.length === 0 && tasks.length > 0 ? (
                             <p className="empty-list-message">Задачи, соответствующие фильтру, не найдены.</p>
                        ) : tasks.length === 0 ? (
                            <p className="empty-list-message">Задач пока нет.</p>
                        ) : (
                            <div className="task-groups-container">
                                {groupedTasks.overdue.length > 0 && (
                                    <div className="task-group">
                                        <h4>Просроченные</h4>
                                        <ul className="task-list">
                                            {groupedTasks.overdue.map(task => <TaskItem key={task.id} task={task} projectName={projects.find(p => p.id === task.projectId)?.name || ''} onToggle={onToggleTask} onSelect={handleSelectTaskForEdit} onDelete={onDeleteTask} />)}
                                        </ul>
                                    </div>
                                )}
                                {groupedTasks.today.length > 0 && (
                                    <div className="task-group">
                                        <h4>Сегодня</h4>
                                        <ul className="task-list">
                                            {groupedTasks.today.map(task => <TaskItem key={task.id} task={task} projectName={projects.find(p => p.id === task.projectId)?.name || ''} onToggle={onToggleTask} onSelect={handleSelectTaskForEdit} onDelete={onDeleteTask} />)}
                                        </ul>
                                    </div>
                                )}
                                {groupedTasks.upcoming.length > 0 && (
                                    <div className="task-group">
                                        <h4>Предстоящие</h4>
                                        <ul className="task-list">
                                            {groupedTasks.upcoming.map(task => <TaskItem key={task.id} task={task} projectName={projects.find(p => p.id === task.projectId)?.name || ''} onToggle={onToggleTask} onSelect={handleSelectTaskForEdit} onDelete={onDeleteTask} />)}
                                        </ul>
                                    </div>
                                )}
                                {groupedTasks.completed.length > 0 && (
                                    <div className="task-group">
                                        <h4>Выполненные</h4>
                                        <ul className="task-list">
                                            {groupedTasks.completed.map(task => <TaskItem key={task.id} task={task} projectName={projects.find(p => p.id === task.projectId)?.name || ''} onToggle={onToggleTask} onSelect={handleSelectTaskForEdit} onDelete={onDeleteTask} />)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {isFilterModalOpen && (
                <TaskFilterModal 
                    onClose={() => setIsFilterModalOpen(false)}
                    onApplyFilters={setActiveFilters}
                    availableProjects={availableProjects}
                    availableTags={availableTags}
                    currentFilters={activeFilters}
                />
            )}
            {isAddTaskModalOpen && (
                <AddTaskModal 
                    onClose={() => setIsAddTaskModalOpen(false)}
                    onSave={handleSaveTask}
                    projects={projects}
                    initialProjectId={projectId}
                />
            )}
        </>
    );
};