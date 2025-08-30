import { useState } from 'react';
import { Tool, Project, InventoryScreenProps, Consumable } from '../../types';
import { IconPlus, IconTrash } from '../common/Icon';
import { EditConsumableModal } from '../modals/EditConsumableModal'; // Import the new modal

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
    tools,
    projects,
    consumables,
    onToolClick,
    onUpdateTool,
    onOpenAddToolModal,
    onAddConsumable,
    onUpdateConsumable, // New prop
    onDeleteConsumable, // New prop
}) => {
    const [activeTab, setActiveTab] = useState('tools');
    const [newConsumableName, setNewConsumableName] = useState('');
    const [newConsumableQuantity, setNewConsumableQuantity] = useState('');

    // New state for the edit consumable modal
    const [showEditConsumableModal, setShowEditConsumableModal] = useState(false);
    const [selectedConsumable, setSelectedConsumable] = useState<Consumable | null>(null);

    const handleLocationChange = (tool: Tool, newLocation: string) => {
        onUpdateTool({ ...tool, location: newLocation });
    };

    const handleAddConsumable = () => {
        if (newConsumableName.trim() && newConsumableQuantity.trim()) {
            onAddConsumable({
                name: newConsumableName.trim(),
                quantity: newConsumableQuantity.trim(),
            });
            setNewConsumableName('');
            setNewConsumableQuantity('');
        }
    };

    // New function to handle clicking on a consumable
    const handleConsumableClick = (consumable: Consumable) => {
        setSelectedConsumable(consumable);
        setShowEditConsumableModal(true);
    };

    const handleCloseEditConsumableModal = () => {
        setShowEditConsumableModal(false);
        setSelectedConsumable(null);
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
                                                <select 
                                                    value={tool.location} 
                                                    onChange={(e) => handleLocationChange(tool, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()} // Предотвращаем переход на другой экран
                                                >
                                                    <option value="На базе">На базе</option>
                                                    {projects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
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
                )}

                {activeTab === 'consumables' && (
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
                                    type="text"
                                    placeholder="Количество"
                                    value={newConsumableQuantity}
                                    onChange={(e) => setNewConsumableQuantity(e.target.value)}
                                />
                                <button onClick={handleAddConsumable} className="btn btn-primary">Добавить расходник</button>
                            </div>
                            <div className="consumables-list project-items-list">
                                {consumables.length > 0 ? (
                                    consumables.map(consumable => (
                                        <div
                                            key={consumable.id}
                                            className="list-item inventory-item"
                                            onClick={() => handleConsumableClick(consumable)} // Add onClick handler
                                            style={{ cursor: 'pointer' }} // Indicate clickability
                                        >
                                            <div className="list-item-info">
                                                <strong>{consumable.name}</strong>
                                                <span>Кол-во: {consumable.quantity}</span>
                                            </div>
                                            <div className="list-item-actions">
                                                {/* Add actions here if needed, e.g., delete button */}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-results-message">Расходников пока нет.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Render the EditConsumableModal */}
            {showEditConsumableModal && selectedConsumable && (
                <EditConsumableModal
                    consumable={selectedConsumable}
                    onClose={handleCloseEditConsumableModal}
                    onSave={onUpdateConsumable}
                    onDelete={onDeleteConsumable}
                />
            )}
        </>
    );
};