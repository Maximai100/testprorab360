import React, { useMemo, useCallback } from 'react';
import { ProjectDetailViewProps, Estimate, FinanceEntry, PhotoReport, Document, WorkStage, Note } from '../../types';
import { IconChevronRight, IconEdit, IconTrash, IconDocument, IconPlus, IconCreditCard, IconCalendar, IconPaperclip, IconDownload, IconMessageSquare, IconCheckSquare } from '../common/Icon';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
    activeProject, estimates, financeEntries, photoReports, documents, workStages, notes, formatCurrency, statusMap, setActiveView, setActiveProjectId,
    handleOpenProjectModal, handleDeleteProject, handleLoadEstimate, handleAddNewEstimateForProject,
    onOpenFinanceModal, onDeleteFinanceEntry, onOpenPhotoReportModal, onViewPhoto, onOpenDocumentModal, onDeleteDocument,
    onOpenWorkStageModal, onDeleteWorkStage, onOpenNoteModal, onDeleteNote, onOpenActModal, onNavigateToTasks
}) => {
    const projectEstimates = useMemo(() => estimates.filter(e => e.projectId === activeProject.id), [estimates, activeProject.id]);
    const projectFinances = useMemo(() => financeEntries.filter(f => f.projectId === activeProject.id), [financeEntries, activeProject.id]);
    const projectPhotos = useMemo(() => photoReports.filter(p => p.projectId === activeProject.id), [photoReports, activeProject.id]);
    const projectDocuments = useMemo(() => documents.filter(d => d.projectId === activeProject.id), [documents, activeProject.id]);
    const projectWorkStages = useMemo(() => workStages.filter(ws => ws.projectId === activeProject.id), [workStages, activeProject.id]);
    const projectNotes = useMemo(() => notes.filter(n => n.projectId === activeProject.id), [notes, activeProject.id]);
    
    const calculateEstimateTotal = useCallback((estimate: Estimate) => {
        const subtotal = estimate.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = estimate.discountType === 'percent' ? subtotal * (Number(estimate.discount) / 100) : Number(estimate.discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(estimate.tax) / 100);
        return totalAfterDiscount + taxAmount;
    }, []);

    const { estimateTotal, totalExpenses, totalPayments, profit } = useMemo(() => {
        const estimateTotal = projectEstimates.reduce((sum, est) => sum + calculateEstimateTotal(est), 0);
        const totalExpenses = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
        const totalPayments = projectFinances.filter(f => f.type === 'payment').reduce((sum, f) => sum + f.amount, 0);
        const profit = estimateTotal - totalExpenses;
        return { estimateTotal, totalExpenses, totalPayments, profit };
    }, [projectEstimates, projectFinances, calculateEstimateTotal]);


    return (
        <>
            <header className="project-detail-header">
                <button onClick={() => {setActiveView('projects'); setActiveProjectId(null);}} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
                <h1>{activeProject.name}</h1>
                <div className="header-actions">
                    <button onClick={() => handleOpenProjectModal(activeProject)} className="header-btn" aria-label="Редактировать"><IconEdit/></button>
                    <button onClick={() => handleDeleteProject(activeProject.id)} className="header-btn" aria-label="Удалить"><IconTrash/></button>
                    {activeProject.status === 'completed' && <button onClick={() => onOpenActModal(estimateTotal)} className="header-btn" aria-label="Сгенерировать акт"><IconDocument/></button>}
                </div>
            </header>
            <main className="project-detail-main">
                <div className="card project-section">
                    <div className="project-section-header"><h3>Финансовый дашборд</h3></div>
                    <div className="project-section-body">
                         <div className="dashboard-grid">
                            <div className="dashboard-item">
                                <span className="dashboard-value">{formatCurrency(estimateTotal)}</span>
                                <span className="dashboard-label">Сумма смет</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-value expense-value">{formatCurrency(totalExpenses)}</span>
                                <span className="dashboard-label">Расходы</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-value payment-value">{formatCurrency(totalPayments)}</span>
                                <span className="dashboard-label">Оплачено</span>
                            </div>
                                <div className="dashboard-item">
                                <span className="dashboard-value profit-value">{formatCurrency(profit)}</span>
                                <span className="dashboard-label">Прибыль</span>
                            </div>
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
                        <button className="add-in-header-btn" onClick={handleAddNewEstimateForProject}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {projectEstimates.length > 0 ? projectEstimates.map(est => (
                                <div key={est.id} className="list-item" onClick={() => handleLoadEstimate(est.id)}>
                                    <IconDocument />
                                    <div className="list-item-info">
                                        <strong>{est.number} - {est.clientInfo || 'Без названия'}</strong>
                                        <span>{formatCurrency(calculateEstimateTotal(est))} <span className="status-badge" style={{ backgroundColor: statusMap[est.status].color }}>{statusMap[est.status].text}</span></span>
                                    </div>
                                    <span className="list-item-arrow"><IconChevronRight/></span>
                                </div>
                            )) : (
                                <div className="empty-list-message-with-button">
                                    <p className="no-results-message">Смет для этого проекта пока нет. Создайте первую смету, чтобы начать работу!</p>
                                    <button onClick={handleAddNewEstimateForProject} className="btn btn-primary">+ Добавить смету</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Финансы ({projectFinances.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => { e.preventDefault(); onOpenFinanceModal(); }}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectFinances.length > 0 ? (
                            <div className="project-items-list">
                                {projectFinances.map(f => (
                                    <div key={f.id} className="list-item finance-item">
                                        {f.receiptImage ? <img src={f.receiptImage} alt="чек" className="finance-receipt-thumb"/> : <IconCreditCard />}
                                        <div className="list-item-info">
                                            <strong>{f.description || (f.type === 'expense' ? 'Расход' : 'Оплата')}</strong>
                                            <span className={f.type === 'expense' ? 'expense-value' : 'payment-value'}>{formatCurrency(f.amount)}</span>
                                        </div>
                                        <button onClick={() => onDeleteFinanceEntry(f.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-list-message-with-button">
                                <p className="no-results-message">Транзакций пока нет. Добавьте расходы или оплаты, чтобы отслеживать финансы проекта.</p>
                                <button onClick={(e) => { e.preventDefault(); onOpenFinanceModal(); }} className="btn btn-primary">+ Добавить транзакцию</button>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="card project-section">
                    <div className="project-section-header">
                        <h3>График работ ({projectWorkStages.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenWorkStageModal(null);}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectWorkStages.length > 0 ? (
                            <div className="project-items-list">
                                {projectWorkStages.map(stage => (
                                    <div key={stage.id} className="list-item">
                                        <IconCalendar />
                                        <div className="list-item-info" onClick={() => onOpenWorkStageModal(stage)}>
                                            <strong>{stage.name}</strong>
                                            <span>{new Date(stage.startDate).toLocaleDateString('ru-RU')} - {new Date(stage.endDate).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <button onClick={() => onDeleteWorkStage(stage.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-list-message-with-button">
                                <p className="no-results-message">Этапы работ не добавлены. Создайте график, чтобы отслеживать прогресс.</p>
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
                            <div className="empty-list-message-with-button">
                                <p className="no-results-message">Фотографий пока нет. Добавьте фотоотчеты, чтобы зафиксировать прогресс.</p>
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
                                    <div key={doc.id} className="list-item document-item">
                                        <IconPaperclip />
                                        <div className="list-item-info">
                                            <strong>{doc.name}</strong>
                                            <span>{new Date(doc.date).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <a href={doc.dataUrl} download={doc.name} className="btn btn-secondary" aria-label="Скачать"><IconDownload/></a>
                                            <button onClick={() => onDeleteDocument(doc.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-list-message-with-button">
                                <p className="no-results-message">Документов пока нет. Загрузите важные документы, связанные с проектом.</p>
                                <button onClick={(e) => {e.preventDefault(); onOpenDocumentModal();}} className="btn btn-primary">+ Загрузить документ</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Заметки ({projectNotes.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenNoteModal(null);}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectNotes.length > 0 ? (
                            <div className="project-items-list">
                                {projectNotes.map(note => (
                                    <div key={note.id} className="list-item note-item">
                                        <IconMessageSquare />
                                        <div className="list-item-info" onClick={() => onOpenNoteModal(note)}>
                                            <p className="note-content">{note.text}</p>
                                            <span className="note-date">Изменено: {new Date(note.lastModified).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <button onClick={() => onDeleteNote(note.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-list-message-with-button">
                                <p className="no-results-message">Заметок пока нет. Добавьте важные мысли и напоминания по проекту.</p>
                                <button onClick={(e) => {e.preventDefault(); onOpenNoteModal(null);}} className="btn btn-primary">+ Добавить заметку</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
};