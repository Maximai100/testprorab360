import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import { GoogleGenAI } from '@google/genai';
import { 
    TelegramWebApp, Item, LibraryItem, CompanyProfile, EstimateStatus, ThemeMode, Estimate, Project, FinanceEntry, 
    PhotoReport, Document, WorkStage, Note, InventoryItem, InventoryNote, Task, Tool, Consumable, SettingsModalProps, EstimatesListModalProps, LibraryModalProps, 
    NewProjectModalProps, FinanceEntryModalProps, PhotoReportModalProps, PhotoViewerModalProps, ShoppingListModalProps, 
    DocumentUploadModalProps, WorkStageModalProps, NoteModalProps, ActGenerationModalProps, AISuggestModalProps, 
    EstimateViewProps, ProjectsListViewProps, ProjectDetailViewProps, InventoryViewProps, AddToolModalProps, ReportsViewProps, WorkspaceViewProps, ScratchpadViewProps, CalculationResults,
    ProjectStatus,
    ProjectFinancials
} from './types';
import { tg, safeShowAlert, safeShowConfirm, generateNewEstimateNumber, resizeImage, readFileAsDataURL, numberToWordsRu, generateUUID } from './utils';
import { statusMap } from './constants';
import { Icon, IconPlus, IconClose, IconEdit, IconTrash, IconDocument, IconFolder, IconSettings, IconBook, IconClipboard, IconCart, IconDownload, IconPaperclip, IconDragHandle, IconProject, IconChevronRight, IconSparkles, IconSun, IconMoon, IconContrast, IconCreditCard, IconCalendar, IconMessageSquare, IconImage, IconTrendingUp, IconHome, IconCheckSquare } from './components/common/Icon';
import { Loader } from './components/common/Loader';
import { SettingsModal } from './components/modals/SettingsModal';
import { EstimatesListModal } from './components/modals/EstimatesListModal';
import { LibraryModal } from './components/modals/LibraryModal';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { FinanceEntryModal } from './components/modals/FinanceEntryModal';
import { PhotoReportModal } from './components/modals/PhotoReportModal';
import { PhotoViewerModal } from './components/modals/PhotoViewerModal';
import { ShoppingListModal } from './components/modals/ShoppingListModal';
import { DocumentUploadModal } from './components/modals/DocumentUploadModal';
import { WorkStageModal } from './components/modals/WorkStageModal';
import { NoteModal } from './components/modals/NoteModal';
import { ActGenerationModal } from './components/modals/ActGenerationModal';
import { AISuggestModal } from './components/modals/AISuggestModal';
import { AddToolModal } from './components/modals/AddToolModal';
import { EstimateView } from './components/views/EstimateView';
import { ProjectsListView } from './components/views/ProjectsListView';
import { ProjectDetailView } from './components/views/ProjectDetailView';
import { InventoryScreen } from './components/views/InventoryScreen';
import { ToolDetailsScreen } from './components/views/ToolDetailsScreen';
import { ReportsView } from './components/views/ReportsView';
import { WorkspaceView } from './components/views/WorkspaceView';
import { ScratchpadView } from './components/views/ScratchpadView';
import { ProjectTasksScreen } from './components/views/ProjectTasksScreen';
import { ListItem } from './components/ui/ListItem';

