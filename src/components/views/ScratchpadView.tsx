import React, { useState } from 'react';
import { ScratchpadViewProps } from '../../types';
import { IconChevronRight } from '../common/Icon';

export const ScratchpadView: React.FC<ScratchpadViewProps> = ({ content, onSave, onBack }) => {
    const [text, setText] = useState(content);

    const handleSave = () => {
        onSave(text);
        onBack();
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
                    onChange={(e) => setText(e.target.value)} 
                    placeholder="Место для быстрых заметок..."
                    className="note-textarea"
                    style={{height: 'calc(100vh - 150px)'}}
                />
            </main>
        </>
    );
};