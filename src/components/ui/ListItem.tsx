
import React from 'react';
import './ListItem.css';
import { Icon } from '../common/Icon'; // Убедись, что путь к Icon правильный

type ListItemProps = {
  iconName: string;
  iconBgColor?: string;
  title: React.ReactNode;
  subtitle?: string;
  amountText: string;
  amountColor?: string;
  onDelete?: () => void;
  onClick?: () => void;
};

export const ListItem: React.FC<ListItemProps> = ({
  iconName,
  iconBgColor,
  title,
  subtitle,
  amountText,
  amountColor,
  onDelete,
  onClick,
}) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал onClick на всем элементе
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className="list-item" onClick={onClick}>
      <div className="list-item-icon-wrapper" style={{ backgroundColor: iconBgColor }}>
        <Icon name={iconName} />
      </div>

      <div className="list-item-details">
        <span className="list-item-title">{title}</span>
        {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
      </div>

      <div className="list-item-actions">
        <span className="list-item-amount" style={{ color: amountColor }}>
          {amountText}
        </span>
        {onDelete && (
          <button className="list-item-delete-button" onClick={handleDeleteClick}>
            <Icon name="delete" />
          </button>
        )}
      </div>
    </div>
  );
};
