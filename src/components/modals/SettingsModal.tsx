import React, { useRef, useEffect } from 'react';
import { CompanyProfile, SettingsModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onProfileChange, onLogoChange, onRemoveLogo, onSave, onInputFocus }) => {
    const modalRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
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
                </div>
            </div>
        </div>
    );
};