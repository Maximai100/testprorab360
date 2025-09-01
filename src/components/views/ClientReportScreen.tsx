import React from 'react';
import { Project, FinanceEntry, WorkStage } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconCheckCircle, IconImage, IconShare, IconChevronRight } from '../common/Icon';

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
  const projectEstimates = estimates.filter(e => e.projectId === project.id);
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
    .sort((a, b) => new Date(b.completionDate || 0).getTime() - new Date(a.completionDate || 0).getTime());

  // Имитируем фотоотчет (в будущем здесь будут реальные фото)
  const mockPhotos = [
    { id: 1, title: 'Начало работ', date: '15.01.2024' },
    { id: 2, title: 'Фундамент', date: '20.01.2024' },
    { id: 3, title: 'Стены', date: '25.01.2024' },
    { id: 4, title: 'Крыша', date: '30.01.2024' },
    { id: 5, title: 'Отделка', date: '05.02.2024' }
  ];

  const handleShare = () => {
    alert('Функция "Поделиться" будет добавлена в следующем обновлении! 📱');
  };

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

        {/* Финансовая сводка (только для клиента) */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--spacing-m)', color: 'var(--color-text-primary)' }}>
            <IconTrendingUp style={{ marginRight: 'var(--spacing-s)' }} />
            Финансовая сводка
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
                marginBottom: 'var(--spacing-s)'
              }}>
                {formatCurrency(totalEstimateAmount)}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Итоговая сумма по смете
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
                marginBottom: 'var(--spacing-s)'
              }}>
                {formatCurrency(totalPaidByClient)}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Оплачено клиентом
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
                color: remainingToPay > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                marginBottom: 'var(--spacing-s)'
              }}>
                {formatCurrency(Math.abs(remainingToPay))}
                {remainingToPay > 0 ? ' (к оплате)' : ' (оплачено полностью)'}
              </div>
              <div style={{
                fontSize: 'var(--font-size-s)',
                color: 'var(--color-text-secondary)',
                fontWeight: '500'
              }}>
                Остаток к оплате
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
                  title={stage.name}
                  subtitle={stage.completionDate ? 
                    `Завершено: ${new Date(stage.completionDate).toLocaleDateString('ru-RU')}` : 
                    'Завершено'
                  }
                  amountText={stage.budget ? formatCurrency(stage.budget) : undefined}
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

        {/* Кнопка "Поделиться" */}
        <div className="card" style={{ textAlign: 'center' }}>
          <button 
            onClick={handleShare}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-s)',
              padding: 'var(--spacing-m) var(--spacing-xl)',
              fontSize: 'var(--font-size-m)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-s)'
            }}
          >
            <IconShare />
            Поделиться / Отправить
          </button>
        </div>
      </main>
    </>
  );
};
