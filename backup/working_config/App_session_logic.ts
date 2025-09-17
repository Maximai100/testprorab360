// Рабочая логика сессии из App.tsx (функция checkInitialSession)
// Дата создания: 17.09.2025

const checkInitialSession = async () => {
    try {
        console.log('App: Проверяем начальную сессию...');
        console.log('App: Выполняем запрос к supabase.auth.getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('App: Запрос к getSession завершен');
        
        if (error) {
            console.error('App: Ошибка получения сессии:', error);
            return;
        }
        
        console.log('App: Начальная сессия:', session);
        setSession(session);
        
        if (session) {
            console.log('App: Сессия найдена, загружаем проекты и сметы...');
            console.log('App: Вызываем projectsHook.loadProjectsFromSupabase()');
            await projectsHook.loadProjectsFromSupabase();
            console.log('App: Вызываем fetchAllEstimates()');
            await fetchAllEstimates();
            console.log('App: Загрузка завершена');
        } else {
            console.log('App: Сессия не найдена');
        }
    } catch (error) {
        console.error('App: Ошибка при проверке сессии:', error);
    }
};
