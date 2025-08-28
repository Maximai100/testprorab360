import React, { useRef } from 'react';
import { CompanyProfile, SettingsModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onProfileChange, onLogoChange, onRemoveLogo, onSave, onBackup, onRestore, onInputFocus }) => {
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleRestoreClick = () => {
        restoreInputRef.current?.click();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Профиль компании</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label>Название компании</label>
                    <input type="text" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} onFocus={onInputFocus} placeholder="Ваше ИП или название" />
                    <label>Реквизиты / Контакты</label>
                    <textarea value={profile.details} onChange={(e) => onProfileChange('details', e.target.value)} onFocus={onInputFocus} placeholder="Телефон, адрес, email..." rows={3} />
                    <label>Логотип</label>
                    {profile.logo ? (
                        <div className="logo-preview-container">
                            <img src={profile.logo} alt="Предпросмотр логотипа" className="logo-preview" />
                            <button onClick={onRemoveLogo} className="btn btn-tertiary remove-logo-btn">Удалить</button>
                        </div>
                    ) : (
                        <input type="file" accept="image/png, image/jpeg" onChange={onLogoChange} />
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={onSave} className="btn btn-primary">Сохранить</button>
                    <button onClick={onBackup} className="btn btn-secondary">Резервное копирование</button>
                    <button onClick={handleRestoreClick} className="btn btn-secondary">Восстановить</button>
                    <input type="file" accept=".json" style={{ display: 'none' }} ref={restoreInputRef} onChange={onRestore} />
                </div>
            </div>
        </div>
    );
};