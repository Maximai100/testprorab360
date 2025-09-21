import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ProjectDetailViewProps, Estimate, PhotoReport, Document, WorkStage, Note, ProjectFinancials, FinanceEntry, Task } from '../../types';
import { IconChevronRight, IconEdit, IconTrash, IconDocument, IconPlus, IconCreditCard, IconCalendar, IconPaperclip, IconDownload, IconMessageSquare, IconTrendingUp, IconCamera, IconChevronDown, IconFolder, IconClose, IconExternalLink } from '../common/Icon';
import { ListItem } from '../ui/ListItem';
import { TaskDetailsScreen } from './TaskDetailsScreen';
import TaskDetailsModal from '../modals/TaskDetailsModal';
import ImageViewerModal from '../modals/ImageViewerModal';
import { formatDueDate, financeCategoryToRu, downloadFileFromUrl, safeShowAlert } from '../../utils';
import './ProjectDetailView.css';
import { FinanceEntryModal } from '../modals/FinanceEntryModal';


// Карта приоритетов для задач
const priorityMap: Record<string, { color: string, name: string }> = {
    low: { color: '#808080', name: 'Низкий' },
    medium: { color: '#ffc107', name: 'Средний' },
    high: { color: '#e53935', name: 'Высокий' },
    urgent: { color: '#d32f2f', name: 'Срочный' },
};

