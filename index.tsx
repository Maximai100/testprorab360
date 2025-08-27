import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ROBOTO_FONT_BASE64 } from './font';

// Fix: Add TypeScript definitions for the Telegram Web App API to resolve errors on `window.Telegram`.
interface TelegramWebApp {
    version: string;
    ready: () => void;
    expand: () => void;
    sendData: (data: string) => void;
    HapticFeedback: {
        notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
    };
    colorScheme: 'light' | 'dark';
    onEvent: (eventType: 'themeChanged', eventHandler: () => void) => void;
    offEvent: (eventType: 'themeChanged', eventHandler: () => void) => void;
    isClosingConfirmationEnabled: boolean;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
    disableVerticalSwipes: () => void;
    showAlert: (message: string, callback?: () => void) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
        jspdf: any; // For jsPDF library
    }
}

// --- Development Mock for Telegram API ---
// This allows the app to run in a regular browser for development without errors.
if (!window.Telegram || !window.Telegram.WebApp) {
    console.log("Telegram WebApp API not found. Using development mock.");
    window.Telegram = {
        WebApp: {
            version: '7.0',
            ready: () => console.log("Mock App.ready()"),
            expand: () => console.log("Mock App.expand()"),
            sendData: (data: string) => {
                console.log("--- Mock App.sendData() ---");
                console.log("Data to be sent to Telegram chat:");
                console.log(data);
                alert("Данные для отправки выведены в консоль (F12).");
            },
            HapticFeedback: {
                notificationOccurred: (type) => console.log(`Mock HapticFeedback: ${type}`),
            },
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            onEvent: (eventType, eventHandler) => {
                if (eventType === 'themeChanged') {
                     window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', eventHandler);
                }
            },
            offEvent: (eventType, eventHandler) => {
                 if (eventType === 'themeChanged') {
                     window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', eventHandler);
                }
            },
            isClosingConfirmationEnabled: false,
            enableClosingConfirmation: () => console.log("Mock Closing Confirmation Enabled"),
            disableClosingConfirmation: () => console.log("Mock Closing Confirmation Disabled"),
            disableVerticalSwipes: () => console.log("Mock Vertical Swipes Disabled"),
            showAlert: (message, callback) => { alert(message); callback?.(); },
            showConfirm: (message, callback) => { callback(window.confirm(message)); },
        },
    };
}
// --- End of Mock ---

const tg = window.Telegram?.WebApp;

/**
 * Safely shows an alert. Falls back to browser's alert if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Optional callback to be executed after the alert is closed.
 */
const safeShowAlert = (message: string, callback?: () => void) => {
    // Telegram WebApp version 6.1+ is required for showAlert.
    if (tg && tg.version >= '6.1' && typeof tg.showAlert === 'function') {
        tg.showAlert(message, callback);
    } else {
        alert(message);
        if (callback) {
            callback();
        }
    }
};

/**
 * Safely shows a confirmation dialog. Falls back to browser's confirm if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Callback to be executed with the result (true for OK, false for Cancel).
 */
const safeShowConfirm = (message: string, callback: (ok: boolean) => void) => {
    // Telegram WebApp version 6.1+ is required for showConfirm.
    if (tg && tg.version >= '6.1' && typeof tg.showConfirm === 'function') {
        tg.showConfirm(message, callback);
    } else {
        callback(window.confirm(message));
    }
};


// --- DATA INTERFACES ---
interface Item {
    id: number;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image?: string | null;
    type: 'work' | 'material'; // Added for shopping list
}

interface LibraryItem {
    id: number;
    name: string;
    price: number;
    unit: string;
    category: string;
}

interface CompanyProfile {
    name: string;
    details: string;
    logo: string | null;
}

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'completed' | 'cancelled';
type ThemeMode = 'auto' | 'light' | 'dark';

interface Estimate {
    id: number;
    number: string;
    date: string;
    status: EstimateStatus;
    clientInfo: string;
    items: Item[];
    discount: number;
    discountType: 'percent' | 'fixed';
    tax: number;
    lastModified: number;
    projectId: number | null;
}

interface Project {
    id: number;
    name: string;
    client: string;
    address: string;
    status: 'in_progress' | 'completed';
}

interface FinanceEntry {
    id: number;
    projectId: number;
    type: 'expense' | 'payment';
    amount: number;
    description: string;
    date: string;
    receiptImage?: string | null;
}

interface PhotoReport {
    id: number;
    projectId: number;
    image: string;
    caption: string;
    date: string;
}

interface Document {
    id: number;
    projectId: number;
    name: string;
    dataUrl: string; // File content stored as a Base64 data URL
    date: string;
}

const statusMap: Record<EstimateStatus, { text: string; color: string; }> = {
    draft: { text: 'Черновик', color: '#808080' },
    sent: { text: 'Отправлена', color: '#007BFF' },
    approved: { text: 'Одобрена', color: '#28A745' },
    completed: { text: 'Завершена', color: '#17A2B8' },
    cancelled: { text: 'Отменена', color: '#DC3545' },
};

// Pure utility function to generate a new estimate number
const generateNewEstimateNumber = (allEstimates: Estimate[]): string => {
    const currentYear = new Date().getFullYear();
    const yearEstimates = allEstimates.filter(e => e.number?.startsWith(String(currentYear)));
    const maxNum = yearEstimates.reduce((max, e) => {
        const numPart = parseInt(e.number.split('-')[1] || '0', 10);
        return Math.max(max, numPart);
    }, 0);
    const newNum = (maxNum + 1).toString().padStart(3, '0');
    return `${currentYear}-${newNum}`;
};

const resizeImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Could not get canvas context"));
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for better compression
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- START OF MODAL COMPONENTS ---
interface SettingsModalProps {
    profile: CompanyProfile;
    onClose: () => void;
    onProfileChange: (field: keyof CompanyProfile, value: string) => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLogo: () => void;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}
const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onProfileChange, onLogoChange, onRemoveLogo, onSave, onInputFocus }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Профиль компании</h2>
                <button onClick={onClose} className="close-btn" aria-label="Закрыть">×</button>
            </div>
            <div className="modal-body">
                <label>Название компании</label>
                <input type="text" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} onFocus={onInputFocus} placeholder="Ваше ИП или название" />
                <label>Реквизиты / Контакты</label>
                <textarea value={profile.details} onChange={(e) => onProfileChange('details', e.target.value)} onFocus={onInputFocus} placeholder="Телефон, адрес, email..." rows={3} />
                <label>Логотип</label>
                {profile.logo ? (
                    <div className="logo-preview-container">
                        <img src={profile.logo} alt="Предпросмотр логотипа" className="logo-preview" />
                        <button onClick={onRemoveLogo} className="btn btn-tertiary remove-logo-btn">Удалить</button>
                    </div>
                ) : (
                    <input type="file" accept="image/png, image/jpeg" onChange={onLogoChange} />
                )}
            </div>
            <div className="modal-footer">
                <button onClick={onSave} className="btn btn-primary">Сохранить</button>
            </div>
        </div>
    </div>
);

interface EstimatesListModalProps {
    onClose: () => void;
    estimates: Estimate[];
    templates: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>[];
    activeEstimateId: number | null;
    statusMap: typeof statusMap;
    formatCurrency: (value: number) => string;
    onLoadEstimate: (id: number) => void;
    onDeleteEstimate: (id: number) => void;
    onStatusChange: (id: number, newStatus: EstimateStatus) => void;
    onSaveAsTemplate: (id: number) => void;
    onDeleteTemplate: (timestamp: number) => void;
    onNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}
