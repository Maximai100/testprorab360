/**
 * Утилита для обработки ошибок Supabase
 */

export interface SupabaseError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Проверяет, является ли ошибка временной и подходящей для повторной попытки
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.message || '';
  const errorMessage = String(error.message || '').toLowerCase();
  
  // Временные ошибки сервера
  if (errorCode === 'PGRST002' || errorCode === 'PGRST003') return true;
  
  // Сетевые ошибки
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) return true;
  
  // HTTP статус коды для повторных попыток
  if (error.status >= 500 && error.status < 600) return true; // 5xx ошибки
  if (error.status === 429) return true; // Too Many Requests
  
  // Специфичные ошибки Supabase
  if (errorMessage.includes('service unavailable')) return true;
  if (errorMessage.includes('timeout')) return true;
  if (errorMessage.includes('connection')) return true;
  
  return false;
}

/**
 * Вычисляет задержку для следующей попытки с экспоненциальным backoff
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Выполняет функцию с повторными попытками при временных ошибках
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      console.log(`🔄 Попытка ${attempt}/${finalConfig.maxAttempts}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      console.warn(`❌ Попытка ${attempt} неудачна:`, {
        code: error?.code,
        message: error?.message,
        status: error?.status,
      });
      
      // Если это последняя попытка или ошибка не подходит для повторной попытки
      if (attempt === finalConfig.maxAttempts || !isRetryableError(error)) {
        console.error(`❌ Все попытки исчерпаны или ошибка не подходит для повторной попытки`);
        throw error;
      }
      
      // Вычисляем задержку и ждем
      const delay = calculateDelay(attempt, finalConfig);
      console.log(`⏳ Ожидание ${delay}ms перед следующей попыткой...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Обрабатывает ошибки Supabase и возвращает понятное сообщение
 */
export function handleSupabaseError(error: any): string {
  if (!error) return 'Неизвестная ошибка';
  
  // Ошибки аутентификации
  if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
    return 'Ошибка аутентификации. Пожалуйста, войдите в систему заново.';
  }
  
  // Ошибки доступа
  if (error.code === 'PGRST301' || error.message?.includes('permission')) {
    return 'Недостаточно прав доступа. Обратитесь к администратору.';
  }
  
  // Сетевые ошибки
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'Проблема с подключением к серверу. Проверьте интернет-соединение.';
  }
  
  // Ошибки сервера
  if (error.status >= 500) {
    return 'Сервер временно недоступен. Попробуйте позже.';
  }
  
  // Ошибки клиента
  if (error.status >= 400 && error.status < 500) {
    return 'Ошибка в запросе. Проверьте данные и попробуйте снова.';
  }
  
  // Общие ошибки Supabase
  if (error.code?.startsWith('PGRST')) {
    return `Ошибка базы данных: ${error.message || 'Неизвестная ошибка'}`;
  }
  
  return error.message || 'Произошла неизвестная ошибка';
}

/**
 * Проверяет, доступен ли сервер Supabase
 */
export async function checkSupabaseHealth(supabase: any): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Создает обработчик ошибок для React компонентов
 */
export function createErrorHandler() {
  return (error: any, context: string = '') => {
    const message = handleSupabaseError(error);
    console.error(`❌ Ошибка в ${context}:`, {
      original: error,
      handled: message,
    });
    
    // Здесь можно добавить уведомления пользователю
    // Например, через toast или state management
    
    return message;
  };
}
