export type ProjectStatus = 'all' | 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ToolLocation = 'on_base' | 'in_repair' | 'on_project';
export type FinanceCategory = 'materials' | 'labor' | 'transport' | 'tools_rental' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ToolCondition = 'excellent' | 'good' | 'needs_service';
export type WorkStageStatus = 'planned' | 'in_progress' | 'completed';
export type ItemType = 'material' | 'work';
export type LibraryItemCategory = 'electrics' | 'plumbing' | 'finishing_materials';

export interface ProjectFinancials {
    estimateTotal: number;
    paidTotal: number;
    expensesTotal: number;
    expensesBreakdown: { categoryName: string; amount: number }[];
    profit: number;
    profitability: number;
    cashFlowEntries: { date: string; type: 'income' | 'expense'; amount: number; description: string }[];
}

export interface ProjectTasksScreenProps {
    tasks: Task[];
    projects: Project[];
    projectId: string | null;
    onAddTask: (title: string, projectId: string | null) => void;
    onUpdateTask: (task: Task) => void;
    onToggleTask: (id: string) => void;
    onBack?: () => void;
}

export interface InventoryScreenProps {
    tools: Tool[];
    projects: Project[];
    consumables: Consumable[];
    onToolClick: (tool: Tool) => void;
    onUpdateTool: (tool: Tool) => void;
    onOpenAddToolModal: () => void;
    onAddConsumable: (consumable: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => void;
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
    id: string; // Генерируется UUID
    name: string;
    quantity: number;
    unit: string;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Tool {
    id: string; // Генерируется UUID
    name: string;
    category: string;
    condition: ToolCondition;
    location?: ToolLocation;
    notes?: string;
    image?: string; // URL-адрес изображения
    purchaseDate?: string; // ISO 8601 format
    purchasePrice?: number;
    projectId?: string | null; // Required if location is 'on_project'
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Project {
    id: string; // Генерируется UUID
    name: string;
    client: string;
    address: string;
    status: ProjectStatus;
    scratchpad?: string;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Task {
    id: string; // Генерируется UUID
    title: string;
    projectId: string | null;
    isCompleted: boolean;
    priority: TaskPriority;
    tags: string[];
    dueDate: string | null; // ISO 8601 format
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Item {
    id: string; // Генерируется UUID
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image: string | null; // URL-адрес изображения
    type: ItemType;
}

export interface LibraryItem {
    id: string; // Генерируется UUID
    name: string;
    price: number;
    unit: string;
    category?: LibraryItemCategory;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface CompanyProfile {
    name: string;
    details: string;
    logo: string | null; // URL-адрес изображения
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export type ThemeMode = 'light' | 'dark';

export interface Estimate {
    id: string; // Генерируется UUID
    clientInfo: string;
    items: Item[];
    discount: number;
    discountType: 'percent' | 'fixed';
    tax: number;
    number: string; // Генерируется в формате 'ГГГГ-ННН', где ННН - порядковый номер для года
    date: string; // ISO 8601 format
    status: EstimateStatus;
    project_id: string | null;
    user_id: string; // ID пользователя
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface FinanceEntry {
    id: string; // Генерируется UUID
    projectId: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string; // ISO 8601 format
    category?: FinanceCategory;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface PhotoReport {
    id: string; // Генерируется UUID
    projectId: string;
    title: string;
    description: string;
    photos: string[]; // Массив URL-адресов изображений
    date: string; // ISO 8601 format
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Document {
    id: string; // Генерируется UUID
    projectId?: string;
    name: string;
    fileUrl: string; // URL to the stored file
    date: string; // ISO 8601 format
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface WorkStage {
    id: string; // Генерируется UUID
    projectId: string;
    title: string;
    description: string;
    startDate: string; // ISO 8601 format
    endDate?: string; // ISO 8601 format
    status: WorkStageStatus;
    progress: number; // Прогресс в процентах от 0 до 100
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface Note {
    id: string; // Генерируется UUID
    projectId: string;
    text: string;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface InventoryItem {
    id: string; // Генерируется UUID
    name: string;
    category: string;
    status: 'available' | 'in_use' | 'maintenance' | 'retired';
    location?: string;
    notes?: string;
    createdAt: string; // ISO 8601 format
    updatedAt: string; // ISO 8601 format
}

export interface InventoryNote {
    id: string; // Генерируется UUID
    toolId: string;
    text: string;
    date: string; // ISO 8601 format
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
    templates: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>[];
    activeEstimateId: string | null;
    statusMap: Record<EstimateStatus, { text: string; color: string; textColor: string; }>;
    formatCurrency: (value: number) => string;
    onLoadEstimate: (id: string) => void;
    onDeleteEstimate: (id: string) => void;
    onStatusChange: (id: string, status: EstimateStatus) => void;
    onSaveAsTemplate: (id: string) => void;
    onDeleteTemplate: (timestamp: number) => void;
    onNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
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
    onSave: (entry: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
    showAlert: (message: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}

export interface PhotoReportModalProps {
    onClose: () => void;
    onSave: (photo: Omit<PhotoReport, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
    showAlert: (message: string) => void;
}

export interface PhotoViewerModalProps {
    photo: PhotoReport;
    onClose: () => void;
    onDelete: (id: string) => void;
}

export interface ShoppingListModalProps {
    items: Item[];
    onClose: () => void;
    showAlert: (message: string) => void;
}

export interface DocumentUploadModalProps {
    onClose: () => void;
    onSave: (name: string, fileUrl: string) => void;
    showAlert: (message: string) => void;
}

export interface WorkStageModalProps {
    stage: Partial<WorkStage> | null;
    onClose: () => void;
    onSave: (stage: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
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
    onSave: (tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

// View Props
export interface EstimateViewProps {
    currentEstimateProjectId: string | null;
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
    fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
    handleItemImageChange: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveItemImage: (id: string) => void;
    handleRemoveItem: (id: string) => void;
    handleItemChange: (id: string, field: keyof Item, value: string | number) => void;
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
    onNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId' | 'createdAt' | 'updatedAt'>) => void;
}

export interface ProjectsListViewProps {
    handleOpenProjectModal: (project: Partial<Project> | null) => void;
    projectStatusFilter: ProjectStatus;
    setProjectStatusFilter: (value: ProjectStatus) => void;
    projectSearch: string;
    setProjectSearch: (value: string) => void;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    filteredProjects: Project[];
    projects: Project[];
    setActiveProjectId: (value: string | null) => void;
    setActiveView: (value: string) => void;
}

export interface ProjectDetailViewProps {
    activeProject: Project;
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    photoReports: PhotoReport[];
    documents: Document[];
    workStages: WorkStage[];
    financials: ProjectFinancials;
    formatCurrency: (value: number) => string;
    statusMap: Record<EstimateStatus, { text: string; color: string; textColor: string; }>;
    setActiveView: (value: string) => void;
    setActiveProjectId: (value: string | null) => void;
    handleOpenProjectModal: (project: Partial<Project> | null) => void;
    handleDeleteProject: (id: string) => void;
    handleLoadEstimate: (id: string) => void;
    handleAddNewEstimateForProject: () => void;
    handleDeleteProjectEstimate: (id: string) => void;
    onOpenFinanceModal: () => void;
    onDeleteFinanceEntry: (id: string) => void;
    onOpenPhotoReportModal: () => void;
    onViewPhoto: (photo: PhotoReport) => void;
    onOpenDocumentModal: () => void;
    onDeleteDocument: (id: string) => void;
    onOpenWorkStageModal: (stage: Partial<WorkStage> | null) => void;
    onDeleteWorkStage: (id: string) => void;
    onOpenNoteModal: (note: Partial<Note> | null) => void;
    onDeleteNote: (id: string) => void;
    onOpenActModal: (total: number) => void;
    onNavigateToTasks: () => void;
    onProjectScratchpadChange: (projectId: string, content: string) => void;
    onExportWorkSchedulePDF: (project: Project, workStages: WorkStage[]) => void;
    onOpenEstimatesListModal: () => void;
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
    onDeleteGlobalDocument: (id: string) => void;
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
