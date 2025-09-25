import React from 'react';
import { Project, FinanceEntry, WorkStage } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconCheckCircle, IconImage, IconChevronRight } from '../common/Icon';
import { financeCategoryToRu } from '../../utils';

interface ClientReportScreenProps {
  project: Project;
  estimates: any[];
  financeEntries: FinanceEntry[];
  workStages: WorkStage[];
  formatCurrency: (amount: number) => string;
  onBack: () => void;
}

export const ClientReportScreen: React.FC<ClientReportScreenProps> = ({
  project,
  estimates,
  financeEntries,
  workStages,
  formatCurrency,
  onBack
}) => {
  // Получаем текущую дату
  const today = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Фильтруем данные по проекту
  const projectEstimates = estimates.filter(e => e.project_id === project.id);
  const projectFinanceEntries = financeEntries.filter(f => f.projectId === project.id);
  const projectWorkStages = workStages.filter(w => w.projectId === project.id);

  // Рассчитываем финансовые показатели (только для клиента)
  const totalEstimateAmount = projectEstimates.reduce((sum, estimate) => {
    const estimateTotal = estimate.items?.reduce((itemSum: number, item: any) =>
      itemSum + (item.quantity * item.price), 0) || 0;
    return sum + estimateTotal;
  }, 0);

  const totalPaidByClient = projectFinanceEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const remainingToPay = totalEstimateAmount - totalPaidByClient;

  // Получаем завершенные этапы работ
  const completedWorkStages = projectWorkStages
    .filter(stage => stage.status === 'completed')
    .sort((a, b) => new Date(b.endDate || 0).getTime() - new Date(a.endDate || 0).getTime());

  // Имитируем фотоотчет (в будущем здесь будут реальные фото)
  const mockPhotos = [
    { id: 1, title: 'Начало работ', date: '15.01.2024' },
    { id: 2, title: 'Фундамент', date: '20.01.2024' },
    { id: 3, title: 'Стены', date: '25.01.2024' },
    { id: 4, title: 'Крыша', date: '30.01.2024' },
    { id: 5, title: 'Отделка', date: '05.02.2024' }
  ];


  return (
    <>
      <header className="projects-list-header">
        <button onClick={onBack} className="back-btn">
          <IconChevronRight style={{ transform: 'rotate(180deg)' }} />
          <span>Назад</span>
        </button>
        <h1>Отчет для клиента</h1>
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
            Отчет по проекту "{project.name}"
          </h2>
          <p style={{ 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-m)'
          }}>
            от {today}
          </p>
        </div>

        {/* Финансовая сводка — унифицированный дашборд */}
        <div className="card project-section financial-dashboard">
          <div className="project-section-header">
            <h3>Финансовый дашборд</h3>
          </div>
          <div className="project-section-body">
            <div className="dashboard-grid-final">
              <div className="dashboard-column">
                <div className="dashboard-item">
                  <span className="dashboard-value">{formatCurrency(totalEstimateAmount)}</span>
                  <span className="dashboard-label">Сумма смет</span>
                </div>
                <div className="dashboard-item">
                  <span className="dashboard-value payment-value">{formatCurrency(totalPaidByClient)}</span>
                  <span className="dashboard-label">Оплачено клиентом</span>
                </div>
              </div>
              <div className="dashboard-column">
                <div className="dashboard-item expenses-card">
                  <span className="dashboard-value expense-value">{formatCurrency(Math.max(remainingToPay, 0))}</span>
                  <span className="dashboard-label">Остаток к оплате</span>
                  <div className="dashboard-breakdown">
                    <div className="breakdown-item">
                      <span>Статус</span>
                      <span>{remainingToPay > 0 ? 'К оплате' : 'Оплачено полностью'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dashboard-item profit-card-final">
              <span className="dashboard-label">Итог</span>
              <div className="profit-details-final">
                <span className="dashboard-value profit-value">{formatCurrency(totalPaidByClient)}</span>
                <span className="dashboard-label">Оплачено из {formatCurrency(totalEstimateAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Выполненные работы */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconCheckCircle style={{ marginRight: 'var(--spacing-s)' }} />
            Выполненные работы
          </h3>

          {completedWorkStages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {completedWorkStages.map((stage) => (
                <ListItem
                  key={stage.id}
                  icon={<IconCheckCircle />}
                  title={stage.title}
                  subtitle={stage.endDate ? 
                    `Завершено: ${new Date(stage.endDate).toLocaleDateString('ru-RU')}` : 
                    'Завершено'
                  }
                  amountText={stage.progress ? `${stage.progress}%` : undefined}
                  amountColor="var(--color-success)"
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Завершенные этапы работ пока не добавлены
            </p>
          )}
        </div>

        {/* Фотоотчет */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconImage style={{ marginRight: 'var(--spacing-s)' }} />
            Фотоотчет
          </h3>

          <div style={{ 
            display: 'grid', 
            gap: 'var(--spacing-m)', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            marginBottom: 'var(--spacing-m)'
          }}>
            {mockPhotos.map((photo) => (
              <div 
                key={photo.id} 
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  borderRadius: 'var(--border-radius-s)',
                  padding: 'var(--spacing-m)',
                  textAlign: 'center',
                  border: '1px solid var(--color-separator)'
                }}
              >
                <div style={{
                  width: '100%',
                  height: '100px',
                  backgroundColor: 'var(--color-surface-1)',
                  borderRadius: 'var(--border-radius-s)',
                  marginBottom: 'var(--spacing-s)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-s)'
                }}>
                  📷
                </div>
                <div style={{ fontSize: 'var(--font-size-s)', color: 'var(--color-text-primary)' }}>
                  {photo.title}
                </div>
                <div style={{ fontSize: 'var(--font-size-s)', color: 'var(--color-text-secondary)' }}>
                  {photo.date}
                </div>
              </div>
            ))}
          </div>

          <p style={{ 
            color: 'var(--color-text-secondary)', 
            textAlign: 'center', 
            fontSize: 'var(--font-size-s)',
            fontStyle: 'italic'
          }}>
            В будущем здесь будут отображаться реальные фотографии с проекта
          </p>
        </div>

      </main>
    </>
  );
};
