
import React from 'react';
import './ListItem.css';


type ListItemProps = {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  amountText?: string;
  amountColor?: string;
  onDelete?: () => void;
  onClick?: () => void;
  actions?: React.ReactNode;
};

export const ListItem: React.FC<ListItemProps> = ({
  ({ icon,
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
                <Icon name="delete" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
