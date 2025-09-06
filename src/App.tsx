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
import { ReportsHubScreen } from './components/views/ReportsHubScreen';
import { ProjectFinancialReportScreen } from './components/views/ProjectFinancialReportScreen';
import { ClientReportScreen } from './components/views/ClientReportScreen';
import { OverallFinancialReportScreen } from './components/views/OverallFinancialReportScreen';
import { ListItem } from './components/ui/ListItem';
import { useProjectContext } from './context/ProjectContext';

// Import new hooks
import { useAppState } from './hooks/useAppState';
import { useEstimates } from './hooks/useEstimates';
import { useProjects } from './hooks/useProjects';
import { dataService } from './services/storageService';

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

    // Use new hooks
    const appState = useAppState();
    const estimatesHook = useEstimates();
    const projectsHook = useProjects();

    // Additional state that's not yet moved to hooks
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
    const [inventoryItems, setInventoryItems] = useState<Tool[]>([]);
    const [inventoryNotes, setInventoryNotes] = useState<InventoryNote[]>([]);
    const [toolsScratchpad, setToolsScratchpad] = useState('');
    const [consumablesScratchpad, setConsumablesScratchpad] = useState('');
    const [reportProject, setReportProject] = useState<Project | null>(null);
    const [clientReportProject, setClientReportProject] = useState<Project | null>(null);

    // Refs
    const lastFocusedElement = useRef<HTMLElement | null>(null);
    const activeModalName = useRef<string | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Get project context
    const { setActiveProjectId: setContextActiveProjectId, activeProjectId: contextProjectId } = useProjectContext();

    // Load initial data
    useEffect(() => {
        setLibraryItems(dataService.getLibraryItems());
        setCompanyProfile(dataService.getCompanyProfile());
        setInventoryItems(dataService.getTools());
        setInventoryNotes(dataService.getInventoryNotes());
    }, []);

    // Save data when it changes
    useEffect(() => {
        dataService.setLibraryItems(libraryItems);
    }, [libraryItems]);

    useEffect(() => {
        dataService.setCompanyProfile(companyProfile);
    }, [companyProfile]);

    useEffect(() => {
        dataService.setTools(inventoryItems);
    }, [inventoryItems]);

    useEffect(() => {
        dataService.setInventoryNotes(inventoryNotes);
    }, [inventoryNotes]);

    // Helper functions for modal management
    const openModal = useCallback((setOpenState: React.Dispatch<React.SetStateAction<boolean>>, modalName: string) => {
        lastFocusedElement.current = document.activeElement as HTMLElement;
        setOpenState(true);
        activeModalName.current = modalName;
    }, []);

    const closeModal = useCallback((setOpenState: React.Dispatch<React.SetStateAction<boolean>>) => {
        console.log('Closing modal, current activeModalName:', activeModalName.current);
        setOpenState(false);
        activeModalName.current = null;
        if (lastFocusedElement.current) {
            lastFocusedElement.current.focus();
            lastFocusedElement.current = null;
        }
        console.log('Modal closed successfully');
    }, []);

    // Handle input focus for mobile keyboard
    const handleInputFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }, []);

    // Format currency
    const formatCurrency = useCallback((value: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    }, []);

    // Theme icon
    const themeIcon = useCallback(() => {
        if (appState.themeMode === 'light') {
            return <IconMoon />;
        } else {
            return <IconSun />;
        }
    }, [appState.themeMode]);

    // Get active project
    const activeProject = useMemo(() => {
        return projectsHook.getProjectById(appState.activeProjectId || '') || null;
    }, [appState.activeProjectId, projectsHook.projects]);

    // Get project financials
    const projectFinancials = useMemo(() => {
        if (!activeProject) return null;
        return projectsHook.calculateProjectFinancials(activeProject.id, estimatesHook.estimates);
    }, [activeProject, estimatesHook.estimates, projectsHook]);

    // Filtered projects
    const filteredProjects = useMemo(() => {
        return projectsHook.projects.filter(project => {
            const matchesStatus = project.status === appState.projectStatusFilter;
            const matchesSearch = !appState.projectSearch || 
                project.name.toLowerCase().includes(appState.projectSearch.toLowerCase()) ||
                project.client.toLowerCase().includes(appState.projectSearch.toLowerCase()) ||
                project.address.toLowerCase().includes(appState.projectSearch.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [projectsHook.projects, appState.projectStatusFilter, appState.projectSearch]);

    // Estimate handlers
    const handleLoadEstimate = useCallback((id: string) => {
        estimatesHook.loadEstimate(id);
        appState.navigateToEstimate(id);
    }, [estimatesHook, appState]);

    const handleNewEstimate = useCallback((template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        const newEstimate = estimatesHook.createNewEstimate(template);
        appState.navigateToEstimate(newEstimate.id);
    }, [estimatesHook, appState]);

    const handleSaveEstimate = useCallback(() => {
        estimatesHook.saveEstimate(appState.activeProjectId);
        appState.setIsDirty(false);
        appState.setLoading('saving', false);
    }, [estimatesHook, appState]);

    const handleDeleteEstimate = useCallback((id: string) => {
        safeShowConfirm('Вы уверены, что хотите удалить эту смету?', (ok) => {
            if (ok) {
                estimatesHook.deleteEstimate(id);
                if (appState.activeEstimateId === id) {
                    appState.goBack();
                }
            }
        });
    }, [estimatesHook, appState]);

    const handleStatusChange = useCallback((id: string, status: EstimateStatus) => {
        estimatesHook.updateEstimateStatus(id, status);
    }, [estimatesHook]);

    const handleSaveAsTemplate = useCallback((id: string) => {
        estimatesHook.saveAsTemplate(id);
        safeShowAlert('Шаблон сохранен');
    }, [estimatesHook]);

    const handleDeleteTemplate = useCallback((index: number) => {
        estimatesHook.deleteTemplate(index);
    }, [estimatesHook]);

    // Project handlers
    const handleOpenProjectModal = useCallback((project: Partial<Project> | null = null) => {
        appState.openModal('newProject', project);
    }, [appState]);

    const handleSaveProject = useCallback(() => {
        if (appState.selectedProject) {
            if (appState.selectedProject.id) {
                projectsHook.updateProject(appState.selectedProject.id, appState.selectedProject);
            } else {
                projectsHook.createProject(appState.selectedProject as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
            }
        }
        appState.closeModal('newProject');
    }, [appState, projectsHook]);

    const handleDeleteProject = useCallback((id: string) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот проект? Все связанные данные будут удалены.', (ok) => {
            if (ok) {
                projectsHook.deleteProject(id);
                if (appState.activeProjectId === id) {
                    appState.goBack();
                }
            }
        });
    }, [projectsHook, appState]);

    // Finance handlers
    const handleAddFinanceEntry = useCallback((entryData: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (appState.activeProjectId) {
            projectsHook.addFinanceEntry(appState.activeProjectId, entryData);
        }
        appState.closeModal('financeEntry');
    }, [projectsHook, appState]);

    const handleDeleteFinanceEntry = useCallback((id: string) => {
        projectsHook.deleteFinanceEntry(id);
    }, [projectsHook]);

    // Photo report handlers
    const handleAddPhotoReport = useCallback((reportData: Omit<PhotoReport, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (appState.activeProjectId) {
            projectsHook.addPhotoReport(appState.activeProjectId, reportData);
        }
        appState.closeModal('photoReport');
    }, [projectsHook, appState]);

    const handleViewPhoto = useCallback((photo: PhotoReport) => {
        appState.openModal('photoViewer', photo);
    }, [appState]);

    // Document handlers
    const handleAddDocument = useCallback((name: string, fileUrl: string) => {
        if (appState.activeProjectId) {
            projectsHook.addDocument(appState.activeProjectId, { name, fileUrl, date: new Date().toISOString() });
        }
        appState.closeModal('documentUpload');
    }, [projectsHook, appState]);

    const handleAddGlobalDocument = useCallback((name: string, fileUrl: string) => {
        projectsHook.addDocument(null, { name, fileUrl, date: new Date().toISOString() });
        appState.closeModal('globalDocument');
    }, [projectsHook, appState]);

    const handleDeleteDocument = useCallback((id: string) => {
        projectsHook.deleteDocument(id);
    }, [projectsHook]);

    const handleDeleteGlobalDocument = useCallback((id: string) => {
        projectsHook.deleteDocument(id);
    }, [projectsHook]);

    // Work stage handlers
    const handleAddWorkStage = useCallback((stageData: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (appState.activeProjectId) {
            projectsHook.addWorkStage(appState.activeProjectId, stageData);
        }
        appState.closeModal('workStage');
    }, [projectsHook, appState]);

    const handleUpdateWorkStage = useCallback((id: string, updates: Partial<WorkStage>) => {
        projectsHook.updateWorkStage(id, updates);
    }, [projectsHook]);

    const handleDeleteWorkStage = useCallback((id: string) => {
        projectsHook.deleteWorkStage(id);
    }, [projectsHook]);

    // Note handlers
    const handleAddNote = useCallback((text: string) => {
        if (appState.activeProjectId) {
            projectsHook.addNote(appState.activeProjectId, text);
        }
        appState.closeModal('note');
    }, [projectsHook, appState]);

    const handleUpdateNote = useCallback((id: string, text: string) => {
        projectsHook.updateNote(id, text);
    }, [projectsHook]);

    const handleDeleteNote = useCallback((id: string) => {
        projectsHook.deleteNote(id);
    }, [projectsHook]);

    // Task handlers
    const handleAddTask = useCallback((title: string, projectId: string | null) => {
        projectsHook.addTask(title, projectId);
    }, [projectsHook]);

    const handleUpdateTask = useCallback((task: Task) => {
        projectsHook.updateTask(task.id, task);
    }, [projectsHook]);

    const handleToggleTask = useCallback((id: string) => {
        projectsHook.toggleTask(id);
    }, [projectsHook]);

    // Tool handlers
    const handleAddTool = useCallback((toolData: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => {
        projectsHook.addTool(toolData);
        appState.closeModal('addTool');
    }, [projectsHook, appState]);

    const handleUpdateTool = useCallback((tool: Tool) => {
        projectsHook.updateTool(tool.id, tool);
    }, [projectsHook]);

    const handleDeleteTool = useCallback((id: string) => {
        projectsHook.deleteTool(id);
    }, [projectsHook]);

    // Consumable handlers
    const handleAddConsumable = useCallback((consumable: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => {
        projectsHook.addConsumable(consumable);
    }, [projectsHook]);

    const handleUpdateConsumable = useCallback((consumable: Consumable) => {
        projectsHook.updateConsumable(consumable.id, consumable);
    }, [projectsHook]);

    const handleDeleteConsumable = useCallback((id: string) => {
        projectsHook.deleteConsumable(id);
    }, [projectsHook]);

    // Library handlers
    const handleLibraryItemsChange = useCallback((items: LibraryItem[]) => {
        setLibraryItems(items);
    }, []);

    const handleAddItemToEstimate = useCallback((item: LibraryItem) => {
        estimatesHook.addItemFromLibrary(item);
    }, [estimatesHook]);

    // Profile handlers
    const handleProfileChange = useCallback((field: keyof CompanyProfile, value: string) => {
        setCompanyProfile(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            readFileAsDataURL(file).then(dataUrl => {
                setCompanyProfile(prev => ({ ...prev, logo: dataUrl }));
            });
        }
    }, []);

    const handleRemoveLogo = useCallback(() => {
        setCompanyProfile(prev => ({ ...prev, logo: null }));
    }, []);

    const handleSaveProfile = useCallback(() => {
        // Profile is already saved via useEffect
        appState.closeModal('settings');
    }, [appState]);

    // Backup and restore
    const handleBackup = useCallback(() => {
        try {
            const data = dataService.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            safeShowAlert('Резервная копия создана');
        } catch (error) {
            safeShowAlert('Ошибка при создании резервной копии');
        }
    }, []);

    const handleRestore = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    dataService.importData(e.target?.result as string);
                    safeShowAlert('Данные восстановлены. Перезагрузите страницу.');
                } catch (error) {
                    safeShowAlert('Ошибка при восстановлении данных');
                }
            };
            reader.readAsText(file);
        }
    }, []);

    // Item handlers
    const handleAddItem = useCallback(() => {
        estimatesHook.addItem();
    }, [estimatesHook]);

    const handleItemChange = useCallback((id: string, field: keyof Item, value: string | number) => {
        estimatesHook.updateItem(id, field, value);
        appState.setIsDirty(true);
    }, [estimatesHook, appState]);

    const handleRemoveItem = useCallback((id: string) => {
        estimatesHook.removeItem(id);
        appState.setIsDirty(true);
    }, [estimatesHook, appState]);

    const handleItemImageChange = useCallback((id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            resizeImage(file, 800).then(dataUrl => {
                estimatesHook.updateItemImage(id, dataUrl);
                appState.setIsDirty(true);
            });
        }
    }, [estimatesHook, appState]);

    const handleRemoveItemImage = useCallback((id: string) => {
        estimatesHook.updateItemImage(id, null);
        appState.setIsDirty(true);
    }, [estimatesHook, appState]);

    const handleDragSort = useCallback(() => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            estimatesHook.reorderItems(dragItem.current, dragOverItem.current);
            appState.setIsDirty(true);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    }, [estimatesHook, appState]);

    // AI handlers
    const handleAddItemsFromAI = useCallback((items: Omit<Item, 'id' | 'image' | 'type'>[]) => {
        estimatesHook.addItemsFromAI(items);
        appState.setIsDirty(true);
    }, [estimatesHook, appState]);

    // PDF export
    const handleExportPDF = useCallback(async () => {
        if (!estimatesHook.currentEstimate) return;
        
        appState.setLoading('pdf', true);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(20);
            doc.text('СМЕТА', 20, 30);
            
            if (companyProfile.name) {
                doc.setFontSize(12);
                doc.text(companyProfile.name, 20, 40);
            }
            
            // Client info
            if (estimatesHook.clientInfo) {
                doc.setFontSize(10);
                doc.text(`Клиент: ${estimatesHook.clientInfo}`, 20, 50);
            }
            
            // Estimate details
            doc.text(`Номер: ${estimatesHook.estimateNumber}`, 20, 60);
            doc.text(`Дата: ${estimatesHook.estimateDate}`, 20, 70);
            
            // Items table
            const tableData = estimatesHook.items.map((item, index) => [
                index + 1,
                item.name,
                item.quantity,
                item.unit,
                formatCurrency(item.price),
                formatCurrency(item.quantity * item.price)
            ]);
            
            autoTable(doc, {
                head: [['№', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма']],
                body: tableData,
                startY: 80,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [79, 91, 213] }
            });
            
            // Totals
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`Итого: ${formatCurrency(estimatesHook.calculation.grandTotal)}`, 20, finalY);
            
            doc.save(`smeta-${estimatesHook.estimateNumber}.pdf`);
        } catch (error) {
            console.error('PDF generation error:', error);
            safeShowAlert('Ошибка при генерации PDF');
        } finally {
            appState.setLoading('pdf', false);
        }
    }, [estimatesHook, companyProfile, formatCurrency, appState]);

    // Share
    const handleShare = useCallback(() => {
        if (tg && tg.sendData) {
            const data = {
                type: 'estimate',
                estimate: estimatesHook.currentEstimate
            };
            tg.sendData(JSON.stringify(data));
        } else {
            safeShowAlert('Функция доступна только в Telegram');
        }
    }, [estimatesHook.currentEstimate]);

    // Navigation handlers
    const handleBackToProject = useCallback(() => {
        if (appState.activeProjectId) {
            appState.navigateToProject(appState.activeProjectId);
        } else {
            appState.navigateToView('workspace');
        }
    }, [appState]);

    const handleNavigateToTasks = useCallback(() => {
        appState.navigateToView('projectTasks');
    }, [appState]);

    const handleNavigateToInventory = useCallback(() => {
        appState.navigateToView('inventory');
    }, [appState]);

    const handleNavigateToReports = useCallback(() => {
        appState.navigateToView('reports');
    }, [appState]);

    const handleOpenScratchpad = useCallback(() => {
        appState.navigateToView('scratchpad');
    }, [appState]);

    // Render view
    const renderView = () => {
        switch (appState.activeView) {
            case 'workspace':
                return (
                    <WorkspaceView
                        scratchpad={projectsHook.scratchpad}
                        globalDocuments={projectsHook.globalDocuments}
                        onScratchpadChange={projectsHook.setScratchpad}
                        onOpenGlobalDocumentModal={() => appState.openModal('globalDocument')}
                        onDeleteGlobalDocument={handleDeleteGlobalDocument}
                        onOpenScratchpad={handleOpenScratchpad}
                    />
                );
            
            case 'estimate':
                return (
                    <EstimateView
                        currentEstimateProjectId={estimatesHook.getCurrentEstimateProjectId()}
                        handleBackToProject={handleBackToProject}
                        clientInfo={estimatesHook.clientInfo}
                        setClientInfo={estimatesHook.setClientInfo}
                        setIsDirty={appState.setIsDirty}
                        handleThemeChange={appState.handleThemeChange}
                        themeIcon={themeIcon}
                        themeMode={appState.themeMode}
                        onOpenLibraryModal={() => appState.openModal('library')}
                        onOpenEstimatesListModal={() => appState.openModal('estimatesList')}
                        onOpenSettingsModal={() => appState.openModal('settings')}
                        onOpenAISuggestModal={() => appState.openModal('aiSuggest')}
                        estimateNumber={estimatesHook.estimateNumber}
                        setEstimateNumber={estimatesHook.setEstimateNumber}
                        estimateDate={estimatesHook.estimateDate}
                        setEstimateDate={estimatesHook.setEstimateDate}
                        handleInputFocus={handleInputFocus}
                        items={estimatesHook.items}
                        dragItem={dragItem}
                        dragOverItem={dragOverItem}
                        handleDragSort={handleDragSort}
                        draggingItem={appState.draggingItem}
                        setDraggingItem={appState.setDraggingItem}
                        fileInputRefs={fileInputRefs}
                        handleItemImageChange={handleItemImageChange}
                        handleRemoveItemImage={handleRemoveItemImage}
                        handleRemoveItem={handleRemoveItem}
                        handleItemChange={handleItemChange}
                        formatCurrency={formatCurrency}
                        handleAddItem={handleAddItem}
                        discount={estimatesHook.discount}
                        setDiscount={estimatesHook.setDiscount}
                        discountType={estimatesHook.discountType}
                        setDiscountType={estimatesHook.setDiscountType}
                        tax={estimatesHook.tax}
                        setTax={estimatesHook.setTax}
                        calculation={estimatesHook.calculation}
                        handleSave={handleSaveEstimate}
                        isDirty={appState.isDirty}
                        isPdfLoading={appState.isPdfLoading}
                        isSaving={appState.isSaving}
                        handleExportPDF={handleExportPDF}
                        handleShare={handleShare}
                        onNewEstimate={handleNewEstimate}
                    />
                );
            
            case 'projects':
                return (
                    <ProjectsListView
                        handleOpenProjectModal={handleOpenProjectModal}
                        projectStatusFilter={appState.projectStatusFilter}
                        setProjectStatusFilter={appState.setProjectStatusFilter}
                        projectSearch={appState.projectSearch}
                        setProjectSearch={appState.setProjectSearch}
                        handleInputFocus={handleInputFocus}
                        filteredProjects={filteredProjects}
                        projects={projectsHook.projects}
                        setActiveProjectId={appState.setActiveProjectId}
                        setActiveView={appState.setActiveView}
                    />
                );
            
            case 'projectDetail':
                if (!activeProject) return null;
                return (
                    <ProjectDetailView
                        activeProject={activeProject}
                        estimates={estimatesHook.getEstimatesByProject(activeProject.id)}
                        financeEntries={projectsHook.getFinanceEntriesByProject(activeProject.id)}
                        photoReports={projectsHook.getPhotoReportsByProject(activeProject.id)}
                        documents={projectsHook.getDocumentsByProject(activeProject.id)}
                        workStages={projectsHook.getWorkStagesByProject(activeProject.id)}
                        financials={projectFinancials!}
                        formatCurrency={formatCurrency}
                        statusMap={statusMap}
                        setActiveView={appState.setActiveView}
                        setActiveProjectId={appState.setActiveProjectId}
                        handleOpenProjectModal={handleOpenProjectModal}
                        handleDeleteProject={handleDeleteProject}
                        handleLoadEstimate={handleLoadEstimate}
                        handleAddNewEstimateForProject={() => {
                            const newEstimate = estimatesHook.createNewEstimate();
                            estimatesHook.saveEstimate(activeProject.id);
                            handleLoadEstimate(newEstimate.id);
                        }}
                        handleDeleteProjectEstimate={handleDeleteEstimate}
                        onOpenFinanceModal={() => appState.openModal('financeEntry')}
                        onDeleteFinanceEntry={handleDeleteFinanceEntry}
                        onOpenPhotoReportModal={() => appState.openModal('photoReport')}
                        onViewPhoto={handleViewPhoto}
                        onOpenDocumentModal={() => appState.openModal('documentUpload')}
                        onDeleteDocument={handleDeleteDocument}
                        onOpenWorkStageModal={(stage) => appState.openModal('workStage', stage)}
                        onDeleteWorkStage={handleDeleteWorkStage}
                        onOpenNoteModal={(note) => appState.openModal('note', note)}
                        onDeleteNote={handleDeleteNote}
                        onOpenActModal={(total) => appState.openModal('actGeneration', total)}
                        onNavigateToTasks={handleNavigateToTasks}
                        onProjectScratchpadChange={projectsHook.updateProjectScratchpad}
                        onExportWorkSchedulePDF={() => {}}
                        onOpenEstimatesListModal={() => appState.openModal('estimatesList')}
                    />
                );
            
            case 'inventory':
                return (
                    <InventoryScreen
                        tools={inventoryItems}
                        projects={projectsHook.projects}
                        consumables={projectsHook.consumables}
                        onToolClick={(tool) => {
                            appState.setSelectedTool(tool);
                            appState.navigateToView('toolDetails');
                        }}
                        onUpdateTool={handleUpdateTool}
                        onOpenAddToolModal={() => appState.openModal('addTool')}
                        onAddConsumable={handleAddConsumable}
                        onUpdateConsumable={handleUpdateConsumable}
                        onDeleteConsumable={handleDeleteConsumable}
                    />
                );
            
            case 'reports':
                return (
                    <ReportsView
                        projects={projectsHook.projects}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectsHook.financeEntries}
                        formatCurrency={formatCurrency}
                        setActiveView={appState.setActiveView}
                    />
                );
            
            case 'scratchpad':
                return (
                    <ScratchpadView
                        content={projectsHook.scratchpad}
                        onSave={projectsHook.setScratchpad}
                        onBack={appState.goBack}
                    />
                );
            
            case 'allTasks':
                return (
                    <ProjectTasksScreen
                        tasks={projectsHook.tasks}
                        projects={projectsHook.projects}
                        projectId={null}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onToggleTask={handleToggleTask}
                        onBack={appState.goBack}
                    />
                );
            
            default:
                return (
                    <WorkspaceView
                        scratchpad={projectsHook.scratchpad}
                        globalDocuments={projectsHook.globalDocuments}
                        onScratchpadChange={projectsHook.setScratchpad}
                        onOpenGlobalDocumentModal={() => appState.openModal('globalDocument')}
                        onDeleteGlobalDocument={handleDeleteGlobalDocument}
                        onOpenScratchpad={handleOpenScratchpad}
                    />
                );
        }
    };

    return (
        <div className="app-container">
            {/* Global Header */}
            <header className="app-header">
                <div className="app-header-left">
                    <img src="/logo.png" alt="Логотип" className="app-logo" />
                    <h1>Прораб</h1>
                </div>
                <div className="app-header-right">
                    <button onClick={appState.handleThemeChange} className="header-btn" aria-label="Сменить тему">
                        {themeIcon()}
                    </button>
                    <button onClick={() => appState.openModal('library')} className="header-btn" aria-label="Справочник">
                        <IconBook />
                    </button>
                    <button onClick={() => appState.openModal('estimatesList')} className="header-btn" aria-label="Список смет">
                        <IconClipboard />
                    </button>
                    <button onClick={() => appState.openModal('settings')} className="header-btn" aria-label="Настройки">
                        <IconSettings />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {renderView()}
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button 
                    onClick={() => appState.navigateToView('workspace')} 
                    className={appState.activeView === 'workspace' ? 'active' : ''}
                >
                    <IconHome />
                    <span>Главная</span>
                </button>
                <button 
                    onClick={() => appState.navigateToView('projects')} 
                    className={appState.activeView.startsWith('project') ? 'active' : ''}
                >
                    <IconProject />
                    <span>Проекты</span>
                </button>
                <button 
                    onClick={() => {
                        if (appState.activeView === 'estimate') {
                            // Если уже в смете, создаем новую
                            handleNewEstimate();
                        } else {
                            // Если переходим в смету из другого экрана, создаем новую
                            // При переходе в блок сметы сбрасываем привязку к проекту и активный проект
                            appState.setActiveProjectId(null); // Сбрасываем активный проект при переходе в блок смет
                            setContextActiveProjectId(null); // очищаем контекст
                            appState.navigateToView('estimate');
                            handleNewEstimate();
                        }
                    }} 
                    className={appState.activeView === 'estimate' ? 'active' : ''}
                >
                    <IconDocument />
                    <span>Смета</span>
                </button>
                <button 
                    onClick={() => appState.navigateToView('inventory')} 
                    className={appState.activeView.startsWith('inventory') || appState.activeView === 'toolDetails' ? 'active' : ''}
                >
                    <IconClipboard />
                    <span>Инвентарь</span>
                </button>
                <button 
                    onClick={() => appState.navigateToView('reports')} 
                    className={appState.activeView === 'reports' ? 'active' : ''}
                >
                    <IconTrendingUp />
                    <span>Отчеты</span>
                </button>
                <button 
                    onClick={() => appState.navigateToView('allTasks')} 
                    className={appState.activeView === 'allTasks' ? 'active' : ''}
                >
                    <IconCheckSquare />
                    <span>Задачи</span>
                </button>
            </nav>

            {/* Modals */}
            {appState.showSettingsModal && (
                <SettingsModal
                    onClose={() => appState.closeModal('settings')}
                    profile={companyProfile}
                    onProfileChange={handleProfileChange}
                    onLogoChange={handleLogoChange}
                    onRemoveLogo={handleRemoveLogo}
                    onSave={handleSaveProfile}
                    onBackup={handleBackup}
                    onRestore={handleRestore}
                    onInputFocus={handleInputFocus}
                />
            )}

            {appState.showEstimatesListModal && (
                <EstimatesListModal
                    onClose={() => appState.closeModal('estimatesList')}
                    estimates={estimatesHook.estimates}
                    templates={estimatesHook.templates}
                    activeEstimateId={appState.activeEstimateId}
                    statusMap={statusMap}
                    formatCurrency={formatCurrency}
                    onLoadEstimate={handleLoadEstimate}
                    onDeleteEstimate={handleDeleteEstimate}
                    onStatusChange={handleStatusChange}
                    onSaveAsTemplate={handleSaveAsTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onNewEstimate={handleNewEstimate}
                    onInputFocus={handleInputFocus}
                />
            )}

            {appState.showLibraryModal && (
                <LibraryModal
                    onClose={() => appState.closeModal('library')}
                    libraryItems={libraryItems}
                    onLibraryItemsChange={handleLibraryItemsChange}
                    onAddItemToEstimate={handleAddItemToEstimate}
                    formatCurrency={formatCurrency}
                    onInputFocus={handleInputFocus}
                    showConfirm={safeShowConfirm}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showNewProjectModal && (
                <NewProjectModal
                    project={appState.selectedProject}
                    onClose={() => appState.closeModal('newProject')}
                    onProjectChange={(project) => appState.setSelectedProject(project)}
                    onSave={handleSaveProject}
                    onInputFocus={handleInputFocus}
                />
            )}

            {appState.showFinanceEntryModal && (
                <FinanceEntryModal
                    onClose={() => appState.closeModal('financeEntry')}
                    onSave={handleAddFinanceEntry}
                    showAlert={safeShowAlert}
                    onInputFocus={handleInputFocus}
                />
            )}

            {appState.showPhotoReportModal && (
                <PhotoReportModal
                    onClose={() => appState.closeModal('photoReport')}
                    onSave={handleAddPhotoReport}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showPhotoViewerModal && appState.selectedPhoto && (
                <PhotoViewerModal
                    photo={appState.selectedPhoto}
                    onClose={() => appState.closeModal('photoViewer')}
                    onDelete={(id) => {
                        projectsHook.deletePhotoReport(id);
                        appState.closeModal('photoViewer');
                    }}
                />
            )}

            {appState.showShoppingListModal && (
                <ShoppingListModal
                    items={estimatesHook.items}
                    onClose={() => appState.closeModal('shoppingList')}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showDocumentUploadModal && (
                <DocumentUploadModal
                    onClose={() => appState.closeModal('documentUpload')}
                    onSave={handleAddDocument}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showGlobalDocumentModal && (
                <DocumentUploadModal
                    onClose={() => appState.closeModal('globalDocument')}
                    onSave={handleAddGlobalDocument}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showWorkStageModal && (
                <WorkStageModal
                    stage={appState.selectedWorkStage}
                    onClose={() => appState.closeModal('workStage')}
                    onSave={handleAddWorkStage}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showNoteModal && (
                <NoteModal
                    note={appState.selectedNote}
                    onClose={() => appState.closeModal('note')}
                    onSave={handleAddNote}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showActGenerationModal && activeProject && (
                <ActGenerationModal
                    onClose={() => appState.closeModal('actGeneration')}
                    project={activeProject}
                    profile={companyProfile}
                    totalAmount={appState.actTotalAmount}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showAISuggestModal && (
                <AISuggestModal
                    onClose={() => appState.closeModal('aiSuggest')}
                    onAddItems={handleAddItemsFromAI}
                    showAlert={safeShowAlert}
                />
            )}

            {appState.showAddToolModal && (
                <AddToolModal
                    onClose={() => appState.closeModal('addTool')}
                    onSave={handleAddTool}
                />
            )}

            {appState.showScratchpadModal && (
                <div className="modal-overlay" onClick={() => appState.closeModal('scratchpad')}>
                    <div className="modal-content scratchpad-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Блокнот</h2>
                            <button onClick={() => appState.closeModal('scratchpad')} className="close-btn">
                                <IconClose />
                            </button>
                        </div>
                        <textarea
                            value={projectsHook.scratchpad}
                            onChange={(e) => projectsHook.setScratchpad(e.target.value)}
                            placeholder="Ваши заметки..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;