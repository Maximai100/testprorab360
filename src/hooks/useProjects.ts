import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Project, FinanceEntry, PhotoReport, Document, WorkStage, Note, 
    Tool, Consumable, ProjectFinancials, ProjectStatus 
} from '../types';
import { dataService, dataUtils } from '../services/storageService';
import { supabase } from '../supabaseClient';

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
    
    // Finance management
    const addFinanceEntry = useCallback((projectId: string, entryData: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        const newEntry = dataUtils.createEntity({
            ...entryData,
            projectId
        });
        setFinanceEntries(prev => [...prev, newEntry]);
        return newEntry;
    }, []);
    
    const updateFinanceEntry = useCallback((id: string, updates: Partial<FinanceEntry>) => {
        setFinanceEntries(prev => prev.map(entry => 
            entry.id === id ? dataUtils.updateTimestamps({ ...entry, ...updates }) : entry
        ));
    }, []);
    
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