export interface ProjectTasksScreenProps {
    tasks: Task[];
    projects: Project[];
    projectId: string | number | null;
    onAddTask: (title: string, projectId: string | number | null) => void;
    onUpdateTask: (task: Task) => void;
    onToggleTask: (id: string | number) => void;
}

export interface InventoryScreenProps {
    tools: Tool[];
    projects: Project[];
    consumables: Consumable[];
    onToolClick: (tool: Tool) => void;
    onUpdateTool: (tool: Tool) => void;
    onOpenAddToolModal: () => void;
    onAddConsumable: (consumable: Omit<Consumable, 'id'>) => void;
    onUpdateConsumable: (consumable: Consumable) => void;
    onDeleteConsumable: (id: string) => void;
}

export interface ToolDetailsScreenProps {
    tool: Partial<Tool>;
    onSave: (tool: Partial<Tool>) => void;
    onBack: () => void;
    onDelete: (id: string) => void;
}

export interface Consumable {
    id: string;
    name: string;
    quantity: string;
}

export interface Tool {
    id: string;
    name: string;
    category: string;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    location?: string;
    notes?: string;
    image?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    currentProjectId?: string | number;
}

export interface Project {
    id: number;
    name: string;
    client: string;
    address: string;
    status: 'in_progress' | 'completed';
}

export interface Task {
    id: number;
    title: string;
    projectId: string | number | null;
    isCompleted: boolean;
    createdAt: Date;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    dueDate: Date | null;
}

export interface Item {
    id: number;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image?: string | null;
    type: 'material' | 'work';
}

export interface LibraryItem {
    id: number;
    name: string;
    price: number;
    unit: string;
    category?: string;
}

