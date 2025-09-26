import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate, Project, CompanyProfile, WorkStage, Item } from '../types';

// Расширяем типы для jsPDF с autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Цветовая схема для профессионального дизайна
const COLORS = {
  primary: [51, 144, 236],      // Основной синий цвет
  primaryDark: [40, 116, 189],  // Темно-синий
  secondary: [108, 117, 125],   // Серый
  success: [40, 167, 69],       // Зеленый
  warning: [255, 193, 7],       // Желтый
  danger: [220, 53, 69],        // Красный
  light: [248, 249, 250],       // Светло-серый
  dark: [33, 37, 41],           // Темно-серый
  white: [255, 255, 255],       // Белый
  border: [222, 226, 230],      // Граница
  shadow: [0, 0, 0, 0.1],       // Тень
  accent: [102, 16, 242],       // Акцентный фиолетовый
  gradient1: [51, 144, 236],    // Начало градиента
  gradient2: [102, 16, 242],    // Конец градиента
};

class PdfService {
  private static readonly FONT_NAME = 'Roboto';

  // Cache loaded base64 font data to avoid repeated fetches
  private static fontCache: { regular?: string; bold?: string } = {};

  /**
   * Создает профессиональную шапку документа с градиентом
   */
  private static createProfessionalHeader(
    doc: jsPDF, 
    title: string, 
    subtitle: string, 
    companyProfile: CompanyProfile,
    startY: number = 20
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = startY;

    // Создаем градиентный фон для шапки
    const headerHeight = 45;
    
    // Имитация градиента через несколько прямоугольников
    for (let i = 0; i < headerHeight; i++) {
      const ratio = i / headerHeight;
      const r = COLORS.gradient1[0] + (COLORS.gradient2[0] - COLORS.gradient1[0]) * ratio;
      const g = COLORS.gradient1[1] + (COLORS.gradient2[1] - COLORS.gradient1[1]) * ratio;
      const b = COLORS.gradient1[2] + (COLORS.gradient2[2] - COLORS.gradient1[2]) * ratio;
      
      doc.setFillColor(r, g, b);
      doc.rect(0, yPosition + i, pageWidth, 1, 'F');
    }

    // Белый текст на градиентном фоне
    doc.setTextColor(255, 255, 255);
    
    // Название компании
    doc.setFontSize(20);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile?.name || 'Компания', pageWidth / 2, yPosition + 15, { align: 'center' });
    
