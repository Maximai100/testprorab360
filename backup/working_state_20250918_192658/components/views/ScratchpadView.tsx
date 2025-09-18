import React, { useState, useEffect } from 'react';
import { ScratchpadViewProps } from '../../types';
import { IconChevronRight } from '../common/Icon';

export const ScratchpadView: React.FC<ScratchpadViewProps> = ({ content, onSave, onBack }) => {
    const [text, setText] = useState(content);

    // Синхронизируем локальное состояние с пропсом при изменении
    useEffect(() => {
        setText(content);
    }, [content]);

    const handleSave = () => {
        onSave(text);
        onBack();
    };

    // Автоматическое сохранение при изменении текста
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);
        onSave(newText); // Автоматически сохраняем изменения
    };

    return (
        <>
            <header className="project-detail-header">
                <button onClick={handleSave} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
                <h1>Блокнот</h1>
            </header>
            <main>
                <textarea 
                    value={text} 
                    onChange={handleTextChange} 
                    placeholder="Место для быстрых заметок..."
                    className="note-textarea"
                    style={{height: 'calc(100vh - 150px)'}}
                />
            </main>
        </>
    );
};