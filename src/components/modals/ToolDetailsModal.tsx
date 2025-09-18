import React, { useState, useRef, useEffect } from 'react';
import { ToolDetailsModalProps, ToolCondition } from '../../types';
import { IconClose, IconTrash } from '../common/Icon';

const conditionMap: Record<ToolCondition, string> = {
    excellent: 'Отличное',
    good: 'Хорошее',
    needs_service: 'Требует обслуживания',
};

export const ToolDetailsModal: React.FC<ToolDetailsModalProps> = ({ 
    tool, 
    onClose, 
    onSave, 
    onDelete, 
    projects = [] 
}) => {
    const [name, setName] = useState(tool?.name || '');
    const [category, setCategory] = useState(tool?.category || '');
    const [condition, setCondition] = useState<ToolCondition>(tool?.condition || 'excellent');
    const [notes, setNotes] = useState(tool?.notes || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(tool?.image_url || '');
    const [purchaseDate, setPurchaseDate] = useState(tool?.purchase_date || '');
    const [purchasePrice, setPurchasePrice] = useState(tool?.purchase_price?.toString() || '');
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = () => {
        if (!name.trim() || !tool) {
            return;
        }
        
        const updatedTool: Tool = {
            ...tool,
            name,
            category: category || undefined,
            condition,
            notes: notes || undefined,
            image_url: imagePreview || undefined,
            purchase_date: purchaseDate || undefined,
            purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        };
        
        onSave(updatedTool);
        onClose();
    };

    const handleDelete = () => {
        if (tool && window.confirm('Вы уверены, что хотите удалить этот инструмент?')) {
            onDelete(tool.id);
            onClose();
        }
    };

    if (!tool) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Редактировать инструмент</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose /></button>
                </div>
                <div className="modal-body">
                    <label>Название инструмента *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, 'Перфоратор Bosch'"
                        required
                    />
                    
                    <label>Категория</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Например, 'Электроинструмент'"
                    />
                    
                    <label>Состояние</label>
                    <select value={condition} onChange={(e) => setCondition(e.target.value as ToolCondition)}>
                        {Object.entries(conditionMap).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                    
                    <label>Заметки</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Дополнительная информация об инструменте"
                        rows={3}
                    />
                    
                    <label>Изображение</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-color)',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            📷 Выбрать изображение
                        </button>
                        {imagePreview && (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                    src={imagePreview}
                                    alt="Предпросмотр"
                                    style={{
                                        maxWidth: '200px',
                                        maxHeight: '150px',
                                        borderRadius: '6px',
                                        objectFit: 'cover'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'rgba(255, 0, 0, 0.8)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <label>Дата покупки</label>
                    <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                    
                    <label>Цена покупки</label>
                    <input
                        type="number"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                    />
                </div>
                <div className="modal-footer" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 24px',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)'
                }}>
                    <button 
                        onClick={handleDelete} 
                        style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                    >
                        <IconTrash /> Удалить
                    </button>
                    <button 
                        onClick={handleSave} 
                        style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 24px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};
