import React from 'react';
import { Project } from '../../types';
import { ListItem } from '../ui/ListItem';
import { IconProject, IconClose } from '../common/Icon';

interface ProjectSelectionModalProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onClose: () => void;
}

export const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  projects,
  onSelectProject,
  onClose
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Выберите проект для отчета</h2>
          <button onClick={onClose} className="close-btn" aria-label="Закрыть">
            <IconClose />
          </button>
        </div>
        
        <div className="modal-body">
          {projects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-s)' }}>
              {projects.map((project) => (
                <ListItem
                  key={project.id}
                  icon={<IconProject />}
                  title={project.name}
                  subtitle={`${project.client} • ${project.address}`}
                  onClick={() => onSelectProject(project)}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-l)' }}>
              Проекты не найдены
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
