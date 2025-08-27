import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { ROBOTO_FONT_BASE64 } from './font';

// Fix: Add TypeScript definitions for the Telegram Web App API to resolve errors on `window.Telegram`.
interface TelegramWebApp {
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

// --- Development Mock for Telegram API ---
// This allows the app to run in a regular browser for development without errors.
if (!window.Telegram || !window.Telegram.WebApp) {
    console.log("Telegram WebApp API not found. Using development mock.");
    window.Telegram = {
        WebApp: {
            version: '7.0',
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

const tg = window.Telegram?.WebApp;

/**
 * Safely shows an alert. Falls back to browser's alert if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Optional callback to be executed after the alert is closed.
 */
const safeShowAlert = (message: string, callback?: () => void) => {
    // Telegram WebApp version 6.1+ is required for showAlert.
    if (tg && tg.version >= '6.1' && typeof tg.showAlert === 'function') {
        tg.showAlert(message, callback);
    } else {
        alert(message);
        if (callback) {
            callback();
        }
    }
};

/**
 * Safely shows a confirmation dialog. Falls back to browser's confirm if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Callback to be executed with the result (true for OK, false for Cancel).
 */
const safeShowConfirm = (message: string, callback: (ok: boolean) => void) => {
    // Telegram WebApp version 6.1+ is required for showConfirm.
    if (tg && tg.version >= '6.1' && typeof tg.showConfirm === 'function') {
        tg.showConfirm(message, callback);
    } else {
        callback(window.confirm(message));
    }
};

// --- ICON COMPONENTS ---
// Fix: Allow Icon component to accept and spread additional HTML attributes (like style) to its root div.
const Icon = ({ children, className = '', ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => <div className={`icon-wrapper ${className}`} {...props}>{children}</div>;
const IconPlus = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></Icon>;
const IconClose = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></Icon>;
const IconEdit = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></Icon>;
const IconTrash = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></Icon>;
const IconDocument = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></Icon>;
const IconFolder = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></Icon>;
const IconSettings = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></Icon>;
const IconBook = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></Icon>;
const IconClipboard = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></Icon>;
const IconCart = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></Icon>;
const IconDownload = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></Icon>;
const IconPaperclip = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></Icon>;
const IconDragHandle = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></Icon>;
const IconProject = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></Icon>;
// Fix: Allow IconChevronRight to accept props and pass them to the underlying Icon component.
const IconChevronRight = (props: React.HTMLAttributes<HTMLDivElement>) => <Icon {...props}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></Icon>;
const IconSparkles = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L9.27 9.27L3 12l6.27 2.73L12 21l2.73-6.27L21 12l-6.27-2.73z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg></Icon>;
const IconSun = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg></Icon>;
const IconMoon = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></Icon>;
const IconContrast = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 18a6 6 0 0 0 0-12v12z"></path></svg></Icon>;
const IconCreditCard = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></Icon>;
const IconCalendar = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></Icon>;
const IconMessageSquare = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></Icon>;
const IconImage = () => <Icon><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></Icon>;

const Loader = () => <div className="loader"></div>;

// --- DATA INTERFACES ---
interface Item {
    id: number;
    name: string;
    quantity: number;
    price: number;
    unit: string;
    image?: string | null;
    type: 'work' | 'material'; // Added for shopping list
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
    projectId: number | null;
}

interface Project {
    id: number;
    name: string;
    client: string;
    address: string;
    status: 'in_progress' | 'completed';
}

interface FinanceEntry {
    id: number;
    projectId: number;
    type: 'expense' | 'payment';
    amount: number;
    description: string;
    date: string;
    receiptImage?: string | null;
}

interface PhotoReport {
    id: number;
    projectId: number;
    image: string;
    caption: string;
    date: string;
}

interface Document {
    id: number;
    projectId: number;
    name: string;
    dataUrl: string; // File content stored as a Base64 data URL
    date: string;
}

interface WorkStage {
    id: number;
    projectId: number;
    name: string;
    startDate: string;
    endDate: string;
}

interface Note {
    id: number;
    projectId: number;
    text: string;
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

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- NUMBER TO WORDS UTILITY ---
const numberToWordsRu = (number: number): string => {
    const toWords = (n: number): string => {
        const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
        const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
        const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
        const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

        if (n === 0) return 'ноль';
        
        let words = [];
        if (n >= 100) {
            words.push(hundreds[Math.floor(n / 100)]);
            n %= 100;
        }
        if (n >= 20) {
            words.push(tens[Math.floor(n / 10)]);
            n %= 10;
        }
        if (n >= 10) {
            words.push(teens[n - 10]);
            n = 0;
        }
        if (n > 0) {
            words.push(units[n]);
        }
        return words.filter(Boolean).join(' ');
    };

    const morph = (value: number, forms: [string, string, string]): string => {
        value = Math.abs(value) % 100;
        const num = value % 10;
        if (value > 10 && value < 20) return forms[2];
        if (num > 1 && num < 5) return forms[1];
        if (num === 1) return forms[0];
        return forms[2];
    };

    const integerPart = Math.trunc(number);
    const fractionalPart = Math.round((number - integerPart) * 100);

    const rubWords = toWords(integerPart).replace(' один', ' одна').replace(' два', ' две');
    const rubleForms: [string, string, string] = ['рубль', 'рубля', 'рублей'];
    const kopekForms: [string, string, string] = ['копейка', 'копейки', 'копеек'];

    let result = `${rubWords} ${morph(integerPart, rubleForms)}`;
    result = result.charAt(0).toUpperCase() + result.slice(1);
    
    if (fractionalPart > 0) {
        const kopWords = toWords(fractionalPart).replace(' один', ' одна').replace(' два', ' две');
        result += ` ${fractionalPart.toString().padStart(2, '0')} ${morph(fractionalPart, kopekForms)}`;
    } else {
        result += ' 00 копеек';
    }

    return result;
};


// --- START OF MODAL COMPONENTS ---
interface SettingsModalProps {
    profile: CompanyProfile;
    onClose: () => void;
    onProfileChange: (field: keyof CompanyProfile, value: string) => void;
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveLogo: () => void;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}
const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, onProfileChange, onLogoChange, onRemoveLogo, onSave, onInputFocus }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Профиль компании</h2>
                <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
            </div>
            <div className="modal-body">
                <label>Название компании</label>
                <input type="text" value={profile.name} onChange={(e) => onProfileChange('name', e.target.value)} onFocus={onInputFocus} placeholder="Ваше ИП или название" />
                <label>Реквизиты / Контакты</label>
                <textarea value={profile.details} onChange={(e) => onProfileChange('details', e.target.value)} onFocus={onInputFocus} placeholder="Телефон, адрес, email..." rows={3} />
                <label>Логотип</label>
                {profile.logo ? (
                    <div className="logo-preview-container">
                        <img src={profile.logo} alt="Предпросмотр логотипа" className="logo-preview" />
                        <button onClick={onRemoveLogo} className="btn btn-tertiary remove-logo-btn">Удалить</button>
                    </div>
                ) : (
                    <input type="file" accept="image/png, image/jpeg" onChange={onLogoChange} />
                )}
            </div>
            <div className="modal-footer">
                <button onClick={onSave} className="btn btn-primary">Сохранить</button>
            </div>
        </div>
    </div>
);

interface EstimatesListModalProps {
    onClose: () => void;
    estimates: Estimate[];
    templates: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>[];
    activeEstimateId: number | null;
    statusMap: typeof statusMap;
    formatCurrency: (value: number) => string;
    onLoadEstimate: (id: number) => void;
    onDeleteEstimate: (id: number) => void;
    onStatusChange: (id: number, newStatus: EstimateStatus) => void;
    onSaveAsTemplate: (id: number) => void;
    onDeleteTemplate: (timestamp: number) => void;
    onNewEstimate: (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
}
const EstimatesListModal: React.FC<EstimatesListModalProps> = ({ onClose, estimates, templates, activeEstimateId, statusMap, formatCurrency, onLoadEstimate, onDeleteEstimate, onStatusChange, onSaveAsTemplate, onDeleteTemplate, onNewEstimate, onInputFocus }) => {
    const [activeTab, setActiveTab] = useState<'estimates' | 'templates'>('estimates');
    const [estimatesSearch, setEstimatesSearch] = useState('');

    const filteredEstimates = useMemo(() => estimates.filter(e => e.number.toLowerCase().includes(estimatesSearch.toLowerCase()) || e.clientInfo?.toLowerCase().includes(estimatesSearch.toLowerCase())), [estimates, estimatesSearch]);
    const filteredTemplates = useMemo(() => templates.map((t, i) => ({ ...t, index: i })).filter(t => t.items.some(item => item.name.toLowerCase().includes(estimatesSearch.toLowerCase()))), [templates, estimatesSearch]);

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setEstimatesSearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Мои документы</h2>
                    <button onClick={() => { onClose(); setEstimatesSearch(''); }} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-tabs">
                    <button className={activeTab === 'estimates' ? 'active' : ''} onClick={() => setActiveTab('estimates')}>Сметы ({estimates.length})</button>
                    <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => setActiveTab('templates')}>Шаблоны ({templates.length})</button>
                </div>
                <div className="modal-body estimates-modal-list">
                    <input type="search" placeholder="Поиск..." value={estimatesSearch} onChange={e => setEstimatesSearch(e.target.value)} onFocus={onInputFocus} className="modal-search-input" />
                    {activeTab === 'estimates' && ( <>
                        {filteredEstimates.length === 0 ? <p className="no-results-message">{estimates.length > 0 ? 'Ничего не найдено.' : 'Сохраненных смет нет.'}</p> :
                            filteredEstimates.map(e => ( <div key={e.id} className={`list-item ${e.id === activeEstimateId ? 'active' : ''}`}>
                                <div className="list-item-info"><strong>{e.number} - {e.clientInfo || `Без названия`}</strong><div><span className="estimate-date">{new Date(e.date).toLocaleDateString('ru-RU')}</span><span className="status-badge" style={{ backgroundColor: statusMap[e.status].color }}>{statusMap[e.status].text}</span></div></div>
                                <div className="list-item-actions"><select value={e.status} onChange={(ev) => onStatusChange(e.id, ev.target.value as EstimateStatus)} onClick={ev => ev.stopPropagation()} className="status-select">{Object.entries(statusMap).map(([k, v]) => (<option key={k} value={k}>{v.text}</option>))}</select><button onClick={() => onSaveAsTemplate(e.id)} className="btn btn-secondary" title="Сохранить как шаблон"><IconClipboard/></button><button onClick={() => onLoadEstimate(e.id)} className="btn btn-secondary">Загрузить</button><button onClick={() => onDeleteEstimate(e.id)} className="btn btn-tertiary"><IconTrash/></button></div>
                            </div>))
                        }
                    </>)}
                    {activeTab === 'templates' && ( <>
                         {filteredTemplates.length === 0 ? <p className="no-results-message">{templates.length > 0 ? 'Ничего не найдено.' : 'Шаблонов нет.'}</p> :
                            filteredTemplates.map(t => ( <div key={t.lastModified} className="list-item">
                                <div className="list-item-info"><strong>Шаблон от {new Date(t.lastModified).toLocaleDateString('ru-RU')}</strong><span>{t.items.length} поз., Итого: {formatCurrency(t.items.reduce((acc, i) => acc + i.price * i.quantity, 0))}</span></div>
                                <div className="list-item-actions"><button onClick={() => { onNewEstimate(t); onClose(); }} className="btn btn-primary">Использовать</button><button onClick={() => onDeleteTemplate(t.lastModified)} className="btn btn-tertiary"><IconTrash/></button></div>
                            </div>))
                        }
                    </>)}
                </div>
                <div className="modal-footer"><button onClick={() => { onNewEstimate(); onClose(); }} className="btn btn-primary">Создать новую смету</button></div>
            </div>
        </div>
    );
};

interface LibraryModalProps {
    onClose: () => void;
    libraryItems: LibraryItem[];
    onLibraryItemsChange: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
    onAddItemToEstimate: (libItem: LibraryItem) => void;
    formatCurrency: (value: number) => string;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
    showConfirm: (message: string, callback: (ok: boolean) => void) => void;
    showAlert: (message: string) => void;
}
const LibraryModal: React.FC<LibraryModalProps> = ({ onClose, libraryItems, onLibraryItemsChange, onAddItemToEstimate, formatCurrency, onInputFocus, showConfirm, showAlert }) => {
    const [formItem, setFormItem] = useState<Partial<LibraryItem>>({ name: '', price: 0, unit: '', category: '' });
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [librarySearch, setLibrarySearch] = useState('');

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
            showAlert("Введите наименование.");
            return;
        }
        const updatedLibrary = formItem.id
            ? libraryItems.map(item => item.id === formItem.id ? { ...item, ...formItem } as LibraryItem : item)
            : [...libraryItems, { name: formItem.name, price: formItem.price || 0, unit: formItem.unit || '', category: formItem.category?.trim() || '', id: Date.now() }];
        onLibraryItemsChange(updatedLibrary);
        localStorage.setItem('itemLibrary', JSON.stringify(updatedLibrary));
        handleCancelEdit();
    };

    const handleDeleteLibraryItem = (id: number) => {
        showConfirm('Вы уверены, что хотите удалить эту позицию из справочника?', (ok) => {
            if(ok) {
                const updatedLibrary = libraryItems.filter(item => item.id !== id);
                onLibraryItemsChange(updatedLibrary);
                localStorage.setItem('itemLibrary', JSON.stringify(updatedLibrary));
            }
        });
    };

    return (
        <div className="modal-overlay" onClick={() => { onClose(); setLibrarySearch(''); }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Справочник</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body library-modal-body">
                    <div className="library-add-form-wrapper"><h3>{formItem.id ? 'Редактировать' : 'Добавить'}</h3><div className="library-add-form"><input type="text" placeholder="Наименование" value={formItem.name || ''} onChange={e => handleFormChange('name', e.target.value)} onFocus={onInputFocus} /><input type="number" placeholder="Цена" value={formItem.price || ''} onChange={e => handleFormChange('price', parseFloat(e.target.value) || 0)} onFocus={onInputFocus} /><input type="text" placeholder="Ед.изм." value={formItem.unit || ''} onChange={e => handleFormChange('unit', e.target.value)} onFocus={onInputFocus} /><input type="text" placeholder="Категория (необязательно)" value={formItem.category || ''} onChange={e => handleFormChange('category', e.target.value)} onFocus={onInputFocus} /></div><div className="library-form-actions"><button onClick={handleSaveOrUpdate} className="btn btn-primary">{formItem.id ? 'Сохранить' : 'Добавить'}</button>{formItem.id && <button onClick={handleCancelEdit} className="btn btn-secondary">Отмена</button>}</div></div><hr/><div className="library-list-wrapper"><h3>Список позиций</h3><div className="library-filters"><input type="search" placeholder="Поиск..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} onFocus={onInputFocus} className="modal-search-input" /><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} onFocus={onInputFocus}><option value="all">Все категории</option>{categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="library-list">{Object.keys(groupedItems).length === 0 ? <p className="no-results-message">Ничего не найдено.</p> : Object.entries(groupedItems).map(([category, items]) => (<div key={category} className="category-group"><h4>{category}</h4>{items.map(libItem => (<div key={libItem.id} className={`list-item ${formItem.id === libItem.id ? 'editing' : ''}`}><div className="list-item-info"><strong>{libItem.name}</strong><span>{formatCurrency(libItem.price)} / {libItem.unit || 'шт.'}</span></div><div className="list-item-actions"><button onClick={() => onAddItemToEstimate(libItem)} className="btn btn-primary" aria-label="Добавить"><IconPlus/></button><button onClick={() => handleStartEdit(libItem)} className="btn btn-secondary" aria-label="Редактировать"><IconEdit/></button><button onClick={() => handleDeleteLibraryItem(libItem.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button></div></div>))}</div>))}</div></div></div>
            </div>
        </div>
    );
};

interface NewProjectModalProps {
    project: Partial<Project> | null;
    onClose: () => void;
    onProjectChange: React.Dispatch<React.SetStateAction<Partial<Project> | null>>;
    onSave: () => void;
    onInputFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}
const NewProjectModal: React.FC<NewProjectModalProps> = ({ project, onClose, onProjectChange, onSave, onInputFocus }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h2>{project?.id ? 'Редактировать проект' : 'Новый проект'}</h2>
                <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
            </div>
            <div className="modal-body">
                <label>Название проекта</label>
                <input type="text" value={project?.name || ''} onChange={(e) => onProjectChange(p => ({...p!, name: e.target.value}))} onFocus={onInputFocus} placeholder="Название или тип работ" />
                <label>Клиент</label>
                <input type="text" value={project?.client || ''} onChange={(e) => onProjectChange(p => ({...p!, client: e.target.value}))} onFocus={onInputFocus} placeholder="Имя клиента" />
                <label>Адрес объекта</label>
                <textarea value={project?.address || ''} onChange={(e) => onProjectChange(p => ({...p!, address: e.target.value}))} onFocus={onInputFocus} placeholder="Адрес" rows={2} />
                {project?.id && <>
                    <label>Статус</label>
                    <select value={project.status} onChange={(e) => onProjectChange(p => ({...p!, status: e.target.value as Project['status']}))}>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершен</option>
                    </select>
                </>}
            </div>
            <div className="modal-footer">
                <button onClick={onSave} className="btn btn-primary">Сохранить</button>
            </div>
        </div>
    </div>
);

interface FinanceEntryModalProps {
    onClose: () => void;
    onSave: (entry: Omit<FinanceEntry, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
    onInputFocus: (e: React.FocusEvent<HTMLElement>) => void;
}
const FinanceEntryModal: React.FC<FinanceEntryModalProps> = ({ onClose, onSave, showAlert, onInputFocus }) => {
    const [type, setType] = useState<'expense' | 'payment'>('expense');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [receiptImage, setReceiptImage] = useState<string | null>(null);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resized = await resizeImage(file, 800);
                setReceiptImage(resized);
            } catch (error) {
                showAlert('Не удалось обработать изображение.');
            }
        }
    };

    const handleSave = () => {
        if (!amount || parseFloat(amount) <= 0) {
            showAlert('Введите корректную сумму.');
            return;
        }
        onSave({
            type,
            amount: parseFloat(amount),
            description,
            date: new Date().toISOString(),
            receiptImage,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Добавить транзакцию</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Тип</label>
                    <select value={type} onChange={e => setType(e.target.value as any)} onFocus={onInputFocus}>
                        <option value="expense">Расход</option>
                        <option value="payment">Оплата от клиента</option>
                    </select>
                    <label>Сумма (РУБ)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" onFocus={onInputFocus} />
                    <label>Описание</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Например, 'Краска' или 'Аванс'" onFocus={onInputFocus} rows={3} />
                    {type === 'expense' && (
                        <>
                            <label>Фото чека (необязательно)</label>
                            {receiptImage ? (
                                <div className="image-preview-container">
                                    <img src={receiptImage} alt="Чек" className="image-preview" />
                                    <button onClick={() => setReceiptImage(null)} className="remove-image-btn"><IconClose/></button>
                                </div>
                            ) : (
                                <input type="file" accept="image/*" onChange={handleImageChange} />
                            )}
                        </>
                    )}
                </div>
                <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary">Сохранить</button></div>
            </div>
        </div>
    );
};

interface PhotoReportModalProps {
    onClose: () => void;
    onSave: (photo: Omit<PhotoReport, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
}
const PhotoReportModal: React.FC<PhotoReportModalProps> = ({ onClose, onSave, showAlert }) => {
    const [image, setImage] = useState<string | null>(null);
    const [caption, setCaption] = useState('');

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const resized = await resizeImage(file, 1200); // Larger size for reports
                setImage(resized);
            } catch (error) {
                showAlert('Не удалось обработать фото.');
            }
        }
    };
    
    const handleSave = () => {
        if (!image) {
            showAlert('Пожалуйста, выберите фото.');
            return;
        }
        onSave({ image, caption, date: new Date().toISOString() });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Добавить фото</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Фотография</label>
                     {image ? (
                        <div className="image-preview-container large-preview">
                            <img src={image} alt="Предпросмотр" className="image-preview" />
                            <button onClick={() => setImage(null)} className="remove-image-btn"><IconClose/></button>
                        </div>
                    ) : (
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} />
                    )}
                    <label>Подпись</label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Например, 'Укладка плитки в ванной'" rows={3} />
                </div>
                <div className="modal-footer"><button onClick={handleSave} className="btn btn-primary" disabled={!image}>Сохранить</button></div>
            </div>
        </div>
    );
};

