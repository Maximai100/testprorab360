import React from 'react';
import { Project, FinanceEntry } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconCreditCard, IconChevronRight } from '../common/Icon';

interface ProjectFinancialReportScreenProps {
  project: Project;
  estimates: any[];
  financeEntries: FinanceEntry[];
  formatCurrency: (amount: number) => string;
  onBack: () => void;
}

export const ProjectFinancialReportScreen: React.FC<ProjectFinancialReportScreenProps> = ({
  project,
  estimates,
  financeEntries,
  formatCurrency,
  onBack
}) => {
  // Фильтруем данные по проекту
  const projectEstimates = estimates.filter(e => e.projectId === project.id);
  const projectFinanceEntries = financeEntries.filter(f => f.projectId === project.id);

  // Рассчитываем финансовые показатели
  const totalEstimatesAmount = projectEstimates.reduce((sum, estimate) => {
    const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) => 
      itemSum + (item.quantity * item.price), 0) || 0;
    return sum + estimateTotal;
  }, 0);

  const totalIncome = projectFinanceEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = projectFinanceEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const profit = totalIncome - totalExpenses;
  const profitability = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;

  // Группируем расходы по категориям
  const expensesByCategory = projectFinanceEntries
    .filter(entry => entry.type === 'expense')
    .reduce((acc, entry) => {
      const category = entry.category || 'Без категории';
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

  return (
    <>
      <header className="projects-list-header">
        <button onClick={onBack} className="back-btn">
          <IconChevronRight style={{ transform: 'rotate(180deg)' }} />
          <span>Назад</span>
        </button>
        <h1>Отчет по проекту: {project.name}</h1>
      </header>

      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        
        {/* Основные финансовые показатели */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconTrendingUp style={{ marginRight: 'var(--spacing-s)' }} />
            Финансовые показатели
          </h3>
          
          <div style={{ display: 'grid', gap: 'var(--spacing-m)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="metric-card">
              <div className="metric-label">Общая сумма смет</div>
              <div className="metric-value">{formatCurrency(totalEstimatesAmount)}</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Всего доходов</div>
              <div className="metric-value income">{formatCurrency(totalIncome)}</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Всего расходов</div>
              <div className="metric-value expense">{formatCurrency(totalExpenses)}</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Итоговая прибыль</div>
              <div className={`metric-value ${profit >= 0 ? 'income' : 'expense'}`}>
                {formatCurrency(profit)}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Рентабельность</div>
              <div className={`metric-value ${profitability >= 0 ? 'income' : 'expense'}`}>
                {profitability.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Расходы по категориям */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconCreditCard style={{ marginRight: 'var(--spacing-s)' }} />
            Расходы по категориям
          </h3>
          
          {Object.keys(expensesByCategory).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {Object.entries(expensesByCategory)
                .sort(([,a], [,b]) => b - a) // Сортируем по убыванию
                .map(([category, amount]) => (
                  <ListItem
                    key={category}
                    icon={<IconCreditCard />}
                    title={category}
                    amountText={formatCurrency(amount)}
                    amountColor="var(--color-error)"
                  />
                ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Расходы не найдены
            </p>
          )}
        </div>

        {/* Детализация смет */}
        {projectEstimates.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
              Сметы проекта
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {projectEstimates.map((estimate) => {
                const estimateTotal = estimate.items?.reduce((sum: number, item: any) => 
                  sum + (item.quantity * item.price), 0) || 0;
                
                return (
                  <ListItem
                    key={estimate.id}
                    icon={<IconTrendingUp />}
                    title={`Смета №${estimate.estimateNumber || estimate.id?.slice(0, 8)}`}
                    subtitle={estimate.date ? new Date(estimate.date).toLocaleDateString('ru-RU') : 'Без даты'}
                    amountText={formatCurrency(estimateTotal)}
                    amountColor="var(--color-success)"
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
};
