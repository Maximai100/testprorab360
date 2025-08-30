import React from 'react';
import { WorkspaceViewProps } from '../../types';
import { IconDocument, IconDownload, IconExternalLink, IconTrash } from '../common/Icon';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    scratchpad,
    globalDocuments,
    onScratchpadChange,
    onOpenGlobalDocumentModal,
    onDeleteGlobalDocument,
    onOpenScratchpad,
}) => {

    return (
        <>
            <header className="workspace-header">
                <h1>Рабочий стол</h1>
            </header>
            <main className="workspace-container">
                {/* Scratchpad */}
                <div className="card scratchpad-card">
                    <div className="card-header">
                        <h2>Блокнот</h2>
                        <button onClick={onOpenScratchpad} className="expand-btn" aria-label="Развернуть блокнот">
                            <IconExternalLink />
                        </button>
                    </div>
                    <textarea 
                        value={scratchpad} 
                        onChange={(e) => onScratchpadChange(e.target.value)} 
                        placeholder="Место для быстрых заметок..."
                        rows={6}
                    />
                </div>

                {/* My Documents */}
                <div className="card">
                    <div className="card-header">
                        <h2>Мои документы</h2>
                        <button onClick={onOpenGlobalDocumentModal} className="btn btn-secondary add-document-btn">+ Добавить</button>
                    </div>
                    <ul className="document-list">
                        {globalDocuments.map(doc => (
                            <li key={doc.id} className="document-list-item">
                                <IconDocument />
                                <div className="doc-info">
                                    <span>{doc.name}</span>
                                    <small>{new Date(doc.date).toLocaleDateString('ru-RU')}</small>
                                </div>
                                <div className="doc-actions">
                                    <a href={doc.dataUrl} download={doc.name} className="btn-icon" aria-label="Скачать" rel="noopener noreferrer"><IconDownload /></a>
                                    <button onClick={() => onDeleteGlobalDocument(doc.id)} className="btn-icon" aria-label="Удалить"><IconTrash /></button>
                                </div>
                            </li>
                        ))}
                        {globalDocuments.length === 0 && (
                            <div className="empty-list-message-with-button">
                                <p className="empty-list-message">У вас пока нет документов. Загрузите важные файлы, чтобы они всегда были под рукой!</p>
                                <button onClick={onOpenGlobalDocumentModal} className="btn btn-primary">+ Загрузить документ</button>
                            </div>
                        )}
                    </ul>
                </div>
            </main>
        </>
    );
};