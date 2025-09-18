import { Estimate } from '../types';

export const generateUUID = () => {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const tg = window.Telegram;

/**
 * Safely shows an alert. Falls back to browser's alert if Telegram API is unavailable or outdated.
 * @param message The message to display.
 * @param callback Optional callback to be executed after the alert is closed.
 */
export const safeShowAlert = (message: string, callback?: () => void) => {
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
export const safeShowConfirm = (message: string, callback: (ok: boolean) => void) => {
    // Telegram WebApp version 6.1+ is required for showConfirm.
    if (tg && tg.version >= '6.1' && typeof tg.showConfirm === 'function') {
        tg.showConfirm(message, callback);
    } else {
        callback(window.confirm(message));
    }
};

// Pure utility function to generate a new estimate number
export const generateNewEstimateNumber = (allEstimates: Estimate[]): string => {
    const currentYear = new Date().getFullYear();
    const yearEstimates = allEstimates.filter(e => e.number?.startsWith(String(currentYear)));
    const maxNum = yearEstimates.reduce((max, e) => {
        const numPart = parseInt(e.number.split('-')[1] || '0', 10);
        return Math.max(max, numPart);
    }, 0);
    const newNum = (maxNum + 1).toString().padStart(3, '0');
    return `${currentYear}-${newNum}`;
};

export const resizeImage = (file: File, maxSize: number): Promise<string> => {
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

export const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- NUMBER TO WORDS UTILITY ---
export const numberToWordsRu = (number: number): string => {
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

export const formatDueDate = (dueDate: Date | string | null): string => {
    if (!dueDate) {
        return '';
    }

    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
        return 'Сегодня';
    }
    if (date.getTime() === tomorrow.getTime()) {
        return 'Завтра';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
};