import React from 'react';

// 1. Импортируем новый компонент и его стили
import { CalculatorModule } from '../calculator/CalculatorModule';
import '../calculator/styles.css';

interface CalculatorViewProps {
  appState?: any;
  companyProfile?: any;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({ appState, companyProfile }) => {
  // "Прораб" использует темную тему по умолчанию
  const currentTheme = 'dark';

  return (
    // 2. Оборачиваем компонент в div с классами для изоляции и темизации
    <div className={`construction-calculator-module ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
      <CalculatorModule appState={appState} companyProfile={companyProfile} />
    </div>
  );
};
