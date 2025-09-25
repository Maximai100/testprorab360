import { useState, useMemo } from 'react';
import { Tool, Project, InventoryScreenProps, Consumable, ToolLocation, ConsumableLocation } from '../../types';
import { IconPlus, IconTrash, IconSettings, IconClipboard, IconExternalLink } from '../common/Icon';
import { ListItem } from '../ui/ListItem';
import { ConsumableListItem } from '../ui/ConsumableListItem';
import { ToolLocationSelector } from '../ui/ToolLocationSelector';

export const InventoryScreen: React.FC<InventoryScreenProps & {
    toolsScratchpad: string;
    consumablesScratchpad: string;
    onToolsScratchpadChange: (content: string) => void;
    onConsumablesScratchpadChange: (content: string) => void;
    appState: any;
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
    notesHook,
    appState,
}) => {
    const [activeTab, setActiveTab] = useState('tools');
    const [newConsumableName, setNewConsumableName] = useState('');
    const [newConsumableQuantity, setNewConsumableQuantity] = useState<number | string>('');
    const [newConsumableUnit, setNewConsumableUnit] = useState('шт.');
    
    // Мемоизируем значения заметок для оптимизации
    const toolsNote = useMemo(() => {
        const note = notesHook.getNote('inventory_tools');

        return note;
    }, [notesHook]);
    const consumablesNote = useMemo(() => {
        const note = notesHook.getNote('inventory_consumables');

        return note;
    }, [notesHook]);

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
                        <div className="card scratchpad-card">
                            <div className="card-header">
                                <h2>Блокнот для инструментов</h2>
                                <button 
                                    onClick={() => appState.navigateToView('scratchpad', { 
                                        content: toolsNote, 
                                        onSave: (content: string) => notesHook.saveNote('inventory_tools', content),
                                        previousView: 'inventory'
                                    })} 
                                    className="expand-btn" 
                                    aria-label="Развернуть блокнот"
                                >
                                    <IconExternalLink />
                                </button>
                            </div>
                            <textarea 
                                value={toolsNote}
                                onChange={(e) => notesHook.saveNote('inventory_tools', e.target.value)}
                                placeholder="Заметки по инструментам..."
                                style={{ height: '200px', minHeight: '200px' }}
                            />
                        </div>
                    </>
                )}

                {activeTab === 'consumables' && (
                    <>
                        <div className="card project-section">
                            <div className="project-section-body">
                                <div className="add-consumable-form">
                                    <div className="form-row">
                                        <input
                                            type="text"
                                            placeholder="Наименование"
                                            value={newConsumableName}
                                            onChange={(e) => setNewConsumableName(e.target.value)}
                                            className="form-input-long"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <input
                                            type="number"
                                            placeholder="Количество"
                                            value={newConsumableQuantity}
                                            onChange={(e) => setNewConsumableQuantity(e.target.value)}
                                            className="form-input-small"
                                        />
                                        <input
                                            type="text"
                                            placeholder="шт."
                                            value={newConsumableUnit}
                                            onChange={(e) => setNewConsumableUnit(e.target.value)}
                                            className="form-input-small"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <button onClick={handleAddConsumable} className="btn btn-primary add-button">Добавить</button>
                                    </div>
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
                        <div className="card scratchpad-card">
                            <div className="card-header">
                                <h2>Блокнот для расходников</h2>
                                <button 
                                    onClick={() => appState.navigateToView('scratchpad', { 
                                        content: consumablesNote, 
                                        onSave: (content: string) => notesHook.saveNote('inventory_consumables', content),
                                        previousView: 'inventory'
                                    })} 
                                    className="expand-btn" 
                                    aria-label="Развернуть блокнот"
                                >
                                    <IconExternalLink />
                                </button>
                            </div>
                            <textarea 
                                value={consumablesNote}
                                onChange={(e) => notesHook.saveNote('inventory_consumables', e.target.value)}
                                placeholder="Заметки по расходникам..."
                                style={{ height: '200px', minHeight: '200px' }}
                            />
                        </div>
                    </>
                )}
            </main>
        </>
    );
};