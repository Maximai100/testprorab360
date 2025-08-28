export interface TelegramWebApp {
    version: string;
    ready: () => void;
    expand: () => void;
    sendData: (data: string) => void;
    HapticFeedback: {
        notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
    };
    colorScheme: 'light' | 'dark';
    onEvent: (eventType: 'themeChanged', eventHandler: () => void) => void;
    offEvent: (eventType: 'themeChanged', eventHandler: () => void) => void;
    isClosingConfirmationEnabled: boolean;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
    disableVerticalSwipes: () => void;
    showAlert: (message: string, callback?: () => void) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
        jspdf: any; // For jsPDF library
    }
}

export interface Item {
    id: number;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image?: string | null;
    type: 'work' | 'material';
}

export interface LibraryItem {
    id: number;
    name: string;
    price: number;
    unit: string;
    category: string;
}

export interface CompanyProfile {
    name: string;
    details: string;
    logo: string | null;
}

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'completed' | 'cancelled';
export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Estimate {
    id: number;
    number: string;
    date: string;
    status: EstimateStatus;
    clientInfo: string;
    items: Item[];
    discount: number;
    discountType: 'percent' | 'fixed';
    tax: number;
    lastModified: number;
    projectId: number | null;
}

export interface Project {
    id: number;
    name: string;
    client: string;
    address: string;
    status: 'in_progress' | 'completed';
}

export interface FinanceEntry {
    id: number;
    projectId: number;
    type: 'expense' | 'payment';
    amount: number;
    description: string;
    date: string;
    receiptImage?: string | null;
}

export interface PhotoReport {
    id: number;
    projectId: number;
    image: string;
    caption: string;
    date: string;
}

export interface Document {
    id: number;
    projectId?: number | null;
    name: string;
    dataUrl: string;
    date: string;
}

export interface WorkStage {
    id: number;
    projectId: number;
    name: string;
    startDate: string;
    endDate: string;
}

export interface Note {
    id: number;
    projectId: number;
    text: string;
    lastModified: number;
}

export interface InventoryItem {
    id: number;
    name: string;
    location: string; // "На базе" or projectId
}

export interface InventoryNote {
    id: number;
    text: string;
    date: string;
}

export interface SettingsModalProps {
    profile: CompanyProfile;
    onClose: () => void;
    onProfileChange: (field: keyof CompanyProfile, value: string) => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLogo: () => void;
    onSave: () => void;
    onBackup: () => void;
    onRestore: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export interface EstimatesListModalProps {
    onClose: () => void;
    estimates: Estimate[];
    templates: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>[];
    activeEstimateId: number | null;
    statusMap: Record<EstimateStatus, { text: string; color: string; }>;
    formatCurrency: (value: number) => string;
    onLoadEstimate: (id: number) => void;
    onDeleteEstimate: (id: number) => void;
    onStatusChange: (id: number, newStatus: EstimateStatus) => void;
    onSaveAsTemplate: (id: number) => void;
    onDeleteTemplate: (timestamp: number) => void;
    onNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export interface LibraryModalProps {
    onClose: () => void;
    libraryItems: LibraryItem[];
    onLibraryItemsChange: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
    onAddItemToEstimate: (libItem: LibraryItem) => void;
    formatCurrency: (value: number) => string;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
    showAlert: (message: string) => void;
}

export interface NewProjectModalProps {
    project: Partial<Project> | null;
    onClose: () => void;
    onProjectChange: React.Dispatch<React.SetStateAction<Partial<Project> | null>>;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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

export interface EstimateViewProps {
    currentEstimateProjectId: number | null;
    handleBackToProject: () => void;
    clientInfo: string;
    setClientInfo: React.Dispatch<React.SetStateAction<string>>;
    setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
    handleThemeChange: () => void;
    themeIcon: () => JSX.Element;
    themeMode: ThemeMode;
    setIsLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEstimatesListOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAISuggestModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    estimateNumber: string;
    setEstimateNumber: React.Dispatch<React.SetStateAction<string>>;
    estimateDate: string;
    setEstimateDate: React.Dispatch<React.SetStateAction<string>>;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    items: Item[];
    dragItem: React.MutableRefObject<number | null>;
    dragOverItem: React.MutableRefObject<number | null>;
    handleDragSort: () => void;
    draggingItem: number | null;
    setDraggingItem: React.Dispatch<React.SetStateAction<number | null>>;
    fileInputRefs: React.MutableRefObject<Record<number, HTMLInputElement | null>>;
    handleItemImageChange: (id: number, e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveItemImage: (id: number) => void;
    handleRemoveItem: (id: number) => void;
    handleItemChange: (id: number, field: keyof Item, value: string | number) => void;
    formatCurrency: (value: number) => string;
    handleAddItem: () => void;
    discount: number;
    setDiscount: React.Dispatch<React.SetStateAction<number>>;
    discountType: 'percent' | 'fixed';
    setDiscountType: React.Dispatch<React.SetStateAction<'percent' | 'fixed'>>;
    tax: number;
    setTax: React.Dispatch<React.SetStateAction<number>>;
    calculation: any;
    handleSave: () => void;
    isDirty: boolean;
    isPdfLoading: boolean;
    isSaving: boolean;
    handleExportPDF: () => void;
    setIsShoppingListOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleShare: () => void;
}

export interface ProjectsListViewProps {
    handleOpenProjectModal: (project?: Partial<Project> | null) => void;
    projectStatusFilter: 'in_progress' | 'completed';
    setProjectStatusFilter: React.Dispatch<React.SetStateAction<'in_progress' | 'completed'>>;
    projectSearch: string;
    setProjectSearch: React.Dispatch<React.SetStateAction<string>>;
    handleInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
    filteredProjects: Project[];
    projects: Project[];
    setActiveProjectId: React.Dispatch<React.SetStateAction<number | null>>;
    setActiveView: React.Dispatch<React.SetStateAction<string>>;
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
    statusMap: Record<EstimateStatus, { text: string; color: string; }>;
    setActiveView: React.Dispatch<React.SetStateAction<any>>;
    setActiveProjectId: React.Dispatch<React.SetStateAction<number | null>>;
    handleOpenProjectModal: (project: Partial<Project>) => void;
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
}

export interface InventoryViewProps {
    inventoryItems: InventoryItem[];
    inventoryNotes: InventoryNote[];
    projects: Project[];
    onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
    onUpdateItem: (item: InventoryItem) => void;
    onDeleteItem: (id: number) => void;
    onAddNote: (note: Omit<InventoryNote, 'id' | 'date'>) => void;
    onDeleteNote: (id: number) => void;
    onOpenAddToolModal: () => void;
}

export interface AddToolModalProps {
    onClose: () => void;
    onSave: (item: Omit<InventoryItem, 'id'>) => void;
}

export interface ReportsViewProps {
    projects: Project[];
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
}

export interface Task {
  id: number;
  text: string;
  completed: boolean;
}

export interface WorkspaceViewProps {
    tasks: Task[];
    scratchpad: string;
    globalDocuments: Document[];
    onAddTask: (text: string) => void;
    onToggleTask: (id: number) => void;
    onDeleteTask: (id: number) => void;
    onScratchpadChange: (text: string) => void;
    onOpenGlobalDocumentModal: () => void;
    onDeleteGlobalDocument: (id: number) => void;
}
