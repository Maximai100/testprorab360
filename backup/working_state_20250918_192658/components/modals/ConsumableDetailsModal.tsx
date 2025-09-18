import React, { useState, useRef, useEffect } from 'react';
import { ConsumableDetailsModalProps, Consumable, ConsumableLocation, Project } from '../../types';
import { IconClose, IconTrash } from '../common/Icon';

const locationMap: Record<ConsumableLocation, string> = {
    on_base: 'На базе',
    on_project: 'На проекте',
    to_buy: 'Купить',
};

export const ConsumableDetailsModal: React.FC<ConsumableDetailsModalProps> = ({ 
    consumable, 
    onClose, 
    onSave, 
    onDelete,
    projects = []
}) => {
    const [name, setName] = useState(consumable?.name || '');
    const [quantity, setQuantity] = useState(consumable?.quantity?.toString() || '');
    const [unit, setUnit] = useState(consumable?.unit || '');
    const [location, setLocation] = useState<ConsumableLocation>(consumable?.location || 'on_base');
    const [projectId, setProjectId] = useState<string>(consumable?.projectId || '');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            if (firstElement) {
                firstElement.focus();
            }
        }
    }, []);

    const handleSave = () => {
        if (!name.trim() || !consumable) {
            return;
        }
        
        const updatedConsumable: Consumable = {
            ...consumable,
            name,
            quantity: parseFloat(quantity) || 0,
            unit: unit || undefined,
            location,
            projectId: location === 'on_project' ? projectId || null : null,
        };
        
        onSave(updatedConsumable);
        onClose();
    };

    const handleDelete = () => {
        if (consumable && window.confirm('Вы уверены, что хотите удалить этот расходник?')) {
            onDelete(consumable.id);
            onClose();
        }
    };

    if (!consumable) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Редактировать расходник</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose /></button>
                </div>
                <div className="modal-body">
                    <label>Название расходника *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, 'Саморезы 3x50'"
                        required
                    />
                    
                    <label>Количество *</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        required
                    />
                    
                    <label>Единица измерения</label>
                    <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="Например, 'шт', 'кг', 'м'"
                    />
                    
                    <label>Местоположение</label>
                    <select value={location} onChange={(e) => setLocation(e.target.value as ConsumableLocation)}>
                        {Object.entries(locationMap).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                    
                    {location === 'on_project' && (
                        <>
                            <label>Проект</label>
                            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                                <option value="">Выберите проект</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={handleDelete} className="btn btn-danger" style={{ marginRight: 'auto' }}>
                        <IconTrash /> Удалить
                    </button>
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};
