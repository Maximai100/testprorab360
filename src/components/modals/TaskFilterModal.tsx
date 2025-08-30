import React, { useState, useMemo } from 'react';
import { IconClose } from '../common/Icon';

interface TaskFilterModalProps {
    onClose: () => void;
    onApplyFilters: (filters: { projectId: string | null; tag: string | null; }) => void;
    availableProjects: string[];
    availableTags: string[];
    currentFilters: { projectId: string | null; tag: string | null; };
}

export const TaskFilterModal: React.FC<TaskFilterModalProps> = ({ 
    onClose, 
    onApplyFilters, 
    availableProjects, 
    availableTags, 
    currentFilters 
}) => {
    const [selectedProjectId, setSelectedProjectId] = useState(currentFilters.projectId);
    const [selectedTag, setSelectedTag] = useState(currentFilters.tag);

    const handleApply = () => {
        onApplyFilters({ projectId: selectedProjectId, tag: selectedTag });
        onClose();
    };

    const handleReset = () => {
        setSelectedProjectId(null);
        setSelectedTag(null);
        onApplyFilters({ projectId: null, tag: null });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Фильтр задач</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose /></button>
                </div>
                <div className="modal-body" style={{ gap: '16px' }}>
                    <div className="meta-field">
                        <label htmlFor="project-filter">Проект</label>
                        <select 
                            id="project-filter" 
                            value={selectedProjectId || ''} 
                            onChange={e => setSelectedProjectId(e.target.value || null)}
                        >
                            <option value="">Все проекты</option>
                            {availableProjects.map(pId => <option key={pId} value={pId}>{pId}</option>)}
                        </select>
                    </div>
                    <div className="meta-field">
                        <label htmlFor="tag-filter">Тег</label>
                        <select 
                            id="tag-filter" 
                            value={selectedTag || ''} 
                            onChange={e => setSelectedTag(e.target.value || null)}
                        >
                            <option value="">Все теги</option>
                            {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                    </div>
                </div>
                <div className="modal-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button onClick={handleReset} className="btn btn-secondary">Сбросить</button>
                    <button onClick={handleApply} className="btn btn-primary">Применить</button>
                </div>
            </div>
        </div>
    );
};