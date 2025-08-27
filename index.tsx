import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ROBOTO_FONT_BASE64 } from './font';

// Fix: Add TypeScript definitions for the Telegram Web App API to resolve errors on `window.Telegram`.
interface TelegramWebApp {
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

// --- Development Mock for Telegram API ---
// This allows the app to run in a regular browser for development without errors.
if (!window.Telegram || !window.Telegram.WebApp) {
    console.log("Telegram WebApp API not found. Using development mock.");
    window.Telegram = {
        WebApp: {
            ready: () => console.log("Mock App.ready()"),
            expand: () => console.log("Mock App.expand()"),
            sendData: (data: string) => {
                console.log("--- Mock App.sendData() ---");
                console.log("Data to be sent to Telegram chat:");
                console.log(data);
                alert("Данные для отправки выведены в консоль (F12).");
            },
            HapticFeedback: {
                notificationOccurred: (type) => console.log(`Mock HapticFeedback: ${type}`),
            },
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            onEvent: (eventType, eventHandler) => {
                if (eventType === 'themeChanged') {
                     window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', eventHandler);
                }
            },
            offEvent: (eventType, eventHandler) => {
                 if (eventType === 'themeChanged') {
                     window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', eventHandler);
                }
            },
            isClosingConfirmationEnabled: false,
            enableClosingConfirmation: () => console.log("Mock Closing Confirmation Enabled"),
            disableClosingConfirmation: () => console.log("Mock Closing Confirmation Disabled"),
            disableVerticalSwipes: () => console.log("Mock Vertical Swipes Disabled"),
            showAlert: (message, callback) => { alert(message); callback?.(); },
            showConfirm: (message, callback) => { callback(window.confirm(message)); },
        },
    };
}
// --- End of Mock ---


// Define the structure for an estimate item
interface Item {
    id: number;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image?: string | null; // Added for image attachments
}

interface LibraryItem {
    id: number;
    name: string;
    price: number;
    unit: string;
    category: string;
}

interface CompanyProfile {
    name: string;
    details: string;
    logo: string | null;
}

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'completed' | 'cancelled';
type ThemeMode = 'auto' | 'light' | 'dark';

interface Estimate {
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
}

const statusMap: Record<EstimateStatus, { text: string; color: string; }> = {
    draft: { text: 'Черновик', color: '#808080' },
    sent: { text: 'Отправлена', color: '#007BFF' },
    approved: { text: 'Одобрена', color: '#28A745' },
    completed: { text: 'Завершена', color: '#17A2B8' },
    cancelled: { text: 'Отменена', color: '#DC3545' },
};

// Pure utility function to generate a new estimate number
const generateNewEstimateNumber = (allEstimates: Estimate[]): string => {
    const currentYear = new Date().getFullYear();
    const yearEstimates = allEstimates.filter(e => e.number?.startsWith(String(currentYear)));
    const maxNum = yearEstimates.reduce((max, e) => {
        const numPart = parseInt(e.number.split('-')[1] || '0', 10);
        return Math.max(max, numPart);
    }, 0);
    const newNum = (maxNum + 1).toString().padStart(3, '0');
    return `${currentYear}-${newNum}`;
};

const App: React.FC = () => {
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [templates, setTemplates] = useState<Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status'>[]>([]);
    const [activeEstimateId, setActiveEstimateId] = useState<number | null>(null);

    // Form state for the active estimate
    const [items, setItems] = useState<Item[]>([{ id: Date.now(), name: '', quantity: 1, price: 0, unit: '' }]);
    const [clientInfo, setClientInfo] = useState('');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [estimateDate, setEstimateDate] = useState('');
    const [status, setStatus] = useState<EstimateStatus>('draft');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [tax, setTax] = useState(0);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEstimatesListOpen, setIsEstimatesListOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

    const [estimatesSearch, setEstimatesSearch] = useState('');
    const [librarySearch, setLibrarySearch] = useState('');
    
    const [themeMode, setThemeMode] = useState<ThemeMode>('auto');

    // --- State for UI and Logic Control ---
    const [isDirty, setIsDirty] = useState(false); // reliable flag for unsaved changes
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    
    // Theme Management
    useEffect(() => {
        const savedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
        if (savedTheme) {
            setThemeMode(savedTheme);
        }

        const applyTheme = () => {
            const currentMode = (localStorage.getItem('themeMode') as ThemeMode | null) || 'auto';
            if (currentMode === 'dark' || (currentMode === 'auto' && window.Telegram?.WebApp.colorScheme === 'dark')) {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        };

        applyTheme(); // Apply on initial load
        window.Telegram?.WebApp.onEvent('themeChanged', applyTheme); // Listen for TG theme changes

        return () => {
            window.Telegram?.WebApp.offEvent('themeChanged', applyTheme);
        };
    }, []);

    const handleThemeChange = () => {
        const newTheme: ThemeMode = themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto';
        setThemeMode(newTheme);
        localStorage.setItem('themeMode', newTheme);

        if (newTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else if (newTheme === 'light') {
            document.body.classList.remove('dark-theme');
        } else { // auto
            if (window.Telegram?.WebApp.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        }
    };
    
    // Enable native closing confirmation if there are unsaved changes
    useEffect(() => {
        if (isDirty) {
            window.Telegram?.WebApp.enableClosingConfirmation();
        } else {
            window.Telegram?.WebApp.disableClosingConfirmation();
        }
    }, [isDirty]);

    const populateForm = (estimate: Estimate | Partial<Estimate> | null, currentEstimates: Estimate[]) => {
        if (estimate) {
            setItems(estimate.items || []);
            setClientInfo(estimate.clientInfo || '');
            setEstimateNumber(estimate.number || generateNewEstimateNumber(currentEstimates));
            setEstimateDate(estimate.date || new Date().toISOString().split('T')[0]);
            setStatus(estimate.status || 'draft');
            setDiscount(estimate.discount || 0);
            setDiscountType(estimate.discountType || 'percent');
            setTax(estimate.tax || 0);
            if ('id' in estimate && estimate.id) {
                setActiveEstimateId(estimate.id);
            } else {
                 setActiveEstimateId(null);
            }
        } else {
            // New estimate state
            setItems([{ id: Date.now(), name: '', quantity: 1, price: 0, unit: '', image: null }]);
            setClientInfo('');
            setEstimateNumber(generateNewEstimateNumber(currentEstimates));
            setEstimateDate(new Date().toISOString().split('T')[0]);
            setStatus('draft');
            setDiscount(0);
            setDiscountType('percent');
            setTax(0);
            setActiveEstimateId(null);
        }
        setIsDirty(false); // Reset dirty flag when loading new data
    };

    // Load all data on initial render
    useEffect(() => {
        try {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
                window.Telegram.WebApp.disableVerticalSwipes();
            }
        } catch (error) {
            console.error("Failed to initialize Telegram Web App:", error);
        }

        const savedData = localStorage.getItem('estimatesData');
        let initialEstimates: Estimate[] = [];
        let activeEstimate: Estimate | null = null;
        
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                let savedEstimates = (parsedData.estimates || []) as Estimate[];
                const savedActiveId = parsedData.activeEstimateId;
                
                let needsResave = false;
                savedEstimates = savedEstimates.map((e: any) => {
                    if (typeof e.status === 'undefined') {
                        needsResave = true;
                        return {
                            ...e,
                            number: e.number || generateNewEstimateNumber([]),
                            date: e.date || new Date(e.lastModified).toISOString().split('T')[0],
                            status: 'draft',
                        };
                    }
                    return e;
                });
                
                if (needsResave) localStorage.setItem('estimatesData', JSON.stringify({ estimates: savedEstimates, activeEstimateId: savedActiveId }));
                
                initialEstimates = savedEstimates;
                activeEstimate = savedEstimates.find(e => e.id === savedActiveId) || savedEstimates[0] || null;

            } catch (error) { console.error("Failed to parse saved estimates:", error); }
        }
        
        setEstimates(initialEstimates);
        populateForm(activeEstimate, initialEstimates);
        
        const savedProfile = localStorage.getItem('companyProfile');
        if (savedProfile) { try { setCompanyProfile(JSON.parse(savedProfile)); } catch (e) { console.error("Failed to parse profile", e); }}
        
        const savedLibrary = localStorage.getItem('itemLibrary');
        if (savedLibrary) { try { setLibraryItems(JSON.parse(savedLibrary)); } catch (e) { console.error("Failed to parse library", e); }}

        const savedTemplates = localStorage.getItem('estimateTemplates');
        if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { console.error("Failed to parse templates", e); }}
    }, []);
    
