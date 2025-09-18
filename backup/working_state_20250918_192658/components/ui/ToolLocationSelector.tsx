import React from 'react';
import { ToolLocation, Project } from '../../types';

interface ToolLocationSelectorProps {
    location: ToolLocation;
    projectId?: string | null;
    projects: Project[];
    onLocationChange: (location: ToolLocation, projectId?: string | null) => void;
}

export const ToolLocationSelector: React.FC<ToolLocationSelectorProps> = ({
    location,
    projectId,
    projects,
    onLocationChange,
}) => {
    // Создаем список всех возможных опций
    const options = [
        { value: 'on_base', label: 'На базе' },
        { value: 'in_repair', label: 'В ремонте' },
        ...projects.map(project => ({
            value: `project_${project.id}`,
            label: project.name
        }))
    ];

    // Определяем текущее значение
    const getCurrentValue = () => {
        if (location === 'on_project' && projectId) {
            return `project_${projectId}`;
        }
        return location;
    };

    // Обработчик изменения
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        
        if (value.startsWith('project_')) {
            const projectId = value.replace('project_', '');
            // Для проектов передаем 'on_project' как location и projectId
            onLocationChange('on_project', projectId);
        } else {
            // Для базовых локаций передаем значение как есть
            onLocationChange(value as ToolLocation, null);
        }
    };

    return (
        <select 
            value={getCurrentValue()}
            onChange={handleChange}
            style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '100px',
                height: '28px'
            }}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
};
