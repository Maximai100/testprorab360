import { EstimateStatus } from '../types';

export const statusMap: Record<EstimateStatus, { text: string; color: string; }> = {
    draft: { text: 'Черновик', color: '#808080' },
    sent: { text: 'Отправлена', color: '#007BFF' },
    approved: { text: 'Одобрена', color: '#28A745' },
    completed: { text: 'Завершена', color: '#17A2B8' },
    cancelled: { text: 'Отменена', color: '#DC3545' },
};