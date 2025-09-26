import React, { useState, useEffect } from 'react';
import { Consumable } from '../../types';
import { IconClose } from '../common/Icon';

interface EditConsumableModalProps {
    consumable: Consumable;
    onClose: () => void;
    onSave: (consumable: Consumable) => void;
    onDelete: (id: string) => void;
}

export const EditConsumableModal: React.FC<EditConsumableModalProps> = ({ consumable, onClose, onSave, onDelete }) => {
    const [name, setName] = useState(consumable.name);
    const [quantity, setQuantity] = useState(consumable.quantity);

    useEffect(() => {
        setName(consumable.name);
        setQuantity(consumable.quantity);
    }, [consumable]);

    const handleSave = () => {
        onSave({ ...consumable, name, quantity });
        onClose();
    };

    const handleDelete = () => {
        if (window.confirm('Вы уверены, что хотите удалить этот расходник?')) {
            onDelete(consumable.id);
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Редактировать расходник</h2>
                    <button onClick={onClose} className="modal-close-btn"><IconClose /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Наименование</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label>Количество</label>
                        <input
                            type="text"
                            value={quantity}
                            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                            className="form-control"
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                    <button onClick={handleDelete} className="btn btn-danger">Удалить</button>
                    <button onClick={onClose} className="btn btn-secondary">Отмена</button>
                </div>
            </div>
        </div>
    );
};