export interface CompanyProfile {
    name: string;
    details: string;
    logo: string | null;
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export type ThemeMode = 'light' | 'dark';

export interface Estimate {
    id: number;
    clientInfo: string;
    items: Item[];
    discount: number;
    discountType: 'percent' | 'fixed';
    tax: number;
    number: string;
    date: string;
    status: EstimateStatus;
    projectId: number | null;
    lastModified: number;
}

export interface FinanceEntry {
    id: number;
    projectId: number;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    category?: string;
}

export interface PhotoReport {
    id: number;
    projectId: number;
    title: string;
    description: string;
    photos: string[];
    date: string;
}

export interface Document {
    id: number;
    projectId?: number;
    name: string;
    dataUrl: string;
    date: string;
}

export interface WorkStage {
    id: number;
    projectId: number;
    title: string;
    description: string;
    startDate: string;
    endDate?: string;
    status: 'planned' | 'in_progress' | 'completed';
    progress: number;
}

export interface Note {
    id: number;
    projectId: number;
    text: string;
    lastModified: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    status: 'available' | 'in_use' | 'maintenance' | 'retired';
    location?: string;
    notes?: string;
}

export interface InventoryNote {
    id: number;
    toolId: string;
    text: string;
    date: string;
}

export interface CalculationResults {
    subtotal: number;
    materialsTotal: number;
    workTotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
}

// Modal Props
export interface SettingsModalProps {
    onClose: () => void;
    profile: CompanyProfile;
    onProfileChange: (field: keyof CompanyProfile, value: string) => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLogo: () => void;
    onSave: () => void;
    onBackup: () => void;
    onRestore: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface EstimatesListModalProps {
    onClose: () => void;
    estimates: Estimate[];
    templates: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>[];
    activeEstimateId: number | null;
    statusMap: Record<EstimateStatus, string>;
    formatCurrency: (value: number) => string;
    onLoadEstimate: (id: number) => void;
    onDeleteEstimate: (id: number) => void;
    onStatusChange: (id: number, status: EstimateStatus) => void;
    onSaveAsTemplate: (id: number) => void;
    onDeleteTemplate: (timestamp: number) => void;
    onNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface LibraryModalProps {
    onClose: () => void;
    libraryItems: LibraryItem[];
    onLibraryItemsChange: (items: LibraryItem[]) => void;
    onAddItemToEstimate: (item: LibraryItem) => void;
    formatCurrency: (value: number) => string;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
    showAlert: (message: string) => void;
}

export interface NewProjectModalProps {
    project: Partial<Project> | null;
    onClose: () => void;
    onProjectChange: (project: Partial<Project> | null) => void;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface FinanceEntryModalProps {
    onClose: () => void;
    onSave: (entry: Omit<FinanceEntry, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface PhotoReportModalProps {
    onClose: () => void;
    onSave: (photo: Omit<PhotoReport, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
}

export interface PhotoViewerModalProps {
    photo: PhotoReport;
    onClose: () => void;
    onDelete: (id: number) => void;
}

export interface ShoppingListModalProps {
    items: Item[];
    onClose: () => void;
    showAlert: (message: string) => void;
}

export interface DocumentUploadModalProps {
    onClose: () => void;
    onSave: (name: string, dataUrl: string) => void;
    showAlert: (message: string) => void;
}

export interface WorkStageModalProps {
    stage: Partial<WorkStage> | null;
    onClose: () => void;
    onSave: (stage: Omit<WorkStage, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
}

export interface NoteModalProps {
    note: Partial<Note> | null;
    onClose: () => void;
    onSave: (text: string) => void;
    showAlert: (message: string) => void;
}

export interface ActGenerationModalProps {
    onClose: () => void;
    project: Project;
    profile: CompanyProfile;
    totalAmount: number;
    showAlert: (message: string) => void;
}

export interface AISuggestModalProps {
    onClose: () => void;
    onAddItems: (items: Omit<Item, 'id' | 'image' | 'type'>[]) => void;
    showAlert: (message: string) => void;
}

export interface AddToolModalProps {
    onClose: () => void;
    onSave: (tool: Omit<Tool, 'id'>) => void;
}

// View Props
export interface EstimateViewProps {
    currentEstimateProjectId: number | null;
    handleBackToProject: () => void;
    clientInfo: string;
    setClientInfo: (value: string) => void;
    setIsDirty: (value: boolean) => void;
    handleThemeChange: () => void;
    themeIcon: () => React.ReactElement;
    themeMode: ThemeMode;
    onOpenLibraryModal: () => void;
    onOpenEstimatesListModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenAISuggestModal: () => void;
    estimateNumber: string;
    setEstimateNumber: (value: string) => void;
    estimateDate: string;
    setEstimateDate: (value: string) => void;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    items: Item[];
    dragItem: React.MutableRefObject<number | null>;
    dragOverItem: React.MutableRefObject<number | null>;
    handleDragSort: () => void;
    draggingItem: number | null;
    setDraggingItem: (value: number | null) => void;
    fileInputRefs: React.MutableRefObject<Record<number, HTMLInputElement | null>>;
    handleItemImageChange: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveItemImage: (id: number) => void;
    handleRemoveItem: (id: number) => void;
    handleItemChange: (id: number, field: keyof Item, value: string | number) => void;
    formatCurrency: (value: number) => string;
    handleAddItem: () => void;
    discount: number;
    setDiscount: (value: number) => void;
    discountType: 'percent' | 'fixed';
    setDiscountType: (value: 'percent' | 'fixed') => void;
    tax: number;
    setTax: (value: number) => void;
    calculation: CalculationResults;
    handleSave: () => void;
    isDirty: boolean;
    isPdfLoading: boolean;
    isSaving: boolean;
    handleExportPDF: () => void;
    handleShare: () => void;
    handleNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => void;
}

export interface ProjectsListViewProps {
    handleOpenProjectModal: (project: Partial<Project> | null) => void;
    projectStatusFilter: 'in_progress' | 'completed';
    setProjectStatusFilter: (value: 'in_progress' | 'completed') => void;
    projectSearch: string;
    setProjectSearch: (value: string) => void;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    filteredProjects: Project[];
    projects: Project[];
    setActiveProjectId: (value: number | null) => void;
    setActiveView: (value: string) => void;
}

export interface ProjectDetailViewProps {
    activeProject: Project;
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    photoReports: PhotoReport[];
    documents: Document[];
    workStages: WorkStage[];
    notes: Note[];
    formatCurrency: (value: number) => string;
    statusMap: Record<EstimateStatus, string>;
    setActiveView: (value: string) => void;
    setActiveProjectId: (value: number | null) => void;
    handleOpenProjectModal: (project: Partial<Project> | null) => void;
    handleDeleteProject: (id: number) => void;
    handleLoadEstimate: (id: number) => void;
    handleAddNewEstimateForProject: () => void;
    onOpenFinanceModal: () => void;
    onDeleteFinanceEntry: (id: number) => void;
    onOpenPhotoReportModal: () => void;
    onViewPhoto: (photo: PhotoReport) => void;
    onOpenDocumentModal: () => void;
    onDeleteDocument: (id: number) => void;
    onOpenWorkStageModal: (stage: Partial<WorkStage> | null) => void;
    onDeleteWorkStage: (id: number) => void;
    onOpenNoteModal: (note: Partial<Note> | null) => void;
    onDeleteNote: (id: number) => void;
    onOpenActModal: (total: number) => void;
    onNavigateToTasks: () => void;
}

export interface InventoryViewProps {
    tools: Tool[];
    projects: Project[];
    onToolClick: (tool: Tool) => void;
    onUpdateTool: (tool: Tool) => void;
    onOpenAddToolModal: () => void;
}

export interface ReportsViewProps {
    projects: Project[];
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    formatCurrency: (value: number) => string;
    setActiveView: (value: string) => void;
}

export interface WorkspaceViewProps {
    scratchpad: string;
    globalDocuments: Document[];
    onScratchpadChange: (text: string) => void;
    onOpenGlobalDocumentModal: () => void;
    onDeleteGlobalDocument: (id: number) => void;
    onOpenScratchpad: () => void;
}

export interface ScratchpadViewProps {
    content: string;
    onSave: (text: string) => void;
    onBack: () => void;
}

declare global {
    interface Window {
        Telegram?: TelegramWebApp;
    }
}

export interface TelegramWebApp {
    initData: string;
    initDataUnsafe: any;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: any;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;
    isClosingConfirmationEnabled: boolean;
    BackButton: any;
    MainButton: any;
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    ready: () => void;
    expand: () => void;
    close: () => void;
    sendData: (data: string) => void;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
    disableVerticalSwipes: () => void;
}