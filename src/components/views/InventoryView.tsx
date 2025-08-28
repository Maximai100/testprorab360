import React, { useState } from 'react';
import { InventoryViewProps, InventoryItem, Project } from '../../types';
import { IconPlus, IconTrash } from '../common/Icon';

export const InventoryView: React.FC<InventoryViewProps> = ({
    inventoryItems,
    inventoryNotes,
    projects,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onAddNote,
    onDeleteNote,
    onOpenAddToolModal,
}) => {
    const [newNote, setNewNote] = useState('');

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        onAddNote({ text: newNote });
        setNewNote('');
    };

    return (
        <>
            <header className="projects-list-header">
                <h1>Инвентарь</h1>
                <div className="header-actions">
                    <button onClick={onOpenAddToolModal} className="header-btn" aria-label="Новый инструмент"><IconPlus /></button>
                </div>
            </header>
            <main>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Список инструментов ({inventoryItems.length})</h3>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {inventoryItems.length > 0 ? inventoryItems.map(item => (
                                <div key={item.id} className="list-item">
                                    <div className="list-item-info">
                                        <strong>{item.name}</strong>
                                    </div>
                                    <div className="list-item-actions">
                                        <select value={item.location} onChange={(e) => onUpdateItem({ ...item, location: e.target.value })}>
                                            <option value="На базе">На базе</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => onDeleteItem(item.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash /></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-list-message-with-button">
                                    <p className="no-results-message">Инструментов пока нет. Добавьте свой первый инструмент, чтобы начать отслеживать его местоположение.</p>
                                    <button onClick={onOpenAddToolModal} className="btn btn-primary">+ Добавить инструмент</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Заметки по инвентарю</h3>
                    </div>
                    <div className="project-section-body">
                        <div className="note-list">
                            {inventoryNotes.length > 0 ? inventoryNotes.map(note => (
                                <div key={note.id} className="list-item note-item">
                                    <div className="list-item-info">
                                        <p className="note-content">{note.text}</p>
                                        <span className="note-date">{new Date(note.date).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                    <div className="list-item-actions">
                                        <button onClick={() => onDeleteNote(note.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash /></button>
                                    </div>
                                </div>
                            )) : (
                                <p className="no-results-message">Заметок по инвентарю пока нет. Добавьте заметку, чтобы не забыть важную информацию.</p>
                            )}
                        </div>
                        <div className="add-note-form">
                            <textarea 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Новая заметка..."
                                rows={3}
                            />
                            <button onClick={handleAddNote} className="btn btn-primary">Добавить заметку</button>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};