interface PhotoViewerModalProps {
    photo: PhotoReport;
    onClose: () => void;
    onDelete: (id: number) => void;
}
const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ photo, onClose, onDelete }) => {
    return (
        <div className="modal-overlay photo-viewer-overlay" onClick={onClose}>
            <div className="photo-viewer-content" onClick={e => e.stopPropagation()}>
                <img src={photo.image} alt={photo.caption || 'Фото из отчета'} />
                {photo.caption && <p className="photo-viewer-caption">{photo.caption}</p>}
                <div className="photo-viewer-actions">
                     <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                     <button onClick={() => onDelete(photo.id)} className="delete-photo-btn" aria-label="Удалить"><IconTrash/></button>
                </div>
            </div>
        </div>
    );
};

interface ShoppingListModalProps {
    items: Item[];
    onClose: () => void;
    showAlert: (message: string) => void;
}
const ShoppingListModal: React.FC<ShoppingListModalProps> = ({ items, onClose, showAlert }) => {
    const [copyButtonText, setCopyButtonText] = useState('Копировать список');
    const materials = useMemo(() => items.filter(item => item.type === 'material' && item.name.trim() && item.quantity > 0), [items]);
    const listRef = useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        const textToCopy = materials.map(item => `${item.name} - ${item.quantity} ${item.unit || 'шт.'}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyButtonText('Скопировано ✓');
            setTimeout(() => setCopyButtonText('Копировать список'), 2000);
        }).catch(() => {
            showAlert('Не удалось скопировать.');
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Список покупок</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body" ref={listRef}>
                    {materials.length > 0 ? (
                        <div className="shopping-list">
                            {materials.map(item => (
                                <div key={item.id} className="shopping-list-item">
                                    <span>{item.name}</span>
                                    <span>{item.quantity} {item.unit || 'шт.'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-results-message">Материалы не найдены. Отметьте позиции в смете как "Материал", чтобы они появились здесь.</p>
                    )}
                </div>
                {materials.length > 0 && (
                    <div className="modal-footer">
                        <button onClick={handleCopy} className="btn btn-primary">{copyButtonText}</button>
                    </div>
                )}
            </div>
        </div>
    );
};

interface DocumentUploadModalProps {
    onClose: () => void;
    onSave: (name: string, dataUrl: string) => void;
    showAlert: (message: string) => void;
}
const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onSave, showAlert }) => {
    const [file, setFile] = useState<File | null>(null);
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            try {
                const url = await readFileAsDataURL(selectedFile);
                setDataUrl(url);
            } catch (error) {
                showAlert('Не удалось прочитать файл.');
                setFile(null);
                setDataUrl(null);
            }
        }
    };

    const handleSave = () => {
        if (file && dataUrl) {
            onSave(file.name, dataUrl);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h2>Загрузить документ</h2><button onClick={onClose} className="close-btn"><IconClose/></button></div>
                <div className="modal-body">
                    <label>Выберите файл</label>
                    <input type="file" onChange={handleFileChange} />
                    {file && (
                        <div className="document-preview">
                            <p><strong>Файл:</strong> {file.name}</p>
                            <p><strong>Размер:</strong> {(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary" disabled={!file}>Сохранить</button>
                </div>
            </div>
        </div>
    );
};

interface WorkStageModalProps {
    stage: Partial<WorkStage> | null;
    onClose: () => void;
    onSave: (stage: Omit<WorkStage, 'id' | 'projectId'>) => void;
    showAlert: (message: string) => void;
}
const WorkStageModal: React.FC<WorkStageModalProps> = ({ stage, onClose, onSave, showAlert }) => {
    const [name, setName] = useState(stage?.name || '');
    const [startDate, setStartDate] = useState(stage?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(stage?.endDate || new Date().toISOString().split('T')[0]);

    const handleSave = () => {
        if (!name.trim()) {
            showAlert('Введите название этапа.');
            return;
        }
        if (!startDate || !endDate) {
            showAlert('Укажите даты начала и окончания.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showAlert('Дата начала не может быть позже даты окончания.');
            return;
        }
        onSave({ name: name.trim(), startDate, endDate });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{stage?.id ? 'Редактировать этап' : 'Новый этап работ'}</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label>Название этапа</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, 'Черновые работы'" />
                    <label>Дата начала</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <label>Дата окончания</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};

interface NoteModalProps {
    note: Partial<Note> | null;
    onClose: () => void;
    onSave: (text: string) => void;
    showAlert: (message: string) => void;
}
const NoteModal: React.FC<NoteModalProps> = ({ note, onClose, onSave, showAlert }) => {
    const [text, setText] = useState(note?.text || '');
    
    const handleSave = () => {
        if (!text.trim()) {
            showAlert('Текст заметки не может быть пустым.');
            return;
        }
        onSave(text.trim());
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{note?.id ? 'Редактировать заметку' : 'Новая заметка'}</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        placeholder="Введите текст заметки..."
                        className="note-textarea"
                        rows={8}
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="btn btn-primary">Сохранить</button>
                </div>
            </div>
        </div>
    );
};

interface ActGenerationModalProps {
    onClose: () => void;
    project: Project;
    profile: CompanyProfile;
    totalAmount: number;
    showAlert: (message: string) => void;
}
const ActGenerationModal: React.FC<ActGenerationModalProps> = ({ onClose, project, profile, totalAmount, showAlert }) => {
    const [copyButtonText, setCopyButtonText] = useState('Копировать');
    
    const actText = useMemo(() => {
        const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const totalInWords = numberToWordsRu(totalAmount);
        const formattedTotal = new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(totalAmount);

        return `АКТ ВЫПОЛНЕННЫХ РАБОТ

г. __________                                      "${today.split('.')[0]}" ${new Date().toLocaleString('ru-RU', { month: 'long' })} ${new Date().getFullYear()} г.

Исполнитель: ${profile.name || '____________________'}
${profile.details ? `Реквизиты: ${profile.details}` : ''}

Заказчик: ${project.client || '____________________'}
Объект: ${project.address || '____________________'}

1. Исполнитель выполнил, а Заказчик принял работы по объекту, расположенному по адресу: ${project.address}.
2. Качество работ соответствует требованиям. Заказчик претензий по объему, качеству и срокам выполнения работ не имеет.
3. Общая стоимость выполненных работ составляет ${formattedTotal} руб. (${totalInWords}).
4. Настоящий акт составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из сторон.

ПОДПИСИ СТОРОН:

Исполнитель: ________________ / ${profile.name || ''} /

Заказчик: ________________ / ${project.client || ''} /
`;
    }, [project, profile, totalAmount]);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(actText).then(() => {
            setCopyButtonText('Скопировано ✓');
            setTimeout(() => setCopyButtonText('Копировать'), 2000);
        }).catch(() => {
            showAlert('Не удалось скопировать.');
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Акт выполненных работ</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <textarea 
                        className="act-textarea"
                        value={actText} 
                        readOnly 
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={handleCopy} className="btn btn-primary">{copyButtonText}</button>
                </div>
            </div>
        </div>
    );
};

interface AISuggestModalProps {
    onClose: () => void;
    onAddItems: (items: Omit<Item, 'id' | 'image' | 'type'>[]) => void;
    showAlert: (message: string) => void;
}

const AISuggestModal: React.FC<AISuggestModalProps> = ({ onClose, onAddItems, showAlert }) => {
    const [prompt, setPrompt] = useState('');
    const [suggestions, setSuggestions] = useState<Omit<Item, 'id' | 'image' | 'type'>[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const API_KEY = "AIzaSyBiG8q4q8_0wjXsTWILzByFdrY2pMJ0vek";
    
    const ai = useMemo(() => {
        if (API_KEY) {
            return new GoogleGenAI({ apiKey: API_KEY });
        }
        return null;
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showAlert('Введите описание работ.');
            return;
        }
        if (!ai) {
             showAlert('API-ключ для Gemini не настроен. Эта функция недоступна.');
             return;
        }

        setIsGenerating(true);
        setError(null);
        setSuggestions([]);
        setSelectedIndices(new Set());

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Ты - опытный прораб, составляющий смету на ремонтные работы в России. Проанализируй запрос клиента и верни список работ и материалов в формате JSON. Укажи реалистичные для РФ единицы измерения (м2, шт, м.п.) и примерные средние цены в рублях. Не добавляй никаких пояснений, только JSON. Запрос: "${prompt}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: 'Название работы или материала' },
                                quantity: { type: Type.NUMBER, description: 'Количество' },
                                unit: { type: Type.STRING, description: 'Единица измерения (например, м2, шт, м.п.)' },
                                price: { type: Type.NUMBER, description: 'Цена за единицу в рублях' },
                            },
                        },
                    },
                },
            });

            const parsedSuggestions = JSON.parse(response.text);
            setSuggestions(parsedSuggestions);
            setSelectedIndices(new Set(parsedSuggestions.map((_: any, index: number) => index)));
        } catch (e) {
            console.error(e);
            setError('Не удалось получить ответ от AI. Попробуйте изменить запрос или повторите попытку позже.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleToggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };
    
    const handleAddSelected = () => {
        const itemsToAdd = suggestions.filter((_, index) => selectedIndices.has(index));
        onAddItems(itemsToAdd);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>AI-помощник</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Закрыть"><IconClose/></button>
                </div>
                <div className="modal-body">
                    <label>Опишите работы в свободной форме</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Например: Поклеить обои в комнате 15 м2, положить ламинат и установить 2 розетки"
                        rows={4}
                        disabled={isGenerating}
                    />
                    <button onClick={handleGenerate} className="btn btn-primary" disabled={isGenerating}>
                        {isGenerating ? 'Генерация...' : 'Сгенерировать'}
                    </button>
                    {isGenerating && <div className="ai-modal-status"><Loader/></div>}
                    {error && <p className="ai-modal-status error-message">{error}</p>}
                    {suggestions.length > 0 && (
                        <div className="ai-suggestions-list">
                            <h4>Предложенные позиции:</h4>
                            {suggestions.map((item, index) => (
                                <div key={index} className="ai-suggestion-item">
                                    <input 
                                        type="checkbox" 
                                        id={`suggestion-${index}`}
                                        checked={selectedIndices.has(index)}
                                        onChange={() => handleToggleSelection(index)}
                                    />
                                    <label htmlFor={`suggestion-${index}`} className="suggestion-details">
                                        <strong>{item.name}</strong>
                                        <span>{item.quantity} {item.unit} × {item.price} ₽</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {suggestions.length > 0 && (
                    <div className="modal-footer">
                         <button onClick={handleAddSelected} className="btn btn-primary">
                            Добавить выбранное ({selectedIndices.size})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- END OF MODAL COMPONENTS ---

// --- START OF VIEW COMPONENTS ---

const EstimateView: React.FC<any> = ({
    currentEstimateProjectId, handleBackToProject, clientInfo, setClientInfo, setIsDirty, 
    handleThemeChange, themeIcon, themeMode, setIsLibraryOpen, setIsEstimatesListOpen, setIsSettingsOpen, setIsAISuggestModalOpen,
    estimateNumber, setEstimateNumber, estimateDate, setEstimateDate, handleInputFocus, items, 
    dragItem, dragOverItem, handleDragSort, fileInputRefs, handleItemImageChange, 
    handleRemoveItemImage, handleRemoveItem, handleItemChange, formatCurrency, handleAddItem, 
    discount, setDiscount, discountType, setDiscountType, tax, setTax, calculation, 
    handleSave, isDirty, isPdfLoading, handleExportPDF, setIsShoppingListOpen, handleShare 
}) => (
    <>
        <header className="estimate-header">
            {currentEstimateProjectId && <button onClick={handleBackToProject} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>}
            <h1 className={currentEstimateProjectId ? 'with-back-btn' : ''}>{clientInfo || 'Новая смета'}</h1>
            <div className="header-actions">
                <button onClick={handleThemeChange} className="header-btn" aria-label={`Сменить тему: ${themeMode}`} title={`Текущая тема: ${themeMode}`}>{themeIcon()}</button>
                <button onClick={() => setIsLibraryOpen(true)} className="header-btn" aria-label="Справочник"><IconBook/></button>
                <button onClick={() => setIsEstimatesListOpen(true)} className="header-btn" aria-label="Мои сметы"><IconFolder/></button>
                <button onClick={() => setIsSettingsOpen(true)} className="header-btn" aria-label="Настройки"><IconSettings/></button>
            </div>
        </header>
        <main>
            <div className="card"><input type="text" value={clientInfo} onChange={(e) => { setClientInfo(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} className="client-info-input" placeholder="Имя клиента или адрес объекта" aria-label="Имя клиента или адрес объекта"/></div>
            <div className="card estimate-meta"><div className="meta-field"><label htmlFor="estimateNumber">Номер сметы</label><input id="estimateNumber" type="text" value={estimateNumber} onChange={e => { setEstimateNumber(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div><div className="meta-field"><label htmlFor="estimateDate">Дата</label><input id="estimateDate" type="date" value={estimateDate} onChange={e => { setEstimateDate(e.target.value); setIsDirty(true); }} onFocus={handleInputFocus} /></div></div>
            <div className="items-list">
                {items.map((item: Item, index: number) => (
                    <div className="item-card" key={item.id} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()}>
                        <div className="item-header">
                            <div className="drag-handle" aria-label="Переместить"><IconDragHandle/></div>
                            <span className="item-number">Позиция #{index + 1}</span>
                            <div className="item-header-actions">
                                <button onClick={() => fileInputRefs.current[item.id]?.click()} className="attach-btn" aria-label="Прикрепить фото"><IconPaperclip/></button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={el => { fileInputRefs.current[item.id] = el; }}
                                    onChange={(e) => handleItemImageChange(item.id, e)}
                                />
                                <button onClick={() => handleRemoveItem(item.id)} className="remove-btn" aria-label="Удалить позицию"><IconClose/></button>
                            </div>
                        </div>
                        <div className="item-inputs"><input type="text" placeholder="Наименование" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} onFocus={handleInputFocus} aria-label="Наименование" /><input type="number" placeholder="Кол-во" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Количество" min="0"/><input type="text" placeholder="Ед.изм." value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} onFocus={handleInputFocus} aria-label="Единица измерения" /><input type="number" placeholder="Цена" value={item.price || ''} onChange={(e) => handleItemChange(item.id, 'price', Math.max(0, parseFloat(e.target.value) || 0))} onFocus={handleInputFocus} aria-label="Цена" min="0"/></div>
                        {item.image && (
                            <div className="image-preview-container">
                                <img src={item.image} alt="Предпросмотр" className="image-preview" />
                                <button onClick={() => handleRemoveItemImage(item.id)} className="remove-image-btn" aria-label="Удалить изображение"><IconClose/></button>
                            </div>
                        )}
                        <div className="item-footer">
                            <div className="item-type-toggle">
                                <button onClick={() => handleItemChange(item.id, 'type', 'work')} className={item.type === 'work' ? 'active' : ''}>Работа</button>
                                <button onClick={() => handleItemChange(item.id, 'type', 'material')} className={item.type === 'material' ? 'active' : ''}>Материал</button>
                            </div>
                            <div className="item-total">Сумма: {formatCurrency(item.quantity * item.price)}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="add-items-container">
                <button onClick={handleAddItem} className="btn btn-secondary"><IconPlus/> Добавить позицию</button>
                <button onClick={() => setIsLibraryOpen(true)} className="btn btn-secondary"><IconBook/> Из справочника</button>
            </div>
            <div className="add-items-container">
                 <button onClick={() => setIsAISuggestModalOpen(true)} className="btn btn-secondary btn-ai"><IconSparkles/> AI-помощник</button>
            </div>
            <div className="summary-details card"><div className="summary-row"><label htmlFor="discount">Скидка</label><div className="input-group"><input id="discount" type="number" value={discount || ''} onChange={(e) => { setDiscount(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/><div className="toggle-group"><button onClick={() => { setDiscountType('percent'); setIsDirty(true); }} className={discountType === 'percent' ? 'active' : ''}>%</button><button onClick={() => { setDiscountType('fixed'); setIsDirty(true); }} className={discountType === 'fixed' ? 'active' : ''}>РУБ</button></div></div></div><div className="summary-row"><label htmlFor="tax">Налог (%)</label><div className="input-group"><input id="tax" type="number" value={tax || ''} onChange={(e) => { setTax(Math.max(0, parseFloat(e.target.value) || 0)); setIsDirty(true); }} onFocus={handleInputFocus} placeholder="0" min="0"/></div></div></div>
            <div className="total-container card"><div className="total-breakdown"><div className="total-row"><span>Подытог</span><span>{formatCurrency(calculation.subtotal)}</span></div>{calculation.discountAmount > 0 && (<div className="total-row"><span>Скидка ({discountType === 'percent' ? `${discount}%` : formatCurrency(discount)})</span><span>-{formatCurrency(calculation.discountAmount)}</span></div>)}{calculation.taxAmount > 0 && (<div className="total-row"><span>Налог ({tax}%)</span><span>+{formatCurrency(calculation.taxAmount)}</span></div>)}<div className="total-row grand-total"><span>Итого:</span><span>{formatCurrency(calculation.grandTotal)}</span></div></div></div>
            <div className="actions-footer">
                <button onClick={handleSave} className="btn btn-secondary save-btn" disabled={!isDirty}>
                    {isDirty ? 'Сохранить' : 'Сохранено ✓'}
                </button>
                <button onClick={handleExportPDF} className="btn btn-secondary" disabled={isPdfLoading}>
                    {isPdfLoading ? 'Создание...' : 'Экспорт в PDF'}
                </button>
                <button onClick={() => setIsShoppingListOpen(true)} className="btn btn-secondary shopping-list-btn"><IconCart/> Список покупок</button>
                <button onClick={handleShare} className="btn btn-primary share-btn">Поделиться</button>
            </div>
        </main>
    </>
);

const ProjectsListView: React.FC<any> = ({
    handleOpenProjectModal, projectStatusFilter, setProjectStatusFilter, projectSearch, setProjectSearch,
    handleInputFocus, filteredProjects, projects, setActiveProjectId, setActiveView
}) => (
    <>
        <header className="projects-list-header">
            <h1>Проекты</h1>
            <div className="header-actions">
                <button onClick={() => handleOpenProjectModal()} className="header-btn" aria-label="Новый проект"><IconPlus/></button>
            </div>
        </header>
        <main>
            <div className="project-filters">
                <div className="toggle-switch">
                    <button onClick={() => setProjectStatusFilter('in_progress')} className={projectStatusFilter === 'in_progress' ? 'active' : ''}>В работе</button>
                    <button onClick={() => setProjectStatusFilter('completed')} className={projectStatusFilter === 'completed' ? 'active' : ''}>Завершены</button>
                </div>
                <input type="search" placeholder="Поиск по проектам..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} onFocus={handleInputFocus} />
            </div>
            <div className="projects-list">
                {filteredProjects.length > 0 ? filteredProjects.map((project: Project) => (
                    <div key={project.id} className="card project-card" onClick={() => { setActiveProjectId(project.id); setActiveView('projectDetail'); }}>
                        <strong>{project.name}</strong>
                        <small>{project.client}</small>
                        <small>{project.address}</small>
                    </div>
                )) : <p className="no-results-message">{projects.length > 0 ? 'Ничего не найдено.' : 'Проектов нет. Нажмите "+", чтобы создать.'}</p>}
            </div>
        </main>
    </>
);

const ProjectDetailView: React.FC<{
    activeProject: Project;
    estimates: Estimate[];
    financeEntries: FinanceEntry[];
    photoReports: PhotoReport[];
    documents: Document[];
    workStages: WorkStage[];
    notes: Note[];
    formatCurrency: (value: number) => string;
    statusMap: typeof statusMap;
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
}> = ({
    activeProject, estimates, financeEntries, photoReports, documents, workStages, notes, formatCurrency, statusMap, setActiveView, setActiveProjectId,
    handleOpenProjectModal, handleDeleteProject, handleLoadEstimate, handleAddNewEstimateForProject,
    onOpenFinanceModal, onDeleteFinanceEntry, onOpenPhotoReportModal, onViewPhoto, onOpenDocumentModal, onDeleteDocument,
    onOpenWorkStageModal, onDeleteWorkStage, onOpenNoteModal, onDeleteNote, onOpenActModal
}) => {
    // Hooks are now at the top level of this component, which is correct.
    const projectEstimates = useMemo(() => estimates.filter(e => e.projectId === activeProject.id), [estimates, activeProject.id]);
    const projectFinances = useMemo(() => financeEntries.filter(f => f.projectId === activeProject.id), [financeEntries, activeProject.id]);
    const projectPhotos = useMemo(() => photoReports.filter(p => p.projectId === activeProject.id), [photoReports, activeProject.id]);
    const projectDocuments = useMemo(() => documents.filter(d => d.projectId === activeProject.id), [documents, activeProject.id]);
    const projectWorkStages = useMemo(() => workStages.filter(ws => ws.projectId === activeProject.id), [workStages, activeProject.id]);
    const projectNotes = useMemo(() => notes.filter(n => n.projectId === activeProject.id), [notes, activeProject.id]);
    
    const calculateEstimateTotal = useCallback((estimate: Estimate) => {
        const subtotal = estimate.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
        const discountAmount = estimate.discountType === 'percent' ? subtotal * (Number(estimate.discount) / 100) : Number(estimate.discount);
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * (Number(estimate.tax) / 100);
        return totalAfterDiscount + taxAmount;
    }, []);

    const { estimateTotal, totalExpenses, totalPayments, profit } = useMemo(() => {
        const estimateTotal = projectEstimates.reduce((sum, est) => sum + calculateEstimateTotal(est), 0);
        const totalExpenses = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
        const totalPayments = projectFinances.filter(f => f.type === 'payment').reduce((sum, f) => sum + f.amount, 0);
        const profit = estimateTotal - totalExpenses;
        return { estimateTotal, totalExpenses, totalPayments, profit };
    }, [projectEstimates, projectFinances, calculateEstimateTotal]);


    return (
        <>
            <header className="project-detail-header">
                <button onClick={() => {setActiveView('projects'); setActiveProjectId(null);}} className="back-btn"><IconChevronRight style={{transform: 'rotate(180deg)'}} /></button>
                <h1>{activeProject.name}</h1>
                <div className="header-actions">
                    <button onClick={() => handleOpenProjectModal(activeProject)} className="header-btn" aria-label="Редактировать"><IconEdit/></button>
                    <button onClick={() => handleDeleteProject(activeProject.id)} className="header-btn" aria-label="Удалить"><IconTrash/></button>
                    {activeProject.status === 'completed' && <button onClick={() => onOpenActModal(estimateTotal)} className="header-btn" aria-label="Сгенерировать акт"><IconDocument/></button>}
                </div>
            </header>
            <main className="project-detail-main">
                <div className="card project-section">
                    <div className="project-section-header"><h3>Финансовый дашборд</h3></div>
                    <div className="project-section-body">
                         <div className="dashboard-grid">
                            <div className="dashboard-item">
                                <span className="dashboard-value">{formatCurrency(estimateTotal)}</span>
                                <span className="dashboard-label">Сумма смет</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-value expense-value">{formatCurrency(totalExpenses)}</span>
                                <span className="dashboard-label">Расходы</span>
                            </div>
                            <div className="dashboard-item">
                                <span className="dashboard-value payment-value">{formatCurrency(totalPayments)}</span>
                                <span className="dashboard-label">Оплачено</span>
                            </div>
                                <div className="dashboard-item">
                                <span className="dashboard-value profit-value">{formatCurrency(profit)}</span>
                                <span className="dashboard-label">Прибыль</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                     <div className="project-section-header">
                        <h3>Сметы ({projectEstimates.length})</h3>
                        <button className="add-in-header-btn" onClick={handleAddNewEstimateForProject}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        <div className="project-items-list">
                            {projectEstimates.length > 0 ? projectEstimates.map(est => (
                                <div key={est.id} className="list-item" onClick={() => handleLoadEstimate(est.id)}>
                                    <IconDocument />
                                    <div className="list-item-info">
                                        <strong>{est.number} - {est.clientInfo || 'Без названия'}</strong>
                                        <span>{formatCurrency(calculateEstimateTotal(est))} <span className="status-badge" style={{ backgroundColor: statusMap[est.status].color }}>{statusMap[est.status].text}</span></span>
                                    </div>
                                    <span className="list-item-arrow"><IconChevronRight/></span>
                                </div>
                            )) : <p className="no-results-message">Смет для этого проекта нет.</p>}
                        </div>
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Финансы ({projectFinances.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => { e.preventDefault(); onOpenFinanceModal(); }}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectFinances.length > 0 ? (
                            <div className="project-items-list">
                                {projectFinances.map(f => (
                                    <div key={f.id} className="list-item finance-item">
                                        {f.receiptImage ? <img src={f.receiptImage} alt="чек" className="finance-receipt-thumb"/> : <IconCreditCard />}
                                        <div className="list-item-info">
                                            <strong>{f.description || (f.type === 'expense' ? 'Расход' : 'Оплата')}</strong>
                                            <span className={f.type === 'expense' ? 'expense-value' : 'payment-value'}>{formatCurrency(f.amount)}</span>
                                        </div>
                                        <button onClick={() => onDeleteFinanceEntry(f.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Транзакций пока нет.</p>}
                    </div>
                </div>
                 <div className="card project-section">
                    <div className="project-section-header">
                        <h3>График работ ({projectWorkStages.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenWorkStageModal(null);}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectWorkStages.length > 0 ? (
                            <div className="project-items-list">
                                {projectWorkStages.map(stage => (
                                    <div key={stage.id} className="list-item">
                                        <IconCalendar />
                                        <div className="list-item-info" onClick={() => onOpenWorkStageModal(stage)}>
                                            <strong>{stage.name}</strong>
                                            <span>{new Date(stage.startDate).toLocaleDateString('ru-RU')} - {new Date(stage.endDate).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <button onClick={() => onDeleteWorkStage(stage.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Этапы работ не добавлены.</p>}
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Фотоотчеты ({projectPhotos.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenPhotoReportModal();}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectPhotos.length > 0 ? (
                            <div className="photo-grid">
                                {projectPhotos.map(p => (
                                    <div key={p.id} className="photo-thumbnail" onClick={() => onViewPhoto(p)}>
                                        <img src={p.image} alt={p.caption || 'фото'}/>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Фотографий пока нет.</p>}
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Документы ({projectDocuments.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenDocumentModal();}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectDocuments.length > 0 ? (
                             <div className="project-items-list">
                                {projectDocuments.map(doc => (
                                    <div key={doc.id} className="list-item document-item">
                                        <IconPaperclip />
                                        <div className="list-item-info">
                                            <strong>{doc.name}</strong>
                                            <span>{new Date(doc.date).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <a href={doc.dataUrl} download={doc.name} className="btn btn-secondary" aria-label="Скачать"><IconDownload/></a>
                                            <button onClick={() => onDeleteDocument(doc.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Документов пока нет.</p>}
                    </div>
                </div>
                <div className="card project-section">
                    <div className="project-section-header">
                        <h3>Заметки ({projectNotes.length})</h3>
                        <button className="add-in-header-btn" onClick={(e) => {e.preventDefault(); onOpenNoteModal(null);}}><IconPlus/></button>
                    </div>
                    <div className="project-section-body">
                        {projectNotes.length > 0 ? (
                            <div className="project-items-list">
                                {projectNotes.map(note => (
                                    <div key={note.id} className="list-item note-item">
                                        <IconMessageSquare />
                                        <div className="list-item-info" onClick={() => onOpenNoteModal(note)}>
                                            <p className="note-content">{note.text}</p>
                                            <span className="note-date">Изменено: {new Date(note.lastModified).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="list-item-actions">
                                            <button onClick={() => onDeleteNote(note.id)} className="btn btn-tertiary" aria-label="Удалить"><IconTrash/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="no-results-message">Заметок пока нет.</p>}
                    </div>
                </div>
            </main>
        </>
    );
};

// --- END OF VIEW COMPONENTS ---

const App: React.FC = () => {
    // --- App Navigation State ---
    const [activeView, setActiveView] = useState<'estimate' | 'projects' | 'projectDetail'>('projects');

    // --- Data State ---
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [templates, setTemplates] = useState<Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);
    const [photoReports, setPhotoReports] = useState<PhotoReport[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [workStages, setWorkStages] = useState<WorkStage[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({ name: '', details: '', logo: null });
    
    // --- Current Estimate State ---
    const [activeEstimateId, setActiveEstimateId] = useState<number | null>(null);
    const [currentEstimateProjectId, setCurrentEstimateProjectId] = useState<number | null>(null);
    const [items, setItems] = useState<Item[]>([{ id: Date.now(), name: '', quantity: 1, price: 0, unit: '', type: 'material' }]);
    const [clientInfo, setClientInfo] = useState('');
    const [estimateNumber, setEstimateNumber] = useState('');
    const [estimateDate, setEstimateDate] = useState('');
    const [status, setStatus] = useState<EstimateStatus>('draft');
    const [discount, setDiscount] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [tax, setTax] = useState(0);

    // --- Project View State ---
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [projectStatusFilter, setProjectStatusFilter] = useState<'in_progress' | 'completed'>('in_progress');
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
    const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
    const [isWorkStageModalOpen, setIsWorkStageModalOpen] = useState(false);
    const [editingWorkStage, setEditingWorkStage] = useState<Partial<WorkStage> | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
    const [viewingPhoto, setViewingPhoto] = useState<PhotoReport | null>(null);
    const [isActModalOpen, setIsActModalOpen] = useState(false);
    const [isAISuggestModalOpen, setIsAISuggestModalOpen] = useState(false);
    const [actModalTotal, setActModalTotal] = useState(0);
    const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
    const [isDirty, setIsDirty] = useState(false);
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
    
    useEffect(() => {
        if (isDirty) {
            window.Telegram?.WebApp.enableClosingConfirmation();
        } else {
            window.Telegram?.WebApp.disableClosingConfirmation();
        }
    }, [isDirty]);

    const populateForm = (estimate: Estimate | Partial<Estimate> | null, currentEstimates: Estimate[], projectIdForNew: number | null = null) => {
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
                setCurrentEstimateProjectId(estimate.projectId || null);
            } else {
                 setActiveEstimateId(null);
                 setCurrentEstimateProjectId(projectIdForNew);
            }
        } else {
            // New estimate state
            setItems([{ id: Date.now(), name: '', quantity: 1, price: 0, unit: '', image: null, type: 'material' }]);
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
                    let updated = { ...e };
                    if (typeof e.status === 'undefined') {
                        needsResave = true;
                        updated = {
                            ...updated,
                            number: e.number || generateNewEstimateNumber([]),
                            date: e.date || new Date(e.lastModified).toISOString().split('T')[0],
                            status: 'draft',
                        };
                    }
                    if (typeof e.projectId === 'undefined') {
                        needsResave = true;
                        updated.projectId = null;
                    }
                    // Data migration for item type
                    if (e.items && e.items.some((i: any) => typeof i.type === 'undefined')) {
                        needsResave = true;
                        updated.items = e.items.map((i: any) => ({ ...i, type: i.type || 'material' }));
                    }

                    return updated;
                });
                
                if (needsResave) localStorage.setItem('estimatesData', JSON.stringify({ estimates: savedEstimates, activeEstimateId: savedActiveId }));
                
                initialEstimates = savedEstimates;
                activeEstimate = savedEstimates.find(e => e.id === savedActiveId) || savedEstimates[0] || null;

            } catch (error) { console.error("Failed to parse saved estimates:", error); }
        }
        
        setEstimates(initialEstimates);
        // On first load, if no project is associated with the active estimate, don't populate. Let user start from projects view.
        if (activeEstimate && activeEstimate.projectId) {
            populateForm(activeEstimate, initialEstimates);
        } else {
             populateForm(null, initialEstimates);
        }
        
        const savedProfile = localStorage.getItem('companyProfile');
        if (savedProfile) { try { setCompanyProfile(JSON.parse(savedProfile)); } catch (e) { console.error("Failed to parse profile", e); }}
        
        const savedLibrary = localStorage.getItem('itemLibrary');
        if (savedLibrary) { try { setLibraryItems(JSON.parse(savedLibrary)); } catch (e) { console.error("Failed to parse library", e); }}

        const savedTemplates = localStorage.getItem('estimateTemplates');
        if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { console.error("Failed to parse templates", e); }}
        
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) { try { setProjects(JSON.parse(savedProjects)); } catch (e) { console.error("Failed to parse projects", e); } }
        
        const savedFinances = localStorage.getItem('financeEntries');
        if (savedFinances) { try { setFinanceEntries(JSON.parse(savedFinances)); } catch (e) { console.error("Failed to parse finances", e); } }

        const savedPhotos = localStorage.getItem('photoReports');
        if (savedPhotos) { try { setPhotoReports(JSON.parse(savedPhotos)); } catch (e) { console.error("Failed to parse photos", e); } }

        const savedDocuments = localStorage.getItem('projectDocuments');
        if (savedDocuments) { try { setDocuments(JSON.parse(savedDocuments)); } catch (e) { console.error("Failed to parse documents", e); } }

        const savedWorkStages = localStorage.getItem('workStages');
        if (savedWorkStages) { try { setWorkStages(JSON.parse(savedWorkStages)); } catch (e) { console.error("Failed to parse work stages", e); } }

        const savedNotes = localStorage.getItem('projectNotes');
        if (savedNotes) { try { setNotes(JSON.parse(savedNotes)); } catch (e) { console.error("Failed to parse notes", e); } }

    }, []);
    
    const handleInputFocus = (e: React.FocusEvent<HTMLElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay to allow keyboard to appear
    };

    const handleAddItem = () => { setItems(prev => [...prev, { id: Date.now(), name: '', quantity: 1, price: 0, unit: '', image: null, type: 'material' }]); setIsDirty(true); };
    const handleAddFromLibrary = (libItem: LibraryItem) => { setItems(prev => [...prev, { id: Date.now(), name: libItem.name, quantity: 1, price: libItem.price, unit: libItem.unit, image: null, type: 'material' }]); setIsLibraryOpen(false); setIsDirty(true); };
    const handleAddItemsFromAI = (newItems: Omit<Item, 'id' | 'image' | 'type'>[]) => {
        const itemsToAdd: Item[] = newItems.map(item => ({
            ...item,
            id: Date.now() + Math.random(),
            image: null,
            type: 'material' // Default type, user can change it
        }));
        setItems(prev => [...prev, ...itemsToAdd]);
        setIsDirty(true);
    };

    const handleItemChange = (id: number, field: keyof Item, value: string | number) => { setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); setIsDirty(true); };
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

    const handleItemImageChange = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
            
            const currentEstimateData: Estimate = { 
                id: currentId,
                clientInfo, items, discount, discountType, tax, 
                number: estimateNumber, date: estimateDate, status,
                projectId: currentEstimateProjectId,
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
            tg?.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error("Save failed:", error);
            safeShowAlert("Не удалось сохранить смету.");
        }
    };
    
    const handleNewEstimate = (template?: Omit<Estimate, 'id' | 'clientInfo' | 'number' | 'date' | 'status' | 'projectId'>) => {
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
    
    const handleExportPDF = useCallback(async () => {
        setIsPdfLoading(true);
        tg?.HapticFeedback.notificationOccurred('warning');
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
                safeShowAlert("Добавьте хотя бы одну позицию в смету.");
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
            safeShowAlert(`Не удалось создать PDF: ${error.message}`);
        } finally {
            setIsPdfLoading(false);
        }
    }, [getValidItems, clientInfo, companyProfile, estimateNumber, estimateDate, formatCurrency, calculation, discount, discountType, tax]);

    const handleShare = useCallback(() => {
        try {
            const validItems = getValidItems();
            if (validItems.length === 0) {
                safeShowAlert("Добавьте хотя бы одну позицию, чтобы поделиться сметой.");
                tg?.HapticFeedback.notificationOccurred('error');
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
            safeShowAlert("Не удалось подготовить данные для отправки.");
        }
    }, [getValidItems, estimateNumber, estimateDate, clientInfo, formatCurrency, calculation, tax]);
    
    const handleProfileChange = (field: keyof CompanyProfile, value: string) => setCompanyProfile(prev => ({ ...prev, [field]: value }));
    const handleSaveProfile = () => { localStorage.setItem('companyProfile', JSON.stringify(companyProfile)); setIsSettingsOpen(false); tg?.HapticFeedback.notificationOccurred('success'); };
    
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const resizedLogo = await resizeImage(file, 200); // Resize to max 200px for profile
            setCompanyProfile(prev => ({ ...prev, logo: resizedLogo }));
        } catch (error) {
            console.error("Logo processing failed:", error);
            safeShowAlert("Не удалось обработать логотип.");
        }
    };
    const removeLogo = () => setCompanyProfile(prev => ({...prev, logo: null}));

    const handleLoadEstimate = (id: number) => {
        const load = () => {
            const estimateToLoad = estimates.find(e => e.id === id); 
            if (estimateToLoad) { 
                populateForm(estimateToLoad, estimates); 
                setIsEstimatesListOpen(false);
                // If we're loading from a project, switch to the estimate view
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
    
    const handleDeleteEstimate = (id: number) => {
        safeShowConfirm("Вы уверены, что хотите удалить эту смету?", (ok) => {
            if (ok) {
                tg?.HapticFeedback.notificationOccurred('warning');
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
        safeShowAlert('Шаблон сохранен!');
    };
    const handleDeleteTemplate = (timestamp: number) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот шаблон?', (ok) => {
            if (ok) {
                tg?.HapticFeedback.notificationOccurred('warning');
                const newTemplates = templates.filter(t => t.lastModified !== timestamp);
                setTemplates(newTemplates);
                localStorage.setItem('estimateTemplates', JSON.stringify(newTemplates));
            }
        });
    }

    // --- Project Handlers ---
    const handleOpenProjectModal = (project: Partial<Project> | null = null) => {
        setEditingProject(project || { name: '', client: '', address: '', status: 'in_progress' });
        setIsProjectModalOpen(true);
    };

    const handleSaveProject = () => {
        if (!editingProject || !editingProject.name?.trim()) {
            safeShowAlert("Введите название проекта.");
            return;
        }

        let updatedProjects;
        if (editingProject.id) { // Editing existing project
            updatedProjects = projects.map(p => p.id === editingProject.id ? { ...p, ...editingProject } as Project : p);
        } else { // Creating new project
            const newProject: Project = {
                id: Date.now(),
                name: editingProject.name.trim(),
                client: editingProject.client || '',
                address: editingProject.address || '',
                status: 'in_progress'
            };
            updatedProjects = [newProject, ...projects];
        }

        setProjects(updatedProjects);
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
        setIsProjectModalOpen(false);
        setEditingProject(null);
        tg?.HapticFeedback.notificationOccurred('success');
    };
    
    const handleDeleteProject = (id: number) => {
        safeShowConfirm("Вы уверены, что хотите удалить этот проект и все связанные с ним данные?", (ok) => {
            if (ok) {
                tg?.HapticFeedback.notificationOccurred('warning');
                const newProjects = projects.filter(p => p.id !== id);
                setProjects(newProjects);
                localStorage.setItem('projects', JSON.stringify(newProjects));
                
                const newEstimates = estimates.filter(e => e.projectId !== id);
                setEstimates(newEstimates);
                localStorage.setItem('estimatesData', JSON.stringify({ estimates: newEstimates, activeEstimateId }));
                
                const newFinances = financeEntries.filter(f => f.projectId !== id);
                setFinanceEntries(newFinances);
                localStorage.setItem('financeEntries', JSON.stringify(newFinances));

                const newPhotos = photoReports.filter(p => p.projectId !== id);
                setPhotoReports(newPhotos);
                localStorage.setItem('photoReports', JSON.stringify(newPhotos));
                
                const newDocuments = documents.filter(d => d.projectId !== id);
                setDocuments(newDocuments);
                localStorage.setItem('projectDocuments', JSON.stringify(newDocuments));

                const newWorkStages = workStages.filter(ws => ws.projectId !== id);
                setWorkStages(newWorkStages);
                localStorage.setItem('workStages', JSON.stringify(newWorkStages));

                const newNotes = notes.filter(n => n.projectId !== id);
                setNotes(newNotes);
                localStorage.setItem('projectNotes', JSON.stringify(newNotes));

                setActiveView('projects'); 
                setActiveProjectId(null);
            }
        });
    };

    const handleAddNewEstimateForProject = () => {
        const createNew = () => {
            populateForm(null, estimates, activeProjectId);
            setActiveView('estimate');
        };
        if (isDirty) {
            safeShowConfirm('У вас есть несохраненные изменения. Создать новую смету для этого проекта?', (ok) => {
                if (ok) createNew();
            });
        } else {
            createNew();
        }
    };

    const handleBackToProject = () => {
        const goBack = () => {
            setIsDirty(false); // Discard changes
            setActiveProjectId(currentEstimateProjectId);
            setActiveView('projectDetail');
        };
        if (isDirty) {
            safeShowConfirm('Есть несохраненные изменения. Вы уверены, что хотите вернуться к проекту?', (ok) => {
                if (ok) goBack();
            });
        } else {
            goBack();
        }
    };
    
    // --- Finance Handlers ---
    const handleSaveFinanceEntry = (entry: Omit<FinanceEntry, 'id' | 'projectId'>) => {
        const newEntry: FinanceEntry = { ...entry, id: Date.now(), projectId: activeProjectId! };
        const updatedEntries = [newEntry, ...financeEntries];
        setFinanceEntries(updatedEntries);
        localStorage.setItem('financeEntries', JSON.stringify(updatedEntries));
        setIsFinanceModalOpen(false);
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const handleDeleteFinanceEntry = (id: number) => {
        safeShowConfirm('Вы уверены, что хотите удалить эту транзакцию?', (ok) => {
            if (ok) {
                const updatedEntries = financeEntries.filter(f => f.id !== id);
                setFinanceEntries(updatedEntries);
                localStorage.setItem('financeEntries', JSON.stringify(updatedEntries));
                tg?.HapticFeedback.notificationOccurred('warning');
            }
        });
    };
    
    // --- Photo Report Handlers ---
    const handleSavePhotoReport = (photo: Omit<PhotoReport, 'id' | 'projectId'>) => {
        const newPhoto: PhotoReport = { ...photo, id: Date.now(), projectId: activeProjectId! };
        const updatedPhotos = [newPhoto, ...photoReports];
        setPhotoReports(updatedPhotos);
        localStorage.setItem('photoReports', JSON.stringify(updatedPhotos));
        setIsPhotoReportModalOpen(false);
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const handleDeletePhotoReport = (id: number) => {
        safeShowConfirm('Удалить это фото?', (ok) => {
            if (ok) {
                const updatedPhotos = photoReports.filter(p => p.id !== id);
                setPhotoReports(updatedPhotos);
                localStorage.setItem('photoReports', JSON.stringify(updatedPhotos));
                setViewingPhoto(null); // Close the viewer
                tg?.HapticFeedback.notificationOccurred('warning');
            }
        });
    };
    
    // --- Document Handlers ---
    const handleSaveDocument = (name: string, dataUrl: string) => {
        const newDoc: Document = {
            id: Date.now(),
            projectId: activeProjectId!,
            name,
            dataUrl,
            date: new Date().toISOString(),
        };
        const updatedDocs = [newDoc, ...documents];
        setDocuments(updatedDocs);
        localStorage.setItem('projectDocuments', JSON.stringify(updatedDocs));
        setIsDocumentModalOpen(false);
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const handleDeleteDocument = (id: number) => {
        safeShowConfirm('Вы уверены, что хотите удалить этот документ?', (ok) => {
            if (ok) {
                const updatedDocs = documents.filter(d => d.id !== id);
                setDocuments(updatedDocs);
                localStorage.setItem('projectDocuments', JSON.stringify(updatedDocs));
                tg?.HapticFeedback.notificationOccurred('warning');
            }
        });
    };

    // --- Work Stage Handlers ---
    const handleOpenWorkStageModal = (stage: Partial<WorkStage> | null) => {
        setEditingWorkStage(stage);
        setIsWorkStageModalOpen(true);
    };

    const handleSaveWorkStage = (stageData: Omit<WorkStage, 'id' | 'projectId'>) => {
        let updatedStages;
        if (editingWorkStage?.id) {
            updatedStages = workStages.map(ws => ws.id === editingWorkStage.id ? { ...ws, ...stageData } : ws);
        } else {
            const newStage: WorkStage = { ...stageData, id: Date.now(), projectId: activeProjectId! };
            updatedStages = [newStage, ...workStages];
        }
        setWorkStages(updatedStages);
        localStorage.setItem('workStages', JSON.stringify(updatedStages));
        setIsWorkStageModalOpen(false);
        setEditingWorkStage(null);
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const handleDeleteWorkStage = (id: number) => {
        safeShowConfirm('Удалить этот этап работ?', (ok) => {
            if(ok) {
                const updatedStages = workStages.filter(ws => ws.id !== id);
                setWorkStages(updatedStages);
                localStorage.setItem('workStages', JSON.stringify(updatedStages));
                tg?.HapticFeedback.notificationOccurred('warning');
            }
        });
    };

    // --- Note Handlers ---
    const handleOpenNoteModal = (note: Partial<Note> | null) => {
        setEditingNote(note);
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = (text: string) => {
        let updatedNotes;
        if (editingNote?.id) {
            updatedNotes = notes.map(n => n.id === editingNote.id ? { ...n, text, lastModified: Date.now() } : n);
        } else {
            const newNote: Note = { text, id: Date.now(), projectId: activeProjectId!, lastModified: Date.now() };
            updatedNotes = [newNote, ...notes];
        }
        setNotes(updatedNotes);
        localStorage.setItem('projectNotes', JSON.stringify(updatedNotes));
        setIsNoteModalOpen(false);
        setEditingNote(null);
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const handleDeleteNote = (id: number) => {
        safeShowConfirm('Удалить эту заметку?', (ok) => {
            if(ok) {
                const updatedNotes = notes.filter(n => n.id !== id);
                setNotes(updatedNotes);
                localStorage.setItem('projectNotes', JSON.stringify(updatedNotes));
                tg?.HapticFeedback.notificationOccurred('warning');
            }
        });
    };

    const handleOpenActModal = (total: number) => {
        setActModalTotal(total);
        setIsActModalOpen(true);
    };


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

    // --- RENDER LOGIC ---
    
    const themeIcon = useCallback(() => {
        if (themeMode === 'light') return <IconSun />;
        if (themeMode === 'dark') return <IconMoon />;
        return <IconContrast />;
    }, [themeMode]);

    const BottomNav = () => (
        <nav className="bottom-nav">
            <button onClick={() => setActiveView('estimate')} className={activeView === 'estimate' ? 'active' : ''}>
                <span className="icon"><IconDocument/></span>
                <span>Смета</span>
            </button>
            <button onClick={() => setActiveView('projects')} className={activeView.startsWith('project') ? 'active' : ''}>
                <span className="icon"><IconProject/></span>
                <span>Проекты</span>
            </button>
        </nav>
    );

    const renderCurrentView = () => {
        if (activeView === 'projects') {
            return <ProjectsListView {...{
                handleOpenProjectModal, projectStatusFilter, setProjectStatusFilter, projectSearch, setProjectSearch,
                handleInputFocus, filteredProjects, projects, setActiveProjectId, setActiveView
            }} />;
        }
        if (activeView === 'projectDetail') {
            if (!activeProject) {
                // This can happen if a project is deleted while being viewed.
                // Redirecting to the project list is a safe fallback.
                useEffect(() => {
                    setActiveView('projects');
                }, []);
                return null;
            }
            return <ProjectDetailView {...{
                activeProject, estimates, financeEntries, photoReports, documents, workStages, notes, formatCurrency, statusMap, setActiveView,
                setActiveProjectId, handleOpenProjectModal, handleDeleteProject,
                handleLoadEstimate, handleAddNewEstimateForProject,
                onOpenFinanceModal: () => setIsFinanceModalOpen(true),
                onDeleteFinanceEntry: handleDeleteFinanceEntry,
                onOpenPhotoReportModal: () => setIsPhotoReportModalOpen(true),
                onViewPhoto: (photo) => setViewingPhoto(photo),
                onOpenDocumentModal: () => setIsDocumentModalOpen(true),
                onDeleteDocument: handleDeleteDocument,
                onOpenWorkStageModal: handleOpenWorkStageModal,
                onDeleteWorkStage: handleDeleteWorkStage,
                onOpenNoteModal: handleOpenNoteModal,
                onDeleteNote: handleDeleteNote,
                onOpenActModal: handleOpenActModal,
            }} />;
        }
        // Default to 'estimate'
        return <EstimateView {...{
            currentEstimateProjectId, handleBackToProject, clientInfo, setClientInfo, setIsDirty,
            handleThemeChange, themeIcon, themeMode, setIsLibraryOpen, setIsEstimatesListOpen, setIsSettingsOpen, setIsAISuggestModalOpen,
            estimateNumber, setEstimateNumber, estimateDate, setEstimateDate, handleInputFocus, items,
            dragItem, dragOverItem, handleDragSort, fileInputRefs, handleItemImageChange,
            handleRemoveItemImage, handleRemoveItem, handleItemChange, formatCurrency, handleAddItem,
            discount, setDiscount, discountType, setDiscountType, tax, setTax, calculation,
            handleSave, isDirty, isPdfLoading, handleExportPDF, setIsShoppingListOpen, handleShare
        }} />;
    };

    return (
        <>
            <div className="app-container">
                {isSettingsOpen && <SettingsModal 
                    profile={companyProfile}
                    onClose={() => setIsSettingsOpen(false)}
                    onProfileChange={handleProfileChange}
                    onLogoChange={handleLogoChange}
                    onRemoveLogo={removeLogo}
                    onSave={handleSaveProfile}
                    onInputFocus={handleInputFocus as any}
                />}
                {isEstimatesListOpen && <EstimatesListModal
                    onClose={() => setIsEstimatesListOpen(false)}
                    estimates={estimates}
                    templates={templates}
                    activeEstimateId={activeEstimateId}
                    statusMap={statusMap}
                    formatCurrency={formatCurrency}
                    onLoadEstimate={handleLoadEstimate}
                    onDeleteEstimate={handleDeleteEstimate}
                    onStatusChange={handleStatusChange}
                    onSaveAsTemplate={handleSaveAsTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    onNewEstimate={handleNewEstimate}
                    onInputFocus={handleInputFocus as any}
                 />}
                {isLibraryOpen && <LibraryModal 
                    onClose={() => setIsLibraryOpen(false)}
                    libraryItems={libraryItems}
                    onLibraryItemsChange={setLibraryItems}
                    onAddItemToEstimate={handleAddFromLibrary}
                    formatCurrency={formatCurrency}
                    onInputFocus={handleInputFocus as any}
                    showAlert={safeShowAlert}
                    showConfirm={safeShowConfirm}
                />}
                {isProjectModalOpen && <NewProjectModal 
                    project={editingProject}
                    onClose={() => setIsProjectModalOpen(false)}
                    onProjectChange={setEditingProject}
                    onSave={handleSaveProject}
                    onInputFocus={handleInputFocus as any}
                />}
                {isFinanceModalOpen && <FinanceEntryModal
                    onClose={() => setIsFinanceModalOpen(false)}
                    onSave={handleSaveFinanceEntry}
                    showAlert={safeShowAlert}
                    onInputFocus={handleInputFocus}
                />}
                {isPhotoReportModalOpen && <PhotoReportModal
                    onClose={() => setIsPhotoReportModalOpen(false)}
                    onSave={handleSavePhotoReport}
                    showAlert={safeShowAlert}
                />}
                {viewingPhoto && <PhotoViewerModal
                    photo={viewingPhoto}
                    onClose={() => setViewingPhoto(null)}
                    onDelete={handleDeletePhotoReport}
                />}
                {isShoppingListOpen && <ShoppingListModal
                    items={items}
                    onClose={() => setIsShoppingListOpen(false)}
                    showAlert={safeShowAlert}
                />}
                 {isDocumentModalOpen && <DocumentUploadModal
                    onClose={() => setIsDocumentModalOpen(false)}
                    onSave={handleSaveDocument}
                    showAlert={safeShowAlert}
                />}
                {isWorkStageModalOpen && <WorkStageModal 
                    stage={editingWorkStage}
                    onClose={() => {setIsWorkStageModalOpen(false); setEditingWorkStage(null);}}
                    onSave={handleSaveWorkStage}
                    showAlert={safeShowAlert}
                />}
                {isNoteModalOpen && <NoteModal
                    note={editingNote}
                    onClose={() => {setIsNoteModalOpen(false); setEditingNote(null);}}
                    onSave={handleSaveNote}
                    showAlert={safeShowAlert}
                />}
                {isActModalOpen && activeProject && <ActGenerationModal
                    onClose={() => setIsActModalOpen(false)}
                    project={activeProject}
                    profile={companyProfile}
                    totalAmount={actModalTotal}
                    showAlert={safeShowAlert}
                />}
                {isAISuggestModalOpen && <AISuggestModal
                    onClose={() => setIsAISuggestModalOpen(false)}
                    onAddItems={handleAddItemsFromAI}
                    showAlert={safeShowAlert}
                />}


                {renderCurrentView()}
            </div>
            <BottomNav />
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);