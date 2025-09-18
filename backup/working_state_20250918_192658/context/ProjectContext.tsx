import React, { createContext, useState, useContext, ReactNode } from 'react';

type ProjectContextType = {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  return (
    <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
