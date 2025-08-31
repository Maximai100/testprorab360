import React, { useState, useEffect } from 'react';
import { Tool, ToolLocation, Project } from '../../types';
import { IconCamera, IconChevronRight } from '../common/Icon';
import { safeShowConfirm } from '../../utils';

interface ToolDetailsScreenProps {
    tool: Partial<Tool>;
    projects: Project[];
    onSave: (tool: Partial<Tool>) => void;
    onBack: () => void;
    onDelete: (id: string) => void;
}

const conditionMap: Record<string, string> = {
    excellent: 'Отличное',
    good: 'Хорошее',
    needs_service: 'Требует обслуживания',
};

const locationMap: Record<ToolLocation, string> = {
    on_base: 'На базе',
    in_repair: 'В ремонте',
    on_project: 'На объекте',
};

export const ToolDetailsScreen: React.FC<ToolDetailsScreenProps> = ({ tool, projects, onSave, onBack, onDelete }) => {
    const [editableTool, setEditableTool] = useState(tool);

    useEffect(() => {
        setEditableTool(tool);
    }, [tool]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableTool(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(editableTool);
    };

    const handleDelete = () => {
        if (!editableTool.id) return;
        safeShowConfirm(`Вы уверены, что хотите удалить "${editableTool.name}"?`, (ok) => {
            if (ok) {
                onDelete(editableTool.id!);
            }
        });
    };

    return (
        <>
            <header className="project-detail-header">
                <button onClick={onBack} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
                <h1>Карточка инструмента</h1>
            </header>
            <main>
                <div className="card">
                    <div className="project-section-body" style={{ gap: '16px' }}>
                        <div className="tool-photo-placeholder">
                            <IconCamera />
                            <span>Добавить фото</span>
                        </div>

                        <div className="meta-field">
                            <label htmlFor="name">Название</label>
                            <input type="text" id="name" name="name" value={editableTool.name || ''} onChange={handleInputChange} />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="purchaseDate">Дата покупки</label>
                            <input type="date" id="purchaseDate" name="purchaseDate" value={editableTool.purchaseDate ? new Date(editableTool.purchaseDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="purchasePrice">Цена</label>
                            <input type="number" id="purchasePrice" name="purchasePrice" value={editableTool.purchasePrice || ''} onChange={handleInputChange} />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="condition">Состояние</label>
                            <select id="condition" name="condition" value={editableTool.condition || 'excellent'} onChange={handleInputChange}>
                                {Object.entries(conditionMap).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        </div>

                        <div className="meta-field">
                            <label htmlFor="location">Местоположение</label>
                            <select id="location" name="location" value={editableTool.location || 'on_base'} onChange={handleInputChange}>
                                {Object.entries(locationMap).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        </div>

                        {editableTool.location === 'on_project' && (
                            <div className="meta-field">
                                <label htmlFor="projectId">Проект</label>
                                <select id="projectId" name="projectId" value={editableTool.projectId || ''} onChange={handleInputChange}>
                                    <option value="">Выберите проект</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="project-section">
                            <div className="project-section-header" style={{padding: '0', borderTop: '1px solid var(--border-color)', paddingTop: '16px'}}>
                                <h3>История перемещений</h3>
                            </div>
                            <div className="project-section-body" style={{padding: '0', borderTop: 'none'}}>
                                {/* Здесь будет список истории */} 
                                <p className="empty-list-message">История пока пуста.</p>
                            </div>
                        </div>

                        <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                        <button onClick={handleDelete} className="btn btn-tertiary">Удалить инструмент</button>
                    </div>
                </div>
            </main>
        </>
    );
};