const EstimatesListModal: React.FC<EstimatesListModalProps> = ({ onClose, estimates, templates, activeEstimateId, statusMap, formatCurrency, onLoadEstimate, onDeleteEstimate, onStatusChange, onSaveAsTemplate, onDeleteTemplate, onNewEstimate, onInputFocus }) => {
    const [activeTab, setActiveTab] = useState<'estimates' | 'templates'>('estimates');
    const [estimatesSearch, setEstimatesSearch] = useState('');

    const filteredEstimates = useMemo(() => estimates.filter(e => e.number.toLowerCase().includes(estimatesSearch.toLowerCase()) || e.clientInfo?.toLowerCase().includes(estimatesSearch.toLowerCase())), [estimates, estimatesSearch]);
    const filteredTemplates = useMemo(() => templates.map((t, i) => ({ ...t, index: i })).filter(t => t.items.some(item => item.name.toLowerCase().includes(estimatesSearch.toLowerCase()))), [templates, estimatesSearch]);

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setEstimatesSearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Мои документы</h2>
                    <button onClick={() => { onClose(); setEstimatesSearch(''); }} className="close-btn" aria-label="Закрыть">×</button>
                </div>
                <div className="modal-tabs">
                    <button className={activeTab === 'estimates' ? 'active' : ''} onClick={() => setActiveTab('estimates')}>Сметы ({estimates.length})</button>
                    <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>Шаблоны ({templates.length})</button>
                </div>
                <div className="modal-body estimates-modal-list">
                    <input type="search" placeholder="Поиск..." value={estimatesSearch} onChange={e => setEstimatesSearch(e.target.value)} onFocus={onInputFocus} className="modal-search-input" />
                    {activeTab === 'estimates' && ( <>
                        {filteredEstimates.length === 0 ? <p className="no-results-message">{estimates.length > 0 ? 'Ничего не найдено.' : 'Сохраненных смет нет.'}</p> :
                            filteredEstimates.map(e => ( <div key={e.id} className={`list-item ${e.id === activeEstimateId ? 'active' : ''}`}>
                                <div className="list-item-info"><strong>{e.number} - {e.clientInfo || `Без названия`}</strong><div><span className="estimate-date">{new Date(e.date).toLocaleDateString('ru-RU')}</span><span className="status-badge" style={{ backgroundColor: statusMap[e.status].color }}>{statusMap[e.status].text}</span></div></div>
                                <div className="list-item-actions"><select value={e.status} onChange={(ev) => onStatusChange(e.id, ev.target.value as EstimateStatus)} onClick={ev => ev.stopPropagation()} className="status-select">{Object.entries(statusMap).map(([k, v]) => (<option key={k} value={k}>{v.text}</option>))}</select><button onClick={() => onSaveAsTemplate(e.id)} className="btn btn-secondary" title="Сохранить как шаблон">📋</button><button onClick={() => onLoadEstimate(e.id)} className="btn btn-secondary">Загрузить</button><button onClick={() => onDeleteEstimate(e.id)} className="btn btn-tertiary">Удалить</button></div>
                            </div>))
                        }
                    </>)}
                    {activeTab === 'templates' && ( <>
                         {filteredTemplates.length === 0 ? <p className="no-results-message">{templates.length > 0 ? 'Ничего не найдено.' : 'Шаблонов нет.'}</p> :
                            filteredTemplates.map(t => ( <div key={t.lastModified} className="list-item">
                                <div className="list-item-info"><strong>Шаблон от {new Date(t.lastModified).toLocaleDateString('ru-RU')}</strong><span>{t.items.length} поз., Итого: {formatCurrency(t.items.reduce((acc, i) => acc + i.price * i.quantity, 0))}</span></div>
                                <div className="list-item-actions"><button onClick={() => { onNewEstimate(t); onClose(); }} className="btn btn-primary">Использовать</button><button onClick={() => onDeleteTemplate(t.lastModified)} className="btn btn-tertiary">Удалить</button></div>
                            </div>))
                        }
                    </>)}
                </div>
                <div className="modal-footer"><button onClick={() => { onNewEstimate(); onClose(); }} className="btn btn-primary">Создать новую смету</button></div>
            </div>
        </div>
    );
};

interface LibraryModalProps {
    onClose: () => void;
    libraryItems: LibraryItem[];
    onLibraryItemsChange: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
    onAddItemToEstimate: (libItem: LibraryItem) => void;
    formatCurrency: (value: number) => string;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
    showAlert: (message: string) => void;
}
const LibraryModal: React.FC<LibraryModalProps> = ({ onClose, libraryItems, onLibraryItemsChange, onAddItemToEstimate, formatCurrency, onInputFocus, showConfirm, showAlert }) => {
    const [formItem, setFormItem] = useState<Partial<LibraryItem>>({ name: '', price: 0, unit: '', category: '' });
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [librarySearch, setLibrarySearch] = useState('');

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
    const handleCancelEdit = () => setFormItem({ name: '', price: 0, unit: '', category: '' });

    const handleSaveOrUpdate = () => {
        if (!formItem.name?.trim()) {
            showAlert("Введите наименование.");
            return;
        }
        const updatedLibrary = formItem.id
            ? libraryItems.map(item => item.id === formItem.id ? { ...item, ...formItem } as LibraryItem : item)
            : [...libraryItems, { name: formItem.name, price: formItem.price || 0, unit: formItem.unit || '', category: formItem.category?.trim() || '', id: Date.now() }];
        onLibraryItemsChange(updatedLibrary);
        localStorage.setItem('itemLibrary', JSON.stringify(updatedLibrary));
        handleCancelEdit();
    };

    const handleDeleteLibraryItem = (id: number) => {
        showConfirm('Вы уверены, что хотите удалить эту позицию из справочника?', (ok) => {
            if(ok) {
                const updatedLibrary = libraryItems.filter(item => item.id !== id);
                onLibraryItemsChange(updatedLibrary);
                localStorage.setItem('itemLibrary', JSON.stringify(updatedLibrary));
            }
        });
    };

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setLibrarySearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Справочник</h2><button onClick={onClose} className="close-btn">×</button></div>
                <div className="modal-body library-modal-body">
                    <div className="library-add-form-wrapper"><h3>{formItem.id ? 'Редактировать' : 'Добавить'}</h3><div className="library-add-form"><input type="text" placeholder="Наименование" value={formItem.name || ''} onChange={e => handleFormChange('name', e.target.value)} onFocus={onInputFocus} /><input type="number" placeholder="Цена" value={formItem.price || ''} onChange={e => handleFormChange('price', parseFloat(e.target.value) || 0)} onFocus={onInputFocus} /><input type="text" placeholder="Ед.изм." value={formItem.unit || ''} onChange={e => handleFormChange('unit', e.target.value)} onFocus={onInputFocus} /><input type="text" placeholder="Категория (необязательно)" value={formItem.category || ''} onChange={e => handleFormChange('category', e.target.value)} onFocus={onInputFocus} /></div><div className="library-form-actions"><button onClick={handleSaveOrUpdate} className="btn btn-primary">{formItem.id ? 'Сохранить' : 'Добавить'}</button>{formItem.id && <button onClick={handleCancelEdit} className="btn btn-secondary">Отмена</button>}</div></div><hr/><div className="library-list-wrapper"><h3>Список позиций</h3><div className="library-filters"><input type="search" placeholder="Поиск..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} onFocus={onInputFocus} className="modal-search-input" /><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} onFocus={onInputFocus}><option value="all">Все категории</option>{categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="library-list">{Object.keys(groupedItems).length === 0 ? <p className="no-results-message">Ничего не найдено.</p> : Object.entries(groupedItems).map(([category, items]) => (<div key={category} className="category-group"><h4>{category}</h4>{items.map(libItem => (<div key={libItem.id} className={`list-item ${formItem.id === libItem.id ? 'editing' : ''}`}><div className="list-item-info"><strong>{libItem.name}</strong><span>{formatCurrency(libItem.price)} / {libItem.unit || 'шт.'}</span></div><div className="list-item-actions"><button onClick={() => onAddItemToEstimate(libItem)} className="btn btn-primary" aria-label="Добавить">+</button><button onClick={() => handleStartEdit(libItem)} className="btn btn-secondary" aria-label="Редактировать">✎</button><button onClick={() => handleDeleteLibraryItem(libItem.id)} className="btn btn-tertiary" aria-label="Удалить">✕</button></div></div>))}</div>))}</div></div></div>
            </div>
        </div>
    );
};

interface NewProjectModalProps {
    project: Partial<Project> | null;
    onClose: () => void;
    onProjectChange: React.Dispatch<React.SetStateAction<Partial<Project> | null>>;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}
const NewProjectModal: React.FC<NewProjectModalProps> = ({ project, onClose, onProjectChange, onSave, onInputFocus }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>{project?.id ? 'Редактировать проект' : 'Новый проект'}</h2>
                <button onClick={onClose} className="close-btn" aria-label="Закрыть">×</button>
            </div>
            <div className="modal-body">
                <label>Название проекта</label>
                <input type="text" value={project?.name || ''} onChange={(e) => onProjectChange(p => ({...p!, name: e.target.value}))} onFocus={onInputFocus} placeholder="Название или тип работ" />
                <label>Клиент</label>
                <input type="text" value={project?.client || ''} onChange={(e) => onProjectChange(p => ({...p!, client: e.target.value}))} onFocus={onInputFocus} placeholder="Имя клиента" />
                <label>Адрес объекта</label>
                <textarea value={project?.address || ''} onChange={(e) => onProjectChange(p => ({...p!, address: e.target.value}))} onFocus={onInputFocus} placeholder="Адрес" rows={2} />
                {project?.id && <>
                    <label>Статус</label>
                    <select value={project.status} onChange={(e) => onProjectChange(p => ({...p!, status: e.target.value as Project['status']}))}>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершен</option>
                    </select>
                </>}
            </div>
            <div className="modal-footer">
                <button onClick={onSave} className="btn btn-primary">Сохранить</button>
            </div>
        </div>
    </div>
);

