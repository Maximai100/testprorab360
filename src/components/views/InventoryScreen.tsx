import { useState } from 'react';
import { Tool, Project, InventoryScreenProps, Consumable, ToolLocation } from '../../types';
import { IconPlus, IconTrash } from '../common/Icon';

export const InventoryScreen: React.FC<InventoryScreenProps & {
    toolsScratchpad: string;
    consumablesScratchpad: string;
    onToolsScratchpadChange: (content: string) => void;
    onConsumablesScratchpadChange: (content: string) => void;
}> = ({
    tools,
    projects,
    consumables,
    onToolClick,
    onUpdateTool,
    onOpenAddToolModal,
    onAddConsumable,
    onUpdateConsumable,
    onDeleteConsumable,
    toolsScratchpad,
    consumablesScratchpad,
    onToolsScratchpadChange,
    onConsumablesScratchpadChange,
}) => {
    const [activeTab, setActiveTab] = useState('tools');
    const [newConsumableName, setNewConsumableName] = useState('');
    const [newConsumableQuantity, setNewConsumableQuantity] = useState<number | string>('');
    const [newConsumableUnit, setNewConsumableUnit] = useState('шт.');

    const handleAddConsumable = () => {
        const quantity = typeof newConsumableQuantity === 'string' ? parseFloat(newConsumableQuantity) : newConsumableQuantity;
        if (newConsumableName.trim() && quantity > 0) {
            onAddConsumable({
                name: newConsumableName.trim(),
                quantity: quantity,
                unit: newConsumableUnit,
            });
            setNewConsumableName('');
            setNewConsumableQuantity('');
            setNewConsumableUnit('шт.');
        }
    };

    const handleUpdateConsumableQuantity = (consumable: Consumable, newQuantity: number) => {
        if (newQuantity >= 0) {
            onUpdateConsumable({ ...consumable, quantity: newQuantity });
        }
    };

    return (
        <>
            <header className="projects-list-header">
                <h1>Инвентарь</h1>
                <div className="header-actions">
                    <button onClick={onOpenAddToolModal} className="header-btn" aria-label="Новый инструмент"><IconPlus /></button>
                </div>
            </header>
            <main>
                <div className="tabs">
                    <button className={`tab-button ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>Инструменты</button>
                    <button className={`tab-button ${activeTab === 'consumables' ? 'active' : ''}`} onClick={() => setActiveTab('consumables')}>Расходники</button>
                </div>

                {activeTab === 'tools' && (
                    <>
                        <div className="card project-section">
                            <div className="project-section-body">
                                <div className="project-items-list">
                                    {tools.length > 0 ? (
                                        tools.map(tool => (
                                            <div key={tool.id} className="list-item inventory-item">
                                                <div className="list-item-info" onClick={() => onToolClick(tool)} style={{cursor: 'pointer'}}>
                                                    <strong>{tool.name}</strong>
                                                </div>
                                                <div className="list-item-actions">
                                                    <span>
                                                        {tool.location === 'on_project' 
                                                            ? projects.find(p => p.id === tool.projectId)?.name || 'На объекте' 
                                                            : tool.location === 'on_base' ? 'На базе' : 'В ремонте'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <>
                                            <p className="no-results-message">Инструментов пока нет.</p>
                                            <button onClick={onOpenAddToolModal} className="btn btn-primary">+ Добавить инструмент</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card project-section">
                            <div className="project-section-header">
                                <h3>Блокнот для инструментов</h3>
                            </div>
                            <div className="project-section-body">
                                <textarea 
                                    className="scratchpad-textarea"
                                    placeholder="Заметки по инструментам..."
                                    value={toolsScratchpad}
                                    onChange={(e) => onToolsScratchpadChange(e.target.value)}
                                    rows={8}
                                />
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'consumables' && (
                    <>
                        <div className="card project-section">
                            <div className="project-section-body">
                                <div className="add-consumable-form">
                                    <input
                                        type="text"
                                        placeholder="Наименование"
                                        value={newConsumableName}
                                        onChange={(e) => setNewConsumableName(e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Количество"
                                        value={newConsumableQuantity}
                                        onChange={(e) => setNewConsumableQuantity(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Ед. изм."
                                        value={newConsumableUnit}
                                        onChange={(e) => setNewConsumableUnit(e.target.value)}
                                    />
                                    <button onClick={handleAddConsumable} className="btn btn-primary">Добавить</button>
                                </div>
                                <div className="consumables-list project-items-list">
                                    {consumables.length > 0 ? (
                                        consumables.map(consumable => (
                                            <div
                                                key={consumable.id}
                                                className="list-item inventory-item"
                                            >
                                                <div className="list-item-info">
                                                    <strong>{consumable.name}</strong>
                                                </div>
                                                <div className="list-item-actions">
                                                    <button onClick={() => handleUpdateConsumableQuantity(consumable, consumable.quantity - 1)} className="btn-icon">-</button>
                                                    <span>{consumable.quantity} {consumable.unit}</span>
                                                    <button onClick={() => handleUpdateConsumableQuantity(consumable, consumable.quantity + 1)} className="btn-icon">+</button>
                                                    <button onClick={() => onDeleteConsumable(consumable.id)} className="btn-icon btn-tertiary"><IconTrash /></button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-results-message">Расходников пока нет.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card project-section">
                            <div className="project-section-header">
                                <h3>Блокнот для расходников</h3>
                            </div>
                            <div className="project-section-body">
                                <textarea 
                                    className="scratchpad-textarea"
                                    placeholder="Заметки по расходникам..."
                                    value={consumablesScratchpad}
                                    onChange={(e) => onConsumablesScratchpadChange(e.target.value)}
                                    rows={8}
                                />
                            </div>
                        </div>
                    </>
                )}
            </main>
        </>
    );
};