import { useState, useEffect, useCallback, useMemo } from 'react';
import { Estimate, Item, LibraryItem, CalculationResults, EstimateStatus } from '../types';
import { supabase } from '../supabaseClient';
import { generateNewEstimateNumber } from '../utils';

// Helper to map database estimate to frontend type
const mapEstimateFromDb = (dbEstimate: any): Estimate => {
    return {
        id: dbEstimate.id,
        user_id: dbEstimate.user_id,
        projectId: dbEstimate.project_id,
        number: dbEstimate.number,
        clientInfo: dbEstimate.client_info,
        date: dbEstimate.date,
        status: dbEstimate.status,
        discount: dbEstimate.discount,
        discountType: dbEstimate.discount_type,
        tax: dbEstimate.tax,
        createdAt: dbEstimate.created_at,
        updatedAt: dbEstimate.updated_at,
        items: dbEstimate.estimate_items ? dbEstimate.estimate_items.map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            image: item.image_url, // Note: field name difference
            type: item.type,
        })) : [],
    };
};

// Helper to map frontend estimate to database type
const mapEstimateToDb = (estimate: Partial<Estimate>) => {
    return {
        id: estimate.id,
        user_id: estimate.user_id,
        project_id: estimate.projectId,
        number: estimate.number,
        client_info: estimate.clientInfo,
        date: estimate.date,
        status: estimate.status,
        discount: estimate.discount,
        discount_type: estimate.discountType,
        tax: estimate.tax,
    };
};


