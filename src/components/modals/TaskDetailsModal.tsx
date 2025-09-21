import React, { useEffect, useRef, useState } from 'react';
import { Task } from '../../types';
import { IconClose } from '../common/Icon';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updated: Task) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose, onSave }) => {
  const [editableTask, setEditableTask] = useState<Task>(task);
  const [newTag, setNewTag] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setEditableTask(task); }, [task]);

  useEffect(() => {
    if (modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>('input, textarea, select, button');
      focusable[0]?.focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableTask(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (newTag && !editableTask.tags?.includes(newTag)) {
      setEditableTask(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditableTask(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) || [] }));
  };

  const handleSubmit = () => onSave(editableTask);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
        <div className="modal-header">
          <h2>Детали задачи</h2>
          <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor="title">Название задачи</label>
          <input id="title" name="title" type="text" value={editableTask.title || ''} onChange={handleChange} placeholder="Название задачи..." />

          <label htmlFor="description">Описание</label>
          <textarea id="description" name="description" rows={5} value={editableTask.description || ''} onChange={handleChange} placeholder="Подробное описание..." />

          <label htmlFor="dueDate">Срок выполнения</label>
          <input id="dueDate" name="dueDate" type="date" value={editableTask.dueDate ? new Date(editableTask.dueDate).toISOString().split('T')[0] : ''} onChange={handleChange} />

          <label htmlFor="priority">Приоритет</label>
          <select id="priority" name="priority" value={editableTask.priority || 'medium'} onChange={handleChange}>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>

          <label>Теги</label>
          <div className="tags-container" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {editableTask.tags?.map(tag => (
              <div key={tag} className="tag-item" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', background: 'var(--color-surface-2)', padding: '4px 8px', borderRadius: 999 }}>
                <span>{tag}</span>
                <button onClick={() => handleRemoveTag(tag)} className="btn btn-tertiary" aria-label={`Удалить тег ${tag}`}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Новый тег..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
            <button className="btn btn-secondary" onClick={handleAddTag}>Добавить</button>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSubmit} className="btn btn-primary">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;

