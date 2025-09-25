#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для рекурсивного поиска файлов
function findFiles(dir, extensions) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findFiles(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Функция для удаления отладочных логов
function removeDebugLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Паттерны для отладочных логов
    const debugPatterns = [
      // console.log с [DEBUG]
      /^\s*console\.log\([^)]*\[DEBUG\][^)]*\);\s*$/gm,
      // console.log с эмодзи отладки
      /^\s*console\.log\([^)]*[🔧🚀🔍][^)]*\);\s*$/gm,
      // console.log с префиксами отладки
      /^\s*console\.log\([^)]*(?:App:|useCompanyProfile|useEstimates|CalculatorModule|handleLoadEstimate|handleNewEstimate|handleSaveEstimate|handleDeleteEstimate)[^)]*\);\s*$/gm,
      // console.log с диагностическими сообщениями
      /^\s*console\.log\([^)]*(?:ПРОВЕРКА|ДИАГНОСТИКА|ИСПРАВЛЕНИЕ|Загружаем|Переходим|Начинаем|Завершено)[^)]*\);\s*$/gm,
      // console.log с техническими префиксами
      /^\s*console\.log\([^)]*(?:Шаг \d+|Полученный|Тип|Количество|Результат|Анализ)[^)]*\);\s*$/gm,
    ];
    
    // Удаляем отладочные логи
    for (const pattern of debugPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, '');
        modified = true;
        console.log(`Удалено ${matches.length} отладочных логов из ${path.relative(process.cwd(), filePath)}`);
      }
    }
    
    // Удаляем пустые строки, оставшиеся после удаления логов
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Ошибка при обработке файла ${filePath}:`, error.message);
    return false;
  }
}

// Основная функция
function main() {
  const srcDir = path.join(__dirname, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('Папка src не найдена!');
    process.exit(1);
  }
  
  console.log('Поиск файлов с отладочными логами...');
  
  const files = findFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
  let processedCount = 0;
  let modifiedCount = 0;
  
  for (const file of files) {
    processedCount++;
    if (removeDebugLogs(file)) {
      modifiedCount++;
    }
  }
  
  console.log(`\nОбработано файлов: ${processedCount}`);
  console.log(`Изменено файлов: ${modifiedCount}`);
  console.log('Очистка отладочных логов завершена!');
}

if (require.main === module) {
  main();
}

module.exports = { removeDebugLogs, findFiles };