const App: React.FC = () => {
    // Error boundary state
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Error handler
    const handleError = (error: Error) => {
        console.error('App error:', error);
        setHasError(true);
        setErrorMessage(error.message);
    };

    // Global error handler
    useEffect(() => {
        const handleGlobalError = (event: ErrorEvent) => {
            console.error('Global error:', event.error);
            setHasError(true);
            setErrorMessage(event.error?.message || 'Произошла неизвестная ошибка');
        };

        window.addEventListener('error', handleGlobalError);
        return () => window.removeEventListener('error', handleGlobalError);
    }, []);

    // Show error screen if there's an error
    if (hasError) {
        return (
            <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#f5f5f5',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <h2>Произошла ошибка</h2>
                <p>{errorMessage}</p>
                <button 
                    onClick={() => {
                        setHasError(false);
                        setErrorMessage('');
                        window.location.reload();
                    }}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginTop: '20px'
                    }}
                >
                    Перезагрузить приложение
                </button>
            </div>
        );
    }

    // --- App Navigation State ---
    const [activeView, setActiveView] = useState<'workspace' | 'estimate' | 'projects' | 'projectDetail' | 'inventory' | 'reports' | 'scratchpad' | 'projectTasks' | 'allTasks' | 'inventoryList' | 'toolDetails'>('workspace');

    // --- Data State ---
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [templates, setTemplates] = useState<Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
    const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [globalDocuments, setGlobalDocuments] = useState<Document[]>([]);
    const [workStages, setWorkStages] = useState<WorkStage[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
    const [inventoryItems, setInventoryItems] = useState<Tool[]>([]);
    const [inventoryNotes, setInventoryNotes] = useState<InventoryNote[]>([]);
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [scratchpad, setScratchpad] = useState('');
    const [toolsScratchpad, setToolsScratchpad] = useState('');
    const [consumablesScratchpad, setConsumablesScratchpad] = useState('');
    const calculateProjectFinancials = (projectId: string): ProjectFinancials => {
        const projectEstimates = estimates.filter(e => e.projectId === projectId);
        const projectFinances = financeEntries.filter(f => f.projectId === projectId);

        const estimateTotal = projectEstimates.reduce((sum, est) => {
            const subtotal = est.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
            const discountAmount = est.discountType === 'percent' ? subtotal * (Number(est.discount) / 100) : Number(est.discount);
            const totalAfterDiscount = subtotal - discountAmount;
            const taxAmount = totalAfterDiscount * (Number(est.tax) / 100);
            return sum + totalAfterDiscount + taxAmount;
        }, 0);

        const paidTotal = projectFinances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
        const expensesTotal = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);

        const expensesBreakdown = projectFinances
            .filter(f => f.type === 'expense')
            .reduce((acc, f) => {
                const category = f.category || 'other';
                const existing = acc.find(i => i.categoryName === category);
                if (existing) {
                    existing.amount += f.amount;
                } else {
                    acc.push({ categoryName: category, amount: f.amount });
                }
                return acc;
            }, [] as { categoryName: string; amount: number }[]);

        const profit = paidTotal - expensesTotal;
        const profitability = estimateTotal > 0 ? (profit / estimateTotal) * 100 : 0;

        const cashFlowEntries = projectFinances
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(f => ({ date: f.date, type: f.type, amount: f.amount, description: f.description }));

        return { estimateTotal, paidTotal, expensesTotal, expensesBreakdown, profit, profitability, cashFlowEntries };
    };

    // --- Consumable Management ---
    const handleAddConsumable = (consumable: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date().toISOString();
        const newConsumable: Consumable = { ...consumable, id: generateUUID(), createdAt: now, updatedAt: now };
        const updatedConsumables = [newConsumable, ...consumables];
        setConsumables(updatedConsumables);
        localStorage.setItem('consumables', JSON.stringify(updatedConsumables));
    };

    const handleUpdateConsumable = (updatedConsumable: Consumable) => {
        const updatedConsumables = consumables.map(c =>
            c.id === updatedConsumable.id ? { ...updatedConsumable, updatedAt: new Date().toISOString() } : c
        );
        setConsumables(updatedConsumables);
        localStorage.setItem('consumables', JSON.stringify(updatedConsumables));
    };

    const handleDeleteConsumable = (id: string) => {
        const updatedConsumables = consumables.filter(c => c.id !== id);
        setConsumables(updatedConsumables);
        localStorage.setItem('consumables', JSON.stringify(updatedConsumables));
    };

    // --- Task Management Handlers ---
    const handleAddTask = (title: string, projectId: string | null) => {
        const now = new Date().toISOString();
        const newTask: Task = {
            id: generateUUID(),
            title,
            projectId,
            isCompleted: false,
            priority: 'medium',
            tags: [],
            dueDate: null,
            createdAt: now,
            updatedAt: now,
        };
        const updatedTasks = [newTask, ...tasks];
        setTasks(updatedTasks);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const updatedTasks = tasks.map(task =>
            task.id === updatedTask.id ? { ...updatedTask, updatedAt: new Date().toISOString() } : task
        );
        setTasks(updatedTasks);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    };

    const handleToggleTask = (id: string) => {
        const updatedTasks = tasks.map(task =>
            task.id === id ? { ...task, isCompleted: !task.isCompleted, updatedAt: new Date().toISOString() } : task
        );
        setTasks(updatedTasks);
        localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    };
    
    // --- Current Estimate State ---
    const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
    const [currentEstimateProjectId, setCurrentEstimateProjectId] = useState<string | null>(null);
    const [items, setItems] = useState<Item[]>([{ id: generateUUID(), name: '', quantity: 1, price: 0, unit: '', type: 'material', image: null }]);
    const [clientInfo, setClientInfo] = useState('');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [estimateDate, setEstimateDate] = useState('');
    const [status, setStatus] = useState<EstimateStatus>('draft');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [tax, setTax] = useState(0);

    // --- Project View State ---
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus>('in_progress');
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
    const [isGlobalDocumentModalOpen, setIsGlobalDocumentModalOpen] = useState(false);
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
    const [isWorkStageModalOpen, setIsWorkStageModalOpen] = useState(false);
    const [editingWorkStage, setEditingWorkStage] = useState<Partial<WorkStage> | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
    const [viewingPhoto, setViewingPhoto] = useState<PhotoReport | null>(null);
    const [isActModalOpen, setIsActModalOpen] = useState(false);
    const [isAISuggestModalOpen, setIsAISuggestModalOpen] = useState(false);
    const [isAddToolModalOpen, setIsAddToolModalOpen] = useState(false);
    const [isScratchpadModalOpen, setIsScratchpadModalOpen] = useState(false);
    const [actModalTotal, setActModalTotal] = useState(0);
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    const [isDirty, setIsDirty] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [draggingItem, setDraggingItem] = useState<number | null>(null);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

    const lastFocusedElement = useRef<HTMLElement | null>(null);
    const activeModalName = useRef<string | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Helper functions for modal management
    const openModal = useCallback((setOpenState: React.Dispatch<React.SetStateAction<boolean>>, modalName: string) => {
        lastFocusedElement.current = document.activeElement as HTMLElement;
        setOpenState(true);
        activeModalName.current = modalName;
    }, []);

    const closeModal = useCallback((setOpenState: React.Dispatch<React.SetStateAction<boolean>>) => {
        setOpenState(false);
        activeModalName.current = null;
        if (lastFocusedElement.current) {
            lastFocusedElement.current.focus();
            lastFocusedElement.current = null;
        }
    }, []);

    // Effect for Escape key to close modals
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                switch (activeModalName.current) {
                    case 'settings': closeModal(setIsSettingsOpen); break;
                    case 'estimatesList': closeModal(setIsEstimatesListOpen); break;
                    case 'library': closeModal(setIsLibraryOpen); break;
                    case 'project': closeModal(setIsProjectModalOpen); break;
                    case 'finance': closeModal(setIsFinanceModalOpen); break;
                    case 'photoReport': closeModal(setIsPhotoReportModalOpen); break;
                    case 'photoViewer': closeModal(setViewingPhoto as any); break; // Special case for PhotoViewerModal
                    case 'shoppingList': closeModal(setIsShoppingListOpen); break;
                    case 'documentUpload': closeModal(setIsDocumentModalOpen); break;
                    case 'globalDocumentUpload': closeModal(setIsGlobalDocumentModalOpen); break;
                    case 'workStage': closeModal(setIsWorkStageModalOpen); break;
                    case 'note': closeModal(setIsNoteModalOpen); break;
                    case 'act': closeModal(setIsActModalOpen); break;
                    case 'aiSuggest': closeModal(setIsAISuggestModalOpen); break;
                    case 'addTool': closeModal(setIsAddToolModalOpen); break;
                    default: break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

    // --- Theme Management ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
        // Set default to dark if nothing is saved
        const initialTheme = savedTheme || 'dark';
        setThemeMode(initialTheme);
        if (initialTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, []);

    const handleThemeChange = () => {
        const newTheme: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newTheme);
        localStorage.setItem('themeMode', newTheme);
        if (newTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    };

    useEffect(() => {
        if (window.Telegram) {
            if (isDirty) {
                if (typeof window.Telegram.enableClosingConfirmation === 'function') {
                    window.Telegram.enableClosingConfirmation();
                }
            } else {
                if (typeof window.Telegram.disableClosingConfirmation === 'function') {
                    window.Telegram.disableClosingConfirmation();
                }
            }
        }
    }, [isDirty]);

    const populateForm = (estimate: Estimate | Partial<Estimate> | null, currentEstimates: Estimate[], projectIdForNew: string | null = null) => {
        if (estimate) {
            setItems(estimate.items?.map(i => ({...i, id: i.id || generateUUID()})) || []);
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
            setItems([{ id: generateUUID(), name: '', quantity: 1, price: 0, unit: '', type: 'material', image: null }]);
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
            if (window.Telegram) {
                if (typeof window.Telegram.ready === 'function') {
                    window.Telegram.ready();
                }
                if (typeof window.Telegram.expand === 'function') {
                    window.Telegram.expand();
                }
                if (typeof window.Telegram.disableVerticalSwipes === 'function') {
                    window.Telegram.disableVerticalSwipes();
                }
            }
        } catch (error) {
            console.error("Failed to initialize Telegram Web App:", error);
            // Don't throw error, just log it
        }

        const migrateItem = (item: any, key: string) => {
            const now = new Date().toISOString();
            let updated = false;

            if (typeof item.id !== 'string') { item.id = generateUUID(); updated = true; }
            if (key !== 'templates') { // Templates don't have audit fields
                if (!item.createdAt) { item.createdAt = now; updated = true; }
                if (!item.updatedAt) { item.updatedAt = now; updated = true; }
            }

            if (key === 'inventoryItems') {
                if (item.condition === 'fair' || item.condition === 'poor') { item.condition = 'needs_service'; updated = true; }
                if (item.currentProjectId) { item.projectId = item.currentProjectId; delete item.currentProjectId; updated = true; }
            }

            if (key === 'consumables') {
                if (typeof item.quantity === 'string') { item.quantity = parseFloat(item.quantity) || 0; updated = true; }
                if (!item.unit) { item.unit = 'шт.'; updated = true; }
            }

            if (key === 'projectDocuments' || key === 'globalDocuments') {
                if (item.dataUrl) { item.fileUrl = item.dataUrl; delete item.dataUrl; updated = true; }
            }
            
            if (item.lastModified) { delete item.lastModified; updated = true; }

            return updated;
        };

        const loadAndMigrate = <T extends { id: any }> (storageKey: string, setState: React.Dispatch<React.SetStateAction<T[]>>) => {
            try {
                const savedData = localStorage.getItem(storageKey);
                if (savedData) {
                    const data = JSON.parse(savedData);
                    let needsResave = false;
                    const migratedData = data.map((item: any) => {
                        const itemUpdated = migrateItem(item, storageKey);
                        if (itemUpdated) needsResave = true;
                        return item;
                    });

                    if (needsResave) {
                        console.log(`Migrating and saving data for ${storageKey}...`);
                        localStorage.setItem(storageKey, JSON.stringify(migratedData));
                    }
                    setState(migratedData);
                }
            } catch (e) {
                console.error(`Failed to load or migrate ${storageKey}`, e);
            }
        };

        // Special handling for estimates
        const savedEstimatesData = localStorage.getItem('estimatesData');
        if (savedEstimatesData) {
            try {
                const parsedData = JSON.parse(savedEstimatesData);
                let savedEstimates = (parsedData.estimates || []) as any[];
                const savedActiveId = parsedData.activeEstimateId;
                let needsResave = false;

                const migratedEstimates = savedEstimates.map(e => {
                    const estimateUpdated = migrateItem(e, 'estimates');
                    if (estimateUpdated) needsResave = true;
                    return e;
                });

                if (needsResave) {
                     localStorage.setItem('estimatesData', JSON.stringify({ estimates: migratedEstimates, activeEstimateId: savedActiveId }));
                }

                setEstimates(migratedEstimates);
                const activeEstimate = migratedEstimates.find(e => e.id === savedActiveId) || migratedEstimates[0] || null;
                if (activeEstimate) {
                    populateForm(activeEstimate, migratedEstimates);
                }

            } catch (e) { console.error("Failed to parse saved estimates:", e); }
        } else {
            populateForm(null, []);
        }

        loadAndMigrate('projects', setProjects);
        loadAndMigrate('financeEntries', setFinanceEntries);
        loadAndMigrate('photoReports', setPhotoReports);
        loadAndMigrate('projectDocuments', setDocuments);
        loadAndMigrate('globalDocuments', setGlobalDocuments);
        loadAndMigrate('workStages', setWorkStages);
        loadAndMigrate('notes', setNotes);
        loadAndMigrate('itemLibrary', setLibraryItems);
        loadAndMigrate('inventoryItems', setInventoryItems);
        loadAndMigrate('inventoryNotes', setInventoryNotes);
        loadAndMigrate('consumables', setConsumables);
        loadAndMigrate('tasks', setTasks);

        const savedProfile = localStorage.getItem('companyProfile');
        if (savedProfile) { try { setCompanyProfile(JSON.parse(savedProfile)); } catch (e) { console.error("Failed to parse profile", e); }}

        const savedTemplates = localStorage.getItem('estimateTemplates');
        if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { console.error("Failed to parse templates", e); }}

        const savedScratchpad = localStorage.getItem('scratchpad');
        if (savedScratchpad) { setScratchpad(savedScratchpad); }

        const savedToolsScratchpad = localStorage.getItem('toolsScratchpad');
        if (savedToolsScratchpad) { setToolsScratchpad(savedToolsScratchpad); }

        const savedConsumablesScratchpad = localStorage.getItem('consumablesScratchpad');
        if (savedConsumablesScratchpad) { setConsumablesScratchpad(savedConsumablesScratchpad); }

        // Migration for Notes to Project Scratchpad
        const savedNotes = localStorage.getItem('projectNotes');
        if (savedNotes) {
            try {
                const notes = JSON.parse(savedNotes);
                if (notes.length > 0) {
                    const updatedProjects = projects.map(p => {
                        const projectNotes = notes.filter((n: Note) => n.projectId === p.id);
                        if (projectNotes.length > 0) {
                            const existingScratchpad = p.scratchpad || '';
                            const notesText = projectNotes.map((n: Note) => n.text).join('\n\n---\n\n');
                            return { ...p, scratchpad: existingScratchpad + '\n\n---\n\n' + notesText };
                        }
                        return p;
                    });
                    setProjects(updatedProjects);
                    localStorage.setItem('projects', JSON.stringify(updatedProjects));
                    localStorage.removeItem('projectNotes'); // Remove old notes
                }
            } catch (e) {
                console.error("Failed to migrate notes", e);
            }
        }

    }, []);
    
    const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
        setTimeout(() => {
            const inputElement = e.target;
            inputElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            setTimeout(() => {
                const rect = inputElement.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const safeArea = viewportHeight * 0.3;
                if (rect.top > viewportHeight - safeArea) {
                    window.scrollBy({ top: rect.top - safeArea, behavior: 'smooth' });
                }
            }, 100);
        }, 300);
    };

    const handleAddItem = () => { setItems(prev => [...prev, { id: generateUUID(), name: '', quantity: 1, price: 0, unit: '', image: null, type: 'work' }]); setIsDirty(true); };
    const handleAddFromLibrary = (libItem: LibraryItem) => { setItems(prev => [...prev, { id: generateUUID(), name: libItem.name, quantity: 1, price: libItem.price, unit: libItem.unit, image: null, type: 'work' }]); setIsLibraryOpen(false); setIsDirty(true); };
    const handleAddItemsFromAI = (newItems: Omit<Item, 'id' | 'image' | 'type'>[]) => {
        const itemsToAdd: Item[] = newItems.map(item => ({
            ...item,
            id: generateUUID(),
            image: null,
            type: 'work' // Default type, user can change it
        }));
        setItems(prev => [...prev, ...itemsToAdd]);
        setIsDirty(true);
    };

    const handleItemChange = (id: string, field: keyof Item, value: string | number) => { setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); setIsDirty(true); };
    const handleRemoveItem = (id: string) => { setItems(prev => prev.filter(item => item.id !== id)); setIsDirty(true); };
    
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

    const handleItemImageChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    const handleRemoveItemImage = (id: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, image: null } : item));
        setIsDirty(true);
    };

    const calculation: CalculationResults = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const materialsTotal = items.filter(item => item.type === 'material').reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const workTotal = items.filter(item => item.type === 'work').reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = discountType === 'percent' ? subtotal * (Number(discount) / 100) : Number(discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(tax) / 100);
        const grandTotal = totalAfterDiscount + taxAmount;
        return { subtotal, materialsTotal, workTotal, discountAmount, taxAmount, grandTotal };
    }, [items, discount, discountType, tax]);

    const formatCurrency = useCallback((value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value), []);
    const getValidItems = useCallback(() => items.filter(item => item.name.trim() && item.quantity > 0 && item.price >= 0), [items]);

    const handleSave = () => {
        if (!isDirty) return;
        setIsSaving(true);
        try {
            const newEstimates = [...estimates];
            const now = new Date().toISOString();
            const currentId = activeEstimateId || generateUUID();
            
            const currentEstimateData: Estimate = { 
                id: currentId,
                clientInfo,
                items,
                discount,
                discountType,
                tax,
                number: estimateNumber,
                date: estimateDate,
                status,
                projectId: currentEstimateProjectId,
                createdAt: estimates.find(e => e.id === currentId)?.createdAt || now,
                updatedAt: now
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
            tg?.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error("Save failed:", error);
            safeShowAlert("Не удалось сохранить смету.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleNewEstimate = (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
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
    
    // РЕШЕНИЕ 1: Установить альтернативные библиотеки
// npm install html2canvas
// npm install @types/html2canvas

// РЕШЕНИЕ 2: Простой PDF через print API браузера
const handleExportPDF = useCallback(async () => {
    setIsPdfLoading(true);
    tg?.HapticFeedback?.notificationOccurred?.('warning');
    
    try {
        console.log('Starting PDF export via print...');
        
        const validItems = getValidItems();
        if (validItems.length === 0) {
            safeShowAlert("Добавьте хотя бы одну позицию в смету.");
            return;
        }

        // Создаем HTML для печати
        const printContent = createPrintableHTML();
        
        // Создаем новое окно для печати
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            throw new Error('Не удалось открыть окно для печати');
        }

        printWindow.document.write(printContent);
        printWindow.document.close();

        // Ждем загрузки содержимого
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                // Закрываем окно после печати
                setTimeout(() => {
                    printWindow.close();
                }, 1000);
            }, 500);
        };

        safeShowAlert('Откроется диалог печати. Выберите "Сохранить как PDF"');
        
    } catch (error: any) {
        console.error("Print export failed:", error);
        
        // Фоллбэк на скачивание HTML файла
        try {
            const htmlContent = createPrintableHTML();
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `смета-${estimateNumber}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            safeShowAlert('Скачан HTML файл. Откройте его в браузере и распечатайте в PDF');
        } catch (fallbackError) {
            console.error('HTML export also failed:', fallbackError);
            safeShowAlert(`Не удалось экспортировать смету: ${error.message}`);
        }
    } finally {
        setIsPdfLoading(false);
    }
}, [getValidItems, clientInfo, companyProfile, estimateNumber, estimateDate, formatCurrency, calculation, discount, discountType, tax]);

// Функция создания HTML для печати
const createPrintableHTML = (): string => {
    const validItems = getValidItems();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Смета № ${estimateNumber}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .company-details {
            font-size: 10px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .estimate-title {
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
        }
        
        .client-info {
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #333;
            padding: 6px;
            text-align: left;
            font-size: 10px;
        }
        
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        .number-col { width: 5%; text-align: center; }
        .name-col { width: 45%; }
        .qty-col { width: 10%; text-align: center; }
        .unit-col { width: 10%; text-align: center; }
        .price-col { width: 15%; text-align: right; }
        .total-col { width: 15%; text-align: right; }
        
        .totals {
            margin-top: 20px;
            float: right;
            width: 300px;
        }
        
        .totals table {
            margin-bottom: 0;
        }
        
        .totals td {
            border: none;
            border-bottom: 1px solid #ccc;
            padding: 4px 8px;
        }
        
        .grand-total {
            font-weight: bold;
            font-size: 12px;
            border-top: 2px solid #333 !important;
        }
        
        .footer {
            clear: both;
            margin-top: 40px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        
        @page {
            margin: 15mm;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="header">
        ${companyProfile.name ? `<div class="company-name">${companyProfile.name}</div>` : ''}
        ${companyProfile.details ? `<div class="company-details">${companyProfile.details}</div>` : ''}
    </div>
    
    <div class="estimate-title">
        Смета № ${estimateNumber} от ${new Date(estimateDate).toLocaleDateString('ru-RU')}
    </div>
    
    ${clientInfo ? `<div class="client-info">Клиент / Объект: ${clientInfo}</div>` : ''}
    
    <table>
        <thead>
            <tr>
                <th class="number-col">№</th>
                <th class="name-col">Наименование</th>
                <th class="qty-col">Кол-во</th>
                <th class="unit-col">Ед.изм.</th>
                <th class="price-col">Цена</th>
                <th class="total-col">Сумма</th>
            </tr>
        </thead>
        <tbody>
            ${validItems.map((item, index) => `
                <tr>
                    <td class="number-col">${index + 1}</td>
                    <td class="name-col">${item.name}</td>
                    <td class="qty-col">${item.quantity}</td>
                    <td class="unit-col">${item.unit || 'шт.'}</td>
                    <td class="price-col">${formatCurrency(item.price)}</td>
                    <td class="total-col">${formatCurrency(item.quantity * item.price)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="totals">
        <table>
            <tr>
                <td>Подытог:</td>
                <td style="text-align: right;">${formatCurrency(calculation.subtotal)}</td>
            </tr>
            ${calculation.discountAmount > 0 ? `
                <tr>
                    <td>Скидка (${discountType === 'percent' ? `${discount}%` : formatCurrency(discount)}):</td>
                    <td style="text-align:  right;">-${formatCurrency(calculation.discountAmount)}</td>
                </tr>
            ` : ''}
            ${calculation.taxAmount > 0 ? `
                <tr>
                    <td>Налог (${tax}%):</td>
                    <td style="text-align: right;">+${formatCurrency(calculation.taxAmount)}</td>
                </tr>
            ` : ''}
            <tr class="grand-total">
                <td><strong>ИТОГО:</strong></td>
                <td style="text-align: right;"><strong>${formatCurrency(calculation.grandTotal)}</strong></td>
            </tr>
        </table>
    </div>
    
    <div class="footer">
        Документ создан: ${new Date().toLocaleDateString('ru-RU')} | Смета за 5 минут
    </div>
    
    <script>
        // Автоматически печатаем при загрузке (только если это новое окно)
        if (window.opener) {
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            }
        }
    </script>
</body>
</html>`;
};

// Функция экспорта графика работ в PDF
const handleExportWorkSchedulePDF = useCallback(async (project: Project, projectWorkStages: WorkStage[]) => {
    try {
        console.log('Starting work schedule PDF export...');
        console.log('Project:', project);
        console.log('Work stages:', projectWorkStages);
        
        if (projectWorkStages.length === 0) {
            safeShowAlert("Нет этапов работ для экспорта.");
            return;
        }

        // Создаем HTML для печати графика работ
        const printContent = createWorkScheduleHTML(project, projectWorkStages);
        
        // Создаем новое окно для печати
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            throw new Error('Не удалось открыть окно для печати');
        }

        printWindow.document.write(printContent);
        printWindow.document.close();

        // Ждем загрузки содержимого
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
                // Закрываем окно после печати
                setTimeout(() => {
                    printWindow.close();
                }, 1000);
            }, 500);
        };

        safeShowAlert('Откроется диалог печати. Выберите "Сохранить как PDF"');
        
    } catch (error: any) {
        console.error("Work schedule export failed:", error);
        
        // Фоллбэк на скачивание HTML файла
        try {
            const htmlContent = createWorkScheduleHTML(project, projectWorkStages);
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `график-работ-${project.name}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            safeShowAlert('Скачан HTML файл. Откройте его в браузере и распечатайте в PDF');
        } catch (fallbackError) {
            console.error('HTML export also failed:', fallbackError);
            safeShowAlert(`Не удалось экспортировать график работ: ${error.message}`);
        }
    }
}, []);

