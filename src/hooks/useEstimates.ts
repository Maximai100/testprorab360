import { useState, useEffect, useCallback, useMemo } from 'react';
import { Estimate, Item, LibraryItem, CalculationResults } from '../types';
import { dataService, dataUtils } from '../services/storageService';
import { generateNewEstimateNumber } from '../utils';

export const useEstimates = () => {
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [templates, setTemplates] = useState<Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>[]>([]);
    
    // Current estimate state
    const [currentEstimate, setCurrentEstimate] = useState<Estimate | null>(null);
    const [clientInfo, setClientInfo] = useState('');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [estimateDate, setEstimateDate] = useState('');
    const [items, setItems] = useState<Item[]>([]);
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [tax, setTax] = useState(0);
    
    // Load data from storage
    useEffect(() => {
        setEstimates(dataService.getEstimates());
        setTemplates(dataService.getEstimateTemplates());
    }, []);
    
    // Save data to storage when it changes
    useEffect(() => {
        dataService.setEstimates(estimates);
    }, [estimates]);
    
    useEffect(() => {
        dataService.setEstimateTemplates(templates);
    }, [templates]);
    
    // Calculate estimate totals
    const calculation = useMemo((): CalculationResults => {
        const materialsTotal = items
            .filter(item => item.type === 'material')
            .reduce((sum, item) => sum + (item.quantity * item.price), 0);
        
        const workTotal = items
            .filter(item => item.type === 'work')
            .reduce((sum, item) => sum + (item.quantity * item.price), 0);
        
        const subtotal = materialsTotal + workTotal;
        
        const discountAmount = discountType === 'percent' 
            ? subtotal * (discount / 100)
            : discount;
        
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (tax / 100);
        const grandTotal = totalAfterDiscount + taxAmount;
        
        return {
            subtotal,
            materialsTotal,
            workTotal,
            discountAmount,
            taxAmount,
            grandTotal
        };
    }, [items, discount, discountType, tax]);
    
    // Load estimate by ID
    const loadEstimate = useCallback((id: string) => {
        const estimate = estimates.find(e => e.id === id);
        if (estimate) {
            setCurrentEstimate(estimate);
            setClientInfo(estimate.clientInfo);
            setEstimateNumber(estimate.number);
            setEstimateDate(estimate.date);
            setItems(estimate.items);
            setDiscount(estimate.discount);
            setDiscountType(estimate.discountType);
            setTax(estimate.tax);
        }
    }, [estimates]);
    
    // Create new estimate
    const createNewEstimate = useCallback((template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        const newEstimate = dataUtils.createEntity({
            clientInfo: '',
            items: template?.items || [],
            discount: template?.discount || 0,
            discountType: template?.discountType || 'percent',
            tax: template?.tax || 0,
            number: generateNewEstimateNumber(estimates),
            date: new Date().toISOString().split('T')[0],
            status: 'draft' as const,
            projectId: null
        });
        
        setCurrentEstimate(newEstimate);
        setClientInfo(newEstimate.clientInfo);
        setEstimateNumber(newEstimate.number);
        setEstimateDate(newEstimate.date);
        setItems(newEstimate.items);
        setDiscount(newEstimate.discount);
        setDiscountType(newEstimate.discountType);
        setTax(newEstimate.tax);
        
        return newEstimate;
    }, [estimates]);
    
    // Save current estimate
    const saveEstimate = useCallback((projectId?: string | null) => {
        if (!currentEstimate) return;
        
        const updatedEstimate = dataUtils.updateTimestamps({
            ...currentEstimate,
            clientInfo,
            number: estimateNumber,
            date: estimateDate,
            items,
            discount,
            discountType,
            tax,
            projectId: projectId || currentEstimate.projectId
        });
        
        setEstimates(prev => {
            const existingIndex = prev.findIndex(e => e.id === updatedEstimate.id);
            if (existingIndex >= 0) {
                const newEstimates = [...prev];
                newEstimates[existingIndex] = updatedEstimate;
                return newEstimates;
            } else {
                return [...prev, updatedEstimate];
            }
        });
        
        setCurrentEstimate(updatedEstimate);
    }, [currentEstimate, clientInfo, estimateNumber, estimateDate, items, discount, discountType, tax]);
    
    // Delete estimate
    const deleteEstimate = useCallback((id: string) => {
        setEstimates(prev => prev.filter(e => e.id !== id));
        if (currentEstimate?.id === id) {
            setCurrentEstimate(null);
            setClientInfo('');
            setEstimateNumber('');
            setEstimateDate('');
            setItems([]);
            setDiscount(0);
            setDiscountType('percent');
            setTax(0);
        }
    }, [currentEstimate]);
    
    // Update estimate status
    const updateEstimateStatus = useCallback((id: string, status: Estimate['status']) => {
        setEstimates(prev => prev.map(e => 
            e.id === id ? dataUtils.updateTimestamps({ ...e, status }) : e
        ));
    }, []);
    
    // Save as template
    const saveAsTemplate = useCallback((id: string) => {
        const estimate = estimates.find(e => e.id === id);
        if (estimate) {
            const template = {
                items: estimate.items,
                discount: estimate.discount,
                discountType: estimate.discountType,
                tax: estimate.tax
            };
            setTemplates(prev => [...prev, template]);
        }
    }, [estimates]);
    
    // Delete template
    const deleteTemplate = useCallback((index: number) => {
        setTemplates(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    // Item management
    const addItem = useCallback(() => {
        const newItem: Item = {
            id: dataUtils.generateId(),
            name: '',
            quantity: 1,
            price: 0,
            unit: 'шт',
            image: null,
            type: 'work'
        };
        setItems(prev => [...prev, newItem]);
    }, []);
    
    const updateItem = useCallback((id: string, field: keyof Item, value: string | number) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    }, []);
    
    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);
    
    const addItemFromLibrary = useCallback((libraryItem: LibraryItem) => {
        const newItem: Item = {
            id: dataUtils.generateId(),
            name: libraryItem.name,
            quantity: 1,
            price: libraryItem.price,
            unit: libraryItem.unit,
            image: null,
            type: 'work'
        };
        setItems(prev => [...prev, newItem]);
    }, []);
    
    const addItemsFromAI = useCallback((aiItems: Omit<Item, 'id' | 'image' | 'type'>[]) => {
        const newItems: Item[] = aiItems.map(item => ({
            ...item,
            id: dataUtils.generateId(),
            image: null,
            type: 'work'
        }));
        setItems(prev => [...prev, ...newItems]);
    }, []);
    
    const updateItemImage = useCallback((id: string, image: string | null) => {
        setItems(prev => prev.map(item => 
            item.id === id ? { ...item, image } : item
        ));
    }, []);
    
    // Drag and drop for items
    const reorderItems = useCallback((dragIndex: number, hoverIndex: number) => {
        setItems(prev => {
            const newItems = [...prev];
            const draggedItem = newItems[dragIndex];
            newItems.splice(dragIndex, 1);
            newItems.splice(hoverIndex, 0, draggedItem);
            return newItems;
        });
    }, []);
    
    // Get estimates by project
    const getEstimatesByProject = useCallback((projectId: string) => {
        return estimates.filter(e => e.projectId === projectId);
    }, [estimates]);
    
    // Get current estimate project ID
    const getCurrentEstimateProjectId = useCallback(() => {
        return currentEstimate?.projectId || null;
    }, [currentEstimate]);
    
    return {
        // State
        estimates,
        templates,
        currentEstimate,
        clientInfo,
        estimateNumber,
        estimateDate,
        items,
        discount,
        discountType,
        tax,
        calculation,
        
        // Actions
        setClientInfo,
        setEstimateNumber,
        setEstimateDate,
        setDiscount,
        setDiscountType,
        setTax,
        
        // Estimate management
        loadEstimate,
        createNewEstimate,
        saveEstimate,
        deleteEstimate,
        updateEstimateStatus,
        saveAsTemplate,
        deleteTemplate,
        
        // Item management
        addItem,
        updateItem,
        removeItem,
        addItemFromLibrary,
        addItemsFromAI,
        updateItemImage,
        reorderItems,
        
        // Utilities
        getEstimatesByProject,
        getCurrentEstimateProjectId
    };
};