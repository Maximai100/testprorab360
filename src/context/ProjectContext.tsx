import React, { createContext, useContext, useState, ReactNode } from 'react';

// Типы для контекста проекта
interface ProjectContextType {
  // Активный проект
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  
  // Контекст перехода из проекта
  cameFromProject: boolean;
  setCameFromProject: (value: boolean) => void;
  
  // Активный экран
  activeView: string;
  setActiveView: (view: string) => void;
  
  // Методы для работы с проектами
  clearProjectContext: () => void;
  setProjectContext: (projectId: string) => void;
}

// Создаем контекст
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Провайдер контекста
interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  // Состояние активного проекта
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Состояние контекста перехода из проекта
  const [cameFromProject, setCameFromProject] = useState<boolean>(false);
  
  // Состояние активного экрана
  const [activeView, setActiveView] = useState<string>('workspace');

  // Метод для очистки контекста проекта
  const clearProjectContext = () => {
    setActiveProjectId(null);
    setCameFromProject(false);
  };

  // Метод для установки контекста проекта
  const setProjectContext = (projectId: string) => {
    setActiveProjectId(projectId);
    setCameFromProject(false);
  };

  const value: ProjectContextType = {
    activeProjectId,
    setActiveProjectId,
    cameFromProject,
    setCameFromProject,
    activeView,
    setActiveView,
    clearProjectContext,
    setProjectContext,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Хук для использования контекста
export const useProjectContext = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

export default ProjectContext;
