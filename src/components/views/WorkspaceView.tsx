import React, { useMemo } from 'react';
import { WorkspaceViewProps } from '../../types';
import { IconDocument, IconDownload, IconExternalLink, IconTrash } from '../common/Icon';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    scratchpad,
    globalDocuments,
    onScratchpadChange,
    onOpenGlobalDocumentModal,
    onDeleteGlobalDocument,
    onOpenScratchpad,
    notesHook,
}) => {
    // Мемоизируем значение заметки для оптимизации
    const globalNote = useMemo(() => notesHook.getNote('global'), [notesHook]);

    return (
        <>
            <header className="workspace-header">
                <h1>Рабочий стол</h1>
            </header>
            <main className="workspace-container">
                {/* Scratchpad - увеличенный размер */}
                <div className="card scratchpad-card" style={{ flex: 1, marginBottom: 'var(--spacing-m)' }}>
                    <div className="card-header">
                        <h2>Блокнот</h2>
                        <button onClick={onOpenScratchpad} className="expand-btn" aria-label="Развернуть блокнот">
                            <IconExternalLink />
                        </button>
                    </div>
                    <textarea 
                        value={globalNote} 
                        onChange={(e) => notesHook.saveNote('global', e.target.value)} 
                        placeholder="Место для быстрых заметок..."
                        style={{ height: '100%', minHeight: '300px' }}
                    />
                </div>

                {/* Мои файлы - внизу экрана */}
                <div className="card" style={{ marginBottom: 'var(--spacing-l)' }}>
                    <div className="card-header">
                        <h2>Мои файлы</h2>
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
                                <p className="empty-list-message">У вас пока нет файлов. Загрузите важные документы, чтобы они всегда были под рукой!</p>
                                <button onClick={onOpenGlobalDocumentModal} className="btn btn-primary">+ Загрузить файл</button>
                            </div>
                        )}
                    </ul>
                </div>
            </main>
        </>
    );
};