interface FinanceEntryModalProps {
    onClose: () => void;
    onSave: (entry: Omit<FinanceEntry, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}
const FinanceEntryModal: React.FC<FinanceEntryModalProps> = ({ onClose, onSave, showAlert, onInputFocus }) => {
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
                <div className="modal-header"><h2>Добавить транзакцию</h2><button onClick={onClose} className="close-btn">×</button></div>
                <div className="modal-body">
                    <label>Тип</label>
                    <select value={type} onChange={e => setType(e.target.value as any)} onFocus={onInputFocus}>
                        <option value="expense">Расход</option>
                        <option value="payment">Оплата от клиента</option>
                    </select>
                    <label>Сумма (РУБ)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" onFocus={onInputFocus} />
                    <label>Описание</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Например, 'Краска' или 'Аванс'" onFocus={onInputFocus} rows={3} />
                    {type === 'expense' && (
                        <>
                            <label>Фото чека (необязательно)</label>
                            {receiptImage ? (
                                <div className="image-preview-container">
                                    <img src={receiptImage} alt="Чек" className="image-preview" />
                                    <button onClick={() => setReceiptImage(null)} className="remove-image-btn">×</button>
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

interface PhotoReportModalProps {
    onClose: () => void;
    onSave: (photo: Omit<PhotoReport, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
}
const PhotoReportModal: React.FC<PhotoReportModalProps> = ({ onClose, onSave, showAlert }) => {
    const [image, setImage] = useState<string | null>(null);
    const [caption, setCaption] = useState('');

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resized = await resizeImage(file, 1200); // Larger size for reports
                setImage(resized);
            } catch (error) {
                showAlert('Не удалось обработать фото.');
            }
        }
    };
    
    const handleSave = () => {
        if (!image) {
            showAlert('Пожалуйста, выберите фото.');
            return;
        }
        onSave({ image, caption, date: new Date().toISOString() });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Добавить фото</h2><button onClick={onClose} className="close-btn">×</button></div>
                <div className="modal-body">
                    <label>Фотография</label>
                     {image ? (
                        <div className="image-preview-container large-preview">
                            <img src={image} alt="Предпросмотр" className="image-preview" />
                            <button onClick={() => setImage(null)} className="remove-image-btn">×</button>
                        </div>
                    ) : (
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} />
                    )}
                    <label>Подпись</label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Например, 'Укладка плитки в ванной'" rows={3} />
                </div>
                <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary" disabled={!image}>Сохранить</button></div>
            </div>
        </div>
    );
};

interface PhotoViewerModalProps {
    photo: PhotoReport;
    onClose: () => void;
    onDelete: (id: number) => void;
}
const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDelete }) => {
    return (
        <div className="modal-overlay photo-viewer-overlay" onClick={onClose}>
            <div className="photo-viewer-content" onClick={e => e.stopPropagation()}>
                <img src={photo.image} alt={photo.caption || 'Фото из отчета'} />
                {photo.caption && <p className="photo-viewer-caption">{photo.caption}</p>}
                <div className="photo-viewer-actions">
                     <button onClick={onClose} className="close-btn" aria-label="Закрыть">×</button>
                     <button onClick={() => onDelete(photo.id)} className="delete-photo-btn" aria-label="Удалить">🗑️</button>
                </div>
            </div>
        </div>
    );
};

interface ShoppingListModalProps {
    items: Item[];
    onClose: () => void;
    showAlert: (message: string) => void;
}
const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ items, onClose, showAlert }) => {
    const [copyButtonText, setCopyButtonText] = useState('Копировать список');
    const materials = useMemo(() => items.filter(item => item.type === 'material' && item.name.trim() && item.quantity > 0), [items]);
    const listRef = useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        const textToCopy = materials.map(item => `${item.name} - ${item.quantity} ${item.unit || 'шт.'}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyButtonText('Скопировано ✓');
            setTimeout(() => setCopyButtonText('Копировать список'), 2000);
        }).catch(() => {
            showAlert('Не удалось скопировать.');
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Список покупок</h2><button onClick={onClose} className="close-btn">×</button></div>
                <div className="modal-body" ref={listRef}>
                    {materials.length > 0 ? (
                        <div className="shopping-list">
                            {materials.map(item => (
                                <div key={item.id} className="shopping-list-item">
                                    <span>{item.name}</span>
                                    <span>{item.quantity} {item.unit || 'шт.'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-results-message">Материалы не найдены. Отметьте позиции в смете как "Материал", чтобы они появились здесь.</p>
                    )}
                </div>
                {materials.length > 0 && (
                    <div className="modal-footer">
                        <button onClick={handleCopy} className="btn btn-primary">{copyButtonText}</button>
                    </div>
                )}
            </div>
        </div>
    );
};

interface DocumentUploadModalProps {
    onClose: () => void;
    onSave: (name: string, dataUrl: string) => void;
    showAlert: (message: string) => void;
}
const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onSave, showAlert }) => {
    const [file, setFile] = useState<File | null>(null);
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            try {
                const url = await readFileAsDataURL(selectedFile);
                setDataUrl(url);
            } catch (error) {
                showAlert('Не удалось прочитать файл.');
                setFile(null);
                setDataUrl(null);
            }
        }
    };

    const handleSave = () => {
        if (file && dataUrl) {
            onSave(file.name, dataUrl);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Загрузить документ</h2><button onClick={onClose} className="close-btn">×</button></div>
                <div className="modal-body">
                    <label>Выберите файл</label>
                    <input type="file" onChange={handleFileChange} />
                    {file && (
                        <div className="document-preview">
                            <p><strong>Файл:</strong> {file.name}</p>
                            <p><strong>Размер:</strong> {(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary" disabled={!file}>Сохранить</button>
                </div>
            </div>
        </div>
    );
};


// --- END OF MODAL COMPONENTS ---

// --- START OF VIEW COMPONENTS ---

const EstimateView: React.FC<any> = ({
    currentEstimateProjectId, handleBackToProject, clientInfo, setClientInfo, setIsDirty, 
    handleThemeChange, themeIcon, themeMode, setIsLibraryOpen, setIsEstimatesListOpen, setIsSettingsOpen, 
    estimateNumber, setEstimateNumber, estimateDate, setEstimateDate, handleInputFocus, items, 
    dragItem, dragOverItem, handleDragSort, fileInputRefs, handleItemImageChange, 
    handleRemoveItemImage, handleRemoveItem, handleItemChange, formatCurrency, handleAddItem, 
    discount, setDiscount, discountType, setDiscountType, tax, setTax, calculation, 
    handleSave, isDirty, isPdfLoading, handleExportPDF, setIsShoppingListOpen, handleShare 
}) => (
    <>
        <header className="estimate-header">
            {currentEstimateProjectId && <button onClick={handleBackToProject} className="back-btn">←</button>}
            <h1 className={currentEstimateProjectId ? 'with-back-btn' : ''}>{clientInfo || 'Новая смета'}</h1>
            <div className="header-actions">
                <button onClick={handleThemeChange} className="header-btn" aria-label={`Сменить тему: ${themeMode}`} title={`Текущая тема: ${themeMode}`}>{themeIcon}</button>
                <button onClick={() => setIsLibraryOpen(true)} className="header-btn" aria-label="Справочник">📚</button>
                <button onClick={() => setIsEstimatesListOpen(true)} className="header-btn" aria-label="Мои сметы">📂</button>
                <button onClick={() => setIsSettingsOpen(true)} className="header-btn" aria-label="Настройки">⚙️</button>
            </div>
        </header>
        <main>
            <div className="card"><input type="text" value={clientInfo} onChange={(e) => { setClientInfo(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} className="client-info-input" placeholder="Имя клиента или адрес объекта" aria-label="Имя клиента или адрес объекта"/></div>
            <div className="card estimate-meta"><div className="meta-field"><label htmlFor="estimateNumber">Номер сметы</label><input id="estimateNumber" type="text" value={estimateNumber} onChange={e => { setEstimateNumber(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div><div className="meta-field"><label htmlFor="estimateDate">Дата</label><input id="estimateDate" type="date" value={estimateDate} onChange={e => { setEstimateDate(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div></div>
            <div className="items-list">
                {items.map((item: Item, index: number) => (
                    <div className="item-card" key={item.id} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()}>
                        <div className="item-header">
                            <div className="drag-handle" aria-label="Переместить">⠿</div>
                            <span className="item-number">Позиция #{index + 1}</span>
                            <div className="item-header-actions">
                                <button onClick={() => fileInputRefs.current[item.id]?.click()} className="attach-btn" aria-label="Прикрепить фото">📎</button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={el => { fileInputRefs.current[item.id] = el; }}
                                    onChange={(e) => handleItemImageChange(item.id, e)}
                                />
                                <button onClick={() => handleRemoveItem(item.id)} className="remove-btn" aria-label="Удалить позицию">×</button>
                            </div>
                        </div>
                        <div className="item-inputs"><input type="text" placeholder="Наименование" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} onFocus={handleInputFocus} aria-label="Наименование" /><input type="number" placeholder="Кол-во" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Количество" min="0"/><input type="text" placeholder="Ед.изм." value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} onFocus={handleInputFocus} aria-label="Единица измерения" /><input type="number" placeholder="Цена" value={item.price || ''} onChange={(e) => handleItemChange(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Цена" min="0"/></div>
                        {item.image && (
                            <div className="image-preview-container">
                                <img src={item.image} alt="Предпросмотр" className="image-preview" />
                                <button onClick={() => handleRemoveItemImage(item.id)} className="remove-image-btn" aria-label="Удалить изображение">×</button>
                            </div>
                        )}
                        <div className="item-footer">
                            <div className="item-type-toggle">
                                <button onClick={() => handleItemChange(item.id, 'type', 'work')} className={item.type === 'work' ? 'active' : ''}>Работа</button>
                                <button onClick={() => handleItemChange(item.id, 'type', 'material')} className={item.type === 'material' ? 'active' : ''}>Материал</button>
                            </div>
                            <div className="item-total">Сумма: {formatCurrency(item.quantity * item.price)}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="add-items-container"><button onClick={handleAddItem} className="btn btn-secondary">+ Добавить позицию</button><button onClick={() => setIsLibraryOpen(true)} className="btn btn-secondary">📚 + Из справочника</button></div>
            <div className="summary-details card"><div className="summary-row"><label htmlFor="discount">Скидка</label><div className="input-group"><input id="discount" type="number" value={discount || ''} onChange={(e) => { setDiscount(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/><div className="toggle-group"><button onClick={() => { setDiscountType('percent'); setIsDirty(true); }} className={discountType === 'percent' ? 'active' : ''}>%</button><button onClick={() => { setDiscountType('fixed'); setIsDirty(true); }} className={discountType === 'fixed' ? 'active' : ''}>РУБ</button></div></div></div><div className="summary-row"><label htmlFor="tax">Налог (%)</label><div className="input-group"><input id="tax" type="number" value={tax || ''} onChange={(e) => { setTax(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/></div></div></div>
            <div className="total-container card"><div className="total-breakdown"><div className="total-row"><span>Подытог</span><span>{formatCurrency(calculation.subtotal)}</span></div>{calculation.discountAmount > 0 && (<div className="total-row"><span>Скидка ({discountType === 'percent' ? `${discount}%` : formatCurrency(discount)})</span><span>-{formatCurrency(calculation.discountAmount)}</span></div>)}{calculation.taxAmount > 0 && (<div className="total-row"><span>Налог ({tax}%)</span><span>+{formatCurrency(calculation.taxAmount)}</span></div>)}<div className="total-row grand-total"><span>Итого:</span><span>{formatCurrency(calculation.grandTotal)}</span></div></div></div>
            <div className="actions-footer">
                <button onClick={handleSave} className="btn btn-secondary save-btn" disabled={!isDirty}>
                    {isDirty ? 'Сохранить' : 'Сохранено ✓'}
                </button>
                <button onClick={handleExportPDF} className="btn btn-secondary" disabled={isPdfLoading}>
                    {isPdfLoading ? 'Создание...' : 'Экспорт в PDF'}
                </button>
                <button onClick={() => setIsShoppingListOpen(true)} className="btn btn-secondary shopping-list-btn">🛒 Список покупок</button>
                <button onClick={handleShare} className="btn btn-primary share-btn">Поделиться</button>
            </div>
        </main>
    </>
);

const ProjectsListView: React.FC<any> = ({
    handleOpenProjectModal, projectStatusFilter, setProjectStatusFilter, projectSearch, setProjectSearch,
    handleInputFocus, filteredProjects, projects, setActiveProjectId, setActiveView
}) => (
    <>
        <header className="projects-list-header">
            <h1>Проекты</h1>
            <div className="header-actions">
                <button onClick={() => handleOpenProjectModal()} className="header-btn" aria-label="Новый проект">➕</button>
            </div>
        </header>
        <main>
            <div className="project-filters">
                <div className="toggle-switch">
                    <button onClick={() => setProjectStatusFilter('in_progress')} className={projectStatusFilter === 'in_progress' ? 'active' : ''}>В работе</button>
                    <button onClick={() => setProjectStatusFilter('completed')} className={projectStatusFilter === 'completed' ? 'active' : ''}>Завершены</button>
                </div>
                <input type="search" placeholder="Поиск по проектам..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} onFocus={handleInputFocus} />
            </div>
            <div className="projects-list">
                {filteredProjects.length > 0 ? filteredProjects.map((project: Project) => (
                    <div key={project.id} className="card project-card" onClick={() => { setActiveProjectId(project.id); setActiveView('projectDetail'); }}>
                        <strong>{project.name}</strong>
                        <small>{project.client}</small>
                        <small>{project.address}</small>
                    </div>
                )) : <p className="no-results-message">{projects.length > 0 ? 'Ничего не найдено.' : 'Проектов нет. Нажмите "+", чтобы создать.'}</p>}
            </div>
        </main>
    </>
);

const ProjectDetailView: React.FC<{
    activeProject: Project;
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    photoReports: PhotoReport[];
    documents: Document[];
    formatCurrency: (value: number) => string;
    statusMap: typeof statusMap;
    setActiveView: React.Dispatch<React.SetStateAction<any>>;
    setActiveProjectId: React.Dispatch<React.SetStateAction<number | null>>;
    handleOpenProjectModal: (project: Partial<Project>) => void;
    handleDeleteProject: (id: number) => void;
    handleLoadEstimate: (id: number) => void;
    handleAddNewEstimateForProject: () => void;
    onOpenFinanceModal: () => void;
    onDeleteFinanceEntry: (id: number) => void;
    onOpenPhotoReportModal: () => void;
    onViewPhoto: (photo: PhotoReport) => void;
    onOpenDocumentModal: () => void;
    onDeleteDocument: (id: number) => void;
}> = ({
    activeProject, estimates, financeEntries, photoReports, documents, formatCurrency, statusMap, setActiveView, setActiveProjectId,
    handleOpenProjectModal, handleDeleteProject, handleLoadEstimate, handleAddNewEstimateForProject,
    onOpenFinanceModal, onDeleteFinanceEntry, onOpenPhotoReportModal, onViewPhoto, onOpenDocumentModal, onDeleteDocument
}) => {
    // Hooks are now at the top level of this component, which is correct.
    const projectEstimates = useMemo(() => estimates.filter(e => e.projectId === activeProject.id), [estimates, activeProject.id]);
    const projectFinances = useMemo(() => financeEntries.filter(f => f.projectId === activeProject.id), [financeEntries, activeProject.id]);
    const projectPhotos = useMemo(() => photoReports.filter(p => p.projectId === activeProject.id), [photoReports, activeProject.id]);
    const projectDocuments = useMemo(() => documents.filter(d => d.projectId === activeProject.id), [documents, activeProject.id]);
    
    const calculateEstimateTotal = useCallback((estimate: Estimate) => {
        const subtotal = estimate.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = estimate.discountType === 'percent' ? subtotal * (Number(estimate.discount) / 100) : Number(estimate.discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(estimate.tax) / 100);
        return totalAfterDiscount + taxAmount;
    }, []);

    const { estimateTotal, totalExpenses, totalPayments, profit } = useMemo(() => {
        const estimateTotal = projectEstimates.reduce((sum, est) => sum + calculateEstimateTotal(est), 0);
        const totalExpenses = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
        const totalPayments = projectFinances.filter(f => f.type === 'payment').reduce((sum, f) => sum + f.amount, 0);
        const profit = estimateTotal - totalExpenses;
        return { estimateTotal, totalExpenses, totalPayments, profit };
    }, [projectEstimates, projectFinances, calculateEstimateTotal]);


    return (
        <>
            <header className="project-detail-header">
                <button onClick={() => {setActiveView('projects'); setActiveProjectId(null);}} className="back-btn">←</button>
                <h1>{activeProject.name}</h1>
                <div className="header-actions">
                    <button onClick={() => handleOpenProjectModal(activeProject)} className="header-btn" aria-label="Редактировать">✏️</button>
                    <button onClick={() => handleDeleteProject(activeProject.id)} className="header-btn" aria-label="Удалить">🗑️</button>
                    {activeProject.status === 'completed' && <button className="header-btn" aria-label="Сгенерировать акт">📄</button>}
                </div>
            </header>
            <main className="project-detail-main">
                <details className="card project-section" open>
                    <summary>Финансовый дашборд</summary>
                    <div className="dashboard-grid">
                        <div className="dashboard-item">
                            <span className="dashboard-value">{formatCurrency(estimateTotal)}</span>
                            <span className="dashboard-label">Сумма смет</span>
                        </div>
                        <div className="dashboard-item">
                            <span className="dashboard-value expense-value">{formatCurrency(totalExpenses)}</span>
                            <span className="dashboard-label">Расходы</span>
                        </div>
                        <div className="dashboard-item">
                            <span className="dashboard-value payment-value">{formatCurrency(totalPayments)}</span>
                            <span className="dashboard-label">Оплачено</span>
                        </div>
                            <div className="dashboard-item">
                            <span className="dashboard-value profit-value">{formatCurrency(profit)}</span>
                            <span className="dashboard-label">Прибыль</span>
                        </div>
                    </div>
                </details>
                <details className="card project-section">
                    <summary>Сметы ({projectEstimates.length})</summary>
                        <div className="project-section-body">
                        <div className="project-items-list">
                            {projectEstimates.length > 0 ? projectEstimates.map(est => (
                                <div key={est.id} className="list-item" onClick={() => handleLoadEstimate(est.id)}>
                                    <div className="list-item-info">
                                        <strong>{est.number} - {est.clientInfo || 'Без названия'}</strong>
                                        <span>{formatCurrency(calculateEstimateTotal(est))} <span className="status-badge" style={{ backgroundColor: statusMap[est.status].color }}>{statusMap[est.status].text}</span></span>
                                    </div>
                                    <span className="list-item-arrow">›</span>
                                </div>
                            )) : <p className="no-results-message">Смет для этого проекта нет.</p>}
                        </div>
                        <button onClick={handleAddNewEstimateForProject} className="btn btn-secondary">+ Добавить смету</button>
                        </div>
                </details>
                <details className="card project-section">
                    <summary>Финансы ({projectFinances.length}) <button className="add-in-summary-btn" onClick={(e) => { e.preventDefault(); onOpenFinanceModal(); }}>+</button></summary>
                    <div className="project-section-body">
                        {projectFinances.length > 0 ? (
                            <div className="project-items-list">
                                {projectFinances.map(f => (
                                    <div key={f.id} className="list-item finance-item">
                                        {f.receiptImage && <img src={f.receiptImage} alt="чек" className="finance-receipt-thumb"/>}
                                        <div className="list-item-info">
                                            <strong>{f.description || (f.type === 'expense' ? 'Расход' : 'Оплата')}</strong>
                                            <span className={f.type === 'expense' ? 'expense-value' : 'payment-value'}>{formatCurrency(f.amount)}</span>
                                        </div>
                                        <button onClick={() => onDeleteFinanceEntry(f.id)} className="btn btn-tertiary" aria-label="Удалить">✕</button>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Транзакций пока нет.</p>}
                         <button onClick={onOpenFinanceModal} className="btn btn-secondary">+ Добавить транзакцию</button>
                    </div>
                </details>
                <details className="card project-section">
                    <summary>Фотоотчеты ({projectPhotos.length}) <button className="add-in-summary-btn" onClick={(e) => {e.preventDefault(); onOpenPhotoReportModal();}}>+</button></summary>
                    <div className="project-section-body">
                        {projectPhotos.length > 0 ? (
                            <div className="photo-grid">
                                {projectPhotos.map(p => (
                                    <div key={p.id} className="photo-thumbnail" onClick={() => onViewPhoto(p)}>
                                        <img src={p.image} alt={p.caption || 'фото'}/>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Фотографий пока нет.</p>}
                         <button onClick={onOpenPhotoReportModal} className="btn btn-secondary">+ Добавить фото</button>
                    </div>
                </details>
                <details className="card project-section">
                    <summary>Документы ({projectDocuments.length}) <button className="add-in-summary-btn" onClick={(e) => {e.preventDefault(); onOpenDocumentModal();}}>+</button></summary>
                    <div className="project-section-body">
                        {projectDocuments.length > 0 ? (
                             <div className="project-items-list">
                                {projectDocuments.map(doc => (
                                    <div key={doc.id} className="list-item document-item">
                                        <div className="list-item-info">
                                            <strong>{doc.name}</strong>
                                            <span>{new Date(doc.date).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <a href={doc.dataUrl} download={doc.name} className="btn btn-secondary" aria-label="Скачать">📥</a>
                                            <button onClick={() => onDeleteDocument(doc.id)} className="btn btn-tertiary" aria-label="Удалить">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Документов пока нет.</p>}
                        <button onClick={onOpenDocumentModal} className="btn btn-secondary">+ Загрузить документ</button>
                    </div>
                </details>
            </main>
        </>
    );
};

// --- END OF VIEW COMPONENTS ---

const App: React.FC = () => {
    // --- App Navigation State ---
    const [activeView, setActiveView] = useState<'estimate' | 'projects' | 'projectDetail'>('estimate');

    // --- Data State ---
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [templates, setTemplates] = useState<Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
    const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
    
    // --- Current Estimate State ---
    const [activeEstimateId, setActiveEstimateId] = useState<number | null>(null);
    const [currentEstimateProjectId, setCurrentEstimateProjectId] = useState<number | null>(null);
    const [items, setItems] = useState<Item[]>([{ id: Date.now(), name: '', quantity: 1, price: 0, unit: '', type: 'material' }]);
    const [clientInfo, setClientInfo] = useState('');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [estimateDate, setEstimateDate] = useState('');
    const [status, setStatus] = useState<EstimateStatus>('draft');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [tax, setTax] = useState(0);

    // --- Project View State ---
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [projectStatusFilter, setProjectStatusFilter] = useState<'in_progress' | 'completed'>('in_progress');
    const [projectSearch, setProjectSearch] = useState('');
    
    // --- Modals and UI State ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEstimatesListOpen, setIsEstimatesListOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
    const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
    const [isPhotoReportModalOpen, setIsPhotoReportModalOpen] = useState(false);
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<PhotoReport | null>(null);
    const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
    const [isDirty, setIsDirty] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    
    // Theme Management
    useEffect(() => {
        const savedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
        if (savedTheme) {
            setThemeMode(savedTheme);
        }

        const applyTheme = () => {
            const currentMode = (localStorage.getItem('themeMode') as ThemeMode | null) || 'auto';
            if (currentMode === 'dark' || (currentMode === 'auto' && window.Telegram?.WebApp.colorScheme === 'dark')) {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        };

        applyTheme(); // Apply on initial load
        window.Telegram?.WebApp.onEvent('themeChanged', applyTheme); // Listen for TG theme changes

        return () => {
            window.Telegram?.WebApp.offEvent('themeChanged', applyTheme);
        };
    }, []);

    const handleThemeChange = () => {
        const newTheme: ThemeMode = themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto';
        setThemeMode(newTheme);
        localStorage.setItem('themeMode', newTheme);

        if (newTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (newTheme === 'light') {
            document.body.classList.remove('dark-theme');
        } else { // auto
            if (window.Telegram?.WebApp.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        }
    };
    
    useEffect(() => {
        if (isDirty) {
            window.Telegram?.WebApp.enableClosingConfirmation();
        } else {
            window.Telegram?.WebApp.disableClosingConfirmation();
        }
    }, [isDirty]);

    const populateForm = (estimate: Estimate | Partial<Estimate> | null, currentEstimates: Estimate[], projectIdForNew: number | null = null) => {
        if (estimate) {
            setItems(estimate.items || []);
            setClientInfo(estimate.clientInfo || '');
            setEstimateNumber(estimate.number || generateNewEstimateNumber(currentEstimates));
            setEstimateDate(estimate.date || new Date().toISOString().split('T')[0]);
            setStatus(estimate.status || 'draft');
            setDiscount(estimate.discount || 0);
            setDiscountType(estimate.discountType || 'percent');
            setTax(estimate.tax || 0);
            if ('id' in estimate && estimate.id) {
                setActiveEstimateId(estimate.id);
                setCurrentEstimateProjectId(estimate.projectId || null);
            } else {
                 setActiveEstimateId(null);
                 setCurrentEstimateProjectId(projectIdForNew);
            }
        } else {
            // New estimate state
            setItems([{ id: Date.now(), name: '', quantity: 1, price: 0, unit: '', image: null, type: 'material' }]);
            setClientInfo('');
            setEstimateNumber(generateNewEstimateNumber(currentEstimates));
            setEstimateDate(new Date().toISOString().split('T')[0]);
            setStatus('draft');
            setDiscount(0);
            setDiscountType('percent');
            setTax(0);
            setActiveEstimateId(null);
            setCurrentEstimateProjectId(projectIdForNew);
        }
        setIsDirty(false); // Reset dirty flag when loading new data
    };

    // Load all data on initial render
    useEffect(() => {
        try {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                window.Telegram.WebApp.disableVerticalSwipes();
            }
        } catch (error) {
            console.error("Failed to initialize Telegram Web App:", error);
        }

        const savedData = localStorage.getItem('estimatesData');
        let initialEstimates: Estimate[] = [];
        let activeEstimate: Estimate | null = null;
        
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                let savedEstimates = (parsedData.estimates || []) as Estimate[];
                const savedActiveId = parsedData.activeEstimateId;
                
                let needsResave = false;
                savedEstimates = savedEstimates.map((e: any) => {
                    let updated = { ...e };
                    if (typeof e.status === 'undefined') {
                        needsResave = true;
                        updated = {
                            ...updated,
                            number: e.number || generateNewEstimateNumber([]),
                            date: e.date || new Date(e.lastModified).toISOString().split('T')[0],
                            status: 'draft',
                        };
                    }
                    if (typeof e.projectId === 'undefined') {
                        needsResave = true;
                        updated.projectId = null;
                    }
                    // Data migration for item type
                    if (e.items && e.items.some((i: any) => typeof i.type === 'undefined')) {
                        needsResave = true;
                        updated.items = e.items.map((i: any) => ({ ...i, type: i.type || 'material' }));
                    }

                    return updated;
                });
                
                if (needsResave) localStorage.setItem('estimatesData', JSON.stringify({ estimates: savedEstimates, activeEstimateId: savedActiveId }));
                
                initialEstimates = savedEstimates;
                activeEstimate = savedEstimates.find(e => e.id === savedActiveId) || savedEstimates[0] || null;

            } catch (error) { console.error("Failed to parse saved estimates:", error); }
        }
        
        setEstimates(initialEstimates);
        populateForm(activeEstimate, initialEstimates);
        
        const savedProfile = localStorage.getItem('companyProfile');
        if (savedProfile) { try { setCompanyProfile(JSON.parse(savedProfile)); } catch (e) { console.error("Failed to parse profile", e); }}
        
        const savedLibrary = localStorage.getItem('itemLibrary');
        if (savedLibrary) { try { setLibraryItems(JSON.parse(savedLibrary)); } catch (e) { console.error("Failed to parse library", e); }}

        const savedTemplates = localStorage.getItem('estimateTemplates');
        if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { console.error("Failed to parse templates", e); }}
        
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) { try { setProjects(JSON.parse(savedProjects)); } catch (e) { console.error("Failed to parse projects", e); } }
        
        const savedFinances = localStorage.getItem('financeEntries');
        if (savedFinances) { try { setFinanceEntries(JSON.parse(savedFinances)); } catch (e) { console.error("Failed to parse finances", e); } }

        const savedPhotos = localStorage.getItem('photoReports');
        if (savedPhotos) { try { setPhotoReports(JSON.parse(savedPhotos)); } catch (e) { console.error("Failed to parse photos", e); } }

        const savedDocuments = localStorage.getItem('projectDocuments');
        if (savedDocuments) { try { setDocuments(JSON.parse(savedDocuments)); } catch (e) { console.error("Failed to parse documents", e); } }

    }, []);
    
    const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay to allow keyboard to appear
    };

    const handleAddItem = () => { setItems(prev => [...prev, { id: Date.now(), name: '', quantity: 1, price: 0, unit: '', image: null, type: 'material' }]); setIsDirty(true); };
    const handleAddFromLibrary = (libItem: LibraryItem) => { setItems(prev => [...prev, { id: Date.now(), name: libItem.name, quantity: 1, price: libItem.price, unit: libItem.unit, image: null, type: 'material' }]); setIsLibraryOpen(false); setIsDirty(true); };
    const handleItemChange = (id: number, field: keyof Item, value: string | number) => { setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); setIsDirty(true); };
    const handleRemoveItem = (id: number) => { setItems(prev => prev.filter(item => item.id !== id)); setIsDirty(true); };
    
    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;
        const newItems = [...items];
        const dragItemContent = newItems.splice(dragItem.current, 1)[0];
        newItems.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setItems(newItems);
        setIsDirty(true);
    };

    const handleItemImageChange = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resizedImage = await resizeImage(file, 800); // Resize to max 800px
            setItems(prev => prev.map(item => item.id === id ? { ...item, image: resizedImage } : item));
            setIsDirty(true);
        } catch (error) {
            console.error("Image processing failed:", error);
            safeShowAlert("Не удалось обработать изображение.");
        }
    };
    
    const handleRemoveItemImage = (id: number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, image: null } : item));
        setIsDirty(true);
    };

    const calculation = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = discountType === 'percent' ? subtotal * (Number(discount) / 100) : Number(discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(tax) / 100);
        const grandTotal = totalAfterDiscount + taxAmount;
        return { subtotal, discountAmount, taxAmount, grandTotal };
    }, [items, discount, discountType, tax]);

    const formatCurrency = useCallback((value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value), []);
    const getValidItems = useCallback(() => items.filter(item => item.name.trim() && item.quantity > 0 && item.price >= 0), [items]);

    const handleSave = () => {
        if (!isDirty) return;
        try {
            const newEstimates = [...estimates];
            const now = Date.now();
            const currentId = activeEstimateId || now;
            
            const currentEstimateData: Estimate = { 
                id: currentId,
                clientInfo, items, discount, discountType, tax, 
                number: estimateNumber, date: estimateDate, status,
                projectId: currentEstimateProjectId,
                lastModified: now
            };
    
            const existingIndex = newEstimates.findIndex(e => e.id === activeEstimateId);
            if (existingIndex > -1) {
                newEstimates[existingIndex] = currentEstimateData;
            } else {
                newEstimates.unshift(currentEstimateData);
            }
    
            setEstimates(newEstimates);
            setActiveEstimateId(currentId);
            localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId: currentId }));
            setIsDirty(false); // Reset dirty flag after successful save
            window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error("Save failed:", error);
            safeShowAlert("Не удалось сохранить смету.");
        }
    };
    
    const handleNewEstimate = (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => {
        if (isDirty) {
            safeShowConfirm('У вас есть несохраненные изменения. Вы уверены, что хотите создать новую смету?', (ok) => {
                if (ok) {
                    populateForm(template || null, estimates, null);
                }
            });
        } else {
             populateForm(template || null, estimates, null);
        }
    }
    
    const handleExportPDF = useCallback(async () => {
        setIsPdfLoading(true);
        window.Telegram?.WebApp.HapticFeedback.notificationOccurred('warning');
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for scripts
            
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                throw new Error("Библиотека для создания PDF (jsPDF) не загрузилась. Проверьте интернет-соединение.");
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            if (typeof (doc as any).autoTable !== 'function') {
                throw new Error("Плагин для таблиц PDF (autoTable) не загрузился. Проверьте интернет-соединение.");
            }

            const validItems = getValidItems();
            if (validItems.length === 0) {
                safeShowAlert("Добавьте хотя бы одну позицию в смету.");
                return;
            }
        
            doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_FONT_BASE64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto');
        
            let y = 15;
            const pageMargin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
        
            // Header
            if (companyProfile.logo) {
                try {
                    doc.addImage(companyProfile.logo, 'JPEG', pageMargin, y, 30, 30);
                } catch (e) { console.error("Could not add logo to PDF:", e); }
            }
            
            doc.setFontSize(20);
            doc.text(companyProfile.name || 'Смета', pageWidth - pageMargin, y + 5, { align: 'right' });
            doc.setFontSize(10);
            doc.text(companyProfile.details || '', pageWidth - pageMargin, y + 15, { align: 'right', maxWidth: 80 });
            y += 45;
        
            // Estimate Meta
            doc.setFontSize(16);
            doc.text(`Смета № ${estimateNumber} от ${new Date(estimateDate).toLocaleDateString('ru-RU')}`, pageMargin, y);
            y += 10;
            doc.setFontSize(12);
            doc.text(`Клиент / Объект: ${clientInfo}`, pageMargin, y);
            y += 15;
            
            // Table
            const tableData = validItems.map((item, index) => [
                index + 1,
                item.name,
                item.quantity,
                item.unit || 'шт.',
                formatCurrency(item.price),
                formatCurrency(item.quantity * item.price),
            ]);
        
            (doc as any).autoTable({
                startY: y,
                head: [['№', 'Наименование', 'Кол-во', 'Ед.изм.', 'Цена', 'Сумма']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, font: 'Roboto' },
                bodyStyles: { font: 'Roboto' },
                didDrawPage: (data: any) => y = data.cursor.y,
            });
            
            y = (doc as any).autoTable.previous.finalY + 15;
        
            // Totals
            const totalsX = pageWidth - pageMargin;
            doc.setFontSize(12);
            doc.text(`Подытог: ${formatCurrency(calculation.subtotal)}`, totalsX, y, { align: 'right' });
            y += 7;
            if (calculation.discountAmount > 0) {
                doc.text(`Скидка (${discountType === 'percent' ? `${discount}%` : formatCurrency(discount)}): -${formatCurrency(calculation.discountAmount)}`, totalsX, y, { align: 'right' });
                y += 7;
            }
            if (calculation.taxAmount > 0) {
                doc.text(`Налог (${tax}%): +${formatCurrency(calculation.taxAmount)}`, totalsX, y, { align: 'right' });
                y += 7;
            }
            doc.setFontSize(14);
            doc.setFont('Roboto', 'bold');
            doc.text(`Итого: ${formatCurrency(calculation.grandTotal)}`, totalsX, y + 2, { align: 'right' });
            doc.setFont('Roboto', 'normal');
            
            // Images
            const images = validItems.filter(item => item.image);
            if (images.length > 0) {
                doc.addPage();
                let imageY = 15;
                doc.setFontSize(16);
                doc.text('Прикрепленные изображения', pageMargin, imageY);
                imageY += 10;
                
                for (const item of images) {
                    if (!item.image) continue;
                    doc.setFontSize(10);
                    doc.text(`Позиция #${validItems.indexOf(item) + 1}: ${item.name}`, pageMargin, imageY);
                    imageY += 5;
                    try {
                        const imgProps = doc.getImageProperties(item.image);
                        const aspect = imgProps.width / imgProps.height;
                        const maxWidth = pageWidth - pageMargin * 2;
                        const maxHeight = 80;
                        let imgWidth = maxWidth;
                        let imgHeight = imgWidth / aspect;
                        if (imgHeight > maxHeight) {
                            imgHeight = maxHeight;
                            imgWidth = imgHeight * aspect;
                        }
                        if (imageY + imgHeight > doc.internal.pageSize.getHeight() - pageMargin) {
                            doc.addPage();
                            imageY = pageMargin;
                        }
                        doc.addImage(item.image, 'JPEG', pageMargin, imageY, imgWidth, imgHeight);
                        imageY += imgHeight + 10;
                    } catch (e) {
                        console.error("Could not add item image to PDF:", e);
                        doc.setTextColor(150);
                        doc.text('Не удалось загрузить изображение.', pageMargin, imageY);
                        doc.setTextColor(0);
                        imageY += 10;
                    }
                }
            }
        
            doc.save(`смета-${estimateNumber}.pdf`);
        } catch (error: any) {
            console.error("PDF Export failed:", error);
            safeShowAlert(`Не удалось создать PDF: ${error.message}`);
        } finally {
            setIsPdfLoading(false);
        }
    }, [getValidItems, clientInfo, companyProfile, estimateNumber, estimateDate, formatCurrency, calculation, discount, discountType, tax]);

    const handleShare = useCallback(() => {
        try {
            const validItems = getValidItems();
            if (validItems.length === 0) {
                safeShowAlert("Добавьте хотя бы одну позицию, чтобы поделиться сметой.");
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('error');
                return;
            }
            const header = `*Смета № ${estimateNumber} от ${new Date(estimateDate).toLocaleDateString('ru-RU')}*\nКлиент: ${clientInfo || 'Не указан'}\n\n`;
            const itemsText = validItems.map((item, index) => `${index + 1}. ${item.name} (${item.quantity} ${item.unit || 'шт.'}) - ${formatCurrency(item.quantity * item.price)}`).join('\n');
            const footer = `\n\n*Подытог:* ${formatCurrency(calculation.subtotal)}`;
            const discountText = calculation.discountAmount > 0 ? `\n*Скидка:* -${formatCurrency(calculation.discountAmount)}` : '';
            const taxText = calculation.taxAmount > 0 ? `\n*Налог (${tax}%):* +${formatCurrency(calculation.taxAmount)}` : '';
            const total = `\n*Итого:* ${formatCurrency(calculation.grandTotal)}`;
            
            const message = header + itemsText + footer + discountText + taxText + total;
            window.Telegram?.WebApp.sendData(message);
        } catch (error) {
            console.error("Share failed:", error);
            safeShowAlert("Не удалось подготовить данные для отправки.");
        }
    }, [getValidItems, estimateNumber, estimateDate, clientInfo, formatCurrency, calculation, tax]);
    
    const handleProfileChange = (field: keyof CompanyProfile, value: string) => setCompanyProfile(prev => ({ ...prev, [field]: value }));
    const handleSaveProfile = () => { localStorage.setItem('companyProfile', JSON.stringify(companyProfile)); setIsSettingsOpen(false); };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resizedLogo = await resizeImage(file, 200); // Resize to max 200px for profile
            setCompanyProfile(prev => ({ ...prev, logo: resizedLogo }));
        } catch (error) {
            console.error("Logo processing failed:", error);
            safeShowAlert("Не удалось обработать логотип.");
        }
    };
    const removeLogo = () => setCompanyProfile(prev => ({...prev, logo: null}));

    const handleLoadEstimate = (id: number) => {
        const load = () => {
            const estimateToLoad = estimates.find(e => e.id === id); 
            if (estimateToLoad) { 
                populateForm(estimateToLoad, estimates); 
                setIsEstimatesListOpen(false);
                // If we're loading from a project, switch to the estimate view
                if (activeView === 'projectDetail') {
                    setActiveView('estimate');
                }
            }
        };

        if (isDirty) {
            safeShowConfirm("У вас есть несохраненные изменения. Загрузить другую смету?", (ok) => {
                if (ok) load();
            });
        } else {
            load();
        }
    };
    
    const handleDeleteEstimate = (id: number) => {
        safeShowConfirm("Вы уверены, что хотите удалить эту смету?", (ok) => {
            if (ok) {
                const newEstimates = estimates.filter(e => e.id !== id);
                setEstimates(newEstimates);
                let newActiveId = activeEstimateId;
                if (activeEstimateId === id) {
                    const estimateToLoad = newEstimates.find(e => e.projectId === currentEstimateProjectId) || newEstimates[0] || null;
                    newActiveId = estimateToLoad ? estimateToLoad.id : null;
                    populateForm(estimateToLoad, newEstimates);
                }
                localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId: newActiveId }));
            }
        });
    };
    
    const handleStatusChange = (id: number, newStatus: EstimateStatus) => {
        const newEstimates = estimates.map(e => e.id === id ? { ...e, status: newStatus } : e);
        setEstimates(newEstimates);
        localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId }));
    };

    const handleSaveAsTemplate = (id: number) => {
        const estimateToTemplate = estimates.find(e => e.id === id);
        if (!estimateToTemplate) return;
        const { items, discount, discountType, tax } = estimateToTemplate;
        const newTemplates = [...templates, { items, discount, discountType, tax, lastModified: Date.now() }];
        setTemplates(newTemplates);
        localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
        safeShowAlert('Шаблон сохранен!');
    };
    const handleDeleteTemplate = (timestamp: number) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот шаблон?', (ok) => {
            if (ok) {
                const newTemplates = templates.filter(t => t.lastModified !== timestamp);
                setTemplates(newTemplates);
                localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
            }
        });
    }

    // --- Project Handlers ---
    const handleOpenProjectModal = (project: Partial<Project> | null = null) => {
        setEditingProject(project || { name: '', client: '', address: '', status: 'in_progress' });
        setIsProjectModalOpen(true);
    };

    const handleSaveProject = () => {
        if (!editingProject || !editingProject.name?.trim()) {
            safeShowAlert("Введите название проекта.");
            return;
        }

        let updatedProjects;
        if (editingProject.id) { // Editing existing project
            updatedProjects = projects.map(p => p.id === editingProject.id ? { ...p, ...editingProject } as Project : p);
        } else { // Creating new project
            const newProject: Project = {
                id: Date.now(),
                name: editingProject.name.trim(),
                client: editingProject.client || '',
                address: editingProject.address || '',
                status: 'in_progress'
            };
            updatedProjects = [newProject, ...projects];
        }

        setProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        setIsProjectModalOpen(false);
        setEditingProject(null);
    };
    
    const handleDeleteProject = (id: number) => {
        safeShowConfirm("Вы уверены, что хотите удалить этот проект и все связанные с ним данные?", (ok) => {
            if (ok) {
                const newProjects = projects.filter(p => p.id !== id);
                setProjects(newProjects);
                localStorage.setItem('projects', JSON.stringify(newProjects));
                
                const newEstimates = estimates.filter(e => e.projectId !== id);
                setEstimates(newEstimates);
                localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId }));
                
                const newFinances = financeEntries.filter(f => f.projectId !== id);
                setFinanceEntries(newFinances);
                localStorage.setItem('financeEntries', JSON.stringify(newFinances));

                const newPhotos = photoReports.filter(p => p.projectId !== id);
                setPhotoReports(newPhotos);
                localStorage.setItem('photoReports', JSON.stringify(newPhotos));
                
                const newDocuments = documents.filter(d => d.projectId !== id);
                setDocuments(newDocuments);
                localStorage.setItem('projectDocuments', JSON.stringify(newDocuments));

                setActiveView('projects'); 
                setActiveProjectId(null);
            }
        });
    };

    const handleAddNewEstimateForProject = () => {
        const createNew = () => {
            populateForm(null, estimates, activeProjectId);
            setActiveView('estimate');
        };
        if (isDirty) {
            safeShowConfirm('У вас есть несохраненные изменения. Создать новую смету для этого проекта?', (ok) => {
                if (ok) createNew();
            });
        } else {
            createNew();
        }
    };

    const handleBackToProject = () => {
        const goBack = () => {
            setIsDirty(false); // Discard changes
            setActiveProjectId(currentEstimateProjectId);
            setActiveView('projectDetail');
        };
        if (isDirty) {
            safeShowConfirm('Есть несохраненные изменения. Вы уверены, что хотите вернуться к проекту?', (ok) => {
                if (ok) goBack();
            });
        } else {
            goBack();
        }
    };
    
    // --- Finance Handlers ---
    const handleSaveFinanceEntry = (entry: Omit<FinanceEntry, 'id' | 'projectId'>) => {
        const newEntry: FinanceEntry = { ...entry, id: Date.now(), projectId: activeProjectId! };
        const updatedEntries = [newEntry, ...financeEntries];
        setFinanceEntries(updatedEntries);
        localStorage.setItem('financeEntries', JSON.stringify(updatedEntries));
        setIsFinanceModalOpen(false);
    };

    const handleDeleteFinanceEntry = (id: number) => {
        const updatedEntries = financeEntries.filter(f => f.id !== id);
        setFinanceEntries(updatedEntries);
        localStorage.setItem('financeEntries', JSON.stringify(updatedEntries));
    };
    
    // --- Photo Report Handlers ---
    const handleSavePhotoReport = (photo: Omit<PhotoReport, 'id' | 'projectId'>) => {
        const newPhoto: PhotoReport = { ...photo, id: Date.now(), projectId: activeProjectId! };
        const updatedPhotos = [newPhoto, ...photoReports];
        setPhotoReports(updatedPhotos);
        localStorage.setItem('photoReports', JSON.stringify(updatedPhotos));
        setIsPhotoReportModalOpen(false);
    };

    const handleDeletePhotoReport = (id: number) => {
        const updatedPhotos = photoReports.filter(p => p.id !== id);
        setPhotoReports(updatedPhotos);
        localStorage.setItem('photoReports', JSON.stringify(updatedPhotos));
        setViewingPhoto(null); // Close the viewer
    };
    
    // --- Document Handlers ---
    const handleSaveDocument = (name: string, dataUrl: string) => {
        const newDoc: Document = {
            id: Date.now(),
            projectId: activeProjectId!,
            name,
            dataUrl,
            date: new Date().toISOString(),
        };
        const updatedDocs = [newDoc, ...documents];
        setDocuments(updatedDocs);
        localStorage.setItem('projectDocuments', JSON.stringify(updatedDocs));
        setIsDocumentModalOpen(false);
    };

    const handleDeleteDocument = (id: number) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот документ?', (ok) => {
            if (ok) {
                const updatedDocs = documents.filter(d => d.id !== id);
                setDocuments(updatedDocs);
                localStorage.setItem('projectDocuments', JSON.stringify(updatedDocs));
            }
        });
    };


    const activeProject = useMemo(() => projects.find(p => p.id === activeProjectId), [projects, activeProjectId]);

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => p.status === projectStatusFilter)
            .filter(p => 
                p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                p.client.toLowerCase().includes(projectSearch.toLowerCase()) ||
                p.address.toLowerCase().includes(projectSearch.toLowerCase())
            );
    }, [projects, projectStatusFilter, projectSearch]);

    // --- RENDER LOGIC ---
    
    const themeIcon = useMemo(() => {
        if (themeMode === 'light') return '☀️';
        if (themeMode === 'dark') return '🌙';
        return '🌓';
    }, [themeMode]);

    const BottomNav = () => (
        <nav className="bottom-nav">
            <button onClick={() => setActiveView('estimate')} className={activeView === 'estimate' ? 'active' : ''}>
                <span className="icon">📝</span>
                <span>Смета</span>
            </button>
            <button onClick={() => setActiveView('projects')} className={activeView.startsWith('project') ? 'active' : ''}>
                <span className="icon">🏗️</span>
                <span>Проекты</span>
            </button>
        </nav>
    );

    const renderCurrentView = () => {
        if (activeView === 'projects') {
            return <ProjectsListView {...{
                handleOpenProjectModal, projectStatusFilter, setProjectStatusFilter, projectSearch, setProjectSearch,
                handleInputFocus, filteredProjects, projects, setActiveProjectId, setActiveView
            }} />;
        }
        if (activeView === 'projectDetail') {
            if (!activeProject) {
                // This can happen if a project is deleted while being viewed.
                // Redirecting to the project list is a safe fallback.
                useEffect(() => {
                    setActiveView('projects');
                }, []);
                return null;
            }
            return <ProjectDetailView {...{
                activeProject, estimates, financeEntries, photoReports, documents, formatCurrency, statusMap, setActiveView,
                setActiveProjectId, handleOpenProjectModal, handleDeleteProject,
                handleLoadEstimate, handleAddNewEstimateForProject,
                onOpenFinanceModal: () => setIsFinanceModalOpen(true),
                onDeleteFinanceEntry: handleDeleteFinanceEntry,
                onOpenPhotoReportModal: () => setIsPhotoReportModalOpen(true),
                onViewPhoto: (photo) => setViewingPhoto(photo),
                onOpenDocumentModal: () => setIsDocumentModalOpen(true),
                onDeleteDocument: handleDeleteDocument
            }} />;
        }
        // Default to 'estimate'
        return <EstimateView {...{
            currentEstimateProjectId, handleBackToProject, clientInfo, setClientInfo, setIsDirty,
            handleThemeChange, themeIcon, themeMode, setIsLibraryOpen, setIsEstimatesListOpen, setIsSettingsOpen,
            estimateNumber, setEstimateNumber, estimateDate, setEstimateDate, handleInputFocus, items,
            dragItem, dragOverItem, handleDragSort, fileInputRefs, handleItemImageChange,
            handleRemoveItemImage, handleRemoveItem, handleItemChange, formatCurrency, handleAddItem,
            discount, setDiscount, discountType, setDiscountType, tax, setTax, calculation,
            handleSave, isDirty, isPdfLoading, handleExportPDF, setIsShoppingListOpen, handleShare
        }} />;
    };

    return (
        <>
            <div className="app-container">
                {isSettingsOpen && <SettingsModal 
                    profile={companyProfile}
                    onClose={() => setIsSettingsOpen(false)}
                    onProfileChange={handleProfileChange}
                    onLogoChange={handleLogoChange}
                    onRemoveLogo={removeLogo}
                    onSave={handleSaveProfile}
                    onInputFocus={handleInputFocus as any}
                />}
                {isEstimatesListOpen && <EstimatesListModal
                    onClose={() => setIsEstimatesListOpen(false)}
                    estimates={estimates}
                    templates={templates}
                    activeEstimateId={activeEstimateId}
                    statusMap={statusMap}
                    formatCurrency={formatCurrency}
                    onLoadEstimate={handleLoadEstimate}
                    onDeleteEstimate={handleDeleteEstimate}
                    onStatusChange={handleStatusChange}
                    onSaveAsTemplate={handleSaveAsTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onNewEstimate={handleNewEstimate}
                    onInputFocus={handleInputFocus as any}
                 />}
                {isLibraryOpen && <LibraryModal 
                    onClose={() => setIsLibraryOpen(false)}
                    libraryItems={libraryItems}
                    onLibraryItemsChange={setLibraryItems}
                    onAddItemToEstimate={handleAddFromLibrary}
                    formatCurrency={formatCurrency}
                    onInputFocus={handleInputFocus as any}
                    showAlert={safeShowAlert}
                    showConfirm={safeShowConfirm}
                />}
                {isProjectModalOpen && <NewProjectModal 
                    project={editingProject}
                    onClose={() => setIsProjectModalOpen(false)}
                    onProjectChange={setEditingProject}
                    onSave={handleSaveProject}
                    onInputFocus={handleInputFocus as any}
                />}
                {isFinanceModalOpen && <FinanceEntryModal
                    onClose={() => setIsFinanceModalOpen(false)}
                    onSave={handleSaveFinanceEntry}
                    showAlert={safeShowAlert}
                    onInputFocus={handleInputFocus}
                />}
                {isPhotoReportModalOpen && <PhotoReportModal
                    onClose={() => setIsPhotoReportModalOpen(false)}
                    onSave={handleSavePhotoReport}
                    showAlert={safeShowAlert}
                />}
                {viewingPhoto && <PhotoViewerModal
                    photo={viewingPhoto}
                    onClose={() => setViewingPhoto(null)}
                    onDelete={handleDeletePhotoReport}
                />}
                {isShoppingListOpen && <ShoppingListModal
                    items={items}
                    onClose={() => setIsShoppingListOpen(false)}
                    showAlert={safeShowAlert}
                />}
                 {isDocumentModalOpen && <DocumentUploadModal
                    onClose={() => setIsDocumentModalOpen(false)}
                    onSave={handleSaveDocument}
                    showAlert={safeShowAlert}
                />}


                {renderCurrentView()}
            </div>
            <BottomNav />
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);