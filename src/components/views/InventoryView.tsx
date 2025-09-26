import React from 'react';
import { InventoryViewProps, Tool, ToolCondition } from '../../types';
import { IconPlus } from '../common/Icon';

const conditionMap: Record<ToolCondition, string> = {
    excellent: 'Отличное',
    good: 'Хорошее',
    needs_service: 'Требует обслуживания',
    in_repair: 'В ремонте',
};

export const InventoryView: React.FC<InventoryViewProps> = ({
    tools,
    projects,
    onToolClick,
    onUpdateTool,
    onOpenAddToolModal,
}) => {
    return (
        <>
            <header className="projects-list-header">
                <h1>Инвентарь</h1>
                <div className="header-actions">
                    <button onClick={onOpenAddToolModal} className="header-btn" aria-label="Новый инструмент"><IconPlus /></button>
                </div>
            </header>
            <main>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Список инструментов ({tools.length})</h3>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {tools.length > 0 ? tools.map(tool => (
                                <div key={tool.id} className="list-item inventory-item" onClick={() => onToolClick(tool)}>
                                    <div className="list-item-info">
                                        <strong>{tool.name}</strong>
                                        <select 
                                            value={tool.condition || 'excellent'} 
                                            onChange={(e) => onUpdateTool({ ...tool, condition: e.target.value as ToolCondition })} 
                                            className="status-select"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {Object.entries(conditionMap).map(([key, value]) => (
                                                <option key={key} value={key}>{value}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">
                                    <p>Инструменты не найдены</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};