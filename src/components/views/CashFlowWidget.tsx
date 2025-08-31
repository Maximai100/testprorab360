import React from 'react';
import { ProjectFinancials } from '../../types';

interface CashFlowWidgetProps {
    financials: ProjectFinancials;
    formatCurrency: (value: number) => string;
}

export const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({ financials, formatCurrency }) => {
    return (
        <div className="card project-section">
            <div className="project-section-header">
                <h3>Кэшфлоу</h3>
            </div>
            <div className="project-section-body">
                {financials.cashFlowEntries.length > 0 ? (
                    <div className="cashflow-list">
                        {financials.cashFlowEntries.map((entry, index) => (
                            <div key={index} className="cashflow-item">
                                <div className="cashflow-date">
                                    {new Date(entry.date).toLocaleDateString('ru-RU', { 
                                        day: 'numeric', 
                                        month: 'short' 
                                    })}
                                </div>
                                <div className="cashflow-details">
                                    <div className="cashflow-type">
                                        {entry.type === 'income' ? 'Приход' : 'Расход'}
                                    </div>
                                    <div className="cashflow-amount-details">
                                        <span className={`amount ${entry.type === 'income' ? 'income-color' : 'expense-color'}`}>
                                            {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                                        </span>
                                        <span className="description">
                                            ({entry.description || 'Без описания'})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-list-message">
                        <p className="no-results-message">Транзакций пока нет.</p>
                    </div>
                )}
            </div>
        </div>
    );
};