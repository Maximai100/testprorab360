# Руководство по Интеграции Модуля "Строительный Калькулятор"

Это руководство поможет вам быстро и безболезненно встроить модуль калькулятора в ваше основное React-приложение ("Прораб").

## Фаза 1: Установка Зависимостей

Модулю калькулятора для работы требуются несколько внешних библиотек. Установите их в вашем проекте с помощью npm или yarn.

```bash
# С использованием npm
npm install jspdf jspdf-autotable

# С использованием yarn
yarn add jspdf jspdf-autotable
```

Также убедитесь, что в вашем проекте установлены `react` и `react-dom` версии 18 или выше.

## Фаза 2: Копирование Файлов Модуля

Для интеграции вам понадобятся всего два файла из этого проекта.

1.  **Логика и Компоненты:** Скопируйте файл `index.tsx` в структуру вашего проекта. Рекомендуется переименовать его для ясности, например, в `src/components/calculator/CalculatorModule.tsx`.

2.  **Стили:** Скопируйте файл `index.css` в ваш проект, например, в `src/components/calculator/styles.css`.

В результате ваша структура файлов может выглядеть так:

```
/path/to/your/project/
└── src/
    └── components/
        └── calculator/
            ├── CalculatorModule.tsx  (скопированный index.tsx)
            └── styles.css            (скопированный index.css)
```

## Фаза 3: Пример Использования

Теперь вы можете использовать калькулятор как обычный React-компонент.

1.  Импортируйте компонент `CalculatorModule` и его стили.
2.  Вставьте компонент в JSX вашего приложения.
3.  **Важно:** Оберните компонент в `<div>` с классом `construction-calculator-module`. Этот класс обеспечивает полную CSS-изоляцию и предотвращает конфликты стилей.
4.  Для применения темной темы добавьте к обертке класс `.dark-theme`.

Вот готовый к использованию пример:

```tsx
import React from 'react';

// 1. Импортируйте компонент и стили
import { CalculatorModule } from './path/to/your/components/calculator/CalculatorModule';
import './path/to/your/components/calculator/styles.css';

function YourAppComponent() {
  // Вы можете управлять темой динамически, например, из вашего state или context
  const currentTheme = 'dark'; // или 'light'

  return (
    <div>
      <h1>Мое приложение "Прораб"</h1>
      
      {/* 2. Используйте компонент, обернув его в div с нужными классами */}
      <div className={`construction-calculator-module ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
        <CalculatorModule />
      </div>

      <p>Другой контент моего приложения...</p>
    </div>
  );
}

export default YourAppComponent;
```

Интеграция завершена! Теперь калькулятор будет работать внутри вашего приложения как полностью изолированный и независимый модуль.
