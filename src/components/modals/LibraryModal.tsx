import React, { useMemo, useState, useRef, useEffect } from 'react';
import { LibraryItem, LibraryModalProps } from '../../types';
import { IconClose } from '../common/Icon';

export const LibraryModal: React.FC<LibraryModalProps> = ({ onClose, libraryItems, onAddLibraryItem, onUpdateLibraryItem, onDeleteLibraryItem, onAddItemToEstimate, formatCurrency, onInputFocus, showConfirm, showAlert }) => {
    const [formItem, setFormItem] = useState<Partial<LibraryItem>>({ name: '', price: 0, unit: '', category: undefined });
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [librarySearch, setLibrarySearch] = useState('');
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

    const categories = useMemo(() => ['all', ...Array.from(new Set(libraryItems.map(i => i.category).filter(Boolean)))], [libraryItems]);
    
    const groupedItems = useMemo(() => {
        const filtered = libraryItems.filter(item => {
            const searchMatch = !librarySearch.trim() || item.name.toLowerCase().includes(librarySearch.toLowerCase());
            const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
            return searchMatch && categoryMatch;
        });
        return filtered.reduce((acc, item) => {
            const category = item.category || 'Без категории';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {} as Record<string, LibraryItem[]>);
    }, [libraryItems, librarySearch, filterCategory]);

    const handleFormChange = (field: keyof Omit<LibraryItem, 'id'>, value: string | number) => setFormItem(p => ({ ...p, [field]: value }));
    const handleStartEdit = (item: LibraryItem) => setFormItem(item);
    const handleCancelEdit = () => setFormItem({ name: '', price: 0, unit: '', category: undefined });

    const handleSaveOrUpdate = () => {
        if (!formItem.name?.trim()) {
            showAlert("Введите наименование.");
            return;
        }
        if (formItem.id) {
            onUpdateLibraryItem(String(formItem.id), {
                name: formItem.name!,
                price: formItem.price ?? 0,
                unit: formItem.unit ?? '',
                category: (formItem.category as any) ?? '',
            });
        } else {
            onAddLibraryItem({
                name: formItem.name!,
                price: formItem.price ?? 0,
                unit: formItem.unit ?? '',
                category: (formItem.category as any) ?? '',
            } as any);
        }
        handleCancelEdit();
    };

    const handleDeleteLibraryItem = (id: string) => {
        showConfirm('Вы уверены, что хотите удалить эту позицию из справочника?', (ok) => {
            if(ok) {
                onDeleteLibraryItem(id);
            }
        });
    };

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setLibrarySearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header"><h2>Справочник</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body library-modal-body">
                    <div className="library-add-form-wrapper"><h3>{formItem.id ? 'Редактировать' : 'Добавить'}</h3><div className="library-add-form"><input type="text" placeholder="Наименование" value={formItem.name || ''} onChange={e => handleFormChange('name', e.target.value)} onFocus={onInputFocus} /><input type="number" placeholder="Цена" value={formItem.price || ''} onChange={e => handleFormChange('price', parseFloat(e.target.value) || 0)} onFocus={onInputFocus} /><input type="text" placeholder="Ед.изм." value={formItem.unit || ''} onChange={e => handleFormChange('unit', e.target.value)} onFocus={onInputFocus} /><input type="text" placeholder="Категория (необязательно)" value={formItem.category || ''} onChange={e => handleFormChange('category', e.target.value)} onFocus={onInputFocus} /></div><div className="library-form-actions"><button onClick={handleSaveOrUpdate} className="btn btn-primary">{formItem.id ? 'Сохранить' : 'Добавить'}</button>{formItem.id && <button onClick={handleCancelEdit} className="btn btn-secondary">Отмена</button>}</div></div><hr/><div className="library-list-wrapper"><h3>Список позиций</h3><div className="library-filters"><input type="search" placeholder="Поиск..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} onFocus={onInputFocus} className="modal-search-input" /><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} onFocus={onInputFocus}><option value="all">Все категории</option>{categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="library-list">{Object.keys(groupedItems).length === 0 ? <p className="no-results-message">Ничего не найдено.</p> : Object.entries(groupedItems).map(([category, items]) => (<div key={category} className="category-group"><h4>{category}</h4>{items.map(libItem => (<div key={libItem.id} className={`list-item ${formItem.id === libItem.id ? 'editing' : ''}`}><div className="list-item-info"><strong>{libItem.name}</strong><span>{formatCurrency(libItem.price)} / {libItem.unit || 'шт.'}</span></div><div className="list-item-actions"><button onClick={() => onAddItemToEstimate(libItem)} className="btn btn-primary">+</button><button onClick={() => handleStartEdit(libItem)} className="btn btn-secondary">Ред.</button><button onClick={() => handleDeleteLibraryItem(String(libItem.id))} className="btn btn-tertiary">Удал.</button></div></div>))}</div>)) }</div></div>
                </div>
            </div>
        </div>
    );
};
