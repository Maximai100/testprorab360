import React, { useState } from 'react';
import { FinanceEntryModalProps } from '../../types';
import { IconClose } from '../common/Icon';
import { resizeImage } from '../../utils';

export const FinanceEntryModal: React.FC<FinanceEntryModalProps> = ({ onClose, onSave, showAlert, onInputFocus }) => {
    const [type, setType] = useState<'expense' | 'payment'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [receiptImage, setReceiptImage] = useState<string | null>(null);

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

    const handleSave = () => {
        if (!amount || parseFloat(amount) <= 0) {
            showAlert('Введите корректную сумму.');
            return;
        }
        onSave({
            type,
            amount: parseFloat(amount),
            description,
            date: new Date().toISOString(),
            receiptImage,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Добавить транзакцию</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Тип</label>
                    <select value={type} onChange={e => setType(e.target.value as any)}>
                        <option value="expense">Расход</option>
                        <option value="payment">Оплата от клиента</option>
                    </select>
                    <label>Сумма (РУБ)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" onFocus={onInputFocus} />
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