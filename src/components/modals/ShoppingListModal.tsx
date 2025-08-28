import React, { useMemo, useRef, useState } from 'react';
import { ShoppingListModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ items, onClose, showAlert }) => {
    const [copyButtonText, setCopyButtonText] = useState('Копировать список');
    const materials = useMemo(() => items.filter(item => item.type === 'material' && item.name.trim() && item.quantity > 0), [items]);
    const listRef = useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        const textToCopy = materials.map(item => `${item.name} - ${item.quantity} ${item.unit || 'шт.'}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyButtonText('Скопировано ✓');
            setTimeout(() => setCopyButtonText('Копировать список'), 2000);
        }).catch(() => {
            showAlert('Не удалось скопировать.');
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Список покупок</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body" ref={listRef}>
                    {materials.length > 0 ? (
                        <div className="shopping-list">
                            {materials.map(item => (
                                <div key={item.id} className="shopping-list-item">
                                    <span>{item.name}</span>
                                    <span>{item.quantity} {item.unit || 'шт.'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-results-message">Материалы не найдены. Отметьте позиции в смете как "Материал", чтобы они появились здесь.</p>
                    )}
                </div>
                {materials.length > 0 && (
                    <div className="modal-footer">
                        <button onClick={handleCopy} className="btn btn-primary">{copyButtonText}</button>
                    </div>
                )}
            </div>
        </div>
    );
};
