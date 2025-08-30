import React, { useState, useEffect } from 'react';
import { Tool } from '../../types';
import { IconCamera, IconChevronRight } from '../common/Icon';
import { safeShowConfirm } from '../../utils';

interface ToolDetailsScreenProps {
    tool: Partial<Tool>;
    onSave: (tool: Partial<Tool>) => void;
    onBack: () => void;
    onDelete: (id: string) => void;
}

const conditionMap: Record<string, string> = {
    excellent: 'Отличное',
    good: 'Хорошее',
    fair: 'Удовлетворительное',
    poor: 'Плохое',
};

export const ToolDetailsScreen: React.FC<ToolDetailsScreenProps> = ({ tool, onSave, onBack, onDelete }) => {
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
                            <label htmlFor="serialNumber">Серийный номер</label>
                            <input type="text" id="serialNumber" name="serialNumber" value={editableTool.serialNumber || ''} onChange={handleInputChange} />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="purchaseDate">Дата покупки</label>
                            <input type="date" id="purchaseDate" name="purchaseDate" value={editableTool.purchaseDate ? new Date(editableTool.purchaseDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="price">Цена</label>
                            <input type="number" id="price" name="price" value={editableTool.price || ''} onChange={handleInputChange} />
                        </div>

                        <div className="meta-field">
                            <label htmlFor="condition">Состояние</label>
                            <select id="condition" name="condition" value={editableTool.condition || 'excellent'} onChange={handleInputChange}>
                                {Object.entries(conditionMap).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        </div>

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