    // Детали компании (если есть)
    if (companyProfile?.details) {
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      const detailsLines = companyProfile.details.split('\n').slice(0, 2); // Максимум 2 строки
      detailsLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          doc.text(trimmedLine, pageWidth / 2, yPosition + 28 + (index * 6), { align: 'center' });
        }
      });
    }

    yPosition += headerHeight + 15;

    // Заголовок документа
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    doc.setFontSize(18);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Подзаголовок
    if (subtitle) {
      doc.setFontSize(12);
      doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
      PdfService.ensureCyrillicSupport(doc);
      doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Декоративная линия
    doc.setLineWidth(2);
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    const lineWidth = 60;
    doc.line(pageWidth/2 - lineWidth/2, yPosition, pageWidth/2 + lineWidth/2, yPosition);
    yPosition += 20;

    return yPosition;
  }

  /**
   * Создает информационный блок с современным дизайном
   */
  private static createInfoBlock(
    doc: jsPDF,
    title: string,
    content: { label: string; value: string }[],
    startY: number,
    color: number[] = COLORS.primary
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = startY;

    // Заголовок блока
    doc.setFontSize(12);
    doc.setTextColor(color[0], color[1], color[2]);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(title, 20, yPosition);
    yPosition += 15;

    // Рамка с тенью для информационного блока
    const blockHeight = content.length * 12 + 20;
    const blockWidth = pageWidth - 40;
    
    // Тень
    doc.setFillColor(0, 0, 0, 0.1);
    doc.rect(22, yPosition + 2, blockWidth, blockHeight, 'F');
    
    // Основной блок
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.rect(20, yPosition, blockWidth, blockHeight, 'F');
    
    // Граница
    doc.setLineWidth(0.5);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.rect(20, yPosition, blockWidth, blockHeight);

    // Содержимое блока
    doc.setFontSize(10);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    PdfService.ensureCyrillicSupport(doc);

    content.forEach((item, index) => {
      const itemY = yPosition + 15 + (index * 12);
      
      // Метка (жирным)
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text(`${item.label}:`, 25, itemY);
      
      // Значение (обычным)
      PdfService.ensureCyrillicSupport(doc);
      doc.text(item.value, 80, itemY);
    });

    return yPosition + blockHeight + 20;
  }

  /**
   * Создает профессиональную таблицу с современным дизайном
   */
  private static createProfessionalTable(
    doc: jsPDF,
    headers: string[],
    data: any[][],
    startY: number,
    columnStyles?: any
  ): number {
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: startY,
      styles: {
        fontSize: 9,
        font: PdfService.FONT_NAME,
        fontStyle: 'normal',
        cellPadding: 6,
        lineWidth: 0.1,
        lineColor: COLORS.border,
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 10,
        font: PdfService.FONT_NAME,
        halign: 'center',
        cellPadding: 8,
      },
      columnStyles: columnStyles || {},
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: 20, right: 20 },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
      theme: 'grid',
    });

    return (doc as any).lastAutoTable.finalY;
  }

  /**
   * Создает блок итогов с современным дизайном
   */
  private static createTotalsBlock(
    doc: jsPDF,
    totals: { label: string; value: string; isTotal?: boolean }[],
    startY: number
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const blockWidth = 120;
    const blockHeight = totals.length * 12 + 20;
    const blockX = pageWidth - blockWidth - 20;

    // Тень блока
    doc.setFillColor(0, 0, 0, 0.15);
    doc.rect(blockX + 3, startY + 3, blockWidth, blockHeight, 'F');

    // Основной блок
    doc.setFillColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.rect(blockX, startY, blockWidth, blockHeight, 'F');

    // Граница блока
    doc.setLineWidth(1);
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(blockX, startY, blockWidth, blockHeight);

    // Заголовок блока
    doc.setFontSize(11);
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('РАСЧЕТ', blockX + blockWidth/2, startY + 12, { align: 'center' });

    // Разделительная линия
    doc.setLineWidth(0.5);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.line(blockX + 10, startY + 18, blockX + blockWidth - 10, startY + 18);

    // Элементы расчета
    totals.forEach((item, index) => {
      const itemY = startY + 30 + (index * 12);
      
      if (item.isTotal) {
        // Итоговая строка - выделяем
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(blockX + 5, itemY - 8, blockWidth - 10, 14, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
        PdfService.ensureCyrillicSupport(doc, 'bold');
      } else {
        doc.setFontSize(9);
        doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
        PdfService.ensureCyrillicSupport(doc);
      }

      // Метка
      doc.text(item.label, blockX + 10, itemY);
      
      // Значение
      doc.text(item.value, blockX + blockWidth - 10, itemY, { align: 'right' });
    });

    return startY + blockHeight + 20;
  }

  /**
   * Создает профессиональный подвал документа
   */
  private static createProfessionalFooter(
    doc: jsPDF,
    leftTitle: string,
    rightTitle: string,
    showStamp: boolean = false
  ): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 70;

    // Разделительная линия
    doc.setLineWidth(1);
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);

    // Блоки подписей
    const blockWidth = 90;
    const blockHeight = 40;

    // Левый блок (Исполнитель)
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.rect(20, footerY, blockWidth, blockHeight, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.rect(20, footerY, blockWidth, blockHeight);

    doc.setFontSize(10);
    doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(leftTitle, 25, footerY + 12);

    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________________', 25, footerY + 25);
    doc.text('(подпись)', 25, footerY + 32);
    
    if (showStamp) {
      doc.text('М.П.', 25, footerY + 38);
    }

    // Правый блок (Заказчик)
    const rightBlockX = pageWidth - blockWidth - 20;
    doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.rect(rightBlockX, footerY, blockWidth, blockHeight, 'F');
    doc.setLineWidth(0.5);
    doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    doc.rect(rightBlockX, footerY, blockWidth, blockHeight);

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(rightTitle, rightBlockX + 5, footerY + 12);

    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________________', rightBlockX + 5, footerY + 25);
    doc.text('(подпись)', rightBlockX + 5, footerY + 32);

    // Дата в центре
    doc.setFontSize(9);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Дата: ${PdfService.formatDate(new Date().toISOString())}`, pageWidth / 2, footerY + 50, { align: 'center' });
  }

  private static async loadFontBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load font at ${url}: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    // Convert ArrayBuffer to base64 in chunks to avoid call stack limits
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(sub) as unknown as number[]);
    }
    return btoa(binary);
  }

  private static async ensureFontsLoaded(): Promise<void> {
    if (this.fontCache.regular && this.fontCache.bold) return;
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    const prefix = base.endsWith('/') ? base : base + '/';
    const [regular, bold] = await Promise.all([
      this.loadFontBase64(`${prefix}fonts/Roboto-Regular.ttf`),
      this.loadFontBase64(`${prefix}fonts/Roboto-Bold.ttf`),
    ]);
    this.fontCache.regular = regular;
    this.fontCache.bold = bold;
  }

  private static addFontsToDoc(doc: jsPDF): void {
    const docWithFlag = doc as jsPDF & { _robotoRegistered?: boolean };
    if (docWithFlag._robotoRegistered) return;

    // At this point fonts must be in cache
    if (this.fontCache.regular) {
      doc.addFileToVFS('Roboto-Regular.ttf', this.fontCache.regular);
      doc.addFont('Roboto-Regular.ttf', PdfService.FONT_NAME, 'normal');
    }
    if (this.fontCache.bold) {
      doc.addFileToVFS('Roboto-Bold.ttf', this.fontCache.bold);
      doc.addFont('Roboto-Bold.ttf', PdfService.FONT_NAME, 'bold');
    }
    docWithFlag._robotoRegistered = true;
  }

  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }

  private static wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
    if (!text || text.trim() === '') return [''];
    
    try {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        
        try {
          const textWidth = doc.getTextWidth(testLine);
          
          if (textWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Если даже одно слово не помещается, добавляем его как есть
              lines.push(word);
            }
          }
        } catch (error) {
          // Если getTextWidth не работает, просто добавляем слово
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            lines.push(word);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    } catch (error) {
      console.warn('Ошибка в wrapText, возвращаем исходный текст:', error);
      return [text];
    }
  }

  // Приватный статический метод для инициализации документа со шрифтом
  private static async initializeDoc(): Promise<jsPDF> {
    const doc = new jsPDF();
    
    try {
      await PdfService.ensureFontsLoaded();
      PdfService.addFontsToDoc(doc);
      PdfService.ensureCyrillicSupport(doc);
    } catch (error) {
      console.warn('Ошибка при загрузке кириллических шрифтов, используем стандартный шрифт:', error);
      // Если не удалось загрузить кириллические шрифты, используем стандартный
      doc.setFont('helvetica');
    }
    
    return doc;
  }

  private static ensureCyrillicSupport(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
    try {
      // Ensure fonts added to this doc instance (idempotent)
      PdfService.addFontsToDoc(doc);
      doc.setFont(PdfService.FONT_NAME, style);
    } catch (error) {
      console.warn('Ошибка при установке кириллического шрифта, используем стандартный:', error);
      doc.setFont('helvetica', style);
    }
  }

  /**
   * Генерирует PDF для заявки поставщику с профессиональным дизайном
   */
  static async generateSupplierRequestPDF(requestItems: any[], companyProfile: CompanyProfile | null): Promise<void> {
    try {
      const doc = await PdfService.initializeDoc();
      let yPosition = 20;

      // Создаем профессиональную шапку
      yPosition = PdfService.createProfessionalHeader(
        doc,
        'ЗАЯВКА ПОСТАВЩИКУ',
        `№ ${Date.now().toString().slice(-6)} от ${PdfService.formatDate(new Date().toISOString())}`,
        companyProfile || { name: 'Заказчик', details: '' },
        yPosition
      );

      // Информационный блок о заказчике
      const orderInfo = [
        { label: 'Заказчик', value: companyProfile?.name || 'Не указан' },
        { label: 'Дата заявки', value: PdfService.formatDate(new Date().toISOString()) },
        { label: 'Статус', value: 'Новая заявка' }
      ];

      if (companyProfile?.details) {
        const contactInfo = companyProfile.details.split('\n')[0]; // Первая строка как контакт
        if (contactInfo.trim()) {
          orderInfo.push({ label: 'Контакты', value: contactInfo.trim() });
        }
      }

      yPosition = PdfService.createInfoBlock(
        doc,
        'ИНФОРМАЦИЯ О ЗАКАЗЧИКЕ',
        orderInfo,
        yPosition,
        COLORS.accent
      );

      // Проверяем, есть ли материалы для заявки
      if (!requestItems || requestItems.length === 0) {
        // Блок "Нет материалов"
        const pageWidth = doc.internal.pageSize.getWidth();
        const emptyBlockHeight = 60;
        const emptyBlockWidth = pageWidth - 40;
        
        // Фон блока
        doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
        doc.rect(20, yPosition, emptyBlockWidth, emptyBlockHeight, 'F');
        
        // Граница
        doc.setLineWidth(1);
        doc.setDrawColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
        doc.rect(20, yPosition, emptyBlockWidth, emptyBlockHeight);

        // Текст
        doc.setFontSize(14);
        doc.setTextColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
        PdfService.ensureCyrillicSupport(doc, 'bold');
        doc.text('⚠ НЕТ МАТЕРИАЛОВ ДЛЯ ЗАЯВКИ', pageWidth / 2, yPosition + 25, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        PdfService.ensureCyrillicSupport(doc);
        doc.text('Добавьте материалы в смету для создания заявки поставщику', pageWidth / 2, yPosition + 40, { align: 'center' });

        yPosition += emptyBlockHeight + 20;
      } else {
        // Заголовок таблицы материалов
        doc.setFontSize(12);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        PdfService.ensureCyrillicSupport(doc, 'bold');
        doc.text('ЗАПРАШИВАЕМЫЕ МАТЕРИАЛЫ', 20, yPosition);
        yPosition += 15;

        // Таблица материалов (без цен для поставщика)
        const tableData = requestItems.map((item, index) => [
          (index + 1).toString(),
          item.name || 'Не указано',
          item.quantity ? item.quantity.toString() : '0',
          item.unit || 'шт',
          item.note || 'Стандартное качество'
        ]);

        const columnStyles = {
          0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
          1: { cellWidth: 80, font: PdfService.FONT_NAME },
          2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
          4: { cellWidth: 45, font: PdfService.FONT_NAME },
        };

        const finalY = PdfService.createProfessionalTable(
          doc,
          ['№', 'Наименование материалов', 'Кол-во', 'Ед. изм.', 'Примечание'],
          tableData,
          yPosition,
          columnStyles
        );

        yPosition = finalY + 20;

        // Блок с инструкциями для поставщика
        const instructionInfo = [
          { label: 'Срок поставки', value: 'Согласовать с заказчиком' },
          { label: 'Условия оплаты', value: 'По договоренности' },
          { label: 'Качество', value: 'Соответствие ГОСТ/ТУ' },
          { label: 'Доставка', value: 'Обсуждается отдельно' }
        ];

        yPosition = PdfService.createInfoBlock(
          doc,
          'УСЛОВИЯ ПОСТАВКИ',
          instructionInfo,
          yPosition,
          COLORS.success
        );
      }

      // Профессиональный подвал для заявки
      PdfService.createProfessionalFooter(doc, 'ЗАКАЗЧИК', 'ПОСТАВЩИК', false);

      // Сохраняем файл
      const fileName = `Заявка_поставщику_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '_')}.pdf`;
      doc.save(fileName);
      
      console.log('✅ PDF заявки поставщику успешно сгенерирован');
    } catch (error) {
      console.error('❌ Ошибка при генерации PDF заявки поставщику:', error);
      throw error;
    }
  }

  /**
   * Генерирует PDF для сметы с профессиональным дизайном
   */
  static async generateEstimatePDF(
    estimate: Estimate,
    project: Project | null,
    companyProfile: CompanyProfile
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    let yPosition = 20;

    // Создаем профессиональную шапку
    yPosition = PdfService.createProfessionalHeader(
      doc,
      `СМЕТА № ${estimate.number}`,
      `от ${PdfService.formatDate(estimate.date)}`,
      companyProfile,
      yPosition
    );

    // Информационный блок о заказе
    const orderInfo = [
      { label: 'Заказчик', value: estimate.clientInfo },
      { label: 'Номер сметы', value: estimate.number },
      { label: 'Дата составления', value: PdfService.formatDate(estimate.date) }
    ];

    if (project) {
      orderInfo.push({ label: 'Объект', value: project.address });
    }

    yPosition = PdfService.createInfoBlock(
      doc,
      'ИНФОРМАЦИЯ О ЗАКАЗЕ',
      orderInfo,
      yPosition,
      COLORS.primary
    );

    // Таблица позиций сметы
    const tableData = estimate.items.map((item: Item, index: number) => [
      index + 1,
      item.name,
      item.quantity.toString(),
      item.unit,
      PdfService.formatCurrency(item.price),
      PdfService.formatCurrency(item.quantity * item.price)
    ]);

    const columnStyles = {
      0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
      1: { cellWidth: 75, font: PdfService.FONT_NAME, valign: 'top' },
      2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
      3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
      4: { halign: 'right', cellWidth: 30, font: PdfService.FONT_NAME },
      5: { halign: 'right', cellWidth: 30, font: PdfService.FONT_NAME },
    };

    const finalY = PdfService.createProfessionalTable(
      doc,
      ['№', 'Наименование работ/материалов', 'Кол-во', 'Ед. изм.', 'Цена за ед.', 'Сумма'],
      tableData,
      yPosition,
      columnStyles
    );

    // Расчет итогов
    const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountAmount = estimate.discountType === 'percent'
      ? subtotal * (estimate.discount / 100)
      : estimate.discount;
    const totalAfterDiscount = subtotal - discountAmount;
    const taxAmount = totalAfterDiscount * (estimate.tax / 100);
    const grandTotal = totalAfterDiscount + taxAmount;

    // Блок итогов
    const totals = [
      { label: 'Подытог', value: PdfService.formatCurrency(subtotal) }
    ];

    if (discountAmount > 0) {
      totals.push({
        label: `Скидка (${estimate.discountType === 'percent' ? `${estimate.discount}%` : 'фикс.'})`,
        value: `-${PdfService.formatCurrency(discountAmount)}`
      });
    }

    if (taxAmount > 0) {
      totals.push({
        label: `НДС (${estimate.tax}%)`,
        value: `+${PdfService.formatCurrency(taxAmount)}`
      });
    }

    totals.push({
      label: 'ИТОГО',
      value: PdfService.formatCurrency(grandTotal),
      isTotal: true
    });

    PdfService.createTotalsBlock(doc, totals, finalY + 15);

    // Профессиональный подвал
    PdfService.createProfessionalFooter(doc, 'ИСПОЛНИТЕЛЬ', 'ЗАКАЗЧИК', true);

    const fileName = `Смета_${estimate.number}_${PdfService.formatDate(estimate.date)}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }


  /**
   * Генерирует PDF для акта выполненных работ с профессиональным дизайном
   */
  static async generateActPDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile,
    totalAmount: number
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    let yPosition = 20;

    const actNumber = `АКТ-${project.id.slice(-6).toUpperCase()}`;
    const currentDate = PdfService.formatDate(new Date().toISOString());

    // Создаем профессиональную шапку
    yPosition = PdfService.createProfessionalHeader(
      doc,
      'АКТ ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ',
      `№ ${actNumber} от ${currentDate}`,
      companyProfile,
      yPosition
    );

    // Информационный блок о проекте
    const projectInfo = [
      { label: 'Проект', value: project.name },
      { label: 'Заказчик', value: project.client },
      { label: 'Адрес объекта', value: project.address },
      { label: 'Номер акта', value: actNumber },
      { label: 'Дата составления', value: currentDate }
    ];

    yPosition = PdfService.createInfoBlock(
      doc,
      'ИНФОРМАЦИЯ О ПРОЕКТЕ',
      projectInfo,
      yPosition,
      COLORS.success
    );

    const completedStages = workStages.filter(stage => stage.status === 'completed');

    if (completedStages.length > 0) {
      // Заголовок таблицы работ
      doc.setFontSize(12);
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text('ВЫПОЛНЕННЫЕ РАБОТЫ', 20, yPosition);
      yPosition += 15;

      // Таблица выполненных этапов
      const tableData = completedStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        PdfService.formatDate(stage.startDate),
        stage.endDate ? PdfService.formatDate(stage.endDate) : 'В процессе',
        '✓ Выполнено'
      ]);

      const columnStyles = {
        0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
        1: { cellWidth: 70, font: PdfService.FONT_NAME },
        2: { halign: 'center', cellWidth: 35, font: PdfService.FONT_NAME },
        3: { halign: 'center', cellWidth: 35, font: PdfService.FONT_NAME },
        4: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME, textColor: COLORS.success },
      };

      const finalY = PdfService.createProfessionalTable(
        doc,
        ['№', 'Наименование этапа', 'Дата начала', 'Дата завершения', 'Статус'],
        tableData,
        yPosition,
        columnStyles
      );

      // Блок итоговой суммы
      const pageWidth = doc.internal.pageSize.getWidth();
      const totalBlockY = finalY + 20;
      const totalBlockWidth = 140;
      const totalBlockHeight = 35;
      const totalBlockX = pageWidth/2 - totalBlockWidth/2;

      // Тень блока
      doc.setFillColor(0, 0, 0, 0.15);
      doc.rect(totalBlockX + 3, totalBlockY + 3, totalBlockWidth, totalBlockHeight, 'F');

      // Основной блок
      doc.setFillColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
      doc.rect(totalBlockX, totalBlockY, totalBlockWidth, totalBlockHeight, 'F');

      // Граница блока
      doc.setLineWidth(1);
      doc.setDrawColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
      doc.rect(totalBlockX, totalBlockY, totalBlockWidth, totalBlockHeight);

      // Текст итоговой суммы
      doc.setFontSize(12);
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text('ОБЩАЯ СТОИМОСТЬ РАБОТ', pageWidth / 2, totalBlockY + 15, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(PdfService.formatCurrency(totalAmount), pageWidth / 2, totalBlockY + 27, { align: 'center' });

    } else {
      // Блок "Нет выполненных работ"
      const pageWidth = doc.internal.pageSize.getWidth();
      const emptyBlockHeight = 60;
      const emptyBlockWidth = pageWidth - 40;
      
      // Фон блока
      doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
      doc.rect(20, yPosition, emptyBlockWidth, emptyBlockHeight, 'F');
      
      // Граница
      doc.setLineWidth(1);
      doc.setDrawColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
      doc.rect(20, yPosition, emptyBlockWidth, emptyBlockHeight);

      // Текст
      doc.setFontSize(14);
      doc.setTextColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text('⚠ НЕТ ВЫПОЛНЕННЫХ РАБОТ', pageWidth / 2, yPosition + 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Завершите этапы работ для включения их в акт', pageWidth / 2, yPosition + 40, { align: 'center' });
    }

    // Профессиональный подвал с печатью
    PdfService.createProfessionalFooter(doc, 'ИСПОЛНИТЕЛЬ', 'ЗАКАЗЧИК', true);

    const fileName = `Акт_${actNumber}_${currentDate.replace(/\./g, '_')}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }


  /**
   * Генерирует PDF для графика работ с профессиональным дизайном
   */
  static async generateWorkSchedulePDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    let yPosition = 20;

    // Создаем профессиональную шапку
    yPosition = PdfService.createProfessionalHeader(
      doc,
      'ГРАФИК ВЫПОЛНЕНИЯ РАБОТ',
      `Проект: ${project.name}`,
      companyProfile,
      yPosition
    );

    // Информационный блок о проекте
    const projectInfo = [
      { label: 'Проект', value: project.name },
      { label: 'Заказчик', value: project.client },
      { label: 'Адрес объекта', value: project.address },
      { label: 'Дата составления', value: PdfService.formatDate(new Date().toISOString()) },
      { label: 'Всего этапов', value: workStages.length.toString() }
    ];

    yPosition = PdfService.createInfoBlock(
      doc,
      'ИНФОРМАЦИЯ О ПРОЕКТЕ',
      projectInfo,
      yPosition,
      COLORS.accent
    );

    if (workStages.length > 0) {
      // Статистика по этапам
      const completedStages = workStages.filter(stage => stage.status === 'completed').length;
      const inProgressStages = workStages.filter(stage => stage.status === 'in_progress').length;
      const plannedStages = workStages.filter(stage => stage.status === 'planned').length;

      const statsInfo = [
        { label: '✓ Завершено', value: `${completedStages} этапов` },
        { label: '⚠ В работе', value: `${inProgressStages} этапов` },
        { label: '○ Планируется', value: `${plannedStages} этапов` }
      ];

      yPosition = PdfService.createInfoBlock(
        doc,
        'СТАТИСТИКА ВЫПОЛНЕНИЯ',
        statsInfo,
        yPosition,
        COLORS.success
      );

      // Заголовок таблицы этапов
      doc.setFontSize(12);
      doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text('ДЕТАЛЬНЫЙ ГРАФИК РАБОТ', 20, yPosition);
      yPosition += 15;

      // Таблица этапов с улучшенным отображением статусов
      const tableData = workStages.map((stage: WorkStage, index: number) => {
        let statusText = '';
        let statusColor = COLORS.secondary;

        switch (stage.status) {
          case 'completed':
            statusText = '✓ Завершен';
            statusColor = COLORS.success;
            break;
          case 'in_progress':
            statusText = '⚠ В работе';
            statusColor = COLORS.warning;
            break;
          default:
            statusText = '○ Планируется';
            statusColor = COLORS.secondary;
        }

        return [
          index + 1,
          stage.title,
          PdfService.formatDate(stage.startDate),
          stage.endDate ? PdfService.formatDate(stage.endDate) : 'Не определена',
          statusText,
          `${Math.round(stage.progress ?? 0)}%`
        ];
      });

      const columnStyles = {
        0: { halign: 'center', cellWidth: 12, font: PdfService.FONT_NAME },
        1: { cellWidth: 65, font: PdfService.FONT_NAME },
        2: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME },
        3: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME },
        4: { halign: 'center', cellWidth: 25, font: PdfService.FONT_NAME },
        5: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
      };

      const finalY = PdfService.createProfessionalTable(
        doc,
        ['№', 'Наименование этапа', 'Дата начала', 'Дата завершения', 'Статус', 'Прогресс'],
        tableData,
        yPosition,
        columnStyles
      );

      // Блок с общим прогрессом проекта
      const pageWidth = doc.internal.pageSize.getWidth();
      const progressBlockY = finalY + 20;
      const progressBlockWidth = 160;
      const progressBlockHeight = 40;
      const progressBlockX = pageWidth/2 - progressBlockWidth/2;

      // Вычисляем общий прогресс
      const totalProgress = workStages.reduce((sum, stage) => sum + (stage.progress || 0), 0) / workStages.length;

      // Тень блока
      doc.setFillColor(0, 0, 0, 0.15);
      doc.rect(progressBlockX + 3, progressBlockY + 3, progressBlockWidth, progressBlockHeight, 'F');

      // Основной блок
      doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.rect(progressBlockX, progressBlockY, progressBlockWidth, progressBlockHeight, 'F');

      // Граница блока
      doc.setLineWidth(1);
      doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      doc.rect(progressBlockX, progressBlockY, progressBlockWidth, progressBlockHeight);

      // Текст общего прогресса
      doc.setFontSize(12);
      doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text('ОБЩИЙ ПРОГРЕСС ПРОЕКТА', pageWidth / 2, progressBlockY + 15, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`${Math.round(totalProgress)}%`, pageWidth / 2, progressBlockY + 30, { align: 'center' });

    } else {
      // Блок "Нет этапов работ"
      const pageWidth = doc.internal.pageSize.getWidth();
      const emptyBlockHeight = 60;
      const emptyBlockWidth = pageWidth - 40;
      
      // Фон блока
      doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
      doc.rect(20, yPosition, emptyBlockWidth, emptyBlockHeight, 'F');
      
      // Граница
      doc.setLineWidth(1);
      doc.setDrawColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
      doc.rect(20, yPosition, emptyBlockWidth, emptyBlockHeight);

      // Текст
      doc.setFontSize(14);
      doc.setTextColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2]);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text('⚠ НЕТ ЭТАПОВ РАБОТ', pageWidth / 2, yPosition + 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Добавьте этапы работ для создания графика', pageWidth / 2, yPosition + 40, { align: 'center' });
    }

    // Профессиональный подвал
    PdfService.createProfessionalFooter(doc, 'ОТВЕТСТВЕННЫЙ', 'ЗАКАЗЧИК', false);

    const fileName = `График_работ_${project.name.replace(/[^a-zA-Z0-9а-яё]/gi, '_')}_${PdfService.formatDate(new Date().toISOString()).replace(/\./g, '_')}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }

}

export { PdfService };
export default PdfService;
