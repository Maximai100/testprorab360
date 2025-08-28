import React, { useMemo, useState } from 'react';
import { ActGenerationModalProps } from '../../types';
import { IconClose } from '../common/Icon';
import { numberToWordsRu } from '../../utils';

export const ActGenerationModal: React.FC<ActGenerationModalProps> = ({ onClose, project, profile, totalAmount, showAlert }) => {
    const [copyButtonText, setCopyButtonText] = useState('Копировать');
    
    const actText = useMemo(() => {
        const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const totalInWords = numberToWordsRu(totalAmount);
        const formattedTotal = new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(totalAmount);

        return `АКТ ВЫПОЛНЕННЫХ РАБОТ

г. __________                                      "${today.split('.')[0]}" ${new Date().toLocaleString('ru-RU', { month: 'long' })} ${new Date().getFullYear()} г.

Исполнитель: ${profile.name || '____________________'}
${profile.details ? `Реквизиты: ${profile.details}` : ''}

Заказчик: ${project.client || '____________________'}
Объект: ${project.address || '____________________'}

1. Исполнитель выполнил, а Заказчик принял работы по объекту, расположенному по адресу: ${project.address}.
2. Качество работ соответствует требованиям. Заказчик претензий по объему, качеству и срокам выполнения работ не имеет.
3. Общая стоимость выполненных работ составляет ${formattedTotal} руб. (${totalInWords}).
4. Настоящий акт составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из сторон.

ПОДПИСИ СТОРОН:

Исполнитель: ________________ / ${profile.name || ''} /

Заказчик: ________________ / ${project.client || ''} /
`;
    }, [project, profile, totalAmount]);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(actText).then(() => {
            setCopyButtonText('Скопировано ✓');
            setTimeout(() => setCopyButtonText('Копировать'), 2000);
        }).catch(() => {
            showAlert('Не удалось скопировать.');
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal-header">
                    <h2>Акт выполненных работ</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <textarea 
                        className="act-textarea"
                        value={actText} 
                        readOnly 
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={handleCopy} className="btn btn-primary">{copyButtonText}</button>
                </div>
            </div>
        </div>
    );
};