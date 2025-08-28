import React from 'react';
import { IconClose } from '../common/Icon';

interface ScratchpadModalProps {
    content: string;
    onClose: () => void;
    onSave: (content: string) => void;
}

export const ScratchpadModal: React.FC<ScratchpadModalProps> = ({ content, onClose, onSave }) => {
    const [text, setText] = React.useState(content);

    const handleSave = () => {
        onSave(text);
        onClose();
    };

    return (
        <div className="modal-overlay scratchpad-modal" onClick={handleSave}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Блокнот</h2>
                    <button onClick={handleSave} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        placeholder="Место для быстрых заметок..."
                        className="note-textarea"
                        rows={15}
                    />
                </div>
            </div>
        </div>
    );
};
