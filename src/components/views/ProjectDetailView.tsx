import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { ProjectDetailViewProps, Estimate, PhotoReport, Document, WorkStage, Note, ProjectFinancials, FinanceEntry } from '../../types';
import { IconChevronRight, IconEdit, IconTrash, IconDocument, IconPlus, IconCreditCard, IconCalendar, IconPaperclip, IconDownload, IconMessageSquare, IconCheckSquare, IconTrendingUp, IconCamera, IconChevronDown, IconFolder } from '../common/Icon';
import { ListItem } from '../ui/ListItem';


export const ProjectDetailView: React.FC<ProjectDetailViewProps & { financials: ProjectFinancials, onProjectScratchpadChange: (projectId: string, content: string) => void, financeEntries: FinanceEntry[] }> = ({
    activeProject, estimates, photoReports, documents, workStages, formatCurrency, statusMap, setActiveView, setActiveProjectId,
    handleOpenProjectModal, handleDeleteProject, handleLoadEstimate, handleAddNewEstimateForProject, handleDeleteProjectEstimate,
    onOpenFinanceModal, onDeleteFinanceEntry, onOpenPhotoReportModal, onViewPhoto, onOpenDocumentModal, onDeleteDocument,
    onOpenWorkStageModal, onDeleteWorkStage, onOpenActModal, onNavigateToTasks, onProjectScratchpadChange, onExportWorkSchedulePDF, onOpenEstimatesListModal, financials, financeEntries
}) => {
    const { setActiveProjectId: setContextActiveProjectId } = useProjectContext();

    useEffect(() => {
      if (activeProject) {
        setContextActiveProjectId(activeProject.id);
      }
      return () => {
        setContextActiveProjectId(null);
      };
    }, [activeProject, setContextActiveProjectId]);

    console.log('ProjectDetailView: handleDeleteProjectEstimate получен как пропс:', !!handleDeleteProjectEstimate);
    console.log('ProjectDetailView: estimates:', estimates);
    
    const projectEstimates = useMemo(() => {
        const filtered = estimates.filter(e => e.projectId === activeProject.id);
        console.log('ProjectDetailView: projectEstimates фильтрация:', {
            totalEstimates: estimates.length,
            activeProjectId: activeProject.id,
            filteredCount: filtered.length,
            estimatesWithProjectId: estimates.filter(e => e.projectId).map(e => ({ id: e.id, projectId: e.projectId, number: e.number }))
        });
        return filtered;
    }, [estimates, activeProject.id]);
    const projectPhotos = useMemo(() => photoReports.filter(p => p.projectId === activeProject.id), [photoReports, activeProject.id]);
    const projectDocuments = useMemo(() => documents.filter(d => d.projectId === activeProject.id), [documents, activeProject.id]);
    const projectWorkStages = useMemo(() => workStages.filter(ws => ws.projectId === activeProject.id), [workStages, activeProject.id]);
    const projectFinances = useMemo(() => financeEntries.filter(f => f.projectId === activeProject.id), [financeEntries, activeProject.id]);
    
    const [isFinancesCollapsed, setIsFinancesCollapsed] = useState(false);
    
    const calculateEstimateTotal = useCallback((estimate: Estimate) => {
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
                <button onClick={() => {setActiveView('projects'); setContextActiveProjectId(null);}} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
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
                                                <span>{item.categoryName}</span>
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
                        <h3>Задачи</h3>
                        <button className="add-in-header-btn" onClick={onNavigateToTasks}><IconCheckSquare/></button>
                    </div>
                </div>
                <div className="card project-section">
                     <div className="project-section-header">
                        <h3>Сметы ({projectEstimates.length})</h3>
                        <div className="header-actions">
                            <button className="add-in-header-btn" onClick={() => handleAddNewEstimateForProject()}><IconPlus/></button>
                            <button className="add-in-header-btn" onClick={onOpenEstimatesListModal}><IconFolder/></button>
                        </div>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {projectEstimates.length > 0 ? projectEstimates.map(est => (
                                <ListItem
                                    key={est.id}
                                    icon={<IconDocument />}
                                    title={`${est.number} - ${est.clientInfo || 'Без названия'}`}
                                    subtitle={
                                        <span>
                                            {formatCurrency(calculateEstimateTotal(est))}{' '}
                                            <span className="status-badge" style={{ backgroundColor: statusMap[est.status].color }}>
                                                {statusMap[est.status].text}
                                            </span>
                                        </span>
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
                                    <button onClick={handleAddNewEstimateForProject} className="btn btn-primary">+ Добавить смету</button>
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
                                      subtitle={f.category}
                                      amountText={`${f.type === 'income' ? '+' : '-'}${formatCurrency(f.amount)}`}
                                      amountColor={f.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'}
                                      onDelete={() => onDeleteFinanceEntry(f.id)}
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
                            <div className="photo-grid">
                                {projectPhotos.map(p => (
                                    <div key={p.id} className="photo-thumbnail" onClick={() => onViewPhoto(p)}>
                                        <img src={p.image} alt={p.caption || 'фото'}/>
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
                                                <a href={doc.fileUrl} download={doc.name} className="btn btn-secondary" aria-label="Скачать"><IconDownload/></a>
                                                <button onClick={() => onDeleteDocument(doc.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
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
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Блокнот</h3>
                    </div>
                    <div className="project-section-body">
                        <textarea 
                            className="scratchpad-textarea"
                            placeholder="Здесь можно хранить любую текстовую информацию по проекту..."
                            value={activeProject.scratchpad || ''}
                            onChange={(e) => onProjectScratchpadChange(activeProject.id, e.target.value)}
                            rows={8}
                        />
                    </div>
                </div>
            </main>
        </>
    );
};