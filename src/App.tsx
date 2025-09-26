import React, { useState, useMemo, useEffect, useCallback, useRef, startTransition } from 'react';

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
// Lazy load modals for better code splitting
const SettingsModal = React.lazy(() => import('./components/modals/SettingsModal').then(m => ({ default: m.SettingsModal })));
const EstimatesListModal = React.lazy(() => import('./components/modals/EstimatesListModal').then(m => ({ default: m.EstimatesListModal })));
const LibraryModal = React.lazy(() => import('./components/modals/LibraryModal').then(m => ({ default: m.LibraryModal })));
const NewProjectModal = React.lazy(() => import('./components/modals/NewProjectModal').then(m => ({ default: m.NewProjectModal })));
const FinanceEntryModal = React.lazy(() => import('./components/modals/FinanceEntryModal').then(m => ({ default: m.FinanceEntryModal })));
const PhotoReportModal = React.lazy(() => import('./components/modals/PhotoReportModal').then(m => ({ default: m.PhotoReportModal })));
const PhotoViewerModal = React.lazy(() => import('./components/modals/PhotoViewerModal').then(m => ({ default: m.PhotoViewerModal })));
const ShoppingListModal = React.lazy(() => import('./components/modals/ShoppingListModal').then(m => ({ default: m.ShoppingListModal })));
const DocumentUploadModal = React.lazy(() => import('./components/modals/DocumentUploadModal').then(m => ({ default: m.DocumentUploadModal })));
const WorkStageModal = React.lazy(() => import('./components/modals/WorkStageModal').then(m => ({ default: m.WorkStageModal })));
const NoteModal = React.lazy(() => import('./components/modals/NoteModal').then(m => ({ default: m.NoteModal })));
const ActGenerationModal = React.lazy(() => import('./components/modals/ActGenerationModal').then(m => ({ default: m.ActGenerationModal })));
const AISuggestModal = React.lazy(() => import('./components/modals/AISuggestModal').then(m => ({ default: m.AISuggestModal })));
const AddToolModal = React.lazy(() => import('./components/modals/AddToolModal').then(m => ({ default: m.AddToolModal })));
const ToolDetailsModal = React.lazy(() => import('./components/modals/ToolDetailsModal').then(m => ({ default: m.ToolDetailsModal })));
const AddTaskModal = React.lazy(() => import('./components/modals/AddTaskModal').then(m => ({ default: m.AddTaskModal })));
const EstimateView = React.lazy(() => import('./components/views/EstimateView').then(m => ({ default: m.EstimateView })));
const ProjectsListView = React.lazy(() => import('./components/views/ProjectsListView').then(m => ({ default: m.ProjectsListView })));
const ProjectDetailView = React.lazy(() => import('./components/views/ProjectDetailView').then(m => ({ default: m.ProjectDetailView })));
const InventoryScreen = React.lazy(() => import('./components/views/InventoryScreen').then(m => ({ default: m.InventoryScreen })));
const ToolDetailsScreen = React.lazy(() => import('./components/views/ToolDetailsScreen').then(m => ({ default: m.ToolDetailsScreen })));
const ReportsView = React.lazy(() => import('./components/views/ReportsView').then(m => ({ default: m.ReportsView })));
const ReportsHubScreen = React.lazy(() => import('./components/views/ReportsHubScreen').then(m => ({ default: m.ReportsHubScreen })));
const ProjectFinancialReportScreen = React.lazy(() => import('./components/views/ProjectFinancialReportScreen').then(m => ({ default: m.ProjectFinancialReportScreen })));
const ClientReportScreen = React.lazy(() => import('./components/views/ClientReportScreen').then(m => ({ default: m.ClientReportScreen })));
const OverallFinancialReportScreen = React.lazy(() => import('./components/views/OverallFinancialReportScreen').then(m => ({ default: m.OverallFinancialReportScreen })));
const WorkspaceView = React.lazy(() => import('./components/views/WorkspaceView').then(m => ({ default: m.WorkspaceView })));
const ScratchpadView = React.lazy(() => import('./components/views/ScratchpadView').then(m => ({ default: m.ScratchpadView })));
const ProjectTasksScreen = React.lazy(() => import('./components/views/ProjectTasksScreen').then(m => ({ default: m.ProjectTasksScreen })));
const CalculatorView = React.lazy(() => import('./components/views/CalculatorView').then(m => ({ default: m.CalculatorView })));
import { ListItem } from './components/ui/ListItem';
import { useProjectContext, ProjectProvider } from './context/ProjectContext';
const AuthScreen = React.lazy(() => import('./components/views/AuthScreen').then(m => ({ default: m.default })));
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
    
    // Error boundary state
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Supabase auth session
    const [session, setSession] = useState<Session | null>(null);

    // Error handler
    const handleError = (error: Error) => {
        if (import.meta.env.DEV) {
            console.error('App error:', error);
        }
        setHasError(true);
        setErrorMessage(error.message);
    };

    // Global error handler
    useEffect(() => {
        const handleGlobalError = (event: ErrorEvent) => {
            if (import.meta.env.DEV) {
                console.error('Global error:', event.error);
            }
            setHasError(true);
            setErrorMessage(event.error?.message || 'Произошла неизвестная ошибка');
        };

        window.addEventListener('error', handleGlobalError);
        return () => window.removeEventListener('error', handleGlobalError);
    }, []);

    // Use new hooks - ВСЕГДА вызываем хуки в начале компонента
    const appState = useAppState();
    const estimatesHook = useEstimates(session);
    const projectsHook = useProjects();
    const projectDataHook = useProjectData();
    const inventoryHook = useInventory(session);
    const notesHook = useNotes(session);
    const tasksHook = useTasks(session);
    const fileStorageHook = useFileStorage();

    const loadProjectsFromSupabaseRef = projectsHook.loadProjectsFromSupabase;
    const loadDocumentsFromSupabaseRef = projectsHook.loadDocumentsFromSupabase;
    const loadPhotoReportsFromSupabaseRef = projectsHook.loadPhotoReportsFromSupabase;
    const setProjectsRef = projectsHook.setProjects;

    const fetchAllEstimatesFromHook = estimatesHook.fetchAllEstimates;
    const setEstimatesRef = estimatesHook.setEstimates;

    const fetchAllInventoryRef = inventoryHook.fetchAllInventory;
    const fetchAllNotesRef = notesHook.fetchAllNotes;
    const fetchAllTasksRef = tasksHook.fetchAllTasks;
    
    // Логирование состояния после инициализации хуков (перемещено после объявления всех хуков)

    // Subscribe to Supabase auth changes - перемещен после объявления хуков

    // Функция для загрузки всех смет
    const fetchAllEstimates = useCallback(async () => {
      try {
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
          console.error('Ошибка загрузки смет:', error);
          return;
        }
        
        estimatesHook.setEstimates(data || []); // Сохраняем в состояние хука
      } catch (error) {
        console.error('Ошибка в fetchAllEstimates:', error);
      }
    }, []); // Убираем estimatesHook из зависимостей для предотвращения бесконечного цикла

    useEffect(() => {
        // Получаем текущую сессию при инициализации
        const getInitialSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
            } catch (e) {
                console.error('Ошибка получения сессии Supabase:', e);
                setSession(null);
            }
        };
        
        getInitialSession();

        // Подписываемся на изменения состояния авторизации
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
            loadProjectsFromSupabaseRef();
            setProjectsLoaded(true);
        }
    }, [projectsLoaded, loadProjectsFromSupabaseRef]);

    // Остальные данные загружаем только при активной сессии
    useEffect(() => {
        if (!session) {
            if (dataLoaded || isDataLoading) {
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
        setIsDataLoading(true);

        let cancelled = false;

        const loadAllData = async () => {
            try {
                const [projectsRes, documentsRes, photoReportsRes, estimatesRes, inventoryRes, notesRes, tasksRes] = await Promise.allSettled([
                    loadProjectsFromSupabaseRef(),
                    loadDocumentsFromSupabaseRef(),
                    loadPhotoReportsFromSupabaseRef(),
                    fetchAllEstimatesFromHook(),
                    fetchAllInventoryRef(session),
                    fetchAllNotesRef(session),
                    fetchAllTasksRef(session),
                ]);

                // Обработка результатов
                if (projectsRes.status === 'rejected') {
                    console.error('Ошибка загрузки проектов:', projectsRes.reason);
                }
                if (documentsRes.status === 'rejected') {
                    console.error('Ошибка загрузки документов:', documentsRes.reason);
                }
                if (photoReportsRes.status === 'rejected') {
                    console.error('Ошибка загрузки фотоотчетов:', photoReportsRes.reason);
                }
                if (estimatesRes.status === 'rejected') {
                    console.error('Ошибка загрузки смет:', estimatesRes.reason);
                }
                if (inventoryRes.status === 'rejected') {
                    console.error('Ошибка загрузки инвентаря:', inventoryRes.reason);
                }
                if (notesRes.status === 'rejected') {
                    console.error('Ошибка загрузки заметок:', notesRes.reason);
                }
                if (tasksRes.status === 'rejected') {
                    console.error('Ошибка загрузки задач:', tasksRes.reason);
                }

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


    // Additional state that's not yet moved to hooks
    const libraryHook = useLibrary(session);
    const companyProfileHook = useCompanyProfile(session);
    
    const [inventoryNotes, setInventoryNotes] = useState<InventoryNote[]>([]);
    const [toolsScratchpad, setToolsScratchpad] = useState('');
    const [consumablesScratchpad, setConsumablesScratchpad] = useState('');
    const [reportProject, setReportProject] = useState<Project | null>(null);
    const [clientReportProject, setClientReportProject] = useState<Project | null>(null);

    const lastFocusedElement = useRef<HTMLElement | null>(null);
    const activeModalName = useRef<string | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    
    // Добавляем диагностические функции в глобальную область для отладки
    if (typeof window !== 'undefined') {
      (window as Window & { 
        diagnoseLogo?: () => void;
        diagnoseStorage?: () => void;
        refreshSupabaseCache?: () => void;
        fixLogoUrl?: () => void;
        checkLogoUrls?: () => void;
      }).diagnoseLogo = companyProfileHook.diagnoseLogo;
      (window as Window & { 
        diagnoseLogo?: () => void;
        diagnoseStorage?: () => void;
        refreshSupabaseCache?: () => void;
        fixLogoUrl?: () => void;
        checkLogoUrls?: () => void;
      }).diagnoseStorage = companyProfileHook.diagnoseStorage;
      (window as Window & { 
        diagnoseLogo?: () => void;
        diagnoseStorage?: () => void;
        refreshSupabaseCache?: () => void;
        fixLogoUrl?: () => void;
        checkLogoUrls?: () => void;
      }).refreshSupabaseCache = companyProfileHook.refreshSupabaseCache;
      (window as Window & { 
        diagnoseLogo?: () => void;
        diagnoseStorage?: () => void;
        refreshSupabaseCache?: () => void;
        fixLogoUrl?: () => void;
        checkLogoUrls?: () => void;
      }).fixLogoUrl = companyProfileHook.fixLogoUrl;
      // Функция для проверки URL логотипа в компонентах
      (window as Window & { 
        diagnoseLogo?: () => void;
        diagnoseStorage?: () => void;
        refreshSupabaseCache?: () => void;
        fixLogoUrl?: () => void;
        checkLogoUrls?: () => void;
      }).checkLogoUrls = () => {

        // Проверяем URL в шапке
        const headerImg = document.querySelector('.app-logo') as HTMLImageElement;
        if (headerImg) {

          if (headerImg.src.includes('multipart') || headerImg.src.includes('form-data')) {
            // URL содержит multipart/form-data - используем fallback
          }
        }
        
        // Проверяем URL в модальном окне
        const modalImg = document.querySelector('.logo-preview') as HTMLImageElement;
        if (modalImg) {

          if (modalImg.src.includes('multipart') || modalImg.src.includes('form-data')) {
            // URL содержит multipart/form-data - используем fallback
          }
        }
      };

    }

    const { setActiveProjectId: setContextActiveProjectId, activeProjectId: contextProjectId } = useProjectContext();
    
    // Синхронизируем activeProjectId между appState и context
    useEffect(() => {
        if (appState.activeProjectId !== contextProjectId) {
            setContextActiveProjectId(appState.activeProjectId);
        }
    }, [appState.activeProjectId, contextProjectId, setContextActiveProjectId]);

    useEffect(() => {
        setInventoryNotes(dataService.getInventoryNotes());
    }, []);

    // Загружаем справочник и профиль при наличии сессии
    useEffect(() => {
        libraryHook.fetchLibraryItems(session);
        companyProfileHook.fetchProfile(session);
    }, [session]);

    useEffect(() => {
        dataService.setInventoryNotes(inventoryNotes);
    }, [inventoryNotes]);

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

    const handleInputFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }, []);

    const formatCurrency = useCallback((value: number) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    }, []);

    const themeIcon = useCallback(() => {
        if (appState.themeMode === 'light') {
            return <IconMoon />;
        } else {
            return <IconSun />;
        }
    }, [appState.themeMode]);

    useEffect(() => {
        const name = companyProfileHook.profile?.name?.trim();
        document.title = name && name.length ? `${name} — Прораб360` : 'Прораб360';
    }, [companyProfileHook.profile?.name]);

    useEffect(() => {
        // Сохраняем исходную высоту viewport для сравнения
        let initialViewportHeight = window.innerHeight;
        
        const stabilizeMenus = () => {
            // Стабилизируем верхнее меню
            const appHeader = document.querySelector('.app-header') as HTMLElement;
            if (appHeader) {
                // Принудительно устанавливаем стабильную позицию
                appHeader.style.transform = 'translate3d(0, 0, 0)';
                appHeader.style.willChange = 'transform';
                appHeader.style.backfaceVisibility = 'hidden';
                (appHeader.style as CSSStyleDeclaration & { webkitBackfaceVisibility?: string; webkitTransform?: string }).webkitBackfaceVisibility = 'hidden';
                (appHeader.style as CSSStyleDeclaration & { webkitBackfaceVisibility?: string; webkitTransform?: string }).webkitTransform = 'translate3d(0, 0, 0)';
                
                // Фиксированная высота
                appHeader.style.height = '64px';
                appHeader.style.minHeight = '64px';
                appHeader.style.maxHeight = '64px';
                
                // Предотвращаем изменение позиции
                appHeader.style.position = 'fixed';
                appHeader.style.top = '0';
                appHeader.style.left = '0';
                appHeader.style.right = '0';
                
                // Дополнительная стабилизация для iOS
                appHeader.style.overflow = 'hidden';
                (appHeader.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = 'touch';
            }
            
            // Стабилизируем нижнее меню
            const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
            if (bottomNav) {
                // Убираем transform, чтобы избежать конфликтов со скроллом
                bottomNav.style.transform = 'none';
                bottomNav.style.willChange = 'auto';
                bottomNav.style.backfaceVisibility = 'visible';
                (bottomNav.style as CSSStyleDeclaration & { webkitBackfaceVisibility?: string; webkitTransform?: string }).webkitBackfaceVisibility = 'visible';
                (bottomNav.style as CSSStyleDeclaration & { webkitBackfaceVisibility?: string; webkitTransform?: string }).webkitTransform = 'none';
                
                // Фиксированная высота
                bottomNav.style.height = '60px';
                bottomNav.style.minHeight = '60px';
                bottomNav.style.maxHeight = '60px';
                
                // Предотвращаем изменение позиции
                bottomNav.style.position = 'fixed';
                bottomNav.style.bottom = '0';
                bottomNav.style.left = '0';
                bottomNav.style.right = '0';
                
                // Дополнительная стабилизация для iOS
                bottomNav.style.overflow = 'hidden';
                (bottomNav.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = 'touch';
                
                // Дополнительно: принудительно устанавливаем z-index выше чем у других элементов
                bottomNav.style.zIndex = '9999';
            }
            
            // Стабилизируем заголовки экранов
            const screenHeaders = document.querySelectorAll('.estimate-header, .projects-list-header, .project-detail-header');
            screenHeaders.forEach(header => {
                const headerElement = header as HTMLElement;
                // Принудительно устанавливаем стабильную позицию
                headerElement.style.transform = 'translate3d(0, 0, 0)';
                headerElement.style.willChange = 'transform';
                headerElement.style.backfaceVisibility = 'hidden';
                (headerElement.style as CSSStyleDeclaration & { webkitBackfaceVisibility?: string; webkitTransform?: string }).webkitBackfaceVisibility = 'hidden';
                (headerElement.style as CSSStyleDeclaration & { webkitBackfaceVisibility?: string; webkitTransform?: string }).webkitTransform = 'translate3d(0, 0, 0)';
                
                // Предотвращаем изменение позиции
                headerElement.style.position = 'sticky';
                headerElement.style.top = '0';
                headerElement.style.left = '0';
                headerElement.style.right = '0';
                
                // Дополнительная стабилизация для iOS
                headerElement.style.overflow = 'hidden';
                (headerElement.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = 'touch';
            });
        };

        // Функция для обработки изменения размера viewport (например, при открытии клавиатуры)
        const handleViewportChange = () => {
            const currentHeight = window.innerHeight;
            const heightDiff = initialViewportHeight - currentHeight;
            
            // Если высота изменилась более чем на 150px, вероятно, открылась клавиатура
            if (Math.abs(heightDiff) > 150) {
                // Увеличиваем z-index нижнего меню, чтобы оно оставалось поверх клавиатуры
                const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
                if (bottomNav) {
                    // Устанавливаем высоту, чтобы избежать сдвига
                    bottomNav.style.height = '60px';
                    bottomNav.style.minHeight = '60px';
                    bottomNav.style.maxHeight = '60px';
                    
                    // Увеличиваем z-index, чтобы меню оставалось на виду
                    bottomNav.style.zIndex = '10000';
                }
            } else {
                // Если клавиатура закрыта, возвращаем нормальный z-index
                const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
                if (bottomNav) {
                    bottomNav.style.zIndex = '1000';
                }
            }
            
            // В любом случае, стабилизируем меню
            requestAnimationFrame(() => {
                stabilizeMenus();
            });
        };

        // Стабилизируем при загрузке
        stabilizeMenus();

        // Стабилизируем при изменении размера окна
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', handleViewportChange);

        // Стабилизируем при скролле
        window.addEventListener('scroll', stabilizeMenus, { passive: true });
        
        // Стабилизируем при изменении viewport (включая открытие клавиатуры)
        window.addEventListener('resize', handleViewportChange);
        
        // Стабилизируем при изменении видимости
        document.addEventListener('visibilitychange', stabilizeMenus);

        return () => {
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('orientationchange', handleViewportChange);
            window.removeEventListener('scroll', stabilizeMenus);
            document.removeEventListener('visibilitychange', stabilizeMenus);
        };
    }, []);

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

    const activeProject = useMemo(() => {
        const id = appState.activeProjectId || '';
        return projectsHook.projects.find(p => p.id === id) || null;
    }, [appState.activeProjectId, projectsHook.projects]);

    useEffect(() => {
        appState.refreshData = async () => {

            try {
                const [estimatesRes, projectsRes, projectDataRes] = await Promise.allSettled([
                    estimatesHook.fetchAllEstimates(),
                    projectsHook.loadProjectsFromSupabase(),
                    projectDataHook.loadProjectData(activeProject?.id || '')
                ]);

                // Обработка результатов
                if (estimatesRes.status === 'rejected') {
                    console.error('Ошибка обновления смет:', estimatesRes.reason);
                }
                if (projectsRes.status === 'rejected') {
                    console.error('Ошибка обновления проектов:', projectsRes.reason);
                }
                if (projectDataRes.status === 'rejected') {
                    console.error('Ошибка обновления данных проекта:', projectDataRes.reason);
                }

            } catch (error) {
                console.error('🔄 App: ошибка при обновлении данных:', error);
            }
        };
    }, [appState, estimatesHook, projectsHook, projectDataHook, activeProject?.id]);

    const projectFinancials = useMemo(() => {
        if (!activeProject) return null;
        return projectDataHook.calculateProjectFinancials(activeProject.id, estimatesHook.estimates);
    }, [activeProject, estimatesHook.estimates, projectDataHook]);

    const filteredProjects = useMemo(() => {

        const filtered = projectsHook.projects.filter(project => {
            const matchesStatus = project.status === appState.projectStatusFilter;
            const matchesSearch = !appState.projectSearch || 
                project.name.toLowerCase().includes(appState.projectSearch.toLowerCase()) ||
                project.client.toLowerCase().includes(appState.projectSearch.toLowerCase()) ||
                project.address.toLowerCase().includes(appState.projectSearch.toLowerCase());
            return matchesStatus && matchesSearch;
        });

        return filtered;
    }, [projectsHook.projects, appState.projectStatusFilter, appState.projectSearch]);

    const handleLoadEstimate = useCallback((id: string) => {
        estimatesHook.loadEstimate(id, appState.activeProjectId, appState.setIsDirty);
        appState.navigateToEstimate(id);
        // Закрываем модальное окно после загрузки сметы
        appState.closeModal('estimatesList');
    }, [estimatesHook, appState]);

    const handleNewEstimate = useCallback((template?: { items: any[]; discount: number; discountType: 'percent' | 'fixed'; tax: number; }) => {
        const newEstimate = estimatesHook.createNewEstimate(null);
        
        // Если передан шаблон, применяем его данные
        if (template) {
            estimatesHook.setItems(template.items || []);
            estimatesHook.setDiscount(template.discount || 0);
            estimatesHook.setDiscountType(template.discountType || 'percent');
            estimatesHook.setTax(template.tax || 0);
            appState.setIsDirty(true); // Помечаем как измененную
        }
        
        appState.navigateToEstimate(newEstimate.id);
    }, [estimatesHook, appState]);

    const handleSaveEstimate = useCallback(async () => {
        appState.setLoading('saving', true);
        try {
            await estimatesHook.saveEstimate();
            appState.setIsDirty(false);
        } catch (error) {
            console.error('🔧 App: Ошибка при сохранении сметы:', error);
        } finally {
            appState.setLoading('saving', false);
        }
    }, [estimatesHook, appState]);

    const handleDeleteEstimate = useCallback(async (id: string) => {
        try {
            safeShowConfirm('Вы уверены, что хотите удалить эту смету?', async (ok) => {
                if (ok) {
                    try {

                        await estimatesHook.deleteEstimate(id);

                        // Если удаляемая смета была активной, возвращаемся назад
                        if (appState.activeEstimateId === id) {
                            appState.goBack();
                        }
                        
                        safeShowAlert('Смета успешно удалена!');
                        
                    } catch (error) {
                        safeShowAlert('Не удалось удалить смету. Попробуйте еще раз.');
                    }
                }
            });
        } catch (error) {
            // Fallback: удаляем без подтверждения
            try {
                await estimatesHook.deleteEstimate(id);
                safeShowAlert('Смета удалена!');
                
                if (appState.activeEstimateId === id) {
                    appState.goBack();
                }
            } catch (deleteError) {
                safeShowAlert('Не удалось удалить смету. Попробуйте еще раз.');
            }
        }
    }, [estimatesHook, appState]);

    // Альтернативная функция удаления без подтверждения для браузерной версии
    const handleDeleteEstimateDirect = useCallback(async (id: string) => {
        
        try {
            await estimatesHook.deleteEstimate(id);
            
            // Если удаляемая смета была активной, возвращаемся назад
            if (appState.activeEstimateId === id) {
                appState.goBack();
            }
            
            safeShowAlert('Смета удалена!');
            
        } catch (error) {
            safeShowAlert('Не удалось удалить смету. Попробуйте еще раз.');
        }
    }, [estimatesHook, appState]);

    const handleStatusChange = useCallback((id: string, status: EstimateStatus) => {
        estimatesHook.updateEstimateStatus(id, status);
    }, [estimatesHook]);

    const handleAddNewEstimateInProject = (projectId: string) => {
        appState.setActiveProjectId(projectId);
        estimatesHook.createNewEstimate(projectId);
        startTransition(() => {
            appState.setActiveView('estimate');
        });
    };

    const handleDeleteTemplate = useCallback((templateId: string) => {
        estimatesHook.deleteTemplate(templateId);
    }, [estimatesHook]);

    // Project handlers
    const handleOpenProjectModal = useCallback((project: Partial<Project> | null = null) => {
        startTransition(() => {
            appState.openModal('newProject', project);
        });
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
        startTransition(() => {
            appState.setActiveView('projectDetail');
        });
        return created;
    }, []);

    // Supabase: update project
    const handleUpdateProject = useCallback(async (id: string, updates: Partial<Project>) => {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.client !== undefined) payload.client = updates.client;
        if (updates.address !== undefined) payload.address = updates.address;
        if (updates.status !== undefined) payload.status = updates.status;

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
        startTransition(() => {
            appState.openModal('photoViewer', photo);
        });
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
        // Добавляем элемент из библиотеки в текущую смету
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
            // Переупорядочивание элементов сметы
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
            // Добавляем элементы из ИИ в текущую смету
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
                    <React.Suspense fallback={<Loader />}>
                        <WorkspaceView
                        scratchpad={projectsHook.scratchpad}
                        globalDocuments={projectsHook.globalDocuments}
                        onScratchpadChange={projectsHook.setScratchpad}
                        onOpenGlobalDocumentModal={() => startTransition(() => appState.openModal('globalDocument'))}
                        onDeleteGlobalDocument={handleDeleteGlobalDocument}
                        onOpenScratchpad={handleOpenScratchpad}
                        notesHook={notesHook}
                        />
                    </React.Suspense>
                );
            
            case 'estimate':
                return (
                    <React.Suspense fallback={<Loader />}>
                    <EstimateView
                        currentEstimateProjectId={estimatesHook.getCurrentEstimateProjectId()}
                        handleBackToProject={handleBackToProject}
                        clientInfo={estimatesHook.clientInfo}
                        setClientInfo={estimatesHook.setClientInfo}
                        setIsDirty={appState.setIsDirty}
                        handleThemeChange={appState.handleThemeChange}
                        themeIcon={themeIcon}
                        themeMode={appState.themeMode}
                        onOpenLibraryModal={() => startTransition(() => appState.openModal('library'))}
                        onOpenEstimatesListModal={() => startTransition(() => appState.openModal('estimatesList'))}
                        onOpenSettingsModal={() => startTransition(() => appState.openModal('settings'))}
                        onOpenAISuggestModal={() => startTransition(() => appState.openModal('aiSuggest'))}
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
                        onNewEstimate={handleNewEstimate}
                    />
                    </React.Suspense>
                );
            
            case 'projects':
                return (
                    <React.Suspense fallback={<Loader />}>
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
                    </React.Suspense>
                );
            
            case 'projectDetail':
                if (!activeProject) return null;
                
                const projectEstimates = estimatesHook.getEstimatesByProject(activeProject.id);

                return (
                    <React.Suspense fallback={<Loader />}>
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
                        onOpenFinanceModal={() => startTransition(() => appState.openModal('financeEntry'))}
                        onDeleteFinanceEntry={handleDeleteFinanceEntry}
                        onOpenPhotoReportModal={() => startTransition(() => appState.openModal('photoReport'))}
                        onViewPhoto={handleViewPhoto}
                        onOpenDocumentModal={() => startTransition(() => appState.openModal('documentUpload'))}
                        onDeleteDocument={handleDeleteDocument}
                        onOpenWorkStageModal={(stage) => startTransition(() => appState.openModal('workStage', stage))}
                        onDeleteWorkStage={handleDeleteWorkStage}
                        onOpenNoteModal={(note) => startTransition(() => appState.openModal('note', note))}
                        onDeleteNote={handleDeleteNote}
                        onOpenActModal={(total) => startTransition(() => appState.openModal('actGeneration', total))}
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
                        onOpenEstimatesListModal={() => startTransition(() => appState.openModal('estimatesList'))}
                        notesHook={notesHook}
                        tasksHook={tasksHook}
                        appState={appState}
                        projectDataHook={projectDataHook}
                        />
                    </React.Suspense>
                );
            
            case 'inventory':
                return (
                    <React.Suspense fallback={<Loader />}>
                        <InventoryScreen
                        tools={inventoryHook.tools}
                        projects={projectsHook.projects}
                        consumables={inventoryHook.consumables}
                        onToolClick={(tool) => {
                            startTransition(() => {
                                appState.openModal('toolDetails', tool);
                            });
                        }}
                        onUpdateTool={handleUpdateTool}
                        onOpenAddToolModal={() => startTransition(() => appState.openModal('addTool'))}
                        onAddConsumable={handleAddConsumable}
                        onUpdateConsumable={handleUpdateConsumable}
                        onDeleteConsumable={handleDeleteConsumable}
                        onOpenToolDetailsModal={(tool) => startTransition(() => appState.openModal('toolDetails', tool))}
                        toolsScratchpad={toolsScratchpad}
                        consumablesScratchpad={consumablesScratchpad}
                        onToolsScratchpadChange={setToolsScratchpad}
                        onConsumablesScratchpadChange={setConsumablesScratchpad}
                        notesHook={notesHook}
                        appState={appState}
                        />
                    </React.Suspense>
                );
            
            case 'reports':
                return (
                    <React.Suspense fallback={<Loader />}>
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
                            appState.navigateToView('overallFinancialReport');
                        }}
                        />
                    </React.Suspense>
                );
            
            case 'projectFinancialReport':
                if (!reportProject) {
                    appState.navigateToView('reports');
                    return null;
                }
                return (
                    <React.Suspense fallback={<Loader />}>
                        <ProjectFinancialReportScreen
                        project={reportProject}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectDataHook.financeEntries}
                        formatCurrency={formatCurrency}
                        onBack={() => appState.navigateToView('reports')}
                        />
                    </React.Suspense>
                );
            
            case 'clientReport':
                if (!clientReportProject) {
                    appState.navigateToView('reports');
                    return null;
                }
                return (
                    <React.Suspense fallback={<Loader />}>
                        <ClientReportScreen
                        project={clientReportProject}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectDataHook.financeEntries}
                        workStages={projectDataHook.workStages}
                        formatCurrency={formatCurrency}
                        onBack={() => appState.navigateToView('reports')}
                        />
                    </React.Suspense>
                );
            
            case 'overallFinancialReport':
                return (
                    <React.Suspense fallback={<Loader />}>
                        <OverallFinancialReportScreen
                        projects={projectsHook.projects}
                        estimates={estimatesHook.estimates}
                        financeEntries={projectDataHook.financeEntries}
                        formatCurrency={formatCurrency}
                        onBack={() => appState.navigateToView('reports')}
                        />
                    </React.Suspense>
                );
            
            case 'scratchpad':
                return (
                    <React.Suspense fallback={<Loader />}>
                        <ScratchpadView
                        content={appState.scratchpadData?.content || projectsHook.scratchpad}
                        onSave={appState.scratchpadData?.onSave || projectsHook.setScratchpad}
                        onBack={appState.goBack}
                        />
                    </React.Suspense>
                );
            
            case 'allTasks':
                return (
                    <React.Suspense fallback={<Loader />}>
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
                    </React.Suspense>
                );
            
            case 'projectTasks':
                if (!activeProject) {
                    appState.navigateToView('allTasks');
                    return null;
                }
                return (
                    <React.Suspense fallback={<Loader />}>
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
                    </React.Suspense>
                );
            
            case 'calculator':
                return (
                    <React.Suspense fallback={<Loader />}>
                        <CalculatorView appState={appState} companyProfile={companyProfileHook.profile} />
                    </React.Suspense>
                );
            
            default:
                return (
                    <React.Suspense fallback={<Loader />}>
                        <WorkspaceView
                        scratchpad={projectsHook.scratchpad}
                        globalDocuments={projectsHook.globalDocuments}
                        onScratchpadChange={projectsHook.setScratchpad}
                        onOpenGlobalDocumentModal={() => startTransition(() => appState.openModal('globalDocument'))}
                        onDeleteGlobalDocument={handleDeleteGlobalDocument}
                        onOpenScratchpad={handleOpenScratchpad}
                        notesHook={notesHook}
                        />
                    </React.Suspense>
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
        <ProjectProvider>
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
                        src={(() => {
                            const logoUrl = companyProfileHook.profile.logo;

                            if (!logoUrl) {

                                return '/logo.png';
                            }
                            
                            // Проверяем, не содержит ли URL multipart/form-data
                            if (logoUrl.includes('multipart') || logoUrl.includes('form-data')) {
                                console.error('❌ Обнаружен неправильный URL с multipart/form-data в шапке:', logoUrl);
                                console.error('❌ Используем fallback логотип');
                                return '/logo.png';
                            }

                            return logoUrl;
                        })()}
                        alt="Логотип"
                        className="app-logo"
                        onError={(e) => {
                            const currentSrc = e.currentTarget.src;
                            
                            // Проверяем, не является ли это ложным срабатыванием
                            if (currentSrc.includes('multipart') || currentSrc.includes('form-data')) {
                                (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                return;
                            }
                            
                            // Проверяем, не является ли это уже fallback логотипом
                            if (currentSrc.includes('/logo.png')) {
                                return;
                            }
                            
                            (e.currentTarget as HTMLImageElement).src = '/logo.png';
                        }}
                    />
                    <h1>{(companyProfileHook.profile.name && companyProfileHook.profile.name.trim()) ? companyProfileHook.profile.name : 'Прораб'}</h1>
                </div>
                <div className="app-header-right">
                    <button onClick={appState.handleThemeChange} className="header-btn" aria-label="Сменить тему">
                        {themeIcon()}
                    </button>
                    <button onClick={() => startTransition(() => appState.openModal('library'))} className="header-btn" aria-label="Справочник">
                        <IconBook />
                    </button>
                    <button onClick={() => startTransition(() => appState.openModal('estimatesList'))} className="header-btn" aria-label="Список смет">
                        <IconClipboard />
                    </button>
                    <button onClick={() => appState.navigateToView('reports')} className="header-btn" aria-label="Отчеты">
                        <IconTrendingUp />
                    </button>
                    <button onClick={() => startTransition(() => appState.openModal('settings'))} className="header-btn" aria-label="Настройки">
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
                        if (appState.activeProjectId) {
                            appState.navigateToView('projectDetail');
                        } else {
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
                        // Если уже есть активная смета, не создаем новую
                        if (!estimatesHook.currentEstimate) {
                            estimatesHook.createNewEstimate();
                        }
                        startTransition(() => {
                            appState.setActiveView('estimate');
                        });
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
                <React.Suspense fallback={<Loader />}>
                <ActGenerationModal
                    onClose={() => appState.closeModal('actGeneration')}
                    project={activeProject}
                    profile={companyProfileHook.profile}
                    totalAmount={appState.actTotalAmount}
                    workStages={projectDataHook?.workStages || []}
                    showAlert={safeShowAlert}
                />
                </React.Suspense>
            )}

            {appState.showAISuggestModal && (
                <React.Suspense fallback={<Loader />}>
                <AISuggestModal
                    onClose={() => appState.closeModal('aiSuggest')}
                    onAddItems={handleAddItemsFromAI}
                    showAlert={safeShowAlert}
                />
                </React.Suspense>
            )}

            {appState.showAddToolModal && (
                <React.Suspense fallback={<Loader />}>
                <AddToolModal
                    onClose={() => appState.closeModal('addTool')}
                    onSave={handleAddTool}
                    projects={projectsHook.projects}
                />
                </React.Suspense>
            )}

            {appState.showToolDetailsModal && appState.selectedTool && (
                <React.Suspense fallback={<Loader />}>
                <ToolDetailsModal
                    tool={appState.selectedTool}
                    onClose={() => appState.closeModal('toolDetails')}
                    onSave={handleUpdateTool}
                    onDelete={handleDeleteTool}
                    projects={projectsHook.projects}
                />
                </React.Suspense>
            )}

            {appState.showAddTaskModal && (
                <React.Suspense fallback={<Loader />}>
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
                </React.Suspense>
            )}

            {appState.showEditTaskModal && appState.selectedTask && (
                <React.Suspense fallback={<Loader />}>
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
                </React.Suspense>
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
        </ProjectProvider>
    );
};

export default App;
