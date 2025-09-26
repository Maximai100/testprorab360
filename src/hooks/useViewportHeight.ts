import { useState, useEffect } from 'react';

const getActualViewportHeight = () => {
  // window.innerHeight - это стабильное значение высоты окна
  return window.innerHeight;
};

export const useViewportHeight = () => {
  // Сохраняем высоту в состоянии, чтобы избежать ее пересчета
  const [viewportHeight, setViewportHeight] = useState(getActualViewportHeight());

  useEffect(() => {
    // Эта функция будет вызвана только ОДИН РАЗ при монтировании компонента.
    // Мы устанавливаем высоту через CSS-переменную, чтобы ее можно было использовать в стилях.
    document.documentElement.style.setProperty('--app-height', `${viewportHeight}px`);

    // Мы не добавляем слушателей на resize, чтобы высота оставалась фиксированной
    // и не реагировала на появление клавиатуры.
  }, [viewportHeight]); // Зависимость от viewportHeight гарантирует однократный вызов

  return viewportHeight;
};
