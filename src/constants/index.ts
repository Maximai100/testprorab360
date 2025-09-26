import { EstimateStatus } from '../types';

export const statusMap: Record<EstimateStatus, { text: string; color: string; textColor: string; }> = {
    draft: { text: 'Черновик', color: '#4A4A4A', textColor: '#FFFFFF' },
    sent: { text: 'Отправлена', color: '#1E40AF', textColor: '#FFFFFF' },
    approved: { text: 'Одобрена', color: '#166534', textColor: '#FFFFFF' },
    rejected: { text: 'Отклонена', color: '#991B1B', textColor: '#FFFFFF' },
    completed: { text: 'Завершена', color: '#0F766E', textColor: '#FFFFFF' },
};