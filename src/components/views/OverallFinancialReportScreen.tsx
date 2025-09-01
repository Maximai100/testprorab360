import React from 'react';
import { Project, FinanceEntry } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconCreditCard, IconChevronRight, IconProject } from '../common/Icon';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface OverallFinancialReportScreenProps {
  projects: Project[];
  estimates: any[];
  financeEntries: FinanceEntry[];
  formatCurrency: (amount: number) => string;
  onBack: () => void;
}

export const OverallFinancialReportScreen: React.FC<OverallFinancialReportScreenProps> = ({
  projects,
  estimates,
  financeEntries,
  formatCurrency,
  onBack
}) => {
  // Получаем текущую дату
  const today = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Рассчитываем общие финансовые показатели
  const totalEstimatesAmount = estimates.reduce((sum, estimate) => {
    const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) =>
      itemSum + (item.quantity * item.price), 0) || 0;
    return sum + estimateTotal;
  }, 0);

  const totalIncome = financeEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = financeEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalProfit = totalIncome - totalExpenses;
  const overallProfitability = totalExpenses > 0 ? (totalProfit / totalExpenses) * 100 : 0;

  // Финансовые показатели по проектам
  const projectFinancials = projects.map(project => {
    const projectEstimates = estimates.filter(e => e.projectId === project.id);
    const projectFinanceEntries = financeEntries.filter(f => f.projectId === project.id);

    const projectEstimatesAmount = projectEstimates.reduce((sum, estimate) => {
      const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) =>
        itemSum + (item.quantity * item.price), 0) || 0;
      return sum + estimateTotal;
    }, 0);

    const projectIncome = projectFinanceEntries
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const projectExpenses = projectFinanceEntries
      .filter(entry => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const projectProfit = projectIncome - projectExpenses;

    return {
      id: project.id,
      name: project.name,
      estimates: projectEstimatesAmount,
      income: projectIncome,
      expenses: projectExpenses,
      profit: projectProfit
    };
  }).filter(p => p.estimates > 0 || p.income > 0 || p.expenses > 0);

  // Расходы по категориям (по всем проектам)
  const expensesByCategory = financeEntries
    .filter(entry => entry.type === 'expense')
    .reduce((acc, entry) => {
      const category = entry.category || 'Без категории';
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieChartData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    name: category,
    value: amount
  }));

  // Цвета для графиков
  const chartColors = [
    'var(--color-danger)',
    'var(--color-primary)',
    'var(--color-success)',
    'var(--color-text-secondary)',
    'var(--color-surface-2)',
  ];

  // Статус проектов
  const projectStatuses = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(projectStatuses).map(([status, count]) => ({
    status: status === 'planned' ? 'Запланирован' : 
            status === 'in_progress' ? 'В работе' :
            status === 'on_hold' ? 'Приостановлен' :
            status === 'completed' ? 'Завершен' :
            status === 'cancelled' ? 'Отменен' : status,
    count
  }));

  return (
    <>
      <header className="projects-list-header">
        <button onClick={onBack} className="back-btn">
          <IconChevronRight style={{ transform: 'rotate(180deg)' }} />
          <span>Назад</span>
        </button>
        <h1>Общий финансовый отчет</h1>
      </header>

      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>

        {/* Заголовок отчета */}
        <div className="card">
          <h2 style={{ 
            marginBottom: 'var(--spacing-s)', 
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-l)',
            textAlign: 'center'
          }}>
            Общий финансовый отчет по всем проектам
          </h2>
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-m)'
          }}>
            от {today}
          </p>
        </div>

        {/* Общие финансовые показатели */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconTrendingUp style={{ marginRight: 'var(--spacing-s)' }} />
            Общие финансовые показатели
          </h3>

          <div style={{ display: 'grid', gap: 'var(--spacing-m)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="metric-card">
              <div className="metric-label">Общая сумма смет</div>
              <div className="metric-value">{formatCurrency(totalEstimatesAmount)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Общие доходы</div>
              <div className="metric-value income">{formatCurrency(totalIncome)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Общие расходы</div>
              <div className="metric-value expense">{formatCurrency(totalExpenses)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Общая прибыль</div>
              <div className={`metric-value ${totalProfit >= 0 ? 'income' : 'expense'}`}>
                {formatCurrency(totalProfit)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Общая рентабельность</div>
              <div className={`metric-value ${overallProfitability >= 0 ? 'income' : 'expense'}`}>
                {overallProfitability.toFixed(1)}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Активных проектов</div>
              <div className="metric-value">{projects.filter(p => p.status === 'in_progress').length}</div>
            </div>
          </div>
        </div>

        {/* График финансов по проектам */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconTrendingUp style={{ marginRight: 'var(--spacing-s)' }} />
            Финансы по проектам
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectFinancials.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-separator)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--color-text-secondary)"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Сумма']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-1)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 'var(--border-radius-s)',
                  color: 'var(--color-text-primary)'
                }}
              />
              <Legend />
              <Bar dataKey="estimates" fill="var(--color-primary)" name="Сметы" />
              <Bar dataKey="income" fill="var(--color-success)" name="Доходы" />
              <Bar dataKey="expenses" fill="var(--color-danger)" name="Расходы" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Статус проектов */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconProject style={{ marginRight: 'var(--spacing-s)' }} />
            Статус проектов
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
              >
                {statusChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, 'Количество']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-1)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 'var(--border-radius-s)',
                  color: 'var(--color-text-primary)'
                }}
              />
              <Legend 
                formatter={(value: string) => (
                  <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Расходы по категориям */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconCreditCard style={{ marginRight: 'var(--spacing-s)' }} />
            Расходы по категориям (все проекты)
          </h3>

          {Object.keys(expensesByCategory).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {Object.entries(expensesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => (
                  <ListItem
                    key={category}
                    icon={<IconCreditCard />}
                    title={category}
                    amountText={formatCurrency(amount)}
                    amountColor="var(--color-danger)"
                  />
                ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Расходы не найдены
            </p>
          )}
        </div>

        {/* Список проектов с финансовыми показателями */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconProject style={{ marginRight: 'var(--spacing-s)' }} />
            Детализация по проектам
          </h3>

          {projectFinancials.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {projectFinancials.map((project) => (
                <ListItem
                  key={project.id}
                  icon={<IconProject />}
                  title={project.name}
                  subtitle={`Сметы: ${formatCurrency(project.estimates)} • Доходы: ${formatCurrency(project.income)} • Расходы: ${formatCurrency(project.expenses)}`}
                  amountText={formatCurrency(project.profit)}
                  amountColor={project.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Проекты с финансовыми данными не найдены
            </p>
          )}
        </div>
      </main>
    </>
  );
};