    // Fix for mobile keyboards covering inputs
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay to allow keyboard to appear
    };

    const handleAddItem = () => { setItems(prev => [...prev, { id: Date.now(), name: '', quantity: 1, price: 0, unit: '', image: null }]); setIsDirty(true); };
    const handleAddFromLibrary = (libItem: LibraryItem) => { setItems(prev => [...prev, { id: Date.now(), name: libItem.name, quantity: 1, price: libItem.price, unit: libItem.unit, image: null }]); setIsLibraryOpen(false); setIsDirty(true); };
    const handleItemChange = (id: number, field: keyof Omit<Item, 'image'>, value: string | number) => { setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); setIsDirty(true); };
    const handleRemoveItem = (id: number) => { setItems(prev => prev.filter(item => item.id !== id)); setIsDirty(true); };
    
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

    const resizeImage = (file: File, maxSize: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error("Could not get canvas context"));
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8)); // Use JPEG for better compression
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleItemImageChange = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resizedImage = await resizeImage(file, 800); // Resize to max 800px
            setItems(prev => prev.map(item => item.id === id ? { ...item, image: resizedImage } : item));
            setIsDirty(true);
        } catch (error) {
            console.error("Image processing failed:", error);
            window.Telegram?.WebApp.showAlert("Не удалось обработать изображение.");
        }
    };
    
    const handleRemoveItemImage = (id: number) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, image: null } : item));
        setIsDirty(true);
    };

    const calculation = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = discountType === 'percent' ? subtotal * (Number(discount) / 100) : Number(discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(tax) / 100);
        const grandTotal = totalAfterDiscount + taxAmount;
        return { subtotal, discountAmount, taxAmount, grandTotal };
    }, [items, discount, discountType, tax]);

    const formatCurrency = useCallback((value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value), []);
    const getValidItems = useCallback(() => items.filter(item => item.name.trim() && item.quantity > 0 && item.price >= 0), [items]);

    const handleSave = () => {
        if (!isDirty) return;
        try {
            const newEstimates = [...estimates];
            const now = Date.now();
            const currentId = activeEstimateId || now;
            
            const currentEstimateData = { 
                id: currentId,
                clientInfo, items, discount, discountType, tax, 
                number: estimateNumber, date: estimateDate, status,
                lastModified: now
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
            window.Telegram?.WebApp.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error("Save failed:", error);
            window.Telegram?.WebApp.showAlert("Не удалось сохранить смету.");
        }
    };
    
    const handleNewEstimate = (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status'>) => {
        if (isDirty) {
            window.Telegram?.WebApp.showConfirm('У вас есть несохраненные изменения. Вы уверены, что хотите создать новую смету?', (ok) => {
                if (ok) {
                    populateForm(template || null, estimates);
                }
            });
        } else {
             populateForm(template || null, estimates);
        }
    }
    
    const handleExportPDF = useCallback(async () => {
        setIsPdfLoading(true);
        window.Telegram?.WebApp.HapticFeedback.notificationOccurred('warning');
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for scripts
            
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                throw new Error("Библиотека для создания PDF (jsPDF) не загрузилась. Проверьте интернет-соединение.");
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            if (typeof (doc as any).autoTable !== 'function') {
                throw new Error("Плагин для таблиц PDF (autoTable) не загрузился. Проверьте интернет-соединение.");
            }

            const validItems = getValidItems();
            if (validItems.length === 0) {
                window.Telegram?.WebApp.showAlert("Добавьте хотя бы одну позицию в смету.");
                return;
            }
        
            doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_FONT_BASE64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto');
        
            let y = 15;
            const pageMargin = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
        
            // Header
            if (companyProfile.logo) {
                try {
                    doc.addImage(companyProfile.logo, 'JPEG', pageMargin, y, 30, 30);
                } catch (e) { console.error("Could not add logo to PDF:", e); }
            }
            
            doc.setFontSize(20);
            doc.text(companyProfile.name || 'Смета', pageWidth - pageMargin, y + 5, { align: 'right' });
            doc.setFontSize(10);
            doc.text(companyProfile.details || '', pageWidth - pageMargin, y + 15, { align: 'right', maxWidth: 80 });
            y += 45;
        
            // Estimate Meta
            doc.setFontSize(16);
            doc.text(`Смета № ${estimateNumber} от ${new Date(estimateDate).toLocaleDateString('ru-RU')}`, pageMargin, y);
            y += 10;
            doc.setFontSize(12);
            doc.text(`Клиент / Объект: ${clientInfo}`, pageMargin, y);
            y += 15;
            
            // Table
            const tableData = validItems.map((item, index) => [
                index + 1,
                item.name,
                item.quantity,
                item.unit || 'шт.',
                formatCurrency(item.price),
                formatCurrency(item.quantity * item.price),
            ]);
        
            (doc as any).autoTable({
                startY: y,
                head: [['№', 'Наименование', 'Кол-во', 'Ед.изм.', 'Цена', 'Сумма']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185], textColor: 255, font: 'Roboto' },
                bodyStyles: { font: 'Roboto' },
                didDrawPage: (data: any) => y = data.cursor.y,
            });
            
            y = (doc as any).autoTable.previous.finalY + 15;
        
            // Totals
            const totalsX = pageWidth - pageMargin;
            doc.setFontSize(12);
            doc.text(`Подытог: ${formatCurrency(calculation.subtotal)}`, totalsX, y, { align: 'right' });
            y += 7;
            if (calculation.discountAmount > 0) {
                doc.text(`Скидка (${discountType === 'percent' ? `${discount}%` : formatCurrency(discount)}): -${formatCurrency(calculation.discountAmount)}`, totalsX, y, { align: 'right' });
                y += 7;
            }
            if (calculation.taxAmount > 0) {
                doc.text(`Налог (${tax}%): +${formatCurrency(calculation.taxAmount)}`, totalsX, y, { align: 'right' });
                y += 7;
            }
            doc.setFontSize(14);
            doc.setFont('Roboto', 'bold');
            doc.text(`Итого: ${formatCurrency(calculation.grandTotal)}`, totalsX, y + 2, { align: 'right' });
            doc.setFont('Roboto', 'normal');
            
            // Images
            const images = validItems.filter(item => item.image);
            if (images.length > 0) {
                doc.addPage();
                let imageY = 15;
                doc.setFontSize(16);
                doc.text('Прикрепленные изображения', pageMargin, imageY);
                imageY += 10;
                
                for (const item of images) {
                    if (!item.image) continue;
                    doc.setFontSize(10);
                    doc.text(`Позиция #${validItems.indexOf(item) + 1}: ${item.name}`, pageMargin, imageY);
                    imageY += 5;
                    try {
                        const imgProps = doc.getImageProperties(item.image);
                        const aspect = imgProps.width / imgProps.height;
                        const maxWidth = pageWidth - pageMargin * 2;
                        const maxHeight = 80;
                        let imgWidth = maxWidth;
                        let imgHeight = imgWidth / aspect;
                        if (imgHeight > maxHeight) {
                            imgHeight = maxHeight;
                            imgWidth = imgHeight * aspect;
                        }
                        if (imageY + imgHeight > doc.internal.pageSize.getHeight() - pageMargin) {
                            doc.addPage();
                            imageY = pageMargin;
                        }
                        doc.addImage(item.image, 'JPEG', pageMargin, imageY, imgWidth, imgHeight);
                        imageY += imgHeight + 10;
                    } catch (e) {
                        console.error("Could not add item image to PDF:", e);
                        doc.setTextColor(150);
                        doc.text('Не удалось загрузить изображение.', pageMargin, imageY);
                        doc.setTextColor(0);
                        imageY += 10;
                    }
                }
            }
        
            doc.save(`смета-${estimateNumber}.pdf`);
        } catch (error: any) {
            console.error("PDF Export failed:", error);
            window.Telegram?.WebApp.showAlert(`Не удалось создать PDF: ${error.message}`);
        } finally {
            setIsPdfLoading(false);
        }
    }, [getValidItems, clientInfo, companyProfile, estimateNumber, estimateDate, formatCurrency, calculation, discount, discountType, tax]);

    const handleShare = useCallback(() => {
        try {
            const validItems = getValidItems();
            if (validItems.length === 0) {
                window.Telegram?.WebApp.showAlert("Добавьте хотя бы одну позицию, чтобы поделиться сметой.");
                window.Telegram?.WebApp.HapticFeedback.notificationOccurred('error');
                return;
            }
            const header = `*Смета № ${estimateNumber} от ${new Date(estimateDate).toLocaleDateString('ru-RU')}*\nКлиент: ${clientInfo || 'Не указан'}\n\n`;
            const itemsText = validItems.map((item, index) => `${index + 1}. ${item.name} (${item.quantity} ${item.unit || 'шт.'}) - ${formatCurrency(item.quantity * item.price)}`).join('\n');
            const footer = `\n\n*Подытог:* ${formatCurrency(calculation.subtotal)}`;
            const discountText = calculation.discountAmount > 0 ? `\n*Скидка:* -${formatCurrency(calculation.discountAmount)}` : '';
            const taxText = calculation.taxAmount > 0 ? `\n*Налог (${tax}%):* +${formatCurrency(calculation.taxAmount)}` : '';
            const total = `\n*Итого:* ${formatCurrency(calculation.grandTotal)}`;
            
            const message = header + itemsText + footer + discountText + taxText + total;
            window.Telegram?.WebApp.sendData(message);
        } catch (error) {
            console.error("Share failed:", error);
            window.Telegram?.WebApp.showAlert("Не удалось подготовить данные для отправки.");
        }
    }, [getValidItems, estimateNumber, estimateDate, clientInfo, formatCurrency, calculation, tax]);
    
    const handleProfileChange = (field: keyof CompanyProfile, value: string) => setCompanyProfile(prev => ({ ...prev, [field]: value }));
    const handleSaveProfile = () => { localStorage.setItem('companyProfile', JSON.stringify(companyProfile)); setIsSettingsOpen(false); };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resizedLogo = await resizeImage(file, 200); // Resize to max 200px for profile
            setCompanyProfile(prev => ({ ...prev, logo: resizedLogo }));
        } catch (error) {
            console.error("Logo processing failed:", error);
            window.Telegram?.WebApp.showAlert("Не удалось обработать логотип.");
        }
    };
    const removeLogo = () => setCompanyProfile(prev => ({...prev, logo: null}));

    const handleLoadEstimate = (id: number) => {
        const load = () => {
            const estimateToLoad = estimates.find(e => e.id === id); 
            if (estimateToLoad) { 
                populateForm(estimateToLoad, estimates); 
                setIsEstimatesListOpen(false); 
            }
        };

        if (isDirty) {
            window.Telegram?.WebApp.showConfirm("У вас есть несохраненные изменения. Загрузить другую смету?", (ok) => {
                if (ok) load();
            });
        } else {
            load();
        }
    };
    
    const handleDeleteEstimate = (id: number) => {
        window.Telegram?.WebApp.showConfirm("Вы уверены, что хотите удалить эту смету?", (ok) => {
            if (ok) {
                const newEstimates = estimates.filter(e => e.id !== id);
                setEstimates(newEstimates);
                let newActiveId = activeEstimateId;
                if (activeEstimateId === id) {
                    const estimateToLoad = newEstimates[0] || null;
                    newActiveId = estimateToLoad ? estimateToLoad.id : null;
                    populateForm(estimateToLoad, newEstimates);
                }
                localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId: newActiveId }));
            }
        });
    };
    
    const handleStatusChange = (id: number, newStatus: EstimateStatus) => {
        const newEstimates = estimates.map(e => e.id === id ? { ...e, status: newStatus } : e);
        setEstimates(newEstimates);
        localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId }));
    };

    const handleSaveAsTemplate = (id: number) => {
        const estimateToTemplate = estimates.find(e => e.id === id);
        if (!estimateToTemplate) return;
        const { items, discount, discountType, tax } = estimateToTemplate;
        const newTemplates = [...templates, { items, discount, discountType, tax, lastModified: Date.now() }];
        setTemplates(newTemplates);
        localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
        window.Telegram?.WebApp.showAlert('Шаблон сохранен!');
    };
    const handleDeleteTemplate = (timestamp: number) => {
        window.Telegram?.WebApp.showConfirm('Вы уверены, что хотите удалить этот шаблон?', (ok) => {
            if (ok) {
                const newTemplates = templates.filter(t => t.lastModified !== timestamp);
                setTemplates(newTemplates);
                localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
            }
        });
    }
    
    const SettingsModal = () => ( <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}><div className="modal-content card" onClick={e => e.stopPropagation()}><div className="modal-header"><h2>Профиль компании</h2><button onClick={() => setIsSettingsOpen(false)} className="close-btn" aria-label="Закрыть">×</button></div><div className="modal-body"><label>Название компании</label><input type="text" value={companyProfile.name} onChange={(e) => handleProfileChange('name', e.target.value)} onFocus={handleInputFocus} placeholder="Ваше ИП или название" /><label>Реквизиты / Контакты</label><textarea value={companyProfile.details} onChange={(e) => handleProfileChange('details', e.target.value)} onFocus={handleInputFocus} placeholder="Телефон, адрес, email..." rows={3} /><label>Логотип</label>{companyProfile.logo ? (<div className="logo-preview-container"><img src={companyProfile.logo} alt="Предпросмотр логотипа" className="logo-preview" /><button onClick={removeLogo} className="btn btn-tertiary remove-logo-btn">Удалить</button></div>) : ( <input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} /> )}</div><div className="modal-footer"><button onClick={handleSaveProfile} className="btn btn-primary">Сохранить</button></div></div></div>);
    const EstimatesListModal = () => {
        const [activeTab, setActiveTab] = useState<'estimates' | 'templates'>('estimates');
        
        const filteredEstimates = useMemo(() => estimates.filter(e => e.number.toLowerCase().includes(estimatesSearch.toLowerCase()) || e.clientInfo?.toLowerCase().includes(estimatesSearch.toLowerCase())), [estimates, estimatesSearch]);
        const filteredTemplates = useMemo(() => templates.map((t, i) => ({ ...t, index: i })).filter(t => t.items.some(item => item.name.toLowerCase().includes(estimatesSearch.toLowerCase()))), [templates, estimatesSearch]);

        return (
            <div className="modal-overlay" onClick={() => { setIsEstimatesListOpen(false); setEstimatesSearch(''); }}>
                <div className="modal-content card" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Мои документы</h2>
                        <button onClick={() => { setIsEstimatesListOpen(false); setEstimatesSearch(''); }} className="close-btn" aria-label="Закрыть">×</button>
                    </div>
                    <div className="modal-tabs">
                        <button className={activeTab === 'estimates' ? 'active' : ''} onClick={() => setActiveTab('estimates')}>Сметы ({estimates.length})</button>
                        <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>Шаблоны ({templates.length})</button>
                    </div>
                    <div className="modal-body estimates-modal-list">
                        <input type="search" placeholder="Поиск..." value={estimatesSearch} onChange={e => setEstimatesSearch(e.target.value)} onFocus={handleInputFocus} className="modal-search-input" />
                        {activeTab === 'estimates' && ( <>
                            {filteredEstimates.length === 0 ? <p className="no-results-message">{estimates.length > 0 ? 'Ничего не найдено.' : 'Сохраненных смет нет.'}</p> :
                                filteredEstimates.map(e => ( <div key={e.id} className={`list-item ${e.id === activeEstimateId ? 'active' : ''}`}>
                                    <div className="list-item-info"><strong>{e.number} - {e.clientInfo || `Без названия`}</strong><div><span className="estimate-date">{new Date(e.date).toLocaleDateString('ru-RU')}</span><span className="status-badge" style={{ backgroundColor: statusMap[e.status].color }}>{statusMap[e.status].text}</span></div></div>
                                    <div className="list-item-actions"><select value={e.status} onChange={(ev) => handleStatusChange(e.id, ev.target.value as EstimateStatus)} onClick={ev => ev.stopPropagation()} className="status-select">{Object.entries(statusMap).map(([k, v]) => (<option key={k} value={k}>{v.text}</option>))}</select><button onClick={() => handleSaveAsTemplate(e.id)} className="btn btn-secondary" title="Сохранить как шаблон">📋</button><button onClick={() => handleLoadEstimate(e.id)} className="btn btn-secondary">Загрузить</button><button onClick={() => handleDeleteEstimate(e.id)} className="btn btn-tertiary">Удалить</button></div>
                                </div>))
                            }
                        </>)}
                        {activeTab === 'templates' && ( <>
                             {filteredTemplates.length === 0 ? <p className="no-results-message">{templates.length > 0 ? 'Ничего не найдено.' : 'Шаблонов нет.'}</p> :
                                filteredTemplates.map(t => ( <div key={t.lastModified} className="list-item">
                                    <div className="list-item-info"><strong>Шаблон от {new Date(t.lastModified).toLocaleDateString('ru-RU')}</strong><span>{t.items.length} поз., Итого: {formatCurrency(t.items.reduce((acc, i) => acc + i.price * i.quantity, 0))}</span></div>
                                    <div className="list-item-actions"><button onClick={() => { handleNewEstimate(t); setIsEstimatesListOpen(false); }} className="btn btn-primary">Использовать</button><button onClick={() => handleDeleteTemplate(t.lastModified)} className="btn btn-tertiary">Удалить</button></div>
                                </div>))
                            }
                        </>)}
                    </div>
                    <div className="modal-footer"><button onClick={() => { handleNewEstimate(); setIsEstimatesListOpen(false); }} className="btn btn-primary">Создать новую смету</button></div>
                </div>
            </div>
        );
    };

    const LibraryModal = () => {
        const [formItem, setFormItem] = useState<Partial<LibraryItem>>({ name: '', price: 0, unit: '', category: '' });
        const [filterCategory, setFilterCategory] = useState<string>('all');
    
        const categories = useMemo(() => ['all', ...Array.from(new Set(libraryItems.map(i => i.category).filter(Boolean)))], [libraryItems]);
        
        const groupedItems = useMemo(() => {
            const filtered = libraryItems.filter(item => {
                const searchMatch = !librarySearch.trim() || item.name.toLowerCase().includes(librarySearch.toLowerCase());
                const categoryMatch = filterCategory === 'all' || item.category === filterCategory;
                return searchMatch && categoryMatch;
            });
            return filtered.reduce((acc, item) => {
                const category = item.category || 'Без категории';
                if (!acc[category]) acc[category] = [];
                acc[category].push(item);
                return acc;
            }, {} as Record<string, LibraryItem[]>);
        }, [libraryItems, librarySearch, filterCategory]);

        const handleFormChange = (field: keyof Omit<LibraryItem, 'id'>, value: string | number) => setFormItem(p => ({ ...p, [field]: value }));
        const handleStartEdit = (item: LibraryItem) => setFormItem(item);
        const handleCancelEdit = () => setFormItem({ name: '', price: 0, unit: '', category: '' });
    
        const handleSaveOrUpdate = () => {
            if (!formItem.name?.trim()) {
                window.Telegram?.WebApp.showAlert("Введите наименование.");
                return;
            }
            const updatedLibrary = formItem.id
                ? libraryItems.map(item => item.id === formItem.id ? { ...item, ...formItem } as LibraryItem : item)
                : [...libraryItems, { name: formItem.name, price: formItem.price || 0, unit: formItem.unit || '', category: formItem.category?.trim() || '', id: Date.now() }];
            setLibraryItems(updatedLibrary);
            localStorage.setItem('itemLibrary', JSON.stringify(updatedLibrary));
            handleCancelEdit();
        };
    
        const handleDeleteLibraryItem = (id: number) => {
            window.Telegram?.WebApp.showConfirm('Вы уверены, что хотите удалить эту позицию из справочника?', (ok) => {
                if(ok) {
                    const updatedLibrary = libraryItems.filter(item => item.id !== id);
                    setLibraryItems(updatedLibrary);
                    localStorage.setItem('itemLibrary', JSON.stringify(updatedLibrary));
                }
            });
        };
    
        return (
            <div className="modal-overlay" onClick={() => { setIsLibraryOpen(false); setLibrarySearch(''); }}>
                <div className="modal-content card" onClick={e => e.stopPropagation()}>
                    <div className="modal-header"><h2>Справочник</h2><button onClick={() => setIsLibraryOpen(false)} className="close-btn">×</button></div>
                    <div className="modal-body library-modal-body">
                        <div className="library-add-form-wrapper"><h3>{formItem.id ? 'Редактировать' : 'Добавить'}</h3><div className="library-add-form"><input type="text" placeholder="Наименование" value={formItem.name || ''} onChange={e => handleFormChange('name', e.target.value)} onFocus={handleInputFocus} /><input type="number" placeholder="Цена" value={formItem.price || ''} onChange={e => handleFormChange('price', parseFloat(e.target.value) || 0)} onFocus={handleInputFocus} /><input type="text" placeholder="Ед.изм." value={formItem.unit || ''} onChange={e => handleFormChange('unit', e.target.value)} onFocus={handleInputFocus} /><input type="text" placeholder="Категория (необязательно)" value={formItem.category || ''} onChange={e => handleFormChange('category', e.target.value)} onFocus={handleInputFocus} /></div><div className="library-form-actions"><button onClick={handleSaveOrUpdate} className="btn btn-primary">{formItem.id ? 'Сохранить' : 'Добавить'}</button>{formItem.id && <button onClick={handleCancelEdit} className="btn btn-secondary">Отмена</button>}</div></div><hr/><div className="library-list-wrapper"><h3>Список позиций</h3><div className="library-filters"><input type="search" placeholder="Поиск..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} onFocus={handleInputFocus} className="modal-search-input" /><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">Все категории</option>{categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="library-list">{Object.keys(groupedItems).length === 0 ? <p className="no-results-message">Ничего не найдено.</p> : Object.entries(groupedItems).map(([category, items]) => (<div key={category} className="category-group"><h4>{category}</h4>{items.map(libItem => (<div key={libItem.id} className={`list-item ${formItem.id === libItem.id ? 'editing' : ''}`}><div className="list-item-info"><strong>{libItem.name}</strong><span>{formatCurrency(libItem.price)} / {libItem.unit || 'шт.'}</span></div><div className="list-item-actions"><button onClick={() => handleAddFromLibrary(libItem)} className="btn btn-primary" aria-label="Добавить">+</button><button onClick={() => handleStartEdit(libItem)} className="btn btn-secondary" aria-label="Редактировать">✎</button><button onClick={() => handleDeleteLibraryItem(libItem.id)} className="btn btn-tertiary" aria-label="Удалить">✕</button></div></div>))}</div>))}</div></div></div>
                </div>
            </div>
        );
    };

    const themeIcon = useMemo(() => {
        if (themeMode === 'light') return '☀️';
        if (themeMode === 'dark') return '🌙';
        return '🌓';
    }, [themeMode]);

    return (
        <div className="app-container">
            {isSettingsOpen && <SettingsModal />}
            {isEstimatesListOpen && <EstimatesListModal />}
            {isLibraryOpen && <LibraryModal />}

            <header><h1>{clientInfo || 'Новая смета'}</h1><div className="header-actions"><button onClick={handleThemeChange} className="header-btn" aria-label={`Сменить тему: ${themeMode}`} title={`Текущая тема: ${themeMode}`}>{themeIcon}</button><button onClick={() => setIsLibraryOpen(true)} className="header-btn" aria-label="Справочник">📚</button><button onClick={() => setIsEstimatesListOpen(true)} className="header-btn" aria-label="Мои сметы">📂</button><button onClick={() => setIsSettingsOpen(true)} className="header-btn" aria-label="Настройки">⚙️</button></div></header>
            <main>
                <div className="card"><input type="text" value={clientInfo} onChange={(e) => { setClientInfo(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} className="client-info-input" placeholder="Имя клиента или адрес объекта" aria-label="Имя клиента или адрес объекта"/></div>
                <div className="card estimate-meta"><div className="meta-field"><label htmlFor="estimateNumber">Номер сметы</label><input id="estimateNumber" type="text" value={estimateNumber} onChange={e => { setEstimateNumber(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div><div className="meta-field"><label htmlFor="estimateDate">Дата</label><input id="estimateDate" type="date" value={estimateDate} onChange={e => { setEstimateDate(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div></div>
                <div className="items-list">
                    {items.map((item, index) => (
                        <div className="item-card" key={item.id} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()}>
                            <div className="item-header">
                                <div className="drag-handle" aria-label="Переместить">⠿</div>
                                <span className="item-number">Позиция #{index + 1}</span>
                                <div className="item-header-actions">
                                    <button onClick={() => fileInputRefs.current[item.id]?.click()} className="attach-btn" aria-label="Прикрепить фото">📎</button>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        ref={el => { fileInputRefs.current[item.id] = el; }}
                                        onChange={(e) => handleItemImageChange(item.id, e)}
                                    />
                                    <button onClick={() => handleRemoveItem(item.id)} className="remove-btn" aria-label="Удалить позицию">×</button>
                                </div>
                            </div>
                            <div className="item-inputs"><input type="text" placeholder="Наименование" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} onFocus={handleInputFocus} aria-label="Наименование" /><input type="number" placeholder="Кол-во" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Количество" min="0"/><input type="text" placeholder="Ед.изм." value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} onFocus={handleInputFocus} aria-label="Единица измерения" /><input type="number" placeholder="Цена" value={item.price || ''} onChange={(e) => handleItemChange(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Цена" min="0"/></div>
                            {item.image && (
                                <div className="image-preview-container">
                                    <img src={item.image} alt="Предпросмотр" className="image-preview" />
                                    <button onClick={() => handleRemoveItemImage(item.id)} className="remove-image-btn" aria-label="Удалить изображение">×</button>
                                </div>
                            )}
                            <div className="item-total">Сумма: {formatCurrency(item.quantity * item.price)}</div>
                        </div>
                    ))}
                </div>
                <div className="add-items-container"><button onClick={handleAddItem} className="btn btn-secondary">+ Добавить позицию</button><button onClick={() => setIsLibraryOpen(true)} className="btn btn-secondary">📚 + Из справочника</button></div>
                <div className="summary-details card"><div className="summary-row"><label htmlFor="discount">Скидка</label><div className="input-group"><input id="discount" type="number" value={discount || ''} onChange={(e) => { setDiscount(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/><div className="toggle-group"><button onClick={() => { setDiscountType('percent'); setIsDirty(true); }} className={discountType === 'percent' ? 'active' : ''}>%</button><button onClick={() => { setDiscountType('fixed'); setIsDirty(true); }} className={discountType === 'fixed' ? 'active' : ''}>РУБ</button></div></div></div><div className="summary-row"><label htmlFor="tax">Налог (%)</label><div className="input-group"><input id="tax" type="number" value={tax || ''} onChange={(e) => { setTax(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/></div></div></div>
                <div className="total-container card"><div className="total-breakdown"><div className="total-row"><span>Подытог</span><span>{formatCurrency(calculation.subtotal)}</span></div>{calculation.discountAmount > 0 && (<div className="total-row"><span>Скидка ({discountType === 'percent' ? `${discount}%` : formatCurrency(discount)})</span><span>-{formatCurrency(calculation.discountAmount)}</span></div>)}{calculation.taxAmount > 0 && (<div className="total-row"><span>Налог ({tax}%)</span><span>+{formatCurrency(calculation.taxAmount)}</span></div>)}<div className="total-row grand-total"><span>Итого:</span><span>{formatCurrency(calculation.grandTotal)}</span></div></div></div>
                <div className="actions-footer">
                    <button onClick={handleSave} className="btn btn-secondary save-btn" disabled={!isDirty}>
                        {isDirty ? 'Сохранить' : 'Сохранено ✓'}
                    </button>
                    <button onClick={handleExportPDF} className="btn btn-secondary" disabled={isPdfLoading}>
                        {isPdfLoading ? 'Создание...' : 'Экспорт в PDF'}
                    </button>
                    <button onClick={() => handleNewEstimate()} className="btn btn-tertiary">Новая смета</button>
                    <button onClick={handleShare} className="btn btn-primary share-btn">Поделиться</button>
                </div>
            </main>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);