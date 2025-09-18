
import React from 'react';
import './ConsumableListItem.css';
import { Consumable, ConsumableLocation, Project } from '../../types';
import { IconTrash, IconCart } from '../common/Icon';

type ConsumableListItemProps = {
  consumable: Consumable;
  onQuantityChange: (consumable: Consumable, newQuantity: number) => void;
  onDelete: (consumableId: string) => void;
  onLocationChange: (consumable: Consumable, location: ConsumableLocation, projectId?: string | null) => void;
  projects: Project[];
};

const locationMap: Record<ConsumableLocation, string> = {
  on_base: 'На базе',
  on_project: 'На проекте',
  to_buy: 'Купить',
};

export const ConsumableListItem: React.FC<ConsumableListItemProps> = ({
  consumable,
  onQuantityChange,
  onDelete,
  onLocationChange,
  projects,
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

  const getCurrentValue = () => {
    if (consumable.location === 'on_project' && consumable.projectId) {
      return `project_${consumable.projectId}`;
    }
    return consumable.location || 'on_base';
  };

  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (value.startsWith('project_')) {
      const projectId = value.replace('project_', '');
      onLocationChange(consumable, 'on_project', projectId);
    } else {
      onLocationChange(consumable, value as ConsumableLocation, null);
    }
  };

  const options = [
    { value: 'on_base', label: 'На базе' },
    { value: 'to_buy', label: 'Купить' },
    ...projects.map(project => ({
      value: `project_${project.id}`,
      label: project.name
    }))
  ];

  return (
    <div className="c-list-item">
      <div className="c-list-item-icon-wrapper">
        <IconCart />
      </div>

      <div className="c-list-item-content">
        <div className="c-list-item-main">
          <span className="c-list-item-title">{consumable.name}</span>
          <div className="c-list-item-controls">
            <button className="c-quantity-button" onClick={handleDecrement}>-</button>
            <span className="c-quantity-text">{`${consumable.quantity} ${consumable.unit}`}</span>
            <button className="c-quantity-button" onClick={handleIncrement}>+</button>
          </div>
        </div>
        
        <div className="c-list-item-location">
          <select
            value={getCurrentValue()}
            onChange={handleLocationChange}
            className="c-location-select"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="c-list-item-actions">
        <button className="c-delete-button" onClick={handleDelete}>
          <IconTrash />
        </button>
      </div>
    </div>
  );
};
