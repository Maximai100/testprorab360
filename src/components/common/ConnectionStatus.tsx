import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { checkSupabaseHealth } from '../../utils/supabaseErrorHandler';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSupabaseHealthy, setIsSupabaseHealthy] = useState(false); // По умолчанию false для офлайн-режима
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      // Проверяем общее подключение к интернету
      const online = navigator.onLine;
      setIsOnline(online);

      if (online) {
        // Проверяем здоровье Supabase
        const healthy = await checkSupabaseHealth(supabase);
        setIsSupabaseHealthy(healthy);
        setLastCheck(new Date());
      } else {
        setIsSupabaseHealthy(false);
      }
    };

    // Проверяем сразу
    checkConnection();

    // Проверяем каждые 30 секунд
    const interval = setInterval(checkConnection, 30000);

    // Слушаем события изменения состояния сети
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSupabaseHealthy(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (!isSupabaseHealthy) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Нет подключения к интернету';
    if (!isSupabaseHealthy) return 'Офлайн-режим (localStorage)';
    return 'Подключение активно';
  };

  const getStatusIcon = () => {
    if (!isOnline) return '📡';
    if (!isSupabaseHealthy) return '⚠️';
    return '✅';
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-gray-600">
        {getStatusIcon()} {getStatusText()}
      </span>
      {lastCheck && (
        <span className="text-xs text-gray-400">
          ({lastCheck.toLocaleTimeString()})
        </span>
      )}
    </div>
  );
};
