
import React from 'react';
import './ConsumableListItem.css';
import { Consumable } from '../../types'; // Убедись, что путь к типам правильный
import { Icon } from '../common/Icon';

type ConsumableListItemProps = {
  consumable: Consumable;
  onQuantityChange: (consumable: Consumable, newQuantity: number) => void;
  onDelete: (consumableId: string) => void;
};

export const ConsumableListItem: React.FC<ConsumableListItemProps> = ({
  consumable,
  onQuantityChange,
  onDelete,
}) => {
  const handleDecrement = () => {
    if (consumable.quantity > 0) {
      onQuantityChange(consumable, consumable.quantity - 1);
    }
  };

  const handleIncrement = () => {
    onQuantityChange(consumable, consumable.quantity + 1);
  };

  const handleDelete = () => {
    onDelete(consumable.id);
  };

  return (
    <div className="c-list-item">
      <div className="c-list-item-icon-wrapper">
        <Icon name="inventory_2" />
      </div>

      <div className="c-list-item-details">
        <span className="c-list-item-title">{consumable.name}</span>
      </div>

      <div className="c-list-item-controls">
        <button className="c-quantity-button" onClick={handleDecrement}>-</button>
        <span className="c-quantity-text">{`${consumable.quantity} ${consumable.unit}`}</span>
        <button className="c-quantity-button" onClick={handleIncrement}>+</button>
        <button className="c-delete-button" onClick={handleDelete}>
          <Icon name="delete" />
        </button>
      </div>
    </div>
  );
};
