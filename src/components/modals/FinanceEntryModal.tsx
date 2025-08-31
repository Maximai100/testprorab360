import React, { useState, useRef, useEffect } from 'react';
import { FinanceEntryModalProps, FinanceCategory } from '../../types';
import { IconClose } from '../common/Icon';
import { resizeImage } from '../../utils';

export const FinanceEntryModal: React.FC<FinanceEntryModalProps> = ({ onClose, onSave, showAlert, onInputFocus }) => {
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<FinanceCategory>('other');
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [amountError, setAmountError] = useState<string | null>(null);
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

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resized = await resizeImage(file, 800);
                setReceiptImage(resized);
            } catch (error) {
                showAlert('Не удалось обработать изображение.');
            }
        }
    };

    const validateAmount = (value: string) => {
        if (!value || parseFloat(value) <= 0) {
            setAmountError('Введите корректную сумму.');
            return false;
        }
        setAmountError(null);
        return true;
    };

    const handleSave = () => {
        const isAmountValid = validateAmount(amount);

        if (!isAmountValid) {
            return;
        }
        onSave({
            type,
            amount: parseFloat(amount),
            description,
            date: new Date().toISOString(),
            category,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header"><h2>Добавить транзакцию</h2><button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Тип</label>
                    <select value={type} onChange={e => setType(e.target.value as 'income' | 'expense')}>
                        <option value="expense">Расход</option>
                        <option value="income">Доход</option>
                    </select>
                    <label>Категория</label>
                    <select value={category} onChange={e => setCategory(e.target.value as FinanceCategory)}>
                        <option value="materials">Материалы</option>
                        <option value="labor">Работа</option>
                        <option value="transport">Транспорт</option>
                        <option value="tools_rental">Аренда инструмента</option>
                        <option value="other">Другое</option>
                    </select>
                    <label>Сумма (РУБ)</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={e => { setAmount(e.target.value); setAmountError(null); }} 
                        onBlur={e => validateAmount(e.target.value)} 
                        placeholder="0" 
                        onFocus={onInputFocus} 
                        className={amountError ? 'input-error' : ''} 
                    />
                    {amountError && <p className="error-message">{amountError}</p>}
                    <label>Описание</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Например, 'Краска' или 'Аванс'" rows={3} onFocus={onInputFocus} />
                    {type === 'expense' && (
                        <>
                            <label>Фото чека (необязательно)</label>
                            {receiptImage ? (
                                <div className="image-preview-container">
                                    <img src={receiptImage} alt="Чек" className="image-preview" />
                                    <button onClick={() => setReceiptImage(null)} className="remove-image-btn"><IconClose/></button>
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={handleImageChange} />
                            )}
                        </>
                    )}
                </div>
                <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary">Сохранить</button></div>
            </div>
        </div>
    );
};