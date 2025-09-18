import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Estimate, EstimatesListModalProps, EstimateStatus } from '../../types';
import { IconClose, IconClipboard, IconTrash } from '../common/Icon';
import { useProjectContext } from '../../context/ProjectContext';

export const EstimatesListModal: React.FC<EstimatesListModalProps> = ({ onClose, estimates, templates, activeEstimateId, statusMap, formatCurrency, onLoadEstimate, onDeleteEstimate, onStatusChange, onSaveAsTemplate, onDeleteTemplate, onNewEstimate, onInputFocus }) => {
    const [activeTab, setActiveTab] = useState<'estimates' | 'templates'>('estimates');
    const [estimatesSearch, setEstimatesSearch] = useState('');
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

    const filteredEstimates = useMemo(() => estimates.filter(e => e.number.toLowerCase().includes(estimatesSearch.toLowerCase()) || (e.clientInfo && e.clientInfo.toLowerCase().includes(estimatesSearch.toLowerCase()))), [estimates, estimatesSearch]);
    const filteredTemplates = useMemo(() => {
        console.log('🔧 EstimatesListModal: Фильтрация шаблонов');
        console.log('🔧 EstimatesListModal: templates.length:', templates.length);
        console.log('🔧 EstimatesListModal: estimatesSearch:', estimatesSearch);
        console.log('🔧 EstimatesListModal: templates:', templates);
        
        if (!estimatesSearch.trim()) {
            // Если поиск пустой, показываем все шаблоны
            const result = templates.map((t, i) => ({ ...t, index: i }));
            console.log('🔧 EstimatesListModal: Показываем все шаблоны, результат:', result);
            return result;
        }
        // Если есть поиск, фильтруем по названиям позиций
        const result = templates.map((t, i) => ({ ...t, index: i })).filter(t => 
            t.items.some(item => item.name.toLowerCase().includes(estimatesSearch.toLowerCase()))
        );
        console.log('🔧 EstimatesListModal: Фильтрованные шаблоны:', result);
        return result;
    }, [templates, estimatesSearch]);

    const { activeProjectId } = useProjectContext();

    const handleSelectTemplate = (template) => {
      // Создаем новую смету из шаблона
      const newEstimate = { 
        ...template, 
        id: crypto.randomUUID(), // Создаем новый уникальный ID
        projectId: activeProjectId, // Привязываем ID проекта из контекста (будет null, если мы не в проекте)
        date: new Date().toISOString().split('T')[0], // Устанавливаем текущую дату
        status: 'draft' // Устанавливаем статус "черновик"
      };
      onNewEstimate(newEstimate); // Вызываем родительскую функцию с подготовленной сметой
    };

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setEstimatesSearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" ref={modalRef}>
                <div className="modal-header">
                    <h2>Мои документы</h2>
                    <button onClick={() => { onClose(); setEstimatesSearch(''); }} className="close-btn" aria-label="Закрыть"><IconClose/></button>
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
                                <div className="list-item-info">
                                    <strong>{e.number || 'Без названия'}</strong>
                                    <div className="estimate-meta">
                                        <span className="estimate-date">{new Date(e.date).toLocaleDateString('ru-RU')}</span>
                                        <span className="status-badge" style={{ backgroundColor: statusMap[e.status].color, color: statusMap[e.status].textColor }}>{statusMap[e.status].text}</span>
                                    </div>
                                </div>
                                <div className="list-item-actions"><select value={e.status} onChange={(ev) => onStatusChange(e.id, ev.target.value as EstimateStatus)} onClick={ev => ev.stopPropagation()} className="status-select">{Object.entries(statusMap).map(([k, v]) => (<option key={k} value={k}>{v.text}</option>))}</select><button onClick={() => onSaveAsTemplate(e.id)} className="btn btn-secondary" title="Сохранить как шаблон"><IconClipboard/></button><button onClick={() => onLoadEstimate(e.id)} className="btn btn-secondary">Загрузить</button><button onClick={() => onDeleteEstimate(e.id)} className="btn btn-tertiary"><IconTrash/></button></div>
                            </div>))
                        }
                    </>)}
                    {activeTab === 'templates' && ( <>
                         {filteredTemplates.length === 0 ? <p className="no-results-message">{templates.length > 0 ? 'Ничего не найдено.' : 'Шаблонов нет.'}</p> :
                            filteredTemplates.map(t => ( <div key={t.id} className="list-item">
                                <div className="list-item-info"><strong>{t.name}</strong><span>{t.items.length} поз., Итого: {formatCurrency(t.items.reduce((acc, i) => acc + i.price * i.quantity, 0))}</span></div>
                                <div className="list-item-actions"><button onClick={() => { handleSelectTemplate(t); onClose(); }} className="btn btn-primary">Использовать</button><button onClick={() => onDeleteTemplate(t.id)} className="btn btn-tertiary"><IconTrash/></button></div>
                            </div>))
                        }
                    </>)}
                </div>

            </div>
        </div>
    );
};