// Функция создания HTML для печати графика работ
const createWorkScheduleHTML = (project: Project, workStages: WorkStage[]): string => {
    const sortedStages = workStages.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>График работ - ${project.name}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .project-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .project-info {
            font-size: 10px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .schedule-title {
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
            font-size: 10px;
        }
        
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        .number-col { width: 8%; text-align: center; }
        .title-col { width: 35%; }
        .dates-col { width: 25%; text-align: center; }
        .status-col { width: 15%; text-align: center; }
        .progress-col { width: 17%; text-align: center; }
        
        .status-planned { color: #666; }
        .status-in_progress { color: #007bff; font-weight: bold; }
        .status-completed { color: #28a745; font-weight: bold; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background-color: #007bff;
            transition: width 0.3s ease;
        }
        
        .progress-completed {
            background-color: #28a745;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }
        
        @page {
            margin: 15mm;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="project-name">${project.name}</div>
        <div class="project-info">Клиент: ${project.client}</div>
        <div class="project-info">Адрес: ${project.address}</div>
        <div class="project-info">Статус: ${getProjectStatusText(project.status)}</div>
    </div>
    
    <div class="schedule-title">
        График работ (${workStages.length} этапов)
    </div>
    
    <table>
        <thead>
            <tr>
                <th class="number-col">№</th>
                <th class="title-col">Наименование этапа</th>
                <th class="dates-col">Период выполнения</th>
                <th class="status-col">Статус</th>
                <th class="progress-col">Прогресс</th>
            </tr>
        </thead>
        <tbody>
            ${sortedStages.map((stage, index) => `
                <tr>
                    <td class="number-col">${index + 1}</td>
                    <td class="title-col">${stage.title || 'Название не указано'}</td>
                    <td class="dates-col">
                        ${stage.startDate ? (() => {
                            try {
                                return new Date(stage.startDate).toLocaleDateString('ru-RU');
                            } catch {
                                return 'Неверная дата';
                            }
                        })() : 'Не указано'}
                        ${stage.endDate ? (() => {
                            try {
                                return ` - ${new Date(stage.endDate).toLocaleDateString('ru-RU')}`;
                            } catch {
                                return ' - Неверная дата';
                            }
                        })() : ''}
                    </td>
                    <td class="status-col status-${stage.status || 'planned'}">
                        ${getWorkStageStatusText(stage.status || 'planned')}
                    </td>
                    <td class="progress-col">
                        <div class="progress-bar">
                            <div class="progress-fill ${(stage.status || 'planned') === 'completed' ? 'progress-completed' : ''}" style="width: ${stage.progress || 0}%"></div>
                        </div>
                        <div style="margin-top: 2px; font-size: 9px;">${stage.progress || 0}%</div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="footer">
        Документ создан: ${new Date().toLocaleDateString('ru-RU')} | Смета за 5 минут
    </div>
    
    <script>
        // Автоматически печатаем при загрузке (только если это новое окно)
        if (window.opener) {
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 500);
            }
        }
    </script>
</body>
</html>`;
};

// Вспомогательные функции для статусов
const getProjectStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
        'planned': 'Запланирован',
        'in_progress': 'В работе',
        'on_hold': 'Приостановлен',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
};

const getWorkStageStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
        'planned': 'Запланирован',
        'in_progress': 'В работе',
        'completed': 'Завершен'
    };
    return statusMap[status] || status;
};

    const handleShare = useCallback(() => {
        try {
            const validItems = getValidItems();
            if (validItems.length === 0) {
                safeShowAlert("Добавьте хотя бы одну позицию, чтобы поделиться сметой.");
                tg?.HapticFeedback.notificationOccurred('error');
                return;
            }
            const header = `*Смета № ${estimateNumber} от ${new Date(estimateDate).toLocaleDateString('ru-RU')}*
Клиент: ${clientInfo || 'Не указан'}

`;
            const itemsText = validItems.map((item, index) => `${index + 1}. ${item.name} (${item.quantity} ${item.unit || 'шт.'}) - ${formatCurrency(item.quantity * item.price)}`).join('\n');
            const footer = `

*Подытог:* ${formatCurrency(calculation.subtotal)}`;
            const discountText = calculation.discountAmount > 0 ? `
*Скидка:* -${formatCurrency(calculation.discountAmount)}` : '';
            const taxText = calculation.taxAmount > 0 ? `
*Налог (${tax}%):* +${formatCurrency(calculation.taxAmount)}` : '';
            const total = `
*Итого:* ${formatCurrency(calculation.grandTotal)}`;
            
            const message = header + itemsText + footer + discountText + taxText + total;
            if (window.Telegram && typeof window.Telegram.sendData === 'function') {
                window.Telegram.sendData(message);
            }
        } catch (error) {
            console.error("Share failed:", error);
            safeShowAlert("Не удалось подготовить данные для отправки.");
        }
    }, [getValidItems, estimateNumber, estimateDate, clientInfo, formatCurrency, calculation, tax]);
    
    const handleProfileChange = (field: keyof CompanyProfile, value: string) => setCompanyProfile(prev => ({ ...prev, [field]: value }));
    const handleSaveProfile = () => { localStorage.setItem('companyProfile', JSON.stringify(companyProfile)); closeModal(setIsSettingsOpen); tg?.HapticFeedback.notificationOccurred('success'); };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resizedLogo = await resizeImage(file, 200);
            setCompanyProfile(prev => ({ ...prev, logo: resizedLogo }));
        } catch (error) {
            console.error("Logo processing failed:", error);
            safeShowAlert("Не удалось обработать логотип.");
        }
    };
    const removeLogo = () => setCompanyProfile(prev => ({...prev, logo: null}));

    const handleLoadEstimate = (id: string) => {
        const load = () => {
            const estimateToLoad = estimates.find(e => e.id === id); 
            if (estimateToLoad) { 
                populateForm(estimateToLoad, estimates);
                closeModal(setIsEstimatesListOpen);
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
    
    const handleDeleteEstimate = (id: string) => {
        safeShowConfirm("Вы уверены, что хотите удалить эту смету?", (ok) => {
            if (ok) {
                tg?.HapticFeedback?.notificationOccurred?.('warning');
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
    
    const handleStatusChange = (id: string, newStatus: EstimateStatus) => {
        const newEstimates = estimates.map(e => e.id === id ? { ...e, status: newStatus, updatedAt: new Date().toISOString() } : e);
        setEstimates(newEstimates);
        localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId }));
        if (id === activeEstimateId) {
            setStatus(newStatus);
        }
    };

    const handleSaveAsTemplate = (id: string) => {
        const estimateToSave = estimates.find(e => e.id === id);
        if (estimateToSave) {
            const newTemplate = {
                items: estimateToSave.items.map(i => ({...i, id: generateUUID()})),
                discount: estimateToSave.discount,
                discountType: estimateToSave.discountType,
                tax: estimateToSave.tax,
                lastModified: Date.now() // Kept for template identification
            };
            const newTemplates = [...templates, newTemplate];
            setTemplates(newTemplates);
            localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
            safeShowAlert('Шаблон сохранен!');
            tg?.HapticFeedback.notificationOccurred('success');
        }
    };

    const handleDeleteTemplate = (timestamp: number) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот шаблон?', (ok) => {
            if (ok) {
                const newTemplates = templates.filter((t: any) => t.lastModified !== timestamp);
                setTemplates(newTemplates);
                localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
            }
        });
    };

    // --- Project Management ---
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

    const handleOpenProjectModal = (project: Partial<Project> | null = null) => {
        setEditingProject(project || { name: '', client: '', address: '', status: 'planned' });
        openModal(setIsProjectModalOpen, 'project');
    };

    const handleSaveProject = () => {
        if (!editingProject || !editingProject.name?.trim()) {
            safeShowAlert('Введите название проекта.');
            return;
        }
        const now = new Date().toISOString();
        let updatedProjects;
        if (editingProject.id) { // Update existing
            updatedProjects = projects.map(p => p.id === editingProject.id ? { ...p, ...editingProject, updatedAt: now } as Project : p);
        } else { // Create new
            const newProject: Project = {
                id: generateUUID(),
                name: editingProject.name.trim(),
                client: editingProject.client?.trim() || '',
                address: editingProject.address?.trim() || '',
                status: 'in_progress',
                createdAt: now,
                updatedAt: now,
            };
            updatedProjects = [newProject, ...projects];
        }
        setProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        closeModal(setIsProjectModalOpen);
        setEditingProject(null);
    };

    const handleDeleteProject = (id: string) => {
        safeShowConfirm('Вы уверены, что хотите удалить проект и все связанные с ним данные (сметы, финансы и т.д.)?', (ok) => {
            if (ok) {
                const newProjects = projects.filter(p => p.id !== id);
                const newEstimates = estimates.filter(e => e.projectId !== id);
                const newFinances = financeEntries.filter(f => f.projectId !== id);
                const newPhotos = photoReports.filter(ph => ph.projectId !== id);
                const newDocs = documents.filter(d => d.projectId !== id);
                const newStages = workStages.filter(ws => ws.projectId !== id);
                const newNotes = notes.filter(n => n.projectId !== id);

                setProjects(newProjects);
                setEstimates(newEstimates);
                setFinanceEntries(newFinances);
                setPhotoReports(newPhotos);
                setDocuments(newDocs);
                setWorkStages(newStages);
                setNotes(newNotes);

                localStorage.setItem('projects', JSON.stringify(newProjects));
                localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId }));
                localStorage.setItem('financeEntries', JSON.stringify(newFinances));
                localStorage.setItem('photoReports', JSON.stringify(newPhotos));
                localStorage.setItem('projectDocuments', JSON.stringify(newDocs));
                localStorage.setItem('workStages', JSON.stringify(newStages));
                localStorage.setItem('projectNotes', JSON.stringify(newNotes));

                setActiveView('projects');
                setActiveProjectId(null);
            }
        });
    };

    const handleAddNewEstimateForProject = () => {
        if (isDirty) {
            safeShowConfirm('У вас есть несохраненные изменения. Создать новую смету для этого проекта?', (ok) => {
                if (ok) {
                    populateForm(null, estimates, activeProjectId);
                    setActiveView('estimate');
                }
            });
        } else {
            populateForm(null, estimates, activeProjectId);
            setActiveView('estimate');
        }
    };

    const handleBackToProject = () => {
        if (isDirty) {
            safeShowConfirm('У вас есть несохраненные изменения. Вернуться к проекту без сохранения?', (ok) => {
                if (ok) {
                    setIsDirty(false);
                    setActiveView('projectDetail');
                }
            });
        } else {
            setActiveView('projectDetail');
        }
    };

    // --- Finance Management ---
    const handleSaveFinanceEntry = (entry: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (!activeProjectId) return;
        const now = new Date().toISOString();
        const newEntry: FinanceEntry = { ...entry, id: generateUUID(), projectId: activeProjectId, createdAt: now, updatedAt: now };
        const updatedEntries = [newEntry, ...financeEntries];
        setFinanceEntries(updatedEntries);
        localStorage.setItem('financeEntries', JSON.stringify(updatedEntries));
        closeModal(setIsFinanceModalOpen);
    };
    const handleDeleteFinanceEntry = (id: string) => {
        const updatedEntries = financeEntries.filter(f => f.id !== id);
        setFinanceEntries(updatedEntries);
        localStorage.setItem('financeEntries', JSON.stringify(updatedEntries));
    };

    // --- Photo Report Management ---
    const handleSavePhotoReport = (photo: Omit<PhotoReport, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (!activeProjectId) return;
        const now = new Date().toISOString();
        const newPhoto: PhotoReport = { ...photo, id: generateUUID(), projectId: activeProjectId, createdAt: now, updatedAt: now };
        const updatedPhotos = [newPhoto, ...photoReports];
        setPhotoReports(updatedPhotos);
        localStorage.setItem('photoReports', JSON.stringify(updatedPhotos));
        closeModal(setIsPhotoReportModalOpen);
    };
    const handleDeletePhoto = (id: string) => {
        const updatedPhotos = photoReports.filter(p => p.id !== id);
        setPhotoReports(updatedPhotos);
        localStorage.setItem('photoReports', JSON.stringify(updatedPhotos));
        closeModal(setViewingPhoto as any);
    };

    // --- Document Management ---
    const handleSaveDocument = (name: string, fileUrl: string) => {
        if (!activeProjectId) return;
        const now = new Date().toISOString();
        const newDoc: Document = { id: generateUUID(), projectId: activeProjectId, name, fileUrl, date: now, createdAt: now, updatedAt: now };
        const updatedDocs = [newDoc, ...documents];
        setDocuments(updatedDocs);
        localStorage.setItem('projectDocuments', JSON.stringify(updatedDocs));
        closeModal(setIsDocumentModalOpen);
    };
    const handleDeleteDocument = (id: string) => {
        const updatedDocs = documents.filter(d => d.id !== id);
        setDocuments(updatedDocs);
        localStorage.setItem('projectDocuments', JSON.stringify(updatedDocs));
    };

    const handleSaveGlobalDocument = (name: string, fileUrl: string) => {
        const now = new Date().toISOString();
        const newDoc: Document = { id: generateUUID(), name, fileUrl, date: now, createdAt: now, updatedAt: now };
        const updatedDocs = [newDoc, ...globalDocuments];
        setGlobalDocuments(updatedDocs);
        localStorage.setItem('globalDocuments', JSON.stringify(updatedDocs));
        closeModal(setIsGlobalDocumentModalOpen);
    };

    const handleDeleteGlobalDocument = (id: string) => {
        const updatedDocs = globalDocuments.filter(d => d.id !== id);
        setGlobalDocuments(updatedDocs);
        localStorage.setItem('globalDocuments', JSON.stringify(updatedDocs));
    };

    // --- Work Stage Management ---
    const handleOpenWorkStageModal = (stage: Partial<WorkStage> | null) => {
        setEditingWorkStage(stage);
        openModal(setIsWorkStageModalOpen, 'workStage');
    };
    const handleSaveWorkStage = (stageData: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (!activeProjectId) return;
        const now = new Date().toISOString();
        let updatedStages;
        if (editingWorkStage?.id) {
            updatedStages = workStages.map(ws => ws.id === editingWorkStage.id ? { ...ws, ...stageData, updatedAt: now } : ws);
        } else {
            const newStage: WorkStage = { ...stageData, id: generateUUID(), projectId: activeProjectId, createdAt: now, updatedAt: now };
            updatedStages = [newStage, ...workStages];
        }
        setWorkStages(updatedStages);
        localStorage.setItem('workStages', JSON.stringify(updatedStages));
        closeModal(setIsWorkStageModalOpen);
        setEditingWorkStage(null);
    };
    const handleDeleteWorkStage = (id: string) => {
        const updatedStages = workStages.filter(ws => ws.id !== id);
        setWorkStages(updatedStages);
        localStorage.setItem('workStages', JSON.stringify(updatedStages));
    };

    // --- Note Management ---
    const handleOpenNoteModal = (note: Partial<Note> | null) => {
        setEditingNote(note);
        openModal(setIsNoteModalOpen, 'note');
    };
    const handleSaveNote = (text: string) => {
        if (!activeProjectId) return;
        const now = new Date().toISOString();
        let updatedNotes;
        if (editingNote?.id) {
            updatedNotes = notes.map(n => n.id === editingNote.id ? { ...n, text, updatedAt: now } : n);
        } else {
            const newNote: Note = { text, id: generateUUID(), projectId: activeProjectId, createdAt: now, updatedAt: now };
            updatedNotes = [newNote, ...notes];
        }
        setNotes(updatedNotes);
        localStorage.setItem('projectNotes', JSON.stringify(updatedNotes));
        closeModal(setIsNoteModalOpen);
        setEditingNote(null);
    };
    const handleDeleteNote = (id: string) => {
        const updatedNotes = notes.filter(n => n.id !== id);
        setNotes(updatedNotes);
        localStorage.setItem('projectNotes', JSON.stringify(updatedNotes));
    };

    // --- Inventory Management ---
    const handleAddInventoryItem = (item: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = new Date().toISOString();
        const newItem: Tool = {
            purchaseDate: null,
            purchasePrice: 0,
            projectId: null,
            ...item,
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
        };
        const updatedItems = [newItem, ...inventoryItems];
        setInventoryItems(updatedItems);
        localStorage.setItem('inventoryItems', JSON.stringify(updatedItems));
    };

    const handleUpdateInventoryItem = (item: Tool) => {
        const updatedItems = inventoryItems.map(i => (i.id === item.id ? { ...item, updatedAt: new Date().toISOString() } : i));
        setInventoryItems(updatedItems);
        localStorage.setItem('inventoryItems', JSON.stringify(updatedItems));
    };

    const handleDeleteInventoryItem = (id: string) => {
        const updatedItems = inventoryItems.filter(i => i.id !== id);
        setInventoryItems(updatedItems);
        localStorage.setItem('inventoryItems', JSON.stringify(updatedItems));
        setActiveView('inventoryList');
    };

    const handleAddInventoryNote = (note: Omit<InventoryNote, 'id' | 'date'>) => {
        const newNote: InventoryNote = { ...note, id: generateUUID(), date: new Date().toISOString() };
        const updatedNotes = [newNote, ...inventoryNotes];
        setInventoryNotes(updatedNotes);
        localStorage.setItem('inventoryNotes', JSON.stringify(updatedNotes));
    };

    const handleDeleteInventoryNote = (id: string) => {
        const updatedNotes = inventoryNotes.filter(n => n.id !== id);
        setInventoryNotes(updatedNotes);
        localStorage.setItem('inventoryNotes', JSON.stringify(updatedNotes));
    };

    const handleProjectScratchpadChange = (projectId: string, newContent: string) => {
        const updatedProjects = projects.map(p => 
            p.id === projectId ? { ...p, scratchpad: newContent, updatedAt: new Date().toISOString() } : p
        );
        setProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
    };

    const handleToolsScratchpadChange = (newContent: string) => {
        setToolsScratchpad(newContent);
        localStorage.setItem('toolsScratchpad', newContent);
    };

    const handleConsumablesScratchpadChange = (newContent: string) => {
        setConsumablesScratchpad(newContent);
        localStorage.setItem('consumablesScratchpad', newContent);
    };

    const handleScratchpadChange = (text: string) => {
        setScratchpad(text);
        localStorage.setItem('scratchpad', text);
    };

    const handleBackup = () => {
        const backupData = {
            estimates,
            templates,
            projects,
            financeEntries,
            photoReports,
            documents,
            workStages,
            notes,
            libraryItems,
            companyProfile,
            inventoryItems,
            inventoryNotes,
            consumables,
            tasks,
            scratchpad,
        };

        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smetaza5minut_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                const restoredData = JSON.parse(json);

                const migrateRestored = <T extends { id: any, lastModified?: any, createdAt?: any, updatedAt?: any }> (data: T[]): T[] => {
                    return (data || []).map(item => {
                        const newItem = { ...item };
                        if (typeof newItem.id !== 'string') newItem.id = generateUUID();
                        if (!newItem.createdAt) newItem.createdAt = new Date(newItem.lastModified || Date.now()).toISOString();
                        if (!newItem.updatedAt) newItem.updatedAt = new Date(newItem.lastModified || Date.now()).toISOString();
                        delete newItem.lastModified;
                        return newItem;
                    });
                };

                setEstimates(migrateRestored(restoredData.estimates));
                setTemplates(restoredData.templates || []);
                setProjects(migrateRestored(restoredData.projects));
                setFinanceEntries(migrateRestored(restoredData.financeEntries));
                setPhotoReports(migrateRestored(restoredData.photoReports));
                setDocuments(migrateRestored(restoredData.documents));
                setWorkStages(migrateRestored(restoredData.workStages));
                setNotes(migrateRestored(restoredData.notes));
                setLibraryItems(migrateRestored(restoredData.libraryItems));
                setInventoryItems(migrateRestored(restoredData.inventoryItems));
                setInventoryNotes(migrateRestored(restoredData.inventoryNotes));
                setConsumables(migrateRestored(restoredData.consumables));
                setCompanyProfile(restoredData.companyProfile || { name: '', details: '', logo: null });
                setTasks(migrateRestored(restoredData.tasks));
                setScratchpad(restoredData.scratchpad || '');

                localStorage.setItem('estimatesData', JSON.stringify({ estimates: restoredData.estimates || [], activeEstimateId: null }));
                localStorage.setItem('estimateTemplates', JSON.stringify(restoredData.templates || []));
                localStorage.setItem('projects', JSON.stringify(restoredData.projects || []));
                localStorage.setItem('financeEntries', JSON.stringify(restoredData.financeEntries || []));
                localStorage.setItem('photoReports', JSON.stringify(restoredData.photoReports || []));
                localStorage.setItem('projectDocuments', JSON.stringify(restoredData.documents || []));
                localStorage.setItem('workStages', JSON.stringify(restoredData.workStages || []));
                localStorage.setItem('projectNotes', JSON.stringify(restoredData.notes || []));
                localStorage.setItem('itemLibrary', JSON.stringify(restoredData.libraryItems || []));
                localStorage.setItem('inventoryItems', JSON.stringify(restoredData.inventoryItems || []));
                localStorage.setItem('inventoryNotes', JSON.stringify(restoredData.inventoryNotes || []));
                localStorage.setItem('consumables', JSON.stringify(restoredData.consumables || []));
                localStorage.setItem('companyProfile', JSON.stringify(restoredData.companyProfile || { name: '', details: '', logo: null }));
                localStorage.setItem('tasks', JSON.stringify(restoredData.tasks || []));
                localStorage.setItem('scratchpad', restoredData.scratchpad || '');

                safeShowAlert('Данные успешно восстановлены!');
            } catch (error) {
                safeShowAlert('Ошибка при восстановлении данных. Убедитесь, что вы выбрали правильный файл резервной копии.');
                console.error("Restore failed:", error);
            }
        };
        reader.readAsText(file);
    };

    // --- Act Generation ---
    const handleOpenActModal = (total: number) => {
        setActModalTotal(total);
        openModal(setIsActModalOpen, 'act');
    };

    const themeIcon = useCallback(() => {
        return themeMode === 'light' ? <IconSun /> : <IconMoon />;
    }, [themeMode]);

    const renderView = () => {
        switch (activeView) {
            case 'workspace':
                return <WorkspaceView 
                    scratchpad={scratchpad}
                    globalDocuments={globalDocuments}
                    onScratchpadChange={handleScratchpadChange}
                    onOpenGlobalDocumentModal={() => openModal(setIsGlobalDocumentModalOpen, 'globalDocumentUpload')}
                    onDeleteGlobalDocument={handleDeleteGlobalDocument}
                    onOpenScratchpad={() => setActiveView('scratchpad')}
                />;
            case 'projects':
                return <ProjectsListView 
                    handleOpenProjectModal={(project) => {
                        setEditingProject(project || { name: '', client: '', address: '', status: 'in_progress' });
                        openModal(setIsProjectModalOpen, 'project');
                    }}
                    projectStatusFilter={projectStatusFilter}
                    setProjectStatusFilter={setProjectStatusFilter}
                    projectSearch={projectSearch}
                    setProjectSearch={setProjectSearch}
                    handleInputFocus={handleInputFocus}
                    filteredProjects={filteredProjects}
                    projects={projects}
                    setActiveProjectId={setActiveProjectId}
                    setActiveView={setActiveView}
                />;
            case 'projectDetail':
                if (!activeProject) {
                    setActiveView('projects');
                    return null;
                }
                const financials = calculateProjectFinancials(activeProject.id);
                return <ProjectDetailView 
                    activeProject={activeProject}
                    estimates={estimates.filter(e => e.projectId === activeProjectId)}
                    financeEntries={financeEntries.filter(f => f.projectId === activeProjectId)}
                    photoReports={photoReports.filter(p => p.projectId === activeProjectId)}
                    documents={documents.filter(d => d.projectId === activeProjectId)}
                    workStages={workStages.filter(w => w.projectId === activeProjectId)}
                    financials={financials}
                    formatCurrency={formatCurrency}
                    statusMap={statusMap}
                    setActiveView={setActiveView}
                    setActiveProjectId={setActiveProjectId}
                    handleOpenProjectModal={handleOpenProjectModal}
                    handleDeleteProject={handleDeleteProject}
                    handleLoadEstimate={handleLoadEstimate}
                    handleAddNewEstimateForProject={handleAddNewEstimateForProject}
                    onOpenFinanceModal={() => openModal(setIsFinanceModalOpen, 'finance')}
                    onDeleteFinanceEntry={handleDeleteFinanceEntry}
                    onOpenPhotoReportModal={() => openModal(setIsPhotoReportModalOpen, 'photoReport')}
                    onViewPhoto={(photo) => openModal(() => setViewingPhoto(photo), 'photoViewer')}
                    onOpenDocumentModal={() => openModal(setIsDocumentModalOpen, 'documentUpload')}
                    onDeleteDocument={handleDeleteDocument}
                    onOpenWorkStageModal={handleOpenWorkStageModal}
                    onDeleteWorkStage={handleDeleteWorkStage}
                    onOpenNoteModal={handleOpenNoteModal}
                    onDeleteNote={handleDeleteNote}
                    onOpenActModal={handleOpenActModal}
                    onNavigateToTasks={() => setActiveView('projectTasks')}
                    onProjectScratchpadChange={handleProjectScratchpadChange}
                    onExportWorkSchedulePDF={handleExportWorkSchedulePDF}
                />;
            case 'allTasks':
                return <ProjectTasksScreen 
                    tasks={tasks}
                    projects={projects}
                    projectId={null}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onToggleTask={handleToggleTask}
                />;
            case 'projectTasks':
                return <ProjectTasksScreen 
                    tasks={tasks.filter(t => t.projectId === activeProjectId)}
                    projects={projects}
                    projectId={activeProjectId!}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onToggleTask={handleToggleTask}
                    onBack={() => setActiveView('projectDetail')}
                />;
            case 'inventoryList':
                return <InventoryScreen 
                    tools={inventoryItems}
                    projects={projects}
                    consumables={consumables}
                    toolsScratchpad={toolsScratchpad}
                    consumablesScratchpad={consumablesScratchpad}
                    onToolClick={(tool) => {
                        setSelectedTool(tool);
                        setActiveView('toolDetails');
                    }}
                    onUpdateTool={handleUpdateInventoryItem}
                    onOpenAddToolModal={() => openModal(setIsAddToolModalOpen, 'addTool')}
                    onAddConsumable={handleAddConsumable}
                    onUpdateConsumable={handleUpdateConsumable}
                    onDeleteConsumable={handleDeleteConsumable}
                    onToolsScratchpadChange={handleToolsScratchpadChange}
                    onConsumablesScratchpadChange={handleConsumablesScratchpadChange}
                />;
            case 'toolDetails':
                return <ToolDetailsScreen 
                    tool={selectedTool!}
                    projects={projects}
                    onSave={(tool) => {
                        handleUpdateInventoryItem(tool as Tool);
                        setActiveView('inventoryList');
                    }}
                    onBack={() => setActiveView('inventoryList')}
                    onDelete={handleDeleteInventoryItem}
                />;
            
            case 'reports':
                return <ReportsView
                    projects={projects}
                    estimates={estimates}
                    financeEntries={financeEntries}
                    formatCurrency={formatCurrency}
                    setActiveView={setActiveView}
                />;
            case 'scratchpad':
                return <ScratchpadView
                    content={scratchpad}
                    onSave={handleScratchpadChange}
                    onBack={() => setActiveView('workspace')}
                />;
            case 'estimate':
            default:
                return <EstimateView 
                    currentEstimateProjectId={currentEstimateProjectId}
                    handleBackToProject={handleBackToProject}
                    clientInfo={clientInfo}
                    setClientInfo={setClientInfo}
                    setIsDirty={setIsDirty}
                    handleThemeChange={handleThemeChange}
                    themeIcon={themeIcon}
                    themeMode={themeMode}
                    onOpenLibraryModal={() => openModal(setIsLibraryOpen, 'library')}
                    onOpenEstimatesListModal={() => openModal(setIsEstimatesListOpen, 'estimatesList')}
                    onOpenSettingsModal={() => openModal(setIsSettingsOpen, 'settings')}
                    onOpenAISuggestModal={() => openModal(setIsAISuggestModalOpen, 'aiSuggest')}
                    estimateNumber={estimateNumber}
                    setEstimateNumber={setEstimateNumber}
                    estimateDate={estimateDate}
                    setEstimateDate={setEstimateDate}
                    handleInputFocus={handleInputFocus}
                    items={items}
                    dragItem={dragItem}
                    dragOverItem={dragOverItem}
                    handleDragSort={handleDragSort}
                    draggingItem={draggingItem}
                    setDraggingItem={setDraggingItem}
                    fileInputRefs={fileInputRefs}
                    handleItemImageChange={handleItemImageChange}
                    handleRemoveItemImage={handleRemoveItemImage}
                    handleRemoveItem={handleRemoveItem}
                    handleItemChange={handleItemChange}
                    formatCurrency={formatCurrency}
                    handleAddItem={handleAddItem}
                    discount={discount}
                    setDiscount={setDiscount}
                    discountType={discountType}
                    setDiscountType={setDiscountType}
                    tax={tax}
                    setTax={setTax}
                    calculation={calculation}
                    handleSave={handleSave}
                    isDirty={isDirty}
                    isPdfLoading={isPdfLoading}
                    isSaving={isSaving}
                    handleExportPDF={handleExportPDF}
                    handleShare={handleShare}
                    onNewEstimate={handleNewEstimate}
                />;
        }
    };

    const isAnyModalOpen = useMemo(() => (
        isSettingsOpen || isEstimatesListOpen || isLibraryOpen || isProjectModalOpen ||
        isFinanceModalOpen || isPhotoReportModalOpen || viewingPhoto !== null ||
        isShoppingListOpen || isDocumentModalOpen || isGlobalDocumentModalOpen ||
        isWorkStageModalOpen || isNoteModalOpen || isActModalOpen || isAISuggestModalOpen ||
        isAddToolModalOpen
    ), [
        isSettingsOpen, isEstimatesListOpen, isLibraryOpen, isProjectModalOpen,
        isFinanceModalOpen, isPhotoReportModalOpen, viewingPhoto,
        isShoppingListOpen, isDocumentModalOpen, isGlobalDocumentModalOpen,
        isWorkStageModalOpen, isNoteModalOpen, isActModalOpen, isAISuggestModalOpen,
        isAddToolModalOpen
    ]);

    return (
        <div className="app-container" aria-hidden={isAnyModalOpen}>
            <header className="app-header">
                <div className="app-header-left">
                    <img src="/logo.png" alt="Логотип" className="app-logo" />
                    <h1>Прораб</h1>
                </div>
                <div className="app-header-right">
                    <button onClick={handleThemeChange} className="header-btn" title={`Тема: ${themeMode}`}>{themeIcon()}</button>
                    <button onClick={() => openModal(setIsLibraryOpen, 'library')} className="header-btn"><IconBook/></button>
                    <button onClick={() => openModal(setIsEstimatesListOpen, 'estimatesList')} className="header-btn"><IconFolder/></button>
                    <button onClick={() => openModal(setIsSettingsOpen, 'settings')} className="header-btn"><IconSettings/></button>
                </div>
            </header>
            {renderView()}
            
            <nav className="bottom-nav">
                <button onClick={() => setActiveView('workspace')} className={activeView === 'workspace' ? 'active' : ''}>
                    <IconHome/>
                    <span>Главная</span>
                </button>
                <button onClick={() => setActiveView('projects')} className={activeView.startsWith('project') ? 'active' : ''}>
                    <IconProject/>
                    <span>Проекты</span>
                </button>
                <button onClick={() => setActiveView('estimate')} className={activeView === 'estimate' ? 'active' : ''}>
                    <IconDocument/>
                    <span>Смета</span>
                </button>
                <button onClick={() => setActiveView('inventoryList')} className={activeView.startsWith('inventory') || activeView === 'toolDetails' ? 'active' : ''}>
                    <IconClipboard/>
                    <span>Инвентарь</span>
                </button>
                <button onClick={() => setActiveView('reports')} className={activeView === 'reports' ? 'active' : ''}>
                    <IconTrendingUp/>
                    <span>Отчеты</span>
                </button>
                <button onClick={() => setActiveView('allTasks')} className={activeView === 'allTasks' ? 'active' : ''}>
                    <IconCheckSquare/>
                    <span>Задачи</span>
                </button>
                
            </nav>

            {isSettingsOpen && <SettingsModal onClose={() => closeModal(setIsSettingsOpen)} profile={companyProfile} onProfileChange={handleProfileChange} onLogoChange={handleLogoChange} onRemoveLogo={removeLogo} onSave={handleSaveProfile} onBackup={handleBackup} onRestore={handleRestore} onInputFocus={handleInputFocus} />}
            {isEstimatesListOpen && <EstimatesListModal onClose={() => closeModal(setIsEstimatesListOpen)} estimates={estimates} templates={templates} activeEstimateId={activeEstimateId} statusMap={statusMap} formatCurrency={formatCurrency} onLoadEstimate={handleLoadEstimate} onDeleteEstimate={handleDeleteEstimate} onStatusChange={handleStatusChange} onSaveAsTemplate={handleSaveAsTemplate} onDeleteTemplate={handleDeleteTemplate} onNewEstimate={handleNewEstimate} onInputFocus={handleInputFocus} />}
            {isLibraryOpen && <LibraryModal onClose={() => closeModal(setIsLibraryOpen)} libraryItems={libraryItems} onLibraryItemsChange={setLibraryItems} onAddItemToEstimate={handleAddFromLibrary} formatCurrency={formatCurrency} onInputFocus={handleInputFocus} showConfirm={safeShowConfirm} showAlert={safeShowAlert} />}
            {isProjectModalOpen && <NewProjectModal project={editingProject} onClose={() => closeModal(setIsProjectModalOpen)} onProjectChange={setEditingProject} onSave={handleSaveProject} onInputFocus={handleInputFocus} />}
            {isFinanceModalOpen && <FinanceEntryModal onClose={() => closeModal(setIsFinanceModalOpen)} onSave={handleSaveFinanceEntry} showAlert={safeShowAlert} onInputFocus={handleInputFocus} />}
            {isPhotoReportModalOpen && <PhotoReportModal onClose={() => closeModal(setIsPhotoReportModalOpen)} onSave={handleSavePhotoReport} showAlert={safeShowAlert} />}
            {viewingPhoto && <PhotoViewerModal photo={viewingPhoto} onClose={() => closeModal(setViewingPhoto as any)} onDelete={handleDeletePhoto} />}
            {isShoppingListOpen && <ShoppingListModal items={items} onClose={() => closeModal(setIsShoppingListOpen)} showAlert={safeShowAlert} />}
            {isDocumentModalOpen && <DocumentUploadModal onClose={() => closeModal(setIsDocumentModalOpen)} onSave={handleSaveDocument} showAlert={safeShowAlert} />}
            {isGlobalDocumentModalOpen && <DocumentUploadModal onClose={() => closeModal(setIsGlobalDocumentModalOpen)} onSave={handleSaveGlobalDocument} showAlert={safeShowAlert} />}
            {isWorkStageModalOpen && <WorkStageModal stage={editingWorkStage} onClose={() => closeModal(setIsWorkStageModalOpen)} onSave={handleSaveWorkStage} showAlert={safeShowAlert} />}
            {isNoteModalOpen && <NoteModal note={editingNote} onClose={() => closeModal(setIsNoteModalOpen)} onSave={handleSaveNote} showAlert={safeShowAlert} />}
            {isActModalOpen && activeProject && <ActGenerationModal onClose={() => closeModal(setIsActModalOpen)} project={activeProject} profile={companyProfile} totalAmount={actModalTotal} showAlert={safeShowAlert} />}
            {isAISuggestModalOpen && <AISuggestModal onClose={() => closeModal(setIsAISuggestModalOpen)} onAddItems={handleAddItemsFromAI} showAlert={safeShowAlert} />}
            {isAddToolModalOpen && <AddToolModal onClose={() => closeModal(setIsAddToolModalOpen)} onSave={handleAddInventoryItem} />}
        </div>
    );
}

export default App;