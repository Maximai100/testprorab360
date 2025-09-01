import React from 'react';
import { ListItem } from '../ui/ListItem';
import { IconTrendingUp, IconMessageSquare, IconDocument } from '../common/Icon';
import { Project } from '../../types';

interface ReportsHubScreenProps {
  onOpenProjectReport: (project: Project) => void;
}

export const ReportsHubScreen: React.FC<ReportsHubScreenProps> = ({ onOpenProjectReport }) => {
  const handleProjectReportClick = () => {
    // Открываем модальное окно выбора проекта
    // Пока используем временное решение - передаем пустой проект
    // В будущем здесь будет модальное окно выбора
    onOpenProjectReport({} as Project);
  };

  const handleClientReportClick = () => {
    // TODO: Implement navigation to client report selection
    alert('Скоро здесь будет выбор проекта для отчета клиенту');
  };

  const handleOverallReportClick = () => {
    // TODO: Implement navigation to overall report screen
    alert('Скоро здесь будет общий финансовый отчет');
  };

  return (
    <>
      <header className="projects-list-header">
        <h1>Центр Отчетов</h1>
      </header>
      <main className="project-detail-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-m)' }}>
        <ListItem
          icon={<IconTrendingUp />}
          title="Финансовый отчет по проекту"
          subtitle="Прибыль и расходы по одному объекту"
          onClick={handleProjectReportClick}
        />
        <ListItem
          icon={<IconMessageSquare />}
          title="Отчет для клиента"
          subtitle="Создать понятную сводку для заказчика"
          onClick={handleClientReportClick}
        />
        <ListItem
          icon={<IconDocument />}
          title="Общий финансовый отчет"
          subtitle="Аналитика по всем проектам за период"
          onClick={handleOverallReportClick}
        />
      </main>
    </>
  );
};
