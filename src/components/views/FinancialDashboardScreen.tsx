import React from 'react';
import { financeCategoryToRu } from '../../utils';
import { ProjectFinancials } from '../../types';
import { CashFlowWidget } from './CashFlowWidget';

interface FinancialDashboardScreenProps {
    financials: ProjectFinancials;
    formatCurrency: (value: number) => string;
}

export const FinancialDashboardScreen: React.FC<FinancialDashboardScreenProps> = ({ financials, formatCurrency }) => {
    return (
        <>
            <header className="project-detail-header">
                <h1>Финансовый дашборд</h1>
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

                <CashFlowWidget financials={financials} formatCurrency={formatCurrency} />
            </main>
        </>
    );
};
