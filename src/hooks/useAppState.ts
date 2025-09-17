import { useState, useEffect, useCallback } from 'react';
import { ThemeMode } from '../types';
import { dataService } from '../services/storageService';

export const useAppState = () => {
    console.log('🎯 useAppState: Хук useAppState инициализируется');
    // App navigation state
    const [activeView, setActiveView] = useState<string>('workspace');
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);
    
    // Theme state
    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    
    // UI state
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [draggingItem, setDraggingItem] = useState<number | null>(null);
    
    // Modal states
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showEstimatesListModal, setShowEstimatesListModal] = useState(false);
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showFinanceEntryModal, setShowFinanceEntryModal] = useState(false);
    const [showPhotoReportModal, setShowPhotoReportModal] = useState(false);
    const [showPhotoViewerModal, setShowPhotoViewerModal] = useState(false);
    const [showShoppingListModal, setShowShoppingListModal] = useState(false);
    const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
    const [showWorkStageModal, setShowWorkStageModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showActGenerationModal, setShowActGenerationModal] = useState(false);
    const [showAISuggestModal, setShowAISuggestModal] = useState(false);
    const [showAddToolModal, setShowAddToolModal] = useState(false);
    const [showScratchpadModal, setShowScratchpadModal] = useState(false);
    const [showGlobalDocumentModal, setShowGlobalDocumentModal] = useState(false);
    
    // Modal data
    const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
    const [selectedWorkStage, setSelectedWorkStage] = useState<any>(null);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [selectedTool, setSelectedTool] = useState<any>(null);
    const [actTotalAmount, setActTotalAmount] = useState<number>(0);
    
    // Search and filter states
    const [projectSearch, setProjectSearch] = useState('');
    const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'>('all');
    
    // Load initial state from localStorage
    useEffect(() => {
        console.log('🎯 useAppState: Загружаем состояние из localStorage');
        setActiveView(dataService.getActiveView());
        setActiveProjectId(dataService.getActiveProjectId());
        setActiveEstimateId(dataService.getActiveEstimateId());
        setThemeMode(dataService.getThemeMode());
        console.log('🎯 useAppState: Состояние загружено из localStorage');
    }, []);
    
    // Save state to localStorage when it changes
    useEffect(() => {
        dataService.setActiveView(activeView);
    }, [activeView]);
    
    useEffect(() => {
        dataService.setActiveProjectId(activeProjectId);
    }, [activeProjectId]);
    
    useEffect(() => {
        dataService.setActiveEstimateId(activeEstimateId);
    }, [activeEstimateId]);
    
    useEffect(() => {
        dataService.setThemeMode(themeMode);
    }, [themeMode]);
    
    // Theme management
    const handleThemeChange = useCallback(() => {
        const newTheme = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newTheme);
        document.body.classList.toggle('dark-theme', newTheme === 'dark');
    }, [themeMode]);
    
    // Apply theme on mount and change
    useEffect(() => {
        document.body.classList.toggle('dark-theme', themeMode === 'dark');
    }, [themeMode]);
    
    // Navigation helpers
    const navigateToView = useCallback((view: string) => {
        setActiveView(view);
    }, []);
    
    const navigateToProject = useCallback((projectId: string) => {
        setActiveProjectId(projectId);
        setActiveView('projectDetail');
    }, []);
    
    const navigateToEstimate = useCallback((estimateId: string) => {
        setActiveEstimateId(estimateId);
        setActiveView('estimate');
    }, []);
    
    const goBack = useCallback(() => {
        if (activeView === 'projectDetail') {
            setActiveView('projects');
            setActiveProjectId(null);
        } else if (activeView === 'estimate') {
            if (activeProjectId) {
                setActiveView('projectDetail');
            } else {
                setActiveView('workspace');
            }
            setActiveEstimateId(null);
        } else if (activeView === 'inventory') {
            setActiveView('workspace');
        } else if (activeView === 'reports') {
            setActiveView('workspace');
        } else if (activeView === 'scratchpad') {
            setActiveView('workspace');
        } else {
            setActiveView('workspace');
        }
    }, [activeView, activeProjectId]);
    
    // Modal helpers
    const openModal = useCallback((modalName: string, data?: any) => {
        switch (modalName) {
            case 'settings':
                setShowSettingsModal(true);
                break;
            case 'estimatesList':
                setShowEstimatesListModal(true);
                break;
            case 'library':
                setShowLibraryModal(true);
                break;
            case 'newProject':
                setSelectedProject(data || null);
                setShowNewProjectModal(true);
                break;
            case 'financeEntry':
                setShowFinanceEntryModal(true);
                break;
            case 'photoReport':
                setShowPhotoReportModal(true);
                break;
            case 'photoViewer':
                setSelectedPhoto(data);
                setShowPhotoViewerModal(true);
                break;
            case 'shoppingList':
                setShowShoppingListModal(true);
                break;
            case 'documentUpload':
                setShowDocumentUploadModal(true);
                break;
            case 'workStage':
                setSelectedWorkStage(data || null);
                setShowWorkStageModal(true);
                break;
            case 'note':
                setSelectedNote(data || null);
                setShowNoteModal(true);
                break;
            case 'actGeneration':
                setActTotalAmount(data || 0);
                setShowActGenerationModal(true);
                break;
            case 'aiSuggest':
                setShowAISuggestModal(true);
                break;
            case 'addTool':
                setSelectedTool(data || null);
                setShowAddToolModal(true);
                break;
            case 'scratchpad':
                setShowScratchpadModal(true);
                break;
            case 'globalDocument':
                setShowGlobalDocumentModal(true);
                break;
        }
    }, []);
    
    const closeModal = useCallback((modalName: string) => {
        switch (modalName) {
            case 'settings':
                setShowSettingsModal(false);
                break;
            case 'estimatesList':
                setShowEstimatesListModal(false);
                break;
            case 'library':
                setShowLibraryModal(false);
                break;
            case 'newProject':
                setShowNewProjectModal(false);
                setSelectedProject(null);
                break;
            case 'financeEntry':
                setShowFinanceEntryModal(false);
                break;
            case 'photoReport':
                setShowPhotoReportModal(false);
                break;
            case 'photoViewer':
                setShowPhotoViewerModal(false);
                setSelectedPhoto(null);
                break;
            case 'shoppingList':
                setShowShoppingListModal(false);
                break;
            case 'documentUpload':
                setShowDocumentUploadModal(false);
                break;
            case 'workStage':
                setShowWorkStageModal(false);
                setSelectedWorkStage(null);
                break;
            case 'note':
                setShowNoteModal(false);
                setSelectedNote(null);
                break;
            case 'actGeneration':
                setShowActGenerationModal(false);
                setActTotalAmount(0);
                break;
            case 'aiSuggest':
                setShowAISuggestModal(false);
                break;
            case 'addTool':
                setShowAddToolModal(false);
                setSelectedTool(null);
                break;
            case 'scratchpad':
                setShowScratchpadModal(false);
                break;
            case 'globalDocument':
                setShowGlobalDocumentModal(false);
                break;
        }
    }, []);
    
    // Loading state helpers
    const setLoading = useCallback((type: 'saving' | 'pdf', loading: boolean) => {
        if (type === 'saving') {
            setIsSaving(loading);
        } else if (type === 'pdf') {
            setIsPdfLoading(loading);
        }
    }, []);
    
    return {
        // State
        activeView,
        activeProjectId,
        activeEstimateId,
        themeMode,
        isDirty,
        isSaving,
        isPdfLoading,
        draggingItem,
        projectSearch,
        projectStatusFilter,
        
        // Modal states
        showSettingsModal,
        showEstimatesListModal,
        showLibraryModal,
        showNewProjectModal,
        showFinanceEntryModal,
        showPhotoReportModal,
        showPhotoViewerModal,
        showShoppingListModal,
        showDocumentUploadModal,
        showWorkStageModal,
        showNoteModal,
        showActGenerationModal,
        showAISuggestModal,
        showAddToolModal,
        showScratchpadModal,
        showGlobalDocumentModal,
        
        // Modal data
        selectedPhoto,
        selectedWorkStage,
        selectedNote,
        selectedProject,
        selectedTool,
        actTotalAmount,
        
        // Actions
        setActiveView,
        setActiveProjectId,
        setActiveEstimateId,
        setProjectSearch,
        setProjectStatusFilter,
        setIsDirty,
        setLoading,
        setDraggingItem,
        setSelectedProject,
        
        // Navigation
        navigateToView,
        navigateToProject,
        navigateToEstimate,
        goBack,
        
        // Theme
        handleThemeChange,
        
        // Modals
        openModal,
        closeModal
    };
};