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
  // Состояние для фильтров по датам
  const [startDate, setStartDate] = React.useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = React.useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  // Получаем текущую дату
  const today = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Фильтруем финансовые записи по датам
  const filteredFinanceEntries = financeEntries.filter(entry => {
    if (entry.date) {
      const entryDate = new Date(entry.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59); // Включаем весь день
      
      return entryDate >= start && entryDate <= end;
    }
    return true; // Если дата не указана, включаем
  });

  // Рассчитываем общие финансовые показатели
  const totalEstimatesAmount = estimates.reduce((sum, estimate) => {
    const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) =>
      itemSum + (item.quantity * item.price), 0) || 0;
    return sum + estimateTotal;
  }, 0);

  const totalIncome = filteredFinanceEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = filteredFinanceEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalProfit = totalIncome - totalExpenses;
  const overallProfitability = totalExpenses > 0 ? (totalProfit / totalExpenses) * 100 : 0;

  // Финансовые показатели по проектам
  const projectFinancials = projects.map(project => {
    const projectEstimates = estimates.filter(e => e.project_id === project.id);
    const projectFinanceEntries = filteredFinanceEntries.filter(f => f.projectId === project.id);

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
  const expensesByCategory = filteredFinanceEntries
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

        {/* Фильтры по датам */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            📅 Фильтр по периоду
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gap: 'var(--spacing-m)', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            alignItems: 'end'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-s)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-s)',
                fontWeight: '500'
              }}>
                Начало периода
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-s)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 'var(--border-radius-s)',
                  backgroundColor: 'var(--color-surface-1)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-m)'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-s)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-s)',
                fontWeight: '500'
              }}>
                Конец периода
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-s)',
                  border: '1px solid var(--color-separator)',
                  borderRadius: 'var(--border-radius-s)',
                  backgroundColor: 'var(--color-surface-1)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--font-size-m)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Общие финансовые показатели */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
            <IconTrendingUp />
            Общие финансовые показатели
          </h3>

          <div style={{ display: 'grid', gap: 'var(--spacing-m)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--border-radius-m)',
              padding: 'var(--spacing-l)',
              textAlign: 'center',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xxl)',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-s)',
                backgroundColor: 'var(--color-surface-1)',
                padding: 'var(--spacing-m)',
                borderRadius: 'var(--border-radius-s)',
                display: 'inline-block'
              }}>
                {formatCurrency(totalEstimatesAmount)}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Общая сумма смет
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--border-radius-m)',
              padding: 'var(--spacing-l)',
              textAlign: 'center',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xxl)',
                fontWeight: '700',
                color: 'var(--color-primary)',
                marginBottom: 'var(--spacing-s)',
                backgroundColor: 'var(--color-surface-1)',
                padding: 'var(--spacing-m)',
                borderRadius: 'var(--border-radius-s)',
                display: 'inline-block'
              }}>
                {formatCurrency(totalIncome)}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Общие доходы
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--border-radius-m)',
              padding: 'var(--spacing-l)',
              textAlign: 'center',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xxl)',
                fontWeight: '700',
                color: 'var(--color-danger)',
                marginBottom: 'var(--spacing-s)',
                backgroundColor: 'var(--color-surface-1)',
                padding: 'var(--spacing-m)',
                borderRadius: 'var(--border-radius-s)',
                display: 'inline-block'
              }}>
                {formatCurrency(totalExpenses)}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Общие расходы
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--border-radius-m)',
              padding: 'var(--spacing-l)',
              textAlign: 'center',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xxl)',
                fontWeight: '700',
                color: totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                marginBottom: 'var(--spacing-s)',
                backgroundColor: 'var(--color-surface-1)',
                padding: 'var(--spacing-m)',
                borderRadius: 'var(--border-radius-s)',
                display: 'inline-block'
              }}>
                {formatCurrency(totalProfit)}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Общая прибыль
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--border-radius-m)',
              padding: 'var(--spacing-l)',
              textAlign: 'center',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xxl)',
                fontWeight: '700',
                color: overallProfitability >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                marginBottom: 'var(--spacing-s)',
                backgroundColor: 'var(--color-surface-1)',
                padding: 'var(--spacing-m)',
                borderRadius: 'var(--border-radius-s)',
                display: 'inline-block'
              }}>
                {overallProfitability.toFixed(1)}%
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Общая рентабельность
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--color-surface-2)',
              borderRadius: 'var(--border-radius-m)',
              padding: 'var(--spacing-l)',
              textAlign: 'center',
              border: '1px solid var(--color-separator)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xxl)',
                fontWeight: '700',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-s)',
                backgroundColor: 'var(--color-surface-1)',
                padding: 'var(--spacing-m)',
                borderRadius: 'var(--border-radius-s)',
                display: 'inline-block'
              }}>
                {projects.filter(p => p.status === 'in_progress').length}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Активных проектов
              </div>
            </div>
          </div>
        </div>

        {/* График финансов по проектам */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
            <IconTrendingUp />
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
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
            <IconProject />
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
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
            <IconCreditCard />
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
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
            <IconProject />
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
