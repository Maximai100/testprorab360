
import React from 'react';
import './ListItem.css';
import { IconTrash } from '../common/Icon';


type ListItemProps = {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconWrapperClassName?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  amountText?: string;
  amountColor?: string;
  onDelete?: () => void;
  onClick?: () => void;
  actions?: React.ReactNode;
};

export const ListItem: React.FC<ListItemProps> = ({
  icon,
  iconBgColor,
  iconWrapperClassName,
  title,
  subtitle,
  amountText,
  amountColor,
  onDelete,
  onClick,
  actions,
}) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал onClick на всем элементе
    console.log('ListItem: handleDeleteClick вызван');
    console.log('ListItem: onDelete существует?', !!onDelete);
    if (onDelete) {
      console.log('ListItem: вызываю onDelete');
      onDelete();
    } else {
      console.log('ListItem: onDelete не определен');
    }
  };

  return (
    <div className="list-item" onClick={onClick}>
      <div className={`list-item-icon-wrapper ${iconWrapperClassName || ''}`} style={{ backgroundColor: iconBgColor }}>
        {icon}
      </div>

      <div className="list-item-details">
        <span className="list-item-title">{title}</span>
        {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
      </div>

      <div className="list-item-actions">
        {actions ? (
          actions
        ) : (
          <>
            {amountText && (
              <span className="list-item-amount" style={{ color: amountColor }}>
                {amountText}
              </span>
            )}
            {onDelete && (
              <button className="list-item-delete-button" onClick={handleDeleteClick}>
                <IconTrash />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
