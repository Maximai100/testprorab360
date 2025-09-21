
import React from 'react';
import './ListItem.css';
import { IconTrash } from '../common/Icon';


type ListItemProps = {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconWrapperClassName?: string;
  onIconClick?: () => void;
  iconAriaLabel?: string;
  iconChecked?: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  amountText?: string;
  amountColor?: string;
  onDelete?: () => void;
  onClick?: () => void;
  actions?: React.ReactNode;
  titleStrike?: boolean;
};

export const ListItem: React.FC<ListItemProps> = ({
  icon,
  iconBgColor,
  iconWrapperClassName,
  onIconClick,
  iconAriaLabel,
  iconChecked,
  title,
  subtitle,
  amountText,
  amountColor,
  onDelete,
  onClick,
  actions,
  titleStrike,
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
      {onIconClick ? (
        <button
          className={`list-item-icon-button ${iconChecked ? 'checked' : ''} ${iconWrapperClassName || ''}`}
          aria-label={iconAriaLabel || 'toggle'}
          onClick={(e) => { e.stopPropagation(); onIconClick(); }}
          style={{ backgroundColor: iconBgColor }}
        >
          {icon}
        </button>
      ) : (
        <div className={`list-item-icon-wrapper ${iconWrapperClassName || ''}`} style={{ backgroundColor: iconBgColor }}>
          {icon}
        </div>
      )}

      <div className="list-item-details">
        <span className={`list-item-title ${titleStrike ? 'strike' : ''}`}>{title}</span>
        {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
      </div>

      <div className="list-item-actions">
        {actions ? (
          // Предотвращаем всплытие кликов из пользовательских действий,
          // чтобы не срабатывал onClick всего элемента по ошибке
          <div onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
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
