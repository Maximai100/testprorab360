import { useState } from 'react';
import { Tool, Project, InventoryScreenProps, Consumable, ToolLocation, ConsumableLocation } from '../../types';
import { IconPlus, IconTrash, IconSettings, IconClipboard } from '../common/Icon';
import { ListItem } from '../ui/ListItem';
import { ConsumableListItem } from '../ui/ConsumableListItem';
import { ToolLocationSelector } from '../ui/ToolLocationSelector';

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
    onOpenToolDetailsModal,
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

    const handleConsumableLocationChange = (consumable: Consumable, location: ConsumableLocation, projectId?: string | null) => {
        onUpdateConsumable({ ...consumable, location, projectId });
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
                                            <div key={tool.id} className="list-item" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                backgroundColor: 'var(--card-bg)',
                                                borderRadius: '6px',
                                                marginBottom: '6px',
                                                cursor: 'pointer',
                                                minHeight: 'auto'
                                            }} onClick={() => onOpenToolDetailsModal(tool)}>
                                                <div style={{ marginRight: '8px' }}>
                                                    <IconSettings />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                                        {tool.name}
                                                    </div>
                                                </div>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ToolLocationSelector
                                                        location={tool.location || 'on_base'}
                                                        projectId={tool.projectId}
                                                        projects={projects}
                                                        onLocationChange={(location, projectId) => {
                                                            onUpdateTool({
                                                                ...tool,
                                                                location,
                                                                projectId
                                                            });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state-container">
                                          <IconClipboard />
                                          <p>Инструментов пока нет.</p>
                                          <button onClick={onOpenAddToolModal} className="btn btn-primary">+ Добавить инструмент</button>
                                        </div>
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
                                <div className="add-consumable-form" style={{ display: 'flex', gap: '8px' }}>
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
                                            <ConsumableListItem
                                                key={consumable.id}
                                                consumable={consumable}
                                                onQuantityChange={handleUpdateConsumableQuantity}
                                                onDelete={onDeleteConsumable}
                                                onLocationChange={handleConsumableLocationChange}
                                                projects={projects}
                                            />
                                        ))
                                    ) : (
                                        <div className="empty-state-container">
                                            <IconClipboard />
                                            <p>Расходников пока нет.</p>
                                        </div>
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