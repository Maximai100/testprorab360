import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AISuggestModalProps, Item } from '../../types';
import { IconClose } from '../common/Icon';
import { Loader } from '../common/Loader';

export const AISuggestModal: React.FC<AISuggestModalProps> = ({ onClose, onAddItems, showAlert }) => {
    const [prompt, setPrompt] = useState('');
    const [suggestions, setSuggestions] = useState<Omit<Item, 'id' | 'image' | 'type'>[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
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
    
    const ai = useMemo(() => {
        if (API_KEY) {
            return new GoogleGenAI(API_KEY);
        }
        return null;
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showAlert('Введите описание работ.');
            return;
        }
        if (!ai) {
             showAlert('API-ключ для Gemini не настроен. Эта функция недоступна.');
             return;
        }

        setIsGenerating(true);
        setError(null);
        setSuggestions([]);
        setSelectedIndices(new Set());

        try {
            const model = (ai as any).getGenerativeModel({ model: "gemini-2.0-flash" });
            const fullPrompt = `Ты - опытный прораб, составляющий смету на ремонтные работы в России. Проанализируй запрос клиента и верни список работ и материалов в формате JSON. Укажи реалистичные для РФ единицы измерения (м2, шт, м.п.) и примерные средние цены в рублях. Не добавляй никаких пояснений, только JSON. Запрос: "${prompt}"`;
            
            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean the response to get only the JSON part
            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']');
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("Ответ AI не содержит корректного JSON.");
            }
            const jsonText = text.substring(jsonStart, jsonEnd + 1);

            const parsedSuggestions = JSON.parse(jsonText);
            setSuggestions(parsedSuggestions);
            setSelectedIndices(new Set(parsedSuggestions.map((_: any, index: number) => index)));
        } catch (e) {
            console.error(e);
            setError('Не удалось получить ответ от AI. Попробуйте изменить запрос или повторите попытку позже.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleToggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };
    
    const handleAddSelected = () => {
        const itemsToAdd = suggestions.filter((_, index) => selectedIndices.has(index));
        onAddItems(itemsToAdd);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>AI-помощник</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label>Опишите работы в свободной форме</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Например: Поклеить обои в комнате 15 м2, положить ламинат и установить 2 розетки"
                        rows={4}
                        disabled={isGenerating}
                    />
                    <button onClick={handleGenerate} className="btn btn-primary" disabled={isGenerating}>
                        {isGenerating ? 'Генерация...' : 'Сгенерировать'}
                    </button>
                    {isGenerating && <div className="ai-modal-status"><Loader/></div>}
                    {error && <p className="ai-modal-status error-message">{error}</p>}
                    {suggestions.length > 0 && (
                        <div className="ai-suggestions-list">
                            <h4>Предложенные позиции:</h4>
                            {suggestions.map((item, index) => (
                                <div key={index} className="ai-suggestion-item">
                                    <input 
                                        type="checkbox" 
                                        id={`suggestion-${index}`}
                                        checked={selectedIndices.has(index)}
                                        onChange={() => handleToggleSelection(index)}
                                    />
                                    <label htmlFor={`suggestion-${index}`} className="suggestion-details">
                                        <strong>{item.name}</strong>
                                        <span>{item.quantity} {item.unit} × {item.price} ₽</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {suggestions.length > 0 && (
                    <div className="modal-footer">
                         <button onClick={handleAddSelected} className="btn btn-primary">
                            Добавить выбранное ({selectedIndices.size})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};