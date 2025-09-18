import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Project, FinanceEntry, PhotoReport, Document, WorkStage, Note, 
    Tool, Consumable, ProjectFinancials, ProjectStatus 
} from '../types';
import { dataService, dataUtils } from '../services/storageService';
import { supabase } from '../supabaseClient';
import { useFileStorage } from './useFileStorage';

export const useProjects = () => {
    console.log('useProjects: Хук useProjects инициализируется');
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
    const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [workStages, setWorkStages] = useState<WorkStage[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [scratchpad, setScratchpad] = useState('');
    const [globalDocuments, setGlobalDocuments] = useState<Document[]>([]);
    
    // Инициализируем хук для работы с файлами
    const { uploadFileWithFallback } = useFileStorage();
    
    // Load data from storage (only for non-Supabase data)
    useEffect(() => {
        // Не загружаем проекты из локального хранилища, они будут загружены из Supabase
        setFinanceEntries(dataService.getFinanceEntries());
        setPhotoReports(dataService.getPhotoReports());
        setDocuments(dataService.getDocuments());
        setWorkStages(dataService.getWorkStages());
        setNotes(dataService.getNotes());
        setTools(dataService.getTools());
        setConsumables(dataService.getConsumables());
        setScratchpad(dataService.getScratchpad());
        setGlobalDocuments(dataService.getGlobalDocuments());
    }, []);
    
    // Save data to storage when it changes
    useEffect(() => {
        console.log('useProjects: projects изменились:', projects);
        dataService.setProjects(projects);
    }, [projects]);
    
    useEffect(() => {
        dataService.setFinanceEntries(financeEntries);
    }, [financeEntries]);
    
    useEffect(() => {
        dataService.setPhotoReports(photoReports);
    }, [photoReports]);
    
    useEffect(() => {
        dataService.setDocuments(documents);
    }, [documents]);
    
    useEffect(() => {
        dataService.setWorkStages(workStages);
    }, [workStages]);
    
    useEffect(() => {
        dataService.setNotes(notes);
    }, [notes]);
    
    
    useEffect(() => {
        dataService.setTools(tools);
    }, [tools]);
    
    useEffect(() => {
        dataService.setConsumables(consumables);
    }, [consumables]);
    
    useEffect(() => {
        dataService.setScratchpad(scratchpad);
    }, [scratchpad]);
    
    useEffect(() => {
        dataService.setGlobalDocuments(globalDocuments);
    }, [globalDocuments]);
    
    // Project management
    const createProject = useCallback((projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newProject = dataUtils.createEntity(projectData);
        setProjects(prev => [...prev, newProject]);
        return newProject;
    }, []);
    
    const updateProject = useCallback((id: string, updates: Partial<Project>) => {
        setProjects(prev => prev.map(project => 
            project.id === id ? dataUtils.updateTimestamps({ ...project, ...updates }) : project
        ));
    }, []);
    
    const deleteProject = useCallback((id: string) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        // Also delete related data
        setFinanceEntries(prev => prev.filter(f => f.projectId !== id));
        setPhotoReports(prev => prev.filter(p => p.projectId !== id));
        setDocuments(prev => prev.filter(d => d.projectId !== id));
        setWorkStages(prev => prev.filter(w => w.projectId !== id));
        setNotes(prev => prev.filter(n => n.projectId !== id));
    }, []);
    
    const getProjectById = useCallback((id: string) => {
        return projects.find(p => p.id === id) || null;
    }, [projects]);
    
    // Load projects from Supabase
    const loadProjectsFromSupabase = useCallback(async () => {
        try {
            console.log('🔄 loadProjectsFromSupabase: Начинаем загрузку проектов из Supabase...');
            console.log('🔄 loadProjectsFromSupabase: Выполняем запрос к Supabase...');
            const { data: projectsData, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            console.log('🔄 loadProjectsFromSupabase: Запрос к Supabase завершен');

            if (error) {
                console.error('loadProjectsFromSupabase: Ошибка загрузки проектов из Supabase:', error);
                return;
            }

            console.log('loadProjectsFromSupabase: Получены данные из Supabase:', projectsData);

            if (projectsData) {
                const mappedProjects = projectsData.map((row: any) => ({
                    id: row.id,
                    name: row.name,
                    client: row.client || '',
                    address: row.address || '',
                    status: row.status,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
                
                console.log('loadProjectsFromSupabase: Загружено проектов из Supabase:', mappedProjects.length, mappedProjects);
                console.log('loadProjectsFromSupabase: Устанавливаем проекты в состояние...');
                setProjects(mappedProjects);
                console.log('loadProjectsFromSupabase: Проекты установлены в состояние');
            } else {
                console.log('loadProjectsFromSupabase: Данные проектов отсутствуют');
            }
        } catch (error) {
            console.error('❌ loadProjectsFromSupabase: Ошибка при загрузке проектов:', error);
        }
        console.log('✅ loadProjectsFromSupabase: Функция завершена');
    }, []);

    // Load documents from Supabase
    const loadDocumentsFromSupabase = useCallback(async () => {
        try {
            console.log('🔄 loadDocumentsFromSupabase: Начинаем загрузку документов из Supabase...');
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('loadDocumentsFromSupabase: Пользователь не авторизован');
                return;
            }

            const { data: documentsData, error } = await supabase
                .from('documents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('loadDocumentsFromSupabase: Ошибка загрузки документов из Supabase:', error);
                return;
            }

            console.log('loadDocumentsFromSupabase: Получены данные документов из Supabase:', documentsData);

            if (documentsData) {
                const mappedDocuments = documentsData.map((row: any) => ({
                    id: row.id,
                    projectId: row.project_id,
                    name: row.name,
                    fileUrl: row.file_url,
                    storagePath: row.storage_path,
                    date: row.created_at,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
                
                console.log('loadDocumentsFromSupabase: Загружено документов из Supabase:', mappedDocuments.length);
                
                // Разделяем документы на проектные и глобальные
                const projectDocuments = mappedDocuments.filter(doc => doc.projectId);
                const globalDocuments = mappedDocuments.filter(doc => !doc.projectId);
                
                setDocuments(projectDocuments);
                setGlobalDocuments(globalDocuments);
                
                console.log('loadDocumentsFromSupabase: Документы установлены в состояние');
            } else {
                console.log('loadDocumentsFromSupabase: Данные документов отсутствуют');
                setDocuments([]);
                setGlobalDocuments([]);
            }
        } catch (error) {
            console.error('❌ loadDocumentsFromSupabase: Ошибка при загрузке документов:', error);
        }
        console.log('✅ loadDocumentsFromSupabase: Функция завершена');
    }, []);

    // Load photo reports from Supabase
    const loadPhotoReportsFromSupabase = useCallback(async () => {
        try {
            console.log('🔄 loadPhotoReportsFromSupabase: Начинаем загрузку фотоотчетов из Supabase...');
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('loadPhotoReportsFromSupabase: Пользователь не авторизован');
                return;
            }

            const { data: photoReportsData, error } = await supabase
                .from('photoreports')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('loadPhotoReportsFromSupabase: Ошибка загрузки фотоотчетов из Supabase:', error);
                return;
            }

            console.log('loadPhotoReportsFromSupabase: Получены данные фотоотчетов из Supabase:', photoReportsData);

            if (photoReportsData) {
                const mappedPhotoReports = photoReportsData.map((row: any) => ({
                    id: row.id,
                    projectId: row.project_id,
                    title: row.title,
                    photos: row.photos || [],
                    date: row.date || row.created_at,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
                
                console.log('loadPhotoReportsFromSupabase: Загружено фотоотчетов из Supabase:', mappedPhotoReports.length);
                
                setPhotoReports(mappedPhotoReports);
                
                console.log('loadPhotoReportsFromSupabase: Фотоотчеты установлены в состояние');
            } else {
                console.log('loadPhotoReportsFromSupabase: Данные фотоотчетов отсутствуют');
                setPhotoReports([]);
            }
        } catch (error) {
            console.error('❌ loadPhotoReportsFromSupabase: Ошибка при загрузке фотоотчетов:', error);
        }
        console.log('✅ loadPhotoReportsFromSupabase: Функция завершена');
    }, []);

    // Load finance entries from Supabase
    const loadFinanceEntriesFromSupabase = useCallback(async () => {
        try {
            console.log('🔄 loadFinanceEntriesFromSupabase: Начинаем загрузку финансовых записей из Supabase...');
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('loadFinanceEntriesFromSupabase: Пользователь не авторизован');
                return;
            }

            const { data: financeEntriesData, error } = await supabase
                .from('finance_entries')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('loadFinanceEntriesFromSupabase: Ошибка загрузки финансовых записей из Supabase:', error);
                return;
            }

            console.log('loadFinanceEntriesFromSupabase: Получены данные финансовых записей из Supabase:', financeEntriesData);

            if (financeEntriesData) {
                const mappedFinanceEntries: FinanceEntry[] = financeEntriesData.map((row: any) => ({
                    id: row.id,
                    projectId: row.project_id,
                    type: row.type,
                    amount: row.amount,
                    description: row.description,
                    date: row.date,
                    category: row.category || undefined,
                    receipt_url: row.receipt_url || undefined,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
                
                console.log('loadFinanceEntriesFromSupabase: Загружено финансовых записей из Supabase:', mappedFinanceEntries.length);
                
                setFinanceEntries(mappedFinanceEntries);
                
                console.log('loadFinanceEntriesFromSupabase: Финансовые записи установлены в состояние');
            } else {
                console.log('loadFinanceEntriesFromSupabase: Данные финансовых записей отсутствуют');
                setFinanceEntries([]);
            }
        } catch (error) {
            console.error('❌ loadFinanceEntriesFromSupabase: Ошибка при загрузке финансовых записей:', error);
        }
        console.log('✅ loadFinanceEntriesFromSupabase: Функция завершена');
    }, []);
    
    // Finance management
    const addFinanceEntry = useCallback(async (projectId: string, entryData: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>, receiptFile?: File) => {
        let receiptUrl: string | undefined;
        
        // Если передан файл чека, загружаем его
        if (receiptFile) {
            try {
                console.log('📄 Загружаем чек для финансовой транзакции:', receiptFile.name);
                const uploadResult = await uploadFileWithFallback('receipts', receiptFile);
                
                if (uploadResult.error) {
                    console.error('Ошибка загрузки чека:', uploadResult.error);
                    throw new Error(`Не удалось загрузить чек: ${uploadResult.error}`);
                }
                
                receiptUrl = uploadResult.publicUrl;
                console.log('📄 Чек успешно загружен:', receiptUrl);
            } catch (error) {
                console.error('Ошибка при загрузке чека:', error);
                throw error;
            }
        }
        
        try {
            // Получаем текущего пользователя
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            // Создаем запись в Supabase
            const { data, error } = await supabase
                .from('finance_entries')
                .insert({
                    user_id: user.id,
                    project_id: projectId,
                    type: entryData.type,
                    amount: entryData.amount,
                    description: entryData.description,
                    date: entryData.date,
                    category: entryData.category || null,
                    receipt_url: receiptUrl || null,
                })
                .select()
                .single();
            
            if (error) {
                console.error('Ошибка создания финансовой записи:', error);
                throw error;
            }
            
            // Преобразуем данные в формат приложения
            const newEntry: FinanceEntry = {
                id: data.id,
                projectId: data.project_id,
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date,
                category: data.category || undefined,
                receipt_url: data.receipt_url || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
            
            setFinanceEntries(prev => [...prev, newEntry]);
            console.log('📄 Финансовая запись создана:', newEntry);
            return newEntry;
            
        } catch (error) {
            console.error('Ошибка при создании финансовой записи:', error);
            throw error;
        }
    }, [uploadFileWithFallback]);
    
    const updateFinanceEntry = useCallback(async (id: string, updates: Partial<FinanceEntry>, receiptFile?: File) => {
        let receiptUrl: string | undefined = updates.receipt_url;
        
        // Если передан новый файл чека, загружаем его
        if (receiptFile) {
            try {
                console.log('📄 Обновляем чек для финансовой транзакции:', receiptFile.name);
                const uploadResult = await uploadFileWithFallback('receipts', receiptFile);
                
                if (uploadResult.error) {
                    console.error('Ошибка загрузки чека:', uploadResult.error);
                    throw new Error(`Не удалось загрузить чек: ${uploadResult.error}`);
                }
                
                receiptUrl = uploadResult.publicUrl;
                console.log('📄 Чек успешно обновлен:', receiptUrl);
            } catch (error) {
                console.error('Ошибка при обновлении чека:', error);
                throw error;
            }
        }
        
        try {
            // Получаем текущего пользователя
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }
            
            // Обновляем запись в Supabase
            const updateData: any = {};
            if (updates.type !== undefined) updateData.type = updates.type;
            if (updates.amount !== undefined) updateData.amount = updates.amount;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.date !== undefined) updateData.date = updates.date;
            if (updates.category !== undefined) updateData.category = updates.category;
            if (receiptUrl !== undefined) updateData.receipt_url = receiptUrl;
            
            const { data, error } = await supabase
                .from('finance_entries')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();
            
            if (error) {
                console.error('Ошибка обновления финансовой записи:', error);
                throw error;
            }
            
            // Преобразуем данные в формат приложения
            const updatedEntry: FinanceEntry = {
                id: data.id,
                projectId: data.project_id,
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date,
                category: data.category || undefined,
                receipt_url: data.receipt_url || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
            
            setFinanceEntries(prev => prev.map(entry => 
                entry.id === id ? updatedEntry : entry
            ));
            console.log('📄 Финансовая запись обновлена:', updatedEntry);
            
        } catch (error) {
            console.error('Ошибка при обновлении финансовой записи:', error);
            throw error;
        }
    }, [uploadFileWithFallback]);
    
    const deleteFinanceEntry = useCallback((id: string) => {
        setFinanceEntries(prev => prev.filter(f => f.id !== id));
    }, []);
    
    const getFinanceEntriesByProject = useCallback((projectId: string) => {
        return financeEntries.filter(f => f.projectId === projectId);
    }, [financeEntries]);
    
    // Photo reports management
    const addPhotoReport = useCallback((projectId: string, reportData: Omit<PhotoReport, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        const newReport = dataUtils.createEntity({
            ...reportData,
            projectId
        });
        setPhotoReports(prev => [...prev, newReport]);
        return newReport;
    }, []);
    
    const updatePhotoReport = useCallback((id: string, updates: Partial<PhotoReport>) => {
        setPhotoReports(prev => prev.map(report => 
            report.id === id ? dataUtils.updateTimestamps({ ...report, ...updates }) : report
        ));
    }, []);
    
    const deletePhotoReport = useCallback((id: string) => {
        setPhotoReports(prev => prev.filter(p => p.id !== id));
    }, []);
    
    const getPhotoReportsByProject = useCallback((projectId: string) => {
        return photoReports.filter(p => p.projectId === projectId);
    }, [photoReports]);
    
    // Documents management
    const addDocument = useCallback((projectId: string | null, documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newDocument = dataUtils.createEntity({
            ...documentData,
            projectId
        });
        if (projectId) {
            setDocuments(prev => [...prev, newDocument]);
        } else {
            setGlobalDocuments(prev => [...prev, newDocument]);
        }
        return newDocument;
    }, []);
    
    const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
        setDocuments(prev => prev.map(doc => 
            doc.id === id ? dataUtils.updateTimestamps({ ...doc, ...updates }) : doc
        ));
        setGlobalDocuments(prev => prev.map(doc => 
            doc.id === id ? dataUtils.updateTimestamps({ ...doc, ...updates }) : doc
        ));
    }, []);
    
    const deleteDocument = useCallback((id: string) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        setGlobalDocuments(prev => prev.filter(d => d.id !== id));
    }, []);
    
    const getDocumentsByProject = useCallback((projectId: string) => {
        return documents.filter(d => d.projectId === projectId);
    }, [documents]);
    
    // Work stages management
    const addWorkStage = useCallback((projectId: string, stageData: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        const newStage = dataUtils.createEntity({
            ...stageData,
            projectId
        });
        setWorkStages(prev => [...prev, newStage]);
        return newStage;
    }, []);
    
    const updateWorkStage = useCallback((id: string, updates: Partial<WorkStage>) => {
        setWorkStages(prev => prev.map(stage => 
            stage.id === id ? dataUtils.updateTimestamps({ ...stage, ...updates }) : stage
        ));
    }, []);
    
    const deleteWorkStage = useCallback((id: string) => {
        setWorkStages(prev => prev.filter(w => w.id !== id));
    }, []);
    
    const getWorkStagesByProject = useCallback((projectId: string) => {
        return workStages.filter(w => w.projectId === projectId);
    }, [workStages]);
    
    // Notes management
    const addNote = useCallback((projectId: string, text: string) => {
        const newNote = dataUtils.createEntity({
            projectId,
            text
        });
        setNotes(prev => [...prev, newNote]);
        return newNote;
    }, []);
    
    const updateNote = useCallback((id: string, text: string) => {
        setNotes(prev => prev.map(note => 
            note.id === id ? dataUtils.updateTimestamps({ ...note, text }) : note
        ));
    }, []);
    
    const deleteNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);
    
    const getNotesByProject = useCallback((projectId: string) => {
        return notes.filter(n => n.projectId === projectId);
    }, [notes]);
    
    
    // Tools management
    const addTool = useCallback((toolData: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newTool = dataUtils.createEntity(toolData);
        setTools(prev => [...prev, newTool]);
        return newTool;
    }, []);
    
    const updateTool = useCallback((id: string, updates: Partial<Tool>) => {
        setTools(prev => prev.map(tool => 
            tool.id === id ? dataUtils.updateTimestamps({ ...tool, ...updates }) : tool
        ));
    }, []);
    
    const deleteTool = useCallback((id: string) => {
        setTools(prev => prev.filter(t => t.id !== id));
    }, []);
    
    // Consumables management
    const addConsumable = useCallback((consumableData: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newConsumable = dataUtils.createEntity(consumableData);
        setConsumables(prev => [...prev, newConsumable]);
        return newConsumable;
    }, []);
    
    const updateConsumable = useCallback((id: string, updates: Partial<Consumable>) => {
        setConsumables(prev => prev.map(consumable => 
            consumable.id === id ? dataUtils.updateTimestamps({ ...consumable, ...updates }) : consumable
        ));
    }, []);
    
    const deleteConsumable = useCallback((id: string) => {
        setConsumables(prev => prev.filter(c => c.id !== id));
    }, []);
    
    // Project scratchpad management
    const updateProjectScratchpad = useCallback((projectId: string, content: string) => {
        setProjects(prev => prev.map(project => 
            project.id === projectId ? dataUtils.updateTimestamps({ ...project, scratchpad: content }) : project
        ));
    }, []);
    
    // Financial calculations
    const calculateProjectFinancials = useCallback((projectId: string, estimates: any[]): ProjectFinancials => {
        const projectEstimates = estimates.filter(e => e.project_id === projectId);
        const projectFinances = getFinanceEntriesByProject(projectId);
        
        const estimateTotal = projectEstimates.reduce((sum, est) => {
            // Проверяем, что est.items существует и является массивом
            if (!est.items || !Array.isArray(est.items)) {
                console.warn('Estimate items is undefined or not an array:', est);
                return sum;
            }
            
            const subtotal = est.items.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
            const discountAmount = est.discountType === 'percent' ? subtotal * (est.discount / 100) : est.discount;
            const totalAfterDiscount = subtotal - discountAmount;
            const taxAmount = totalAfterDiscount * (est.tax / 100);
            return sum + totalAfterDiscount + taxAmount;
        }, 0);
        
        const paidTotal = projectFinances
            .filter(f => f.type === 'income')
            .reduce((sum, f) => sum + f.amount, 0);
        
        const expensesTotal = projectFinances
            .filter(f => f.type === 'expense')
            .reduce((sum, f) => sum + f.amount, 0);
        
        const expensesBreakdown = projectFinances
            .filter(f => f.type === 'expense')
            .reduce((acc, f) => {
                const categoryName = f.category || 'Другое';
                acc[categoryName] = (acc[categoryName] || 0) + f.amount;
                return acc;
            }, {} as Record<string, number>);
        
        const profit = paidTotal - expensesTotal;
        const profitability = estimateTotal > 0 ? (profit / estimateTotal) * 100 : 0;
        
        const cashFlowEntries = projectFinances.map(f => ({
            date: f.date,
            type: f.type as 'income' | 'expense',
            amount: f.amount,
            description: f.description
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return {
            estimateTotal,
            paidTotal,
            expensesTotal,
            expensesBreakdown: Object.entries(expensesBreakdown).map(([categoryName, amount]) => ({
                categoryName,
                amount
            })),
            profit,
            profitability,
            cashFlowEntries
        };
    }, [getFinanceEntriesByProject]);
    
    // Filtered projects
    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            // Status filter would be applied here if needed
            return true;
        });
    }, [projects]);
    
    return {
        // State
        projects,
        financeEntries,
        photoReports,
        documents,
        workStages,
        notes,
        tools,
        consumables,
        scratchpad,
        globalDocuments,
        filteredProjects,
        
        // Project management
        createProject,
        updateProject,
        deleteProject,
        getProjectById,
        loadProjectsFromSupabase,
        loadDocumentsFromSupabase,
        loadPhotoReportsFromSupabase,
        loadFinanceEntriesFromSupabase,
        setProjects,
        
        // Finance management
        addFinanceEntry,
        updateFinanceEntry,
        deleteFinanceEntry,
        getFinanceEntriesByProject,
        
        // Photo reports management
        addPhotoReport,
        updatePhotoReport,
        deletePhotoReport,
        getPhotoReportsByProject,
        
        // Documents management
        addDocument,
        updateDocument,
        deleteDocument,
        getDocumentsByProject,
        
        // Work stages management
        addWorkStage,
        updateWorkStage,
        deleteWorkStage,
        getWorkStagesByProject,
        
        // Notes management
        addNote,
        updateNote,
        deleteNote,
        getNotesByProject,
        
        
        // Tools management
        addTool,
        updateTool,
        deleteTool,
        
        // Consumables management
        addConsumable,
        updateConsumable,
        deleteConsumable,
        
        // Utilities
        updateProjectScratchpad,
        calculateProjectFinancials,
        setScratchpad
    };
};