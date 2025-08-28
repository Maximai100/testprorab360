import React from 'react';
import { EstimateViewProps } from '../../types';
import { IconBook, IconChevronRight, IconClose, IconDragHandle, IconFolder, IconPaperclip, IconPlus, IconSettings, IconSparkles, IconCart, Icon } from '../common/Icon';
import { Loader } from '../common/Loader';

export const EstimateView: React.FC<EstimateViewProps> = ({
    currentEstimateProjectId, handleBackToProject, clientInfo, setClientInfo, setIsDirty, 
    handleThemeChange, themeIcon, themeMode, setIsLibraryOpen, setIsEstimatesListOpen, setIsSettingsOpen, setIsAISuggestModalOpen,
    estimateNumber, setEstimateNumber, estimateDate, setEstimateDate, handleInputFocus, items, 
    dragItem, dragOverItem, handleDragSort, fileInputRefs, handleItemImageChange, 
    handleRemoveItemImage, handleRemoveItem, handleItemChange, formatCurrency, handleAddItem, 
    discount, setDiscount, discountType, setDiscountType, tax, setTax, calculation, 
    handleSave, isDirty, isPdfLoading, isSaving, draggingItem, setDraggingItem, handleExportPDF, setIsShoppingListOpen, handleShare 
}) => (
    <>
        <header className="estimate-header">
            {currentEstimateProjectId && <button onClick={handleBackToProject} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>}
            <h1 className={currentEstimateProjectId ? 'with-back-btn' : ''}>{clientInfo || 'Новая смета'}</h1>
            <div className="header-actions">
                <button onClick={() => setIsAISuggestModalOpen(true)} className="header-btn" aria-label="AI-помощник"><IconSparkles/></button>
            </div>
        </header>
        <main>
            <div className="card"><input type="text" value={clientInfo} onChange={(e) => { setClientInfo(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} className="client-info-input" placeholder="Имя клиента или адрес объекта" aria-label="Имя клиента или адрес объекта"/></div>
            <div className="card estimate-meta"><div className="meta-field"><label htmlFor="estimateNumber">Номер сметы</label><input id="estimateNumber" type="text" value={estimateNumber} onChange={e => { setEstimateNumber(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div><div className="meta-field"><label htmlFor="estimateDate">Дата</label><input id="estimateDate" type="date" value={estimateDate} onChange={e => { setEstimateDate(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div></div>
            <div className="items-list">
                {items.map((item: any, index: number) => (
                    <div 
                        className={`item-card ${draggingItem === item.id ? 'dragging' : ''}`}
                        key={item.id} 
                        draggable 
                        onDragStart={() => {
                            dragItem.current = index;
                            setDraggingItem(item.id);
                        }} 
                        onDragEnter={() => dragOverItem.current = index} 
                        onDragEnd={() => {
                            handleDragSort();
                            setDraggingItem(null);
                        }} 
                        onDragOver={(e) => e.preventDefault()}>
                        <div className="item-header">
                            <div className="drag-handle" aria-label="Переместить"><IconDragHandle/></div>
                            <span className="item-number">Позиция #{index + 1}</span>
                            <div className="item-header-actions">
                                <button onClick={() => fileInputRefs.current[item.id]?.click()} className="attach-btn" aria-label="Прикрепить фото"><IconPaperclip/></button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={el => { fileInputRefs.current[item.id] = el; }}
                                    onChange={(e) => handleItemImageChange(item.id, e)}
                                />
                                <button onClick={() => handleRemoveItem(item.id)} className="remove-btn" aria-label="Удалить позицию"><IconClose/></button>
                            </div>
                        </div>
                        <div className="item-inputs">
                            <input type="text" placeholder="Наименование" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} onFocus={handleInputFocus} aria-label="Наименование" className="item-name-input" />
                            <div className="item-details-grid">
                                <input type="number" placeholder="Кол-во" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Количество" min="0"/>
                                <input type="text" placeholder="Ед.изм." value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} onFocus={handleInputFocus} aria-label="Единица измерения" />
                                <input type="number" placeholder="Цена" value={item.price || ''} onChange={(e) => handleItemChange(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Цена" min="0"/>
                                <div className="item-row-total">{formatCurrency(item.quantity * item.price)}</div>
                            </div>
                        </div>
                        {item.image && (
                            <div className="image-preview-container">
                                <img src={item.image} alt="Предпросмотр" className="image-preview" />
                                <button onClick={() => handleRemoveItemImage(item.id)} className="remove-image-btn" aria-label="Удалить изображение"><IconClose/></button>
                            </div>
                        )}
                        <div className="item-footer">
                            <div className="item-type-toggle">
                                <button onClick={() => handleItemChange(item.id, 'type', 'work')} className={item.type === 'work' ? 'active' : ''}>Работа</button>
                                <button onClick={() => handleItemChange(item.id, 'type', 'material')} className={item.type === 'material' ? 'active' : ''}>Материал</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="add-items-container">
                <button onClick={handleAddItem} className="btn btn-secondary"><IconPlus/> Добавить позицию</button>
                <button onClick={() => setIsLibraryOpen(true)} className="btn btn-secondary"><IconBook/> Из справочника</button>
            </div>
            <div className="add-items-container">
                 <button onClick={() => setIsAISuggestModalOpen(true)} className="btn btn-secondary btn-ai"><IconSparkles/> AI-помощник</button>
            </div>
            <div className="summary-details card"><div className="summary-row"><label htmlFor="discount">Скидка</label><div className="input-group"><input id="discount" type="number" value={discount || ''} onChange={(e) => { setDiscount(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/><div className="toggle-group"><button onClick={() => { setDiscountType('percent'); setIsDirty(true); }} className={discountType === 'percent' ? 'active' : ''}>%</button><button onClick={() => { setDiscountType('fixed'); setIsDirty(true); }} className={discountType === 'fixed' ? 'active' : ''}>РУБ</button></div></div></div><div className="summary-row"><label htmlFor="tax">Налог (%)</label><div className="input-group"><input id="tax" type="number" value={tax || ''} onChange={(e) => { setTax(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/></div></div></div>
            <div className="total-container card">
                <div className="total-breakdown">
                    <div className="total-row"><span>Материалы</span><span>{formatCurrency(calculation.materialsTotal)}</span></div>
                    <div className="total-row"><span>Работа</span><span>{formatCurrency(calculation.workTotal)}</span></div>
                    <div className="total-row"><span>Подытог</span><span>{formatCurrency(calculation.subtotal)}</span></div>
                    {calculation.discountAmount > 0 && (
                        <div className="total-row">
                            <span>Скидка ({discountType === 'percent' ? `${discount}%` : formatCurrency(discount)})</span>
                            <span>-{formatCurrency(calculation.discountAmount)}</span>
                        </div>
                    )}
                    {calculation.taxAmount > 0 && (
                        <div className="total-row">
                            <span>Налог ({tax}%)</span>
                            <span>+{formatCurrency(calculation.taxAmount)}</span>
                        </div>
                    )}
                    <div className="total-row grand-total">
                        <span>Итого:</span>
                        <span>{formatCurrency(calculation.grandTotal)}</span>
                    </div>
                </div>
            </div>
            <div className="actions-footer">
                <button onClick={handleSave} className="btn btn-secondary save-btn" disabled={!isDirty || isSaving}>
                    {isSaving ? <Loader /> : (isDirty ? 'Сохранить' : 'Сохранено ✓')}
                </button>
                <button onClick={handleExportPDF} className="btn btn-secondary" disabled={isPdfLoading}>
                    {isPdfLoading ? <Loader /> : 'Экспорт в PDF'}
                </button>
                <button onClick={() => setIsShoppingListOpen(true)} className="btn btn-secondary shopping-list-btn"><IconCart/> Список покупок</button>
                <button onClick={handleShare} className="btn btn-primary share-btn">Поделиться</button>
            </div>
        </main>
    </>
);