export const useEstimates = (session: any) => {
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [templates, setTemplates] = useState<Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Current estimate state (for the editor)
    const [currentEstimate, setCurrentEstimate] = useState<Estimate | null>(null);
    const [clientInfo, setClientInfo] = useState('');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [estimateDate, setEstimateDate] = useState('');
    const [items, setItems] = useState<Item[]>([]);
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [tax, setTax] = useState(0);

    // Load all estimates for the user
    const fetchEstimates = useCallback(async () => {
        if (!session?.user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('estimates')
            .select('*, estimate_items(*)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching estimates:', error);
        } else {
            setEstimates(data.map(mapEstimateFromDb));
        }
        setLoading(false);
    }, [session]);

    useEffect(() => {
        fetchEstimates();
    }, [fetchEstimates]);

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

    // Load a specific estimate into the editor
    const loadEstimate = useCallback((id: string) => {
        const estimate = estimates.find(e => e.id === id);
        if (estimate) {
            setCurrentEstimate(estimate);
            setClientInfo(estimate.clientInfo);
            setEstimateNumber(estimate.number);
            setEstimateDate(new Date(estimate.date).toISOString().split('T')[0]);
            setItems(estimate.items);
            setDiscount(estimate.discount);
            setDiscountType(estimate.discountType);
            setTax(estimate.tax);
        }
    }, [estimates]);

    // Set up a new blank estimate in the editor
    const createNewEstimate = useCallback((template?: Partial<Estimate>) => {
        const newNumber = generateNewEstimateNumber(estimates);
        const newEstimate: Estimate = {
            id: `temp-${Date.now()}`, // Temporary ID
            user_id: session.user.id,
            projectId: template?.projectId || null,
            clientInfo: template?.clientInfo || '',
            items: template?.items || [],
            discount: template?.discount || 0,
            discountType: template?.discountType || 'percent',
            tax: template?.tax || 0,
            number: newNumber,
            date: new Date().toISOString(),
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        
        setCurrentEstimate(newEstimate);
        setClientInfo(newEstimate.clientInfo);
        setEstimateNumber(newEstimate.number);
        setEstimateDate(new Date(newEstimate.date).toISOString().split('T')[0]);
        setItems(newEstimate.items);
        setDiscount(newEstimate.discount);
        setDiscountType(newEstimate.discountType);
        setTax(newEstimate.tax);
        
        return newEstimate;
    }, [estimates, session]);

    // Save estimate (handles both create and update)
    const saveEstimate = useCallback(async (projectId?: string | null) => {
        if (!currentEstimate || !session?.user) return;

        const isNewEstimate = currentEstimate.id.startsWith('temp-');

        const estimateDataForDb = {
            ...mapEstimateToDb(currentEstimate),
            client_info: clientInfo,
            number: estimateNumber,
            date: estimateDate,
            discount: discount,
            discount_type: discountType,
            tax: tax,
            project_id: projectId !== undefined ? projectId : currentEstimate.projectId,
            user_id: session.user.id,
        };
        
        if (isNewEstimate) {
            // CREATE
            const { data: newEstimateDb, error: estimateError } = await supabase
                .from('estimates')
                .insert(estimateDataForDb)
                .select('*, estimate_items(*)')
                .single();

            if (estimateError) {
                console.error("Error creating estimate:", estimateError);
                return;
            }

            const itemsWithEstimateId = items.map(item => ({
                ...item,
                estimate_id: newEstimateDb.id,
                image_url: item.image,
            }));
            
            const { error: itemsError } = await supabase
                .from('estimate_items')
                .insert(itemsWithEstimateId);

            if (itemsError) {
                console.error("Error creating estimate items:", itemsError);
                // Optionally, delete the estimate that was just created
                await supabase.from('estimates').delete().eq('id', newEstimateDb.id);
                return;
            }
            
            const finalEstimate = mapEstimateFromDb(newEstimateDb);
            finalEstimate.items = items; // ensure items are in state
            setEstimates(prev => [finalEstimate, ...prev]);
            setCurrentEstimate(finalEstimate);

        } else {
            // UPDATE
            const { data: updatedEstimateDb, error: estimateError } = await supabase
                .from('estimates')
                .update(estimateDataForDb)
                .eq('id', currentEstimate.id)
                .select()
                .single();

            if (estimateError) {
                console.error("Error updating estimate:", estimateError);
                return;
            }

            // Easiest way: delete all old items and insert new ones
            const { error: deleteError } = await supabase
                .from('estimate_items')
                .delete()
                .eq('estimate_id', currentEstimate.id);

            if (deleteError) {
                console.error("Error deleting old items:", deleteError);
                return;
            }

            const itemsWithEstimateId = items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                unit: item.unit,
                image_url: item.image,
                type: item.type,
                estimate_id: currentEstimate.id,
            }));

            const { error: itemsError } = await supabase
                .from('estimate_items')
                .insert(itemsWithEstimateId);
            
            if (itemsError) {
                console.error("Error inserting new items:", itemsError);
                return;
            }

            const finalEstimate = { ...currentEstimate, ...mapEstimateFromDb(updatedEstimateDb), items };
            setEstimates(prev => prev.map(e => e.id === finalEstimate.id ? finalEstimate : e));
            setCurrentEstimate(finalEstimate);
        }
    }, [currentEstimate, clientInfo, estimateNumber, estimateDate, items, discount, discountType, tax, session]);

    // Delete estimate
    const deleteEstimate = useCallback(async (id: string) => {
        const { error } = await supabase.from('estimates').delete().eq('id', id);
        if (error) {
            console.error("Error deleting estimate:", error);
        } else {
            setEstimates(prev => prev.filter(e => e.id !== id));
            if (currentEstimate?.id === id) {
                setCurrentEstimate(null);
            }
        }
    }, [currentEstimate]);

    // Update estimate status
    const updateEstimateStatus = useCallback(async (id: string, status: EstimateStatus) => {
        const { data, error } = await supabase
            .from('estimates')
            .update({ status })
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error("Error updating status:", error);
        } else {
            const updatedEstimate = mapEstimateFromDb(data);
            setEstimates(prev => prev.map(e => e.id === id ? { ...e, ...updatedEstimate } : e));
        }
    }, []);

    // Item management (operates on local state, saved via saveEstimate)
    const addItem = useCallback(() => {
        const newItem: Item = {
            id: `temp-item-${Date.now()}`,
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
            id: `temp-item-${Date.now()}`,
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
            id: `temp-item-${Date.now()}`,
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
    
    const reorderItems = useCallback((dragIndex: number, hoverIndex: number) => {
        setItems(prev => {
            const newItems = [...prev];
            const draggedItem = newItems[dragIndex];
            newItems.splice(dragIndex, 1);
            newItems.splice(hoverIndex, 0, draggedItem);
            return newItems;
        });
    }, []);
    
    const getEstimatesByProject = useCallback((projectId: string) => {
        return estimates.filter(e => e.projectId === projectId);
    }, [estimates]);
    
    const getCurrentEstimateProjectId = useCallback(() => {
        return currentEstimate?.projectId || null;
    }, [currentEstimate]);
    
    return {
        estimates,
        templates,
        loading,
        currentEstimate,
        clientInfo,
        estimateNumber,
        estimateDate,
        items,
        discount,
        discountType,
        tax,
        calculation,
        setClientInfo,
        setEstimateNumber,
        setEstimateDate,
        setDiscount,
        setDiscountType,
        setTax,
        loadEstimate,
        createNewEstimate,
        saveEstimate,
        deleteEstimate,
        updateEstimateStatus,
        saveAsTemplate: () => {}, // Placeholder, templates not in DB yet
        deleteTemplate: () => {}, // Placeholder
        addItem,
        updateItem,
        removeItem,
        addItemFromLibrary,
        addItemsFromAI,
        updateItemImage,
        reorderItems,
        getEstimatesByProject,
        getCurrentEstimateProjectId
    };
};
