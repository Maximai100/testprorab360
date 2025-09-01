import React, { useState } from 'react';
import { ProjectFinancials } from '../../types';
import { IconChevronRight, IconChevronDown } from '../common/Icon';

interface CashFlowWidgetProps {
    financials: ProjectFinancials;
    formatCurrency: (value: number) => string;
}

export const CashFlowWidget: React.FC<CashFlowWidgetProps> = ({ financials, formatCurrency }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const displayedEntries = isCollapsed 
        ? financials.cashFlowEntries.slice(0, 3) 
        : financials.cashFlowEntries;

    const hasMoreEntries = isCollapsed && financials.cashFlowEntries.length > 3;

    return (
        <div className="card project-section">
            <div className="project-section-header collapsible-header" onClick={toggleCollapse}>
                <h3>Кэшфлоу</h3>
                <div className="header-actions">
                    {isCollapsed ? <IconChevronRight /> : <IconChevronDown />}
                </div>
            </div>
            <div className={`project-section-body ${isCollapsed ? 'collapsed' : ''}`}>
                {financials.cashFlowEntries.length > 0 ? (
                    <div className="cashflow-list">
                        {displayedEntries.map((entry, index) => (
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
                        {hasMoreEntries && (
                            <div className="collapsed-indicator">
                                <span>... и еще {financials.cashFlowEntries.length - 3} транзакций</span>
                            </div>
                        )}
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