import React from 'react';
import { ProjectsListViewProps, Project, ProjectStatus } from '../../types';
import { IconPlus, IconFolder } from '../common/Icon';
import { ListItem } from '../ui/ListItem';

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
    handleOpenProjectModal, projectStatusFilter, setProjectStatusFilter, projectSearch, setProjectSearch,
    handleInputFocus, filteredProjects, projects, setActiveProjectId, setActiveView
}) => (
    <>
        <header className="projects-list-header">
            <h1>Проекты</h1>
            <div className="header-actions">
                <button onClick={() => handleOpenProjectModal()} className="header-btn" aria-label="Новый проект"><IconPlus/></button>
            </div>
        </header>
        <main>
            <div className="project-filters">
                <div className="toggle-switch">
                    <button onClick={() => setProjectStatusFilter('planned')} className={projectStatusFilter === 'planned' ? 'active' : ''}>Планируются</button>
                    <button onClick={() => setProjectStatusFilter('in_progress')} className={projectStatusFilter === 'in_progress' ? 'active' : ''}>В работе</button>
                    <button onClick={() => setProjectStatusFilter('on_hold')} className={projectStatusFilter === 'on_hold' ? 'active' : ''}>На паузе</button>
                    <button onClick={() => setProjectStatusFilter('completed')} className={projectStatusFilter === 'completed' ? 'active' : ''}>Завершены</button>
                    <button onClick={() => setProjectStatusFilter('cancelled')} className={projectStatusFilter === 'cancelled' ? 'active' : ''}>Отменены</button>
                </div>
                <input type="search" placeholder="Поиск по проектам..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} onFocus={handleInputFocus} />
            </div>
            <div className="projects-list">
                {filteredProjects.length > 0 ? filteredProjects.map((project: Project) => (
                    <ListItem
                        key={project.id}
                        icon={<IconFolder />}
                        title={project.name}
                        subtitle={`${project.client || 'Клиент не указан'} • ${project.address || 'Адрес не указан'}`}
                        onClick={() => { setActiveProjectId(project.id); setActiveView('projectDetail'); }}
                    />
                )) : (
                    <div className="empty-list-message-with-button">
                        <p className="no-results-message">{projects.length > 0 ? 'По вашему запросу ничего не найдено.' : 'У вас пока нет проектов. Начните свой первый проект прямо сейчас!'}</p>
                        <button onClick={() => handleOpenProjectModal()} className="btn btn-primary">+ Создать новый проект</button>
                    </div>
                )}
            </div>
        </main>
    </>
);