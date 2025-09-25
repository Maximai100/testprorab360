import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

// Простой лог для проверки выполнения
console.log('📁 App.tsx: Файл загружен и выполняется');

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
import { ToolDetailsModal } from './components/modals/ToolDetailsModal';
import { AddTaskModal } from './components/modals/AddTaskModal';
import { EstimateView } from './components/views/EstimateView';
import { ProjectsListView } from './components/views/ProjectsListView';
import { ProjectDetailView } from './components/views/ProjectDetailView';
import { InventoryScreen } from './components/views/InventoryScreen';
import { ToolDetailsScreen } from './components/views/ToolDetailsScreen';
import { ReportsView } from './components/views/ReportsView';
import { ReportsHubScreen } from './components/views/ReportsHubScreen';
import { ProjectFinancialReportScreen } from './components/views/ProjectFinancialReportScreen';
import { ClientReportScreen } from './components/views/ClientReportScreen';
import { OverallFinancialReportScreen } from './components/views/OverallFinancialReportScreen';
import { WorkspaceView } from './components/views/WorkspaceView';
import { ScratchpadView } from './components/views/ScratchpadView';
import { ProjectTasksScreen } from './components/views/ProjectTasksScreen';
import { CalculatorView } from './components/views/CalculatorView';
import { ListItem } from './components/ui/ListItem';
import { useProjectContext } from './context/ProjectContext';
import AuthScreen from './components/views/AuthScreen';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

// Import new hooks
import { useAppState } from './hooks/useAppState';
import useLibrary from './hooks/useLibrary';
import useCompanyProfile from './hooks/useCompanyProfile';
import { useEstimates } from './hooks/useEstimates';
import { useProjects } from './hooks/useProjects';
import { useProjectData } from './hooks/useProjectData';
import { useInventory } from './hooks/useInventory';
import { useNotes } from './hooks/useNotes';
import { useTasks } from './hooks/useTasks';
import { useFileStorage } from './hooks/useFileStorage';
import { dataService, storageService } from './services/storageService';

const App: React.FC = () => {
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log('🚀 App: Компонент App рендерится #' + renderCount.current + ' - ' + new Date().toLocaleTimeString());
    
    // Error boundary state
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Supabase auth session
    const [session, setSession] = useState<Session | null>(null);

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

    // Use new hooks - ВСЕГДА вызываем хуки в начале компонента
    console.log('🔧 App: Инициализируем хуки...');
    const appState = useAppState();
    console.log('🔧 App: useAppState инициализирован');
    const estimatesHook = useEstimates(session);
    console.log('🔧 App: useEstimates инициализирован');
    const projectsHook = useProjects();
    console.log('🔧 App: useProjects инициализирован');
    const projectDataHook = useProjectData();
    console.log('🔧 App: useProjectData инициализирован');
    const inventoryHook = useInventory(session);
    console.log('🔧 App: useInventory инициализирован');
    const notesHook = useNotes(session);
    console.log('🔧 App: useNotes инициализирован');
    const tasksHook = useTasks(session);
    console.log('🔧 App: useTasks инициализирован');
    const fileStorageHook = useFileStorage();
    console.log('🔧 App: useFileStorage инициализирован');

    const loadProjectsFromSupabaseRef = projectsHook.loadProjectsFromSupabase;
    const loadDocumentsFromSupabaseRef = projectsHook.loadDocumentsFromSupabase;
    const loadPhotoReportsFromSupabaseRef = projectsHook.loadPhotoReportsFromSupabase;
    const setProjectsRef = projectsHook.setProjects;

    const fetchAllEstimatesFromHook = estimatesHook.fetchAllEstimates;
    const setEstimatesRef = estimatesHook.setEstimates;

    const fetchAllInventoryRef = inventoryHook.fetchAllInventory;
    const fetchAllNotesRef = notesHook.fetchAllNotes;
    const fetchAllTasksRef = tasksHook.fetchAllTasks;
    
    // Логирование состояния после инициализации хуков
    console.log('🚀 App: activeView:', appState?.activeView);
    console.log('🚀 App: session:', session ? 'есть' : 'нет');

    // Subscribe to Supabase auth changes - перемещен после объявления хуков

    // Функция для загрузки всех смет
    const fetchAllEstimates = useCallback(async () => {
      try {
        console.log('🔧 App: fetchAllEstimates запущен');
        const { data, error } = await supabase
          .from('estimates')
          .select(`
            *,
            estimate_items (
              id,
              name,
              quantity,
              price,
              unit,
              image_url, 
              type,
              estimate_id
            )
          `)
          .eq('user_id', session?.user?.id || '');

        if (error) {
          console.error('🔧 App: Ошибка загрузки смет:', error);
          return;
        }
        
        console.log('🔧 App: fetchAllEstimates успешно, данные:', data);
        console.log('🔧 App: количество смет:', data?.length || 0);
        
        if (data && data.length > 0) {
          console.log('🔧 App: первая смета:', data[0]);
          console.log('🔧 App: estimate_items первой сметы:', data[0].estimate_items);
          console.log('🔧 App: количество позиций в первой смете:', data[0].estimate_items?.length || 0);
          
          if (data[0].estimate_items && data[0].estimate_items.length > 0) {
            console.log('🔧 App: первая позиция первой сметы:', data[0].estimate_items[0]);
          }
        }
        
        estimatesHook.setEstimates(data || []); // Сохраняем в состояние хука
        console.log('🔧 App: setEstimates вызван');
      } catch (error) {
        console.error('🔧 App: Ошибка в fetchAllEstimates:', error);
      }
    }, []); // Убираем estimatesHook из зависимостей для предотвращения бесконечного цикла

    useEffect(() => {
        // Получаем текущую сессию при инициализации
        const getInitialSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
                console.log('🔧 App: Начальная сессия:', initialSession ? 'есть' : 'нет');
            } catch (e) {
                console.error('🔧 App: Ошибка получения сессии Supabase:', e);
                setSession(null);
            }
        };
        
        getInitialSession();

        // Подписываемся на изменения состояния авторизации
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('🔧 App: Изменение состояния авторизации:', _event, session ? 'есть' : 'нет');
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Флаги для предотвращения множественных вызовов
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [projectsLoaded, setProjectsLoaded] = useState(false);

    // Загружаем проекты всегда (даже без сессии), если ещё не загружали
    useEffect(() => {
        if (!projectsLoaded) {
            console.log('Загружаем проекты без зависимости от сессии...');
            loadProjectsFromSupabaseRef();
            setProjectsLoaded(true);
        }
    }, [projectsLoaded, loadProjectsFromSupabaseRef]);

    // Остальные данные загружаем только при активной сессии
    useEffect(() => {
        if (!session) {
            if (dataLoaded || isDataLoading) {
                console.log("Сессия отсутствует, очищаем данные...");
                setProjectsRef([]);
                setEstimatesRef([]);
                fetchAllInventoryRef(null);
                fetchAllNotesRef(null);
                setDataLoaded(false);
                setIsDataLoading(false);
            }
            return;
        }

        if (dataLoaded || isDataLoading) {
            return;
        }

        console.log("Сессия активна, загружаем данные...");
        setIsDataLoading(true);

        let cancelled = false;

        const loadAllData = async () => {
            try {
                await Promise.all([
                    loadProjectsFromSupabaseRef(),
                    loadDocumentsFromSupabaseRef(),
                    loadPhotoReportsFromSupabaseRef(),
                    fetchAllEstimatesFromHook(),
                    fetchAllInventoryRef(session),
                    fetchAllNotesRef(session),
                    fetchAllTasksRef(session),
                ]);

                if (!cancelled) {
                    setDataLoaded(true);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Ошибка при загрузке данных приложения:', error);
                    setDataLoaded(false);
                }
            } finally {
                if (!cancelled) {
                    setIsDataLoading(false);
                }
            }
        };

        loadAllData();

        return () => {
            cancelled = true;
        };
    }, [
        session,
        dataLoaded,
        isDataLoading,
        loadProjectsFromSupabaseRef,
        loadDocumentsFromSupabaseRef,
        loadPhotoReportsFromSupabaseRef,
        setProjectsRef,
        fetchAllEstimatesFromHook,
        setEstimatesRef,
        fetchAllInventoryRef,
        fetchAllNotesRef,
        fetchAllTasksRef,
    ]);

    // Проекты теперь управляются через projectsHook

    // Additional state that's not yet moved to hooks
    const libraryHook = useLibrary(session);
    const companyProfileHook = useCompanyProfile(session);
    
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
    
    // Синхронизируем activeProjectId между appState и context
    useEffect(() => {
        if (appState.activeProjectId !== contextProjectId) {
            setContextActiveProjectId(appState.activeProjectId);
        }
    }, [appState.activeProjectId, contextProjectId, setContextActiveProjectId]);
    

    // Load initial data
    useEffect(() => {
        setInventoryNotes(dataService.getInventoryNotes());
    }, []);

    // Save data when it changes
    // Загружаем справочник и профиль при наличии сессии
    useEffect(() => {
        libraryHook.fetchLibraryItems(session);
        companyProfileHook.fetchProfile(session);
    }, [session]);

    

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

    // Update document title based on company profile name
    useEffect(() => {
        const name = companyProfileHook.profile?.name?.trim();
        document.title = name && name.length ? `${name} — Прораб360` : 'Прораб360';
    }, [companyProfileHook.profile?.name]);

    // Helper to set or update favicon link tag
    const setFaviconHref = useCallback((href: string, sizes?: string) => {
        let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            link.type = 'image/png';
            if (sizes) link.sizes = sizes;
            document.head.appendChild(link);
        }
        if (sizes) link.sizes = sizes;
        link.href = href;

        // Also set apple-touch-icon for iOS
        let apple = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
        if (!apple) {
            apple = document.createElement('link');
            apple.rel = 'apple-touch-icon';
            document.head.appendChild(apple);
        }
        apple.href = href;
    }, []);

    // Generate a small favicon from logo URL and apply it
    useEffect(() => {
        const defaultIcon = '/logo.png';
        const logoUrl = companyProfileHook.profile?.logo || '';
        let cancelled = false;

        const generateFavicon = (src: string, size = 64): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(src);
                        return;
                    }
                    ctx.clearRect(0, 0, size, size);
                    const ratio = Math.min(size / img.width, size / img.height);
                    const drawW = img.width * ratio;
                    const drawH = img.height * ratio;
                    const dx = (size - drawW) / 2;
                    const dy = (size - drawH) / 2;
                    ctx.drawImage(img, dx, dy, drawW, drawH);
                    try {
                        resolve(canvas.toDataURL('image/png'));
                    } catch (e) {
                        resolve(src);
                    }
                };
                img.onerror = () => reject(new Error('logo load error'));
                // small cache-buster to ensure favicon updates
                const withBuster = src ? `${src}${src.includes('?') ? '&' : '?'}_fav=${Date.now()}` : src;
                img.src = withBuster;
            });
        };

        (async () => {
            try {
                if (logoUrl) {
                    const dataUrl = await generateFavicon(logoUrl, 64);
                    if (!cancelled) setFaviconHref(dataUrl, '64x64');
                    return;
                }
            } catch (_e) {
                // Fallback below
            }
            if (!cancelled) setFaviconHref(defaultIcon, '64x64');
        })();

        return () => { cancelled = true; };
    }, [companyProfileHook.profile?.logo, setFaviconHref]);

    // Get active project
    const activeProject = useMemo(() => {
        const id = appState.activeProjectId || '';
        return projectsHook.projects.find(p => p.id === id) || null;
    }, [appState.activeProjectId, projectsHook.projects]);

    // Переопределяем функцию refreshData для обновления всех данных
    useEffect(() => {
        appState.refreshData = async () => {
            console.log('🔄 App: refreshData вызвана - обновляем все данные');
            try {
                await Promise.all([
                    estimatesHook.fetchAllEstimates(),
                    projectsHook.loadProjectsFromSupabase(),
                    projectDataHook.loadProjectData(activeProject?.id || '')
                ]);
                console.log('🔄 App: все данные обновлены');
            } catch (error) {
                console.error('🔄 App: ошибка при обновлении данных:', error);
            }
        };
    }, [appState, estimatesHook, projectsHook, projectDataHook, activeProject?.id]);

    // Get project financials
    const projectFinancials = useMemo(() => {
        if (!activeProject) return null;
        return projectDataHook.calculateProjectFinancials(activeProject.id, estimatesHook.estimates);
    }, [activeProject, estimatesHook.estimates, projectDataHook]);

    // Filtered projects
    const filteredProjects = useMemo(() => {
        console.log('App: filteredProjects вычисляется, projectsHook.projects:', projectsHook.projects);
        console.log('App: projectStatusFilter:', appState.projectStatusFilter);
        console.log('App: projectSearch:', appState.projectSearch);
        
        const filtered = projectsHook.projects.filter(project => {
            const matchesStatus = project.status === appState.projectStatusFilter;
            const matchesSearch = !appState.projectSearch || 
                project.name.toLowerCase().includes(appState.projectSearch.toLowerCase()) ||
                project.client.toLowerCase().includes(appState.projectSearch.toLowerCase()) ||
                project.address.toLowerCase().includes(appState.projectSearch.toLowerCase());
            return matchesStatus && matchesSearch;
        });
        
        console.log('App: filteredProjects результат:', filtered);
        return filtered;
    }, [projectsHook.projects, appState.projectStatusFilter, appState.projectSearch]);

    // Estimate handlers
    const handleLoadEstimate = useCallback((id: string) => {
        console.log('🔧 handleLoadEstimate: загружаем смету', id, 'для проекта', appState.activeProjectId);
        estimatesHook.loadEstimate(id, appState.activeProjectId, appState.setIsDirty);
        appState.navigateToEstimate(id);
        // Закрываем модальное окно после загрузки сметы
        appState.closeModal('estimatesList');
        console.log('🔧 handleLoadEstimate: модальное окно закрыто');
    }, [estimatesHook, appState]);

    const handleNewEstimate = useCallback((template?: { items: any[]; discount: number; discountType: 'percent' | 'fixed'; tax: number; }) => {
        console.log('🔧 App: handleNewEstimate вызвана с шаблоном:', template);
        
        const newEstimate = estimatesHook.createNewEstimate(null);
        console.log('🔧 App: создана новая смета:', newEstimate);
        
        // Если передан шаблон, применяем его данные
        if (template) {
            console.log('🔧 App: применяем данные шаблона:');
            console.log('🔧 App: items:', template.items);
            console.log('🔧 App: discount:', template.discount);
            console.log('🔧 App: discountType:', template.discountType);
            console.log('🔧 App: tax:', template.tax);
            
            estimatesHook.setItems(template.items || []);
            estimatesHook.setDiscount(template.discount || 0);
            estimatesHook.setDiscountType(template.discountType || 'percent');
            estimatesHook.setTax(template.tax || 0);
            appState.setIsDirty(true); // Помечаем как измененную
            
            console.log('🔧 App: данные шаблона применены к новой смете');
        }
        
        console.log('🔧 App: переходим к смете:', newEstimate.id);
        appState.navigateToEstimate(newEstimate.id);
    }, [estimatesHook, appState]);

    const handleSaveEstimate = useCallback(async () => {
        console.log('🔧 App: handleSaveEstimate вызвана');
        appState.setLoading('saving', true);
        try {
            await estimatesHook.saveEstimate();
            console.log('🔧 App: saveEstimate завершена успешно');
            appState.setIsDirty(false);
        } catch (error) {
            console.error('🔧 App: Ошибка при сохранении сметы:', error);
        } finally {
            appState.setLoading('saving', false);
        }
    }, [estimatesHook, appState]);

    const handleDeleteEstimate = useCallback(async (id: string) => {
        safeShowConfirm('Вы уверены, что хотите удалить эту смету?', async (ok) => {
            if (ok) {
                try {
                    console.log('[DEBUG] handleDeleteEstimate: начинаем удаление сметы:', id);
                    await estimatesHook.deleteEstimate(id);
                    console.log('[DEBUG] handleDeleteEstimate: смета успешно удалена');
                    
                    // Если удаляемая смета была активной, возвращаемся назад
                    if (appState.activeEstimateId === id) {
                        console.log('[DEBUG] handleDeleteEstimate: возвращаемся назад, так как удалена активная смета');
                        appState.goBack();
                    }
                    
                    // Показываем уведомление об успешном удалении
                    safeShowAlert('Смета успешно удалена!');
                    
                } catch (error) {
                    console.error('[DEBUG] handleDeleteEstimate: Ошибка при удалении сметы:', error);
                    safeShowAlert('Не удалось удалить смету. Попробуйте еще раз.');
                }
            }
        });
    }, [estimatesHook, appState]);

    const handleStatusChange = useCallback((id: string, status: EstimateStatus) => {
        estimatesHook.updateEstimateStatus(id, status);
    }, [estimatesHook]);

    const handleAddNewEstimateInProject = (projectId: string) => {
        appState.setActiveProjectId(projectId);
        estimatesHook.createNewEstimate(projectId);
        appState.setActiveView('estimate');
    };

    const handleDeleteTemplate = useCallback((templateId: string) => {
        estimatesHook.deleteTemplate(templateId);
    }, [estimatesHook]);

    // Project handlers
    const handleOpenProjectModal = useCallback((project: Partial<Project> | null = null) => {
        appState.openModal('newProject', project);
    }, [appState]);

    // Supabase: create project
    const handleCreateProject = useCallback(async (newProjectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const insertPayload = [{
            name: newProjectData.name,
            client: newProjectData.client,
            address: newProjectData.address,
            status: newProjectData.status ?? 'planned',
            user_id: user.id,
        }];

        const { data, error } = await supabase
            .from('projects')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return null;
        }

        // Map DB row -> frontend type
        const created: Project = {
            id: data.id,
            name: data.name,
            client: data.client || '',
            address: data.address || '',
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
        // Проект создан в Supabase, обновляем локальное состояние через projectsHook
        // projectsHook автоматически синхронизируется с локальным хранилищем
        // Перейти к созданному проекту
        appState.setActiveProjectId(created.id);
        appState.setActiveView('projectDetail');
        return created;
    }, []);

    // Supabase: update project
    const handleUpdateProject = useCallback(async (id: string, updates: Partial<Project>) => {
        const payload: any = {};
        if (typeof updates.name !== 'undefined') payload.name = updates.name;
        if (typeof updates.client !== 'undefined') payload.client = updates.client;
        if (typeof updates.address !== 'undefined') payload.address = updates.address;
        if (typeof updates.status !== 'undefined') payload.status = updates.status;

        const { data, error } = await supabase
            .from('projects')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Error updating project:', error);
            return;
        }
        const updated: Project = {
            id: data.id,
            name: data.name,
            client: data.client || '',
            address: data.address || '',
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
        // Проект обновлен в Supabase, обновляем локальное состояние через projectsHook
        // projectsHook автоматически синхронизируется с локальным хранилищем
    }, []);

    // Supabase: delete project
    const handleDeleteProjectSupabase = useCallback(async (id: string) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
            console.error('Error deleting project:', error);
            return;
        }
        // Проект удален из Supabase, обновляем локальное состояние через projectsHook
        // projectsHook автоматически синхронизируется с локальным хранилищем
    }, []);

    const handleSaveProject = useCallback(() => {
        if (appState.selectedProject) {
            if (appState.selectedProject.id) {
                handleUpdateProject(appState.selectedProject.id, appState.selectedProject);
            } else {
                const base = appState.selectedProject as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
                handleCreateProject({ ...base, status: base.status ?? 'planned' });
            }
        }
        appState.closeModal('newProject');
    }, [appState, handleCreateProject, handleUpdateProject]);

    const handleDeleteProject = useCallback((id: string) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот проект? Все связанные данные будут удалены.', (ok) => {
            if (ok) {
                handleDeleteProjectSupabase(id);
                if (appState.activeProjectId === id) {
                    appState.goBack();
                }
            }
        });
    }, [appState, handleDeleteProjectSupabase]);

    // Finance handlers
    const handleAddFinanceEntry = useCallback(async (entryData: Omit<FinanceEntry, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>, receiptFile?: File) => {
        // Закрываем модалку сразу — оптимистичное UX
        appState.closeModal('financeEntry');
        if (appState.activeProjectId) {
            try {
                await projectDataHook.addFinanceEntry(appState.activeProjectId, entryData, receiptFile);
            } catch (error) {
                console.error('Ошибка при добавлении финансовой записи:', error);
                safeShowAlert('Произошла ошибка при добавлении финансовой записи.');
            }
        }
    }, [projectDataHook, appState, safeShowAlert]);

    const handleDeleteFinanceEntry = useCallback(async (id: string) => {
        try {
            await projectDataHook.deleteFinanceEntry(id);
        } catch (error) {
            console.error('Ошибка при удалении финансовой записи:', error);
            safeShowAlert('Произошла ошибка при удалении финансовой записи.');
        }
    }, [projectDataHook, safeShowAlert]);

    // Photo report handlers
    const handleAddPhotoReport = useCallback((photoReport: {
        id: string;
        title: string;
        photos: Array<{
            url: string;
            path: string;
            caption: string;
        }>;
        date: string;
    }) => {
        if (appState.activeProjectId) {
            // Создаем объект PhotoReport в старом формате для совместимости
            const reportData: PhotoReport = {
                id: photoReport.id,
                projectId: appState.activeProjectId,
                title: photoReport.title,
                photos: photoReport.photos,
                date: photoReport.date,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
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
            // Создаем объект Document в старом формате для совместимости
            const documentData: Document = {
                id: generateUUID(),
                projectId: appState.activeProjectId,
                name,
                fileUrl,
                storagePath: '', // Будет заполнено в useFileStorage
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            projectsHook.addDocument(appState.activeProjectId, documentData);
        }
        appState.closeModal('documentUpload');
    }, [projectsHook, appState]);

    const handleAddGlobalDocument = useCallback((name: string, fileUrl: string) => {
        // Создаем объект Document в старом формате для совместимости
        const documentData: Document = {
            id: generateUUID(),
            projectId: undefined,
            name,
            fileUrl,
            storagePath: '', // Будет заполнено в useFileStorage
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        projectsHook.addDocument(null, documentData);
        appState.closeModal('globalDocument');
    }, [projectsHook, appState]);

    const handleDeleteDocument = useCallback(async (id: string) => {
        try {
            await fileStorageHook.deleteDocument(id);
            projectsHook.deleteDocument(id);
        } catch (error) {
            console.error('Ошибка при удалении документа:', error);
            safeShowAlert('Произошла ошибка при удалении документа.');
        }
    }, [projectsHook, fileStorageHook]);

    const handleDeleteGlobalDocument = useCallback((id: string) => {
        projectsHook.deleteDocument(id);
    }, [projectsHook]);

    // Work stage handlers
    const handleAddWorkStage = useCallback(async (stageData: Omit<WorkStage, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) => {
        if (appState.activeProjectId) {
            try {
                await projectDataHook.addWorkStage(appState.activeProjectId, stageData);
            } catch (error) {
                console.error('Ошибка при добавлении этапа работ:', error);
                safeShowAlert('Произошла ошибка при добавлении этапа работ.');
                return;
            }
        }
        appState.closeModal('workStage');
    }, [projectDataHook, appState, safeShowAlert]);

    const handleUpdateWorkStage = useCallback(async (id: string, updates: Partial<WorkStage>) => {
        try {
            await projectDataHook.updateWorkStage(id, updates);
        } catch (error) {
            console.error('Ошибка при обновлении этапа работ:', error);
            safeShowAlert('Произошла ошибка при обновлении этапа работ.');
        }
    }, [projectDataHook, safeShowAlert]);

    const handleDeleteWorkStage = useCallback(async (id: string) => {
        try {
            await projectDataHook.deleteWorkStage(id);
        } catch (error) {
            console.error('Ошибка при удалении этапа работ:', error);
            safeShowAlert('Произошла ошибка при удалении этапа работ.');
        }
    }, [projectDataHook, safeShowAlert]);

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
    const handleAddTask = useCallback(async (title: string, projectId: string | null, priority?: string, dueDate?: string | null) => {
        await tasksHook.addTask({ 
            title, 
            projectId, 
            priority: priority as 'low' | 'medium' | 'high' | 'urgent' || 'medium',
            dueDate 
        });
    }, [tasksHook]);

    const handleUpdateTask = useCallback(async (task: Task) => {
        await tasksHook.updateTask(task.id, task);
    }, [tasksHook]);

    const handleToggleTask = useCallback(async (id: string) => {
        await tasksHook.toggleTask(id);
    }, [tasksHook]);

    const handleDeleteTask = useCallback(async (id: string) => {
        await tasksHook.deleteTask(id);
    }, [tasksHook]);

    // Tool handlers
    const handleAddTool = useCallback(async (toolData: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>, imageFile?: File) => {
        try {
            await inventoryHook.addTool(toolData, imageFile);
            appState.closeModal('addTool');
        } catch (error) {
            console.error('Ошибка при добавлении инструмента:', error);
            safeShowAlert('Произошла ошибка при добавлении инструмента.');
        }
    }, [inventoryHook, appState, safeShowAlert]);

    const handleUpdateTool = useCallback(async (tool: Tool, imageFile?: File) => {
        try {
            await inventoryHook.updateTool(tool, imageFile);
        } catch (error) {
            console.error('Ошибка при обновлении инструмента:', error);
            safeShowAlert('Произошла ошибка при обновлении инструмента.');
        }
    }, [inventoryHook, safeShowAlert]);

    const handleDeleteTool = useCallback((id: string) => {
        inventoryHook.deleteTool(id);
    }, [inventoryHook]);

    // Consumable handlers
    const handleAddConsumable = useCallback((consumable: Omit<Consumable, 'id' | 'createdAt' | 'updatedAt'>) => {
        inventoryHook.addConsumable(consumable);
    }, [inventoryHook]);

    const handleUpdateConsumable = useCallback((consumable: Consumable) => {
        inventoryHook.updateConsumable(consumable);
    }, [inventoryHook]);

    const handleDeleteConsumable = useCallback((id: string) => {
        inventoryHook.deleteConsumable(id);
    }, [inventoryHook]);

    // Library handlers
    // Library handlers are provided by libraryHook (add/update/delete)

    const handleAddItemToEstimate = useCallback((item: LibraryItem) => {
        // Добавляем элемент из библиотеки в текущую смету
        const newItem: Item = {
            id: `temp-item-${Date.now()}`,
            name: item.name,
            quantity: 1,
            price: item.price,
            unit: item.unit,
            image: null,
            type: 'material'
        };
        estimatesHook.addItem();
        // TODO: Нужно будет обновить последний добавленный элемент данными из библиотеки
    }, [estimatesHook]);

    // Profile handlers
    const handleProfileChange = useCallback((field: keyof CompanyProfile, value: string) => {
        companyProfileHook.setProfile(prev => ({ ...prev, [field]: value }));
    }, [companyProfileHook]);

    const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            companyProfileHook.uploadLogo(file);
        }
    }, [companyProfileHook]);

    const handleRemoveLogo = useCallback(() => {
        companyProfileHook.removeLogo();
    }, [companyProfileHook]);

    const handleSaveProfile = useCallback(() => {
        companyProfileHook.saveProfile(companyProfileHook.profile);
        appState.closeModal('settings');
    }, [companyProfileHook, appState]);


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
                estimatesHook.updateItem(id, 'image', dataUrl);
                appState.setIsDirty(true);
            });
        }
    }, [estimatesHook, appState]);

    const handleRemoveItemImage = useCallback((id: string) => {
        estimatesHook.updateItem(id, 'image', '');
        appState.setIsDirty(true);
    }, [estimatesHook, appState]);

    const handleDragSort = useCallback(() => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            // TODO: Реализовать reorderItems в useEstimates
            // estimatesHook.reorderItems(dragItem.current, dragOverItem.current);
            appState.setIsDirty(true);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    }, [estimatesHook, appState]);

    // AI handlers
    const handleAddItemsFromAI = useCallback((items: Omit<Item, 'id' | 'image' | 'type'>[]) => {
        // Добавляем элементы из ИИ в текущую смету
        items.forEach(item => {
            estimatesHook.addItem();
            // TODO: Нужно будет обновить последний добавленный элемент данными из ИИ
        });
        appState.setIsDirty(true);
    }, [estimatesHook, appState]);

    // PDF export
    const handleExportPDF = useCallback(async () => {
        if (!estimatesHook.currentEstimate) return;
        
        appState.setLoading('pdf', true);
        try {
            const PdfServiceInstance = await import('./services/PdfService');
            
            // Получаем проект, если смета привязана к проекту
            const project = estimatesHook.currentEstimate.project_id 
                ? projectsHook.projects.find(p => p.id === estimatesHook.currentEstimate!.project_id) || null
                : null;
            
            await PdfServiceInstance.default.generateEstimatePDF(
                estimatesHook.currentEstimate,
                project,
                companyProfileHook.profile
            );
        } catch (error) {
            console.error('PDF generation error:', error);
            safeShowAlert('Ошибка при генерации PDF');
        } finally {
            appState.setLoading('pdf', false);
        }
    }, [estimatesHook, companyProfileHook.profile, appState, projectsHook.projects]);

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
        if (appState.activeProjectId) {
            // Если мы в проекте, показываем задачи этого проекта
            appState.navigateToView('projectTasks');
        } else {
            // Если мы не в проекте, показываем все задачи
            appState.navigateToView('allTasks');
        }
    }, [appState]);

    const handleNavigateToInventory = useCallback(() => {
        appState.navigateToView('inventory');
    }, [appState]);

    const handleNavigateToReports = useCallback(() => {
        appState.navigateToView('reports');
    }, [appState]);

    const handleOpenScratchpad = useCallback(() => {
        // Получаем текущее содержимое глобальной заметки
        const globalNote = notesHook.getNote('global');
        console.log('🔧 handleOpenScratchpad: Открываем блокнот с содержимым:', globalNote);
        
        // Переключаемся на вид scratchpad с данными заметки
        appState.navigateToView('scratchpad', { 
            content: globalNote,
            onSave: (content: string) => notesHook.saveNote('global', content),
            previousView: 'workspace'
        });
    }, [appState, notesHook]);

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
                        notesHook={notesHook}
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
                
                const projectEstimates = estimatesHook.getEstimatesByProject(activeProject.id);
                console.log('[DEBUG] Шаг 7: App.tsx - передача смет в ProjectDetailView.');
                console.log('[DEBUG] activeProject.id:', activeProject.id);
                console.log('[DEBUG] projectEstimates для передачи:', projectEstimates);
                console.log('[DEBUG] Количество projectEstimates:', projectEstimates.length);
                
                return (
                    <ProjectDetailView
                        activeProject={activeProject}
                        estimates={projectEstimates}
                        financeEntries={projectDataHook.getFinanceEntriesByProject(activeProject.id)}
                        photoReports={projectsHook.getPhotoReportsByProject(activeProject.id)}
                        documents={projectsHook.getDocumentsByProject(activeProject.id)}
                        workStages={projectDataHook.getWorkStagesByProject(activeProject.id)}
                        tasks={tasksHook.getTasksByProject(activeProject.id)}
                        financials={projectFinancials!}
                        formatCurrency={formatCurrency}
                        statusMap={statusMap}
                        setActiveView={appState.setActiveView}
                        setActiveProjectId={appState.setActiveProjectId}
                        handleOpenProjectModal={handleOpenProjectModal}
                        handleDeleteProject={handleDeleteProject}
                        handleLoadEstimate={handleLoadEstimate}
                        handleAddNewEstimateForProject={() => handleAddNewEstimateInProject(activeProject.id)}
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
                        onExportWorkSchedulePDF={async (project, workStages) => {
                            try {
                                const PdfServiceInstance = await import('./services/PdfService');
                                await PdfServiceInstance.default.generateWorkSchedulePDF(project, workStages, companyProfileHook.profile);
                            } catch (error) {
                                console.error('Ошибка при генерации графика работ PDF:', error);
                                safeShowAlert('Ошибка при генерации PDF графика работ');
                            }
                        }}
                        onOpenEstimatesListModal={() => appState.openModal('estimatesList')}
                        notesHook={notesHook}
                        tasksHook={tasksHook}
                        appState={appState}
                        projectDataHook={projectDataHook}
                    />
                );
            
            case 'inventory':
                return (
                    <InventoryScreen
                        tools={inventoryHook.tools}
                        projects={projectsHook.projects}
                        consumables={inventoryHook.consumables}
                        onToolClick={(tool) => {
                            appState.openModal('toolDetails', tool);
                        }}
                        onUpdateTool={handleUpdateTool}
                        onOpenAddToolModal={() => appState.openModal('addTool')}
                        onAddConsumable={handleAddConsumable}
                        onUpdateConsumable={handleUpdateConsumable}
                        onDeleteConsumable={handleDeleteConsumable}
                        onOpenToolDetailsModal={(tool) => appState.openModal('toolDetails', tool)}
                        toolsScratchpad={toolsScratchpad}
                        consumablesScratchpad={consumablesScratchpad}
                        onToolsScratchpadChange={setToolsScratchpad}
                        onConsumablesScratchpadChange={setConsumablesScratchpad}
                        notesHook={notesHook}
                        appState={appState}
                    />
                );
            
            case 'reports':
                return (
                    <ReportsHubScreen 
                        projects={projectsHook.projects}
                        onOpenProjectReport={(project) => {
                            setReportProject(project);
                            appState.navigateToView('projectFinancialReport');
                        }}
                        onOpenClientReport={(project) => {
                            setClientReportProject(project);
                            appState.navigateToView('clientReport');
                        }}
                        onOpenOverallReport={() => {
                            console.log('onOpenOverallReport вызван в App.tsx!');
                            appState.navigateToView('overallFinancialReport');
                        }}
                    />
                );
            
            case 'projectFinancialReport':
                if (!reportProject) {
                    appState.navigateToView('reports');
                    return null;
                }
                return (
                    <ProjectFinancialReportScreen
                        project={reportProject}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectDataHook.financeEntries}
                        formatCurrency={formatCurrency}
                        onBack={() => appState.navigateToView('reports')}
                    />
                );
            
            case 'clientReport':
                if (!clientReportProject) {
                    appState.navigateToView('reports');
                    return null;
                }
                return (
                    <ClientReportScreen
                        project={clientReportProject}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectDataHook.financeEntries}
                        workStages={projectDataHook.workStages}
                        formatCurrency={formatCurrency}
                        onBack={() => appState.navigateToView('reports')}
                    />
                );
            
            case 'overallFinancialReport':
                return (
                    <OverallFinancialReportScreen
                        projects={projectsHook.projects}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectDataHook.financeEntries}
                        formatCurrency={formatCurrency}
                        onBack={() => appState.navigateToView('reports')}
                    />
                );
            
            case 'scratchpad':
                return (
                    <ScratchpadView
                        content={appState.scratchpadData?.content || projectsHook.scratchpad}
                        onSave={appState.scratchpadData?.onSave || projectsHook.setScratchpad}
                        onBack={appState.goBack}
                    />
                );
            
            case 'allTasks':
                return (
                    <ProjectTasksScreen
                        tasks={tasksHook.tasks}
                        projects={projectsHook.projects}
                        projectId={null}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                        onBack={appState.goBack}
                    />
                );
            
            case 'projectTasks':
                if (!activeProject) {
                    appState.navigateToView('allTasks');
                    return null;
                }
                return (
                    <ProjectTasksScreen
                        tasks={tasksHook.getTasksByProject(activeProject.id)}
                        projects={projectsHook.projects}
                        projectId={activeProject.id}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                        onBack={appState.goBack}
                    />
                );
            
            case 'calculator':
                return <CalculatorView appState={appState} />;
            
            default:
                return (
                    <WorkspaceView
                        scratchpad={projectsHook.scratchpad}
                        globalDocuments={projectsHook.globalDocuments}
                        onScratchpadChange={projectsHook.setScratchpad}
                        onOpenGlobalDocumentModal={() => appState.openModal('globalDocument')}
                        onDeleteGlobalDocument={handleDeleteGlobalDocument}
                        onOpenScratchpad={handleOpenScratchpad}
                        notesHook={notesHook}
                    />
                );
        }
    };

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

    return (
        <div className="app-container">
            {/* Auth gate */}
            {(!session) ? (
                <main>
                    <AuthScreen />
                </main>
            ) : (
            <>
            {/* Global Header */}
            <header className="app-header">
                <div className="app-header-left">
                    <img
                        src={companyProfileHook.profile.logo || '/logo.png'}
                        alt="Логотип"
                        className="app-logo"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                    />
                    <h1>{(companyProfileHook.profile.name && companyProfileHook.profile.name.trim()) ? companyProfileHook.profile.name : 'Прораб'}</h1>
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
                    <button onClick={() => appState.navigateToView('reports')} className="header-btn" aria-label="Отчеты">
                        <IconTrendingUp />
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
                    onClick={() => {
                        // Если есть активный проект, возвращаемся к нему, иначе к списку проектов
                        console.log('🔍 Навигация к проектам: activeProjectId =', appState.activeProjectId);
                        if (appState.activeProjectId) {
                            console.log('🔍 Переходим к деталям проекта:', appState.activeProjectId);
                            appState.navigateToView('projectDetail');
                        } else {
                            console.log('🔍 Переходим к списку проектов');
                            appState.navigateToView('projects');
                        }
                    }} 
                    className={appState.activeView.startsWith('project') ? 'active' : ''}
                >
                    <IconProject />
                    <span>Проекты</span>
                </button>
                <button 
                    onClick={() => {
                        // НЕ сбрасываем activeProjectId, чтобы можно было вернуться к проекту
                        console.log('🔍 Переход к смете: activeProjectId =', appState.activeProjectId);
                        estimatesHook.createNewEstimate();
                        appState.setActiveView('estimate');
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
                    onClick={() => appState.navigateToView('allTasks')} 
                    className={appState.activeView === 'allTasks' ? 'active' : ''}
                >
                    <IconCheckSquare />
                    <span>Задачи</span>
                </button>
                <button 
                    onClick={() => appState.navigateToView('calculator')} 
                    className={appState.activeView === 'calculator' ? 'active' : ''}
                >
                    <IconSparkles />
                    <span>Калькулятор</span>
                </button>
            </nav>

            {/* Modals */}
            {appState.showSettingsModal && (
                <SettingsModal
                    onClose={() => appState.closeModal('settings')}
                    profile={companyProfileHook.profile}
                    onProfileChange={handleProfileChange}
                    onLogoChange={handleLogoChange}
                    onRemoveLogo={handleRemoveLogo}
                    onSave={handleSaveProfile}
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
                    onSaveAsTemplate={estimatesHook.saveAsTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onNewEstimate={handleNewEstimate}
                    onInputFocus={handleInputFocus}
                />
            )}

            {appState.showLibraryModal && (
                <LibraryModal
                    onClose={() => appState.closeModal('library')}
                    libraryItems={libraryHook.libraryItems}
                    onAddLibraryItem={libraryHook.addLibraryItem}
                    onUpdateLibraryItem={libraryHook.updateLibraryItem}
                    onDeleteLibraryItem={libraryHook.deleteLibraryItem}
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
                    projectId={appState.activeProjectId || ''}
                />
            )}

            {appState.showPhotoViewerModal && appState.selectedPhoto && (
                <PhotoViewerModal
                    photo={appState.selectedPhoto}
                    onClose={() => appState.closeModal('photoViewer')}
                    onDelete={async (id) => {
                        try {
                            await fileStorageHook.deletePhotoReport(id);
                            projectsHook.deletePhotoReport(id);
                            appState.closeModal('photoViewer');
                        } catch (error) {
                            console.error('Ошибка при удалении фотоотчета:', error);
                            safeShowAlert('Произошла ошибка при удалении фотоотчета.');
                        }
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
                    projectId={appState.activeProjectId}
                />
            )}

            {appState.showGlobalDocumentModal && (
                <DocumentUploadModal
                    onClose={() => appState.closeModal('globalDocument')}
                    onSave={handleAddGlobalDocument}
                    showAlert={safeShowAlert}
                    projectId={null}
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
                    profile={companyProfileHook.profile}
                    totalAmount={appState.actTotalAmount}
                    workStages={projectDataHook?.workStages || []}
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
                    projects={projectsHook.projects}
                />
            )}

            {appState.showToolDetailsModal && appState.selectedTool && (
                <ToolDetailsModal
                    tool={appState.selectedTool}
                    onClose={() => appState.closeModal('toolDetails')}
                    onSave={handleUpdateTool}
                    onDelete={handleDeleteTool}
                    projects={projectsHook.projects}
                />
            )}

            {appState.showAddTaskModal && (
                <AddTaskModal
                    onClose={() => appState.closeModal('addTask')}
                    onSave={(title, projectId, priority, dueDate) => {
                        handleAddTask(title, projectId as string | null, priority, dueDate);
                        appState.closeModal('addTask');
                    }}
                    projects={projectsHook.projects}
                    initialProjectId={appState.selectedTask?.projectId || (appState.selectedProject?.id as string) || null}
                    hideProjectSelect={!!appState.selectedProject} // Скрываем поле, если создаем из проекта
                />
            )}

            {appState.showEditTaskModal && appState.selectedTask && (
                <AddTaskModal
                    onClose={() => appState.closeModal('editTask')}
                    onSave={(title, projectId, priority, dueDate) => {
                        handleUpdateTask({
                            ...appState.selectedTask!,
                            title,
                            projectId: projectId as string | null,
                            priority: priority as 'low' | 'medium' | 'high' | 'urgent',
                            dueDate
                        });
                        appState.closeModal('editTask');
                    }}
                    projects={projectsHook.projects}
                    initialProjectId={appState.selectedTask.projectId}
                    initialTitle={appState.selectedTask.title}
                    initialPriority={appState.selectedTask.priority}
                    initialDueDate={appState.selectedTask.dueDate}
                    hideProjectSelect={!!appState.selectedTask.projectId} // Скрываем поле, если задача уже привязана к проекту
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
                            value={appState.scratchpadData?.content || projectsHook.scratchpad}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('🔧 Модальное окно блокнота - изменение:', { 
                                    newValue, 
                                    hasScratchpadData: !!appState.scratchpadData,
                                    scratchpadDataContent: appState.scratchpadData?.content,
                                    globalScratchpad: projectsHook.scratchpad
                                });
                                if (appState.scratchpadData?.onSave) {
                                    appState.scratchpadData.onSave(newValue);
                                } else {
                                    projectsHook.setScratchpad(newValue);
                                }
                            }}
                            placeholder="Ваши заметки..."
                            className="scratchpad-textarea"
                            style={{height: 'calc(100vh - 200px)'}}
                        />
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

console.log('📤 App.tsx: Компонент App определен, экспортируем...');
export default App;