// Компонент TaskItem (точно такой же как в ProjectTasksScreen)
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

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
    activeProject, estimates, photoReports, documents, workStages, tasks, formatCurrency, statusMap, setActiveView, setActiveProjectId,
    handleOpenProjectModal, handleDeleteProject, handleLoadEstimate, handleAddNewEstimateForProject, handleDeleteProjectEstimate,
    onOpenFinanceModal, onDeleteFinanceEntry, onOpenPhotoReportModal, onViewPhoto, onOpenDocumentModal, onDeleteDocument,
    onOpenWorkStageModal, onDeleteWorkStage, onOpenActModal, onNavigateToTasks, onProjectScratchpadChange, onExportWorkSchedulePDF, onOpenEstimatesListModal, financials, financeEntries, notesHook, tasksHook, appState, projectDataHook
}) => {
    // Состояние для выбранной задачи
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editingFinance, setEditingFinance] = useState<FinanceEntry | null>(null);

    // Состояние для просмотра чеков
    const [receiptViewer, setReceiptViewer] = useState<{
        isOpen: boolean;
        imageUrl: string;
        title: string;
    }>({
        isOpen: false,
        imageUrl: '',
        title: ''
    });

    // Обработчики для задач
    const handleTaskSelect = useCallback((task: Task) => {
        setSelectedTask(task);
    }, []);

    const handleTaskSave = useCallback(async (updatedTask: Task) => {
        await tasksHook.updateTask(updatedTask.id, updatedTask);
        setSelectedTask(null);
    }, [tasksHook]);

    const handleTaskBack = useCallback(() => {
        setSelectedTask(null);
    }, []);

    const handleTaskToggle = useCallback(async (taskId: string) => {
        await tasksHook.toggleTask(taskId);
    }, [tasksHook]);

    const handleProjectDocumentDownload = useCallback(async (fileUrl: string, fileName: string) => {
        try {
            await downloadFileFromUrl(fileUrl, fileName);
        } catch (error) {
            console.error('ProjectDetailView: не удалось скачать документ', error);
            safeShowAlert('Не удалось скачать документ. Попробуйте ещё раз.');
        }
    }, []);

    // Обработчики для просмотра чеков
    const handleViewReceipt = useCallback((receiptUrl: string, description: string) => {
        setReceiptViewer({
            isOpen: true,
            imageUrl: receiptUrl,
            title: `Чек: ${description}`
        });
    }, []);

    const handleCloseReceiptViewer = useCallback(() => {
        setReceiptViewer({
            isOpen: false,
            imageUrl: '',
            title: ''
        });
    }, []);

    const loadProjectData = projectDataHook?.loadProjectData;

    // Загружаем данные проекта при монтировании компонента
    useEffect(() => {
        if (activeProject?.id && loadProjectData) {
            console.log('🔧 ProjectDetailView: Загружаем данные проекта:', activeProject.id);
            loadProjectData(activeProject.id);
        }
    }, [activeProject?.id, loadProjectData]);

    // Группировка задач (показываем только НЕ выполненные в блоке проекта)
    const groupedTasks = useMemo(() => {
        const groups = {
            overdue: [] as Task[],
            today: [] as Task[],
            upcoming: [] as Task[],
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeTasksOnly = tasks.filter(t => !t.isCompleted);
        activeTasksOnly.forEach(task => {

            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    groups.overdue.push(task);
                } else if (diffDays === 0) {
                    groups.today.push(task);
                } else {
                    groups.upcoming.push(task);
                }
            } else {
                groups.upcoming.push(task);
            }
        });

        return groups;
    }, [tasks]);

    console.log('ProjectDetailView: handleDeleteProjectEstimate получен как пропс:', !!handleDeleteProjectEstimate);
    console.log('ProjectDetailView: estimates:', estimates);
    
    const projectEstimates = useMemo(() => {
        const filtered = estimates.filter(e => e.project_id === activeProject.id);
        console.log('ProjectDetailView: projectEstimates фильтрация:', {
            totalEstimates: estimates.length,
            activeProjectId: activeProject.id,
            filteredCount: filtered.length,
            estimatesWithProjectId: estimates.filter(e => e.project_id).map(e => ({ id: e.id, project_id: e.project_id, number: e.number }))
        });
        return filtered;
    }, [estimates, activeProject.id]);
    const projectPhotos = useMemo(() => photoReports.filter(p => p.projectId === activeProject.id), [photoReports, activeProject.id]);
    const projectDocuments = useMemo(() => documents.filter(d => d.projectId === activeProject.id), [documents, activeProject.id]);
    
    // Мемоизируем значение заметки проекта для оптимизации
    const projectNote = useMemo(() => {
        const note = notesHook.getNote('project', activeProject.id);
        console.log('🔧 ProjectDetailView: projectNote получена:', { 
            note, 
            projectId: activeProject.id,
            projectName: activeProject.name 
        });
        return note;
    }, [notesHook, activeProject.id]);
    const projectWorkStages = useMemo(() => workStages.filter(ws => ws.projectId === activeProject.id), [workStages, activeProject.id]);
    const projectFinances = useMemo(() => financeEntries.filter(f => f.projectId === activeProject.id), [financeEntries, activeProject.id]);
    
    const [isFinancesCollapsed, setIsFinancesCollapsed] = useState(false);
    
    const calculateEstimateTotal = useCallback((estimate: Estimate) => {
        // Проверяем, что estimate.items существует и является массивом
        if (!estimate.items || !Array.isArray(estimate.items)) {
            console.warn('Estimate items is undefined or not an array in ProjectDetailView:', estimate);
            return 0;
        }
        
        const subtotal = estimate.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = estimate.discountType === 'percent' ? subtotal * (Number(estimate.discount) / 100) : Number(estimate.discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(estimate.tax) / 100);
        return totalAfterDiscount + taxAmount;
    }, []);

    // Вспомогательная функция для статусов этапов работ
    const getWorkStageStatusText = useCallback((status: string): string => {
        const statusMap: Record<string, string> = {
            'planned': 'Запланирован',
            'in_progress': 'В работе',
            'completed': 'Завершен'
        };
        return statusMap[status] || status;
    }, []);


    return (
        <>
            <header className="project-detail-header">
                <button onClick={() => {setActiveView('projects');}} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
                <h1>{activeProject.name}</h1>
                <div className="header-actions">
                    <button onClick={() => handleOpenProjectModal(activeProject)} className="header-btn" aria-label="Редактировать"><IconEdit/></button>
                    <button onClick={() => handleDeleteProject(activeProject.id)} className="header-btn" aria-label="Удалить"><IconTrash/></button>
                    {activeProject.status === 'completed' && <button onClick={() => onOpenActModal(financials.estimateTotal)} className="header-btn" aria-label="Сгенерировать акт"><IconDocument/></button>}
                </div>
            </header>
            <main className="project-detail-main">
                <div className="card project-section financial-dashboard">
                    <div className="project-section-header">
                        <h3>Финансовый дашборд</h3>
                    </div>
                    <div className="project-section-body">
                        <div className="dashboard-grid-final">
                            <div className="dashboard-column">
                                <div className="dashboard-item">
                                    <span className="dashboard-value">{formatCurrency(financials.estimateTotal)}</span>
                                    <span className="dashboard-label">Сумма смет</span>
                                </div>
                                <div className="dashboard-item">
                                    <span className="dashboard-value payment-value">{formatCurrency(financials.paidTotal)}</span>
                                    <span className="dashboard-label">Оплачено</span>
                                </div>
                            </div>
                            <div className="dashboard-column">
                                <div className="dashboard-item expenses-card">
                                    <span className="dashboard-value expense-value">{formatCurrency(financials.expensesTotal)}</span>
                                    <span className="dashboard-label">Расходы</span>
                                    <div className="dashboard-breakdown">
                                        {financials.expensesBreakdown.map(item => (
                                            <div key={item.categoryName} className="breakdown-item">
                                                <span>{financeCategoryToRu(item.categoryName)}</span>
                                                <span>{formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="dashboard-item profit-card-final">
                            <span className="dashboard-label">Прибыль</span>
                            <div className="profit-details-final">
                                <span className="dashboard-value profit-value">{formatCurrency(financials.profit)}</span>
                                <span className="dashboard-label">Рентабельность {`${financials.profitability.toFixed(0)}%`}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Кэшфлоу</h3>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {financials.cashFlowEntries.length > 0 ? (
                                financials.cashFlowEntries.slice(0, 3).map((entry, index) => (
                                    <ListItem
                                        key={index}
                                        icon={entry.type === 'income'
                                            ? <IconChevronRight style={{transform: 'rotate(-90deg)'}} />
                                            : <IconChevronRight style={{transform: 'rotate(90deg)'}} />
                                        }
                                        iconBgColor={entry.type === 'income' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)'}
                                        title={entry.description || (entry.type === 'expense' ? 'Расход' : 'Приход')}
                                        subtitle={new Date(entry.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')}
                                        amountText={`${entry.type === 'income' ? '+' : '-'}${formatCurrency(entry.amount)}`}
                                        amountColor={entry.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'}
                                    />
                                ))
                            ) : (
                                <div className="empty-state-container">
                                    <IconTrendingUp />
                                    <p>Движений по счету пока нет.</p>
                                </div>
                            )}
                            {financials.cashFlowEntries.length > 3 && (
                                <div className="collapsed-indicator">
                                    <span>... и еще {financials.cashFlowEntries.length - 3} транзакций</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                     <div className="project-section-header">
                        <h3>Задачи ({tasks.filter(t => !t.isCompleted).length})</h3>
                        <div className="header-actions">
                            <button className="add-in-header-btn" onClick={() => appState.openModal('addTask', { id: activeProject.id, name: activeProject.name })}><IconPlus/></button>
                        </div>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {tasks.filter(t => !t.isCompleted).length > 0 ? (
                                <div className="task-groups-container">
                                    {groupedTasks.overdue.length > 0 && (
                                        <div className="task-group">
                                            <h4>Просроченные</h4>
                                            <div className="project-items-list">
                                                {groupedTasks.overdue.slice(0, 3).map(task => (
                                                    <ListItem
                                                        key={task.id}
                                                        icon={<></>}
                                                        onIconClick={() => handleTaskToggle(task.id)}
                                                        iconAriaLabel="Переключить выполнено"
                                                        iconChecked={false}
                                                        iconBgColor={priorityMap[task.priority || 'medium']?.color}
                                                        title={task.title}
                                                        subtitle={`${activeProject.name}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                        onClick={() => handleTaskSelect(task)}
                                                        onDelete={() => tasksHook.deleteTask(task.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {groupedTasks.today.length > 0 && (
                                        <div className="task-group">
                                            <h4>Сегодня</h4>
                                            <div className="project-items-list">
                                                {groupedTasks.today.slice(0, 3).map(task => (
                                                    <ListItem
                                                        key={task.id}
                                                        icon={<></>}
                                                        onIconClick={() => handleTaskToggle(task.id)}
                                                        iconChecked={false}
                                                        iconAriaLabel="Переключить выполнено"
                                                        iconBgColor={priorityMap[task.priority || 'medium']?.color}
                                                        title={task.title}
                                                        subtitle={`${activeProject.name}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                        onClick={() => handleTaskSelect(task)}
                                                        onDelete={() => tasksHook.deleteTask(task.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {groupedTasks.upcoming.length > 0 && (
                                        <div className="task-group">
                                            <h4>Предстоящие</h4>
                                            <div className="project-items-list">
                                                {groupedTasks.upcoming.slice(0, 3).map(task => (
                                                    <ListItem
                                                        key={task.id}
                                                        icon={<></>}
                                                        onIconClick={() => handleTaskToggle(task.id)}
                                                        iconChecked={false}
                                                        iconAriaLabel="Переключить выполнено"
                                                        iconBgColor={priorityMap[task.priority || 'medium']?.color}
                                                        title={task.title}
                                                        subtitle={`${activeProject.name}${task.dueDate ? ' • ' + formatDueDate(task.dueDate) : ''}`}
                                                        onClick={() => handleTaskSelect(task)}
                                                        onDelete={() => tasksHook.deleteTask(task.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Выполненные задачи в блоке проекта не показываем */}
                                </div>
                            ) : (
                                <p className="empty-list-message">Задач пока нет</p>
                            )}
                            {tasks.filter(t => !t.isCompleted).length > 3 && (
                                <button className="btn btn-secondary" onClick={onNavigateToTasks}>
                                    Показать все задачи ({tasks.length})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                     <div className="project-section-header">
                        <h3>Сметы ({projectEstimates.length})</h3>
                        <div className="header-actions">
                            <button className="add-in-header-btn" onClick={() => handleAddNewEstimateForProject(activeProject.id)}><IconPlus/></button>
                            <button className="add-in-header-btn" onClick={onOpenEstimatesListModal}><IconFolder/></button>
                        </div>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {projectEstimates.length > 0 ? projectEstimates.map(est => (
                                <ListItem
                                    key={est.id}
                                    icon={<IconDocument />}
                                    title={est.number || 'Без названия'}
                                    subtitle={
                                        <div className="estimate-subtitle">
                                            <span className="estimate-amount">{formatCurrency(calculateEstimateTotal(est))}</span>
                                            <span className="status-badge" style={{ backgroundColor: statusMap[est.status].color, color: statusMap[est.status].textColor }}>
                                                {statusMap[est.status].text}
                                            </span>
                                        </div>
                                    }
                                    onClick={() => handleLoadEstimate(est.id)}
                                    onDelete={() => {
                                        console.log('ProjectDetailView: onDelete вызван для сметы:', est.id);
                                        console.log('ProjectDetailView: handleDeleteProjectEstimate существует?', !!handleDeleteProjectEstimate);
                                        if (handleDeleteProjectEstimate) {
                                            console.log('ProjectDetailView: вызываю handleDeleteProjectEstimate');
                                            handleDeleteProjectEstimate(est.id);
                                        } else {
                                            console.log('ProjectDetailView: handleDeleteProjectEstimate не определен');
                                        }
                                    }}
                                />
                            )) : (
                                <div className="empty-state-container">
                                    <IconDocument />
                                    <p>Смет для этого проекта пока нет.</p>
                                    <button onClick={() => handleAddNewEstimateForProject(activeProject.id)} className="btn btn-primary">+ Добавить смету</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header collapsible-header" onClick={() => setIsFinancesCollapsed(!isFinancesCollapsed)}>
                        <h3>Финансы ({projectFinances.length})</h3>
                        <div className="header-actions">
                            <button className="add-in-header-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenFinanceModal(); }}><IconPlus/></button>
                            {isFinancesCollapsed ? <IconChevronRight /> : <IconChevronDown />}
                        </div>
                    </div>
                    <div className={`project-section-body ${isFinancesCollapsed ? 'collapsed' : ''}`}>
                        {projectFinances.length > 0 ? (
                            <div className="project-items-list">
                                {(isFinancesCollapsed ? projectFinances.slice(0, 3) : projectFinances).map(f => (
                                    <ListItem
                                      key={f.id}
                                      icon={f.type === 'income'
                                        ? <IconChevronRight style={{transform: 'rotate(-90deg)'}} />
                                        : <IconChevronRight style={{transform: 'rotate(90deg)'}} />
                                      }
                                      iconBgColor={f.type === 'income' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)'}
                                      title={f.description || (f.type === 'expense' ? 'Расход' : 'Оплата')}
                                      subtitle={`${financeCategoryToRu(f.category || 'other')}${f.date ? ' • ' + new Date(f.date).toLocaleDateString('ru-RU') : ''}`}
                                      amountText={`${f.type === 'income' ? '+' : '-'}${formatCurrency(f.amount)}`}
                                      amountColor={f.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'}
                                      actions={
                                        <div className="finance-actions">
                                          {f.receipt_url && (
                                            <button
                                              className="receipt-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewReceipt(f.receipt_url!, f.description || (f.type === 'expense' ? 'Расход' : 'Оплата'));
                                              }}
                                              title="Просмотреть чек"
                                            >
                                              <IconCamera />
                                            </button>
                                          )}
                                          <button onClick={() => setEditingFinance(f)} className="edit-btn" aria-label="Редактировать"><IconEdit/></button>
                                          <button onClick={(e) => { e.stopPropagation(); onDeleteFinanceEntry(f.id); }} className="delete-btn" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                      }
                                    />
                                ))}
                                {isFinancesCollapsed && projectFinances.length > 3 && (
                                    <div className="collapsed-indicator">
                                        <span>... и еще {projectFinances.length - 3} транзакций</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state-container">
                                <IconCreditCard />
                                <p>Транзакций пока нет.</p>
                                <button onClick={(e) => { e.preventDefault(); onOpenFinanceModal(); }} className="btn btn-primary">+ Добавить транзакцию</button>
                            </div>
                        )}
                    </div>
                </div>
                {editingFinance && (
                    <FinanceEntryModal
                        onClose={() => setEditingFinance(null)}
                        onSave={async (entry, receiptFile) => {
                            await projectDataHook.updateFinanceEntry(editingFinance.id, entry, receiptFile);
                            setEditingFinance(null);
                        }}
                        showAlert={safeShowAlert}
                        onInputFocus={() => {}}
                        initial={editingFinance}
                    />
                )}
                 <div className="card project-section">
                    <div className="project-section-header">
                        <h3>График работ ({projectWorkStages.length})</h3>
                        <div className="header-actions">
                            {projectWorkStages.length > 0 && (
                                <button 
                                    className="export-btn" 
                                    onClick={(e) => {
                                        e.preventDefault(); 
                                        onExportWorkSchedulePDF(activeProject, projectWorkStages);
                                    }}
                                    title="Экспорт в PDF"
                                >
                                    📄
                                </button>
                            )}
                            <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenWorkStageModal(null);}}><IconPlus/></button>
                        </div>
                    </div>
                    <div className="project-section-body">
                        {projectWorkStages.length > 0 ? (
                            <div className="project-items-list">
                                {projectWorkStages.map(stage => {
                                    console.log('Stage data:', stage); // Отладочная информация
                                    return (
                                        <ListItem
                                            key={stage.id}
                                            icon={<IconCalendar />}
                                            title={stage.title || 'Название не указано'}
                                            subtitle={
                                                <div className="work-stage-details">
                                                    <div className="work-stage-dates">
                                                        {(stage.startDate && stage.endDate)
                                                            ? `${new Date(stage.startDate).toLocaleDateString('ru-RU')} - ${new Date(stage.endDate).toLocaleDateString('ru-RU')}`
                                                            : 'Даты не указаны'
                                                        }
                                                    </div>
                                                    <div className="work-stage-status">
                                                        <span className={`status-badge status-${stage.status || 'planned'}`}>
                                                            {getWorkStageStatusText(stage.status || 'planned')}
                                                        </span>
                                                        <span className="progress-indicator">
                                                            {stage.progress || 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            }
                                            onClick={() => onOpenWorkStageModal(stage)}
                                            onDelete={() => onDeleteWorkStage(stage.id)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state-container">
                                <IconCalendar />
                                <p>Этапы работ не добавлены.</p>
                                <button onClick={(e) => {e.preventDefault(); onOpenWorkStageModal(null);}} className="btn btn-primary">+ Добавить этап</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Фотоотчеты ({projectPhotos.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenPhotoReportModal();}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectPhotos.length > 0 ? (
                            <div className="photo-reports-list">
                                {projectPhotos.map(photoReport => (
                                    <div key={photoReport.id} className="photo-report-item">
                                        <div className="photo-report-header">
                                            <h4>{photoReport.title}</h4>
                                            <span className="photo-report-date">
                                                {new Date(photoReport.date).toLocaleDateString('ru-RU')}
                                            </span>
                                        </div>
                                        <div className="photo-grid">
                                            {photoReport.photos.slice(0, 3).map((photo, index) => (
                                                <div key={index} className="photo-thumbnail" onClick={() => onViewPhoto(photoReport)}>
                                                    <img src={photo.url} alt={photo.caption || 'фото'}/>
                                                </div>
                                            ))}
                                            {photoReport.photos.length > 3 && (
                                                <div className="photo-thumbnail more-photos">
                                                    <span>+{photoReport.photos.length - 3}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state-container">
                                <IconCamera />
                                <p>Фотографий пока нет.</p>
                                <button onClick={(e) => {e.preventDefault(); onOpenPhotoReportModal();}} className="btn btn-primary">+ Добавить фото</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Документы ({projectDocuments.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenDocumentModal();}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectDocuments.length > 0 ? (
                             <div className="project-items-list">
                                {projectDocuments.map(doc => (
                                    <ListItem
                                        key={doc.id}
                                        icon={<IconPaperclip />}
                                        title={doc.name}
                                        subtitle={new Date(doc.date).toLocaleDateString('ru-RU')}
                                        actions={
                                            <>
                                                <button className="btn-icon" aria-label="Открыть" onClick={() => window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')}><IconExternalLink/></button>
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    aria-label="Скачать"
                                                    onClick={() => handleProjectDocumentDownload(doc.fileUrl, doc.name)}
                                                >
                                                    <IconDownload />
                                                </button>
                                                <button onClick={() => onDeleteDocument(doc.id)} className="btn-icon" aria-label="Удалить"><IconTrash/></button>
                                            </>
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state-container">
                                <IconPaperclip />
                                <p>Документов пока нет.</p>
                                <button onClick={(e) => {e.preventDefault(); onOpenDocumentModal();}} className="btn btn-primary">+ Загрузить документ</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card scratchpad-card">
                    <div className="card-header">
                        <h2>Блокнот</h2>
                        <button 
                            onClick={() => {
                                console.log('🔧 Открытие полноэкранного блокнота проекта:', { 
                                    projectNote, 
                                    projectId: activeProject.id 
                                });
                                appState.navigateToView('scratchpad', { 
                                    content: projectNote, 
                                    onSave: (content: string) => notesHook.saveNote('project', content, activeProject.id),
                                    previousView: 'projectDetail'
                                });
                            }} 
                            className="expand-btn" 
                            aria-label="Развернуть блокнот"
                        >
                            <IconExternalLink />
                        </button>
                    </div>
                    <textarea 
                        value={projectNote}
                        onChange={(e) => notesHook.saveNote('project', e.target.value, activeProject.id)}
                        placeholder="Здесь можно хранить любую текстовую информацию по проекту..."
                        style={{ height: '200px', minHeight: '200px' }}
                    />
                </div>
            </main>
            {/* Модальное окно просмотра чеков */}
            <ImageViewerModal
                isOpen={receiptViewer.isOpen}
                onClose={handleCloseReceiptViewer}
                imageUrl={receiptViewer.imageUrl}
                title={receiptViewer.title}
                alt="Чек"
            />
            {/* Модальное окно редактирования задачи */}
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={handleTaskSave}
                />
            )}
        </>
    );
};
