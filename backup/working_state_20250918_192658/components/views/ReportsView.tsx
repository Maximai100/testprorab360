import React, { useState, useMemo } from 'react';
import { Project, Estimate, FinanceEntry, ReportsViewProps } from '../../types';

export const ReportsView: React.FC<ReportsViewProps> = ({ projects, estimates, financeEntries, formatCurrency, setActiveView }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredProjects = useMemo(() => {
        if (!startDate || !endDate) {
            return projects;
        }
        return projects.filter(p => {
            const projectEstimates = estimates.filter(e => e.projectId === p.id);
            if (projectEstimates.length === 0) return false;
            const firstEstimateDate = new Date(projectEstimates[0].date);
            return firstEstimateDate >= new Date(startDate) && firstEstimateDate <= new Date(endDate);
        });
    }, [projects, estimates, startDate, endDate]);

    const calculateProjectData = (projectId: number) => {
        const projectEstimates = estimates.filter(e => e.projectId === projectId);
        const estimateTotal = projectEstimates.reduce((sum, est) => sum + est.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0), 0);
        const projectFinances = financeEntries.filter(f => f.projectId === projectId);
        const totalExpenses = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
        const totalPayments = projectFinances.filter(f => f.type === 'payment').reduce((sum, f) => sum + f.amount, 0);
        const profit = estimateTotal - totalExpenses;
        return { estimateTotal, totalExpenses, totalPayments, profit };
    };

    const handleDownloadCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Название проекта,Клиент,Адрес,Статус,Сумма смет,Расходы,Оплаты,Прибыль\n";

        filteredProjects.forEach(p => {
            const { estimateTotal, totalExpenses, totalPayments, profit } = calculateProjectData(p.id);
            csvContent += `${p.id},${p.name},${p.client},${p.address},${p.status},${estimateTotal},${totalExpenses},${totalPayments},${profit}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reports.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <>
            <header className="projects-list-header">
                <h1>Отчеты</h1>
            </header>
            <main>
                <div className="card project-filters">
                    <div className="meta-field">
                        <label htmlFor="startDate">Начало периода</label>
                        <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="meta-field">
                        <label htmlFor="endDate">Конец периода</label>
                        <input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <button onClick={handleDownloadCSV} className="btn btn-primary">Скачать отчет (CSV)</button>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Проекты ({filteredProjects.length})</h3>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {filteredProjects.length > 0 ? filteredProjects.map(p => {
                                const { estimateTotal, totalExpenses, totalPayments, profit } = calculateProjectData(p.id);
                                return (
                                    <div key={p.id} className="list-item">
                                        <div className="list-item-info">
                                            <strong>{p.name}</strong>
                                            <span>Прибыль: {formatCurrency(profit)}</span>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="empty-list-message-with-button">
                                    <p className="no-results-message">
                                        {projects.length === 0 
                                            ? 'Проектов пока нет. Создайте проекты, чтобы видеть отчеты.'
                                            : 'Проектов, соответствующих выбранному периоду, не найдено.'
                                        }
                                    </p>
                                    {projects.length === 0 && (
                                        <button onClick={() => setActiveView('projects')} className="btn btn-primary">+ Создать проект</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};
