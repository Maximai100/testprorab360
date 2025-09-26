import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate, Project, CompanyProfile, WorkStage, Item } from '../types';

// Расширяем типы для jsPDF с autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

class PdfService {
  private static readonly FONT_NAME = 'Roboto';

  // Cache loaded base64 font data to avoid repeated fetches
  private static fontCache: { regular?: string; bold?: string } = {};

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
    const [regularRes, boldRes] = await Promise.allSettled([
      this.loadFontBase64(`${prefix}fonts/Roboto-Regular.ttf`),
      this.loadFontBase64(`${prefix}fonts/Roboto-Bold.ttf`),
    ]);
    if (regularRes.status === 'fulfilled') {
      this.fontCache.regular = regularRes.value;
    }
    if (boldRes.status === 'fulfilled') {
      this.fontCache.bold = boldRes.value;
    }
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
   * Генерирует PDF для заявки поставщику
   */
  static async generateSupplierRequestPDF(requestItems: any[], companyProfile: CompanyProfile | null): Promise<void> {
    try {
      const doc = await PdfService.initializeDoc();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Шапка документа
      doc.setFontSize(16);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      try {
        doc.text('Заявка поставщику', pageWidth / 2, yPosition, { align: 'center' });
      } catch (error) {
        console.warn('Ошибка при добавлении заголовка:', error);
        doc.text('Zayavka postavshchiku', pageWidth / 2, yPosition, { align: 'center' });
      }
      yPosition += 15;

      // Информация о заказчике
      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      try {
        doc.text('Информация о заказе:', 14, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении подзаголовка:', error);
        doc.text('Informatsiya o zakaze:', 14, yPosition);
      }
      yPosition += 12;
      
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      try {
        doc.text(`Заказчик: ${companyProfile?.name || 'Не указан'}`, 14, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении заказчика:', error);
        doc.text(`Zakazchik: ${companyProfile?.name || 'Ne ukazan'}`, 14, yPosition);
      }
      yPosition += 10;
      
      if (companyProfile?.details) {
        // Разбиваем details на строки и добавляем каждую отдельно
        const detailsLines = companyProfile.details.split('\n');
        
        detailsLines.forEach((line, index) => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              // Разбиваем длинные строки на несколько строк
              const wrappedLines = PdfService.wrapText(doc, trimmedLine, pageWidth - 28);
              wrappedLines.forEach(wrappedLine => {
                try {
                  doc.text(wrappedLine, 14, yPosition);
                  yPosition += 8;
                } catch (textError) {
                  console.warn('Ошибка при добавлении текста, пропускаем строку:', textError);
                  yPosition += 8;
                }
              });
            } catch (wrapError) {
              console.warn('Ошибка при переносе текста, добавляем как есть:', wrapError);
              try {
                doc.text(trimmedLine, 14, yPosition);
                yPosition += 8;
              } catch (textError) {
                console.warn('Не удалось добавить текст:', textError);
                yPosition += 8;
              }
            }
          }
        });
        yPosition += 10; // Увеличенный отступ после details
      }
      
      try {
        doc.text(`Дата заявки: ${PdfService.formatDate(new Date().toISOString())}`, 14, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении даты:', error);
        doc.text(`Data zayavki: ${PdfService.formatDate(new Date().toISOString())}`, 14, yPosition);
      }
      yPosition += 20;

      // Проверяем, есть ли материалы для заявки
      if (!requestItems || requestItems.length === 0) {
        doc.setFontSize(12);
        PdfService.ensureCyrillicSupport(doc);
        try {
          doc.text('Нет материалов для заявки', 14, yPosition);
        } catch (error) {
          console.warn('Ошибка при добавлении сообщения о пустой заявке:', error);
          doc.text('Net materialov dlya zayavki', 14, yPosition);
        }
        yPosition += 20;
      } else {
        // Таблица материалов (без цен)
        const tableData = requestItems.map((item, index) => [
          (index + 1).toString(),
          item.name || 'Не указано',
          item.quantity ? item.quantity.toString() : '0',
          item.unit || 'шт',
          item.note || '-'
        ]);

        autoTable(doc, {
          head: [['№', 'Наименование материалов', 'Кол-во', 'Ед. изм.', 'Примечание']],
          body: tableData,
          startY: yPosition,
          styles: {
            fontSize: 9,
            font: PdfService.FONT_NAME,
            fontStyle: 'normal',
            cellPadding: 4,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold',
            font: PdfService.FONT_NAME,
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
            1: { cellWidth: 80, font: PdfService.FONT_NAME },
            2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
            3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
            4: { cellWidth: 40, font: PdfService.FONT_NAME },
          },
          didDrawPage: (data) => {
            // Добавляем поддержку кириллицы для каждой страницы
            PdfService.ensureCyrillicSupport(doc);
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 20;
      }

      // Подпись
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      try {
        doc.text('Подпись заказчика: _________________', 14, yPosition);
        doc.text('Дата: _________________', pageWidth - 80, yPosition);
      } catch (error) {
        console.warn('Ошибка при добавлении подписи:', error);
        doc.text('Podpis zakazchika: _________________', 14, yPosition);
        doc.text('Data: _________________', pageWidth - 80, yPosition);
      }

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
   * Генерирует PDF для сметы
   */
  static async generateEstimatePDF(
    estimate: Estimate,
    project: Project | null,
    companyProfile: CompanyProfile
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Профессиональная шапка документа

    // Логотип/название компании по центру (более крупно)
    doc.setFontSize(18);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile?.name || 'Документ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Детали компании по центру (мелким шрифтом)
    if (companyProfile?.details) {
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      const detailsLines = companyProfile.details.split('\n');
      detailsLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          try {
            const wrappedLines = PdfService.wrapText(doc, trimmedLine, pageWidth - 40);
            wrappedLines.forEach(wrappedLine => {
              doc.text(wrappedLine, pageWidth / 2, yPosition, { align: 'center' });
              yPosition += 6;
            });
          } catch (error) {
            console.warn('Ошибка при переносе текста компании:', error);
            doc.text(trimmedLine, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
          }
        }
      });
      yPosition += 10;
    }

    // Разделительная линия
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Заголовок сметы
    doc.setFontSize(16);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(`СМЕТА № ${estimate.number}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`от ${PdfService.formatDate(estimate.date)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Профессиональная секция информации о заказе
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИНФОРМАЦИЯ О ЗАКАЗЕ', 20, yPosition);
    yPosition += 12;

    // Улучшенная рамка для информации о заказе
    const infoBoxY = yPosition;
    const infoBoxHeight = 30;
    const infoBoxWidth = pageWidth - 40;
    
    // Тень рамки
    doc.setFillColor(240, 240, 240);
    doc.rect(22, infoBoxY + 2, infoBoxWidth, infoBoxHeight, 'F');
    
    // Основная рамка
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.rect(20, infoBoxY, infoBoxWidth, infoBoxHeight);

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${estimate.clientInfo}`, 25, yPosition + 8);
    
    if (project) {
      doc.text(`Объект: ${project.address}`, 25, yPosition + 18);
    }

    yPosition += infoBoxHeight + 20;

    const tableData = estimate.items.map((item: Item, index: number) => [
      index + 1,
      item.name,
      item.quantity.toString(),
      item.unit,
      PdfService.formatCurrency(item.price),
      PdfService.formatCurrency(item.quantity * item.price)
    ]);

    autoTable(doc, {
      head: [['№', 'Наименование работ/материалов', 'Кол-во', 'Ед. изм.', 'Цена за ед.', 'Сумма']],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        font: PdfService.FONT_NAME,
        fontStyle: 'normal',
        cellPadding: 5,
        lineWidth: 0.2,
        lineColor: [180, 180, 180],
        halign: 'left',
      },
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
        font: PdfService.FONT_NAME,
        halign: 'center',
        cellPadding: 6,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
        1: { cellWidth: 75, font: PdfService.FONT_NAME, valign: 'top' },
        2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        4: { halign: 'right', cellWidth: 30, font: PdfService.FONT_NAME },
        5: { halign: 'right', cellWidth: 30, font: PdfService.FONT_NAME },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 20, right: 20 },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.3,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountAmount = estimate.discountType === 'percent'
      ? subtotal * (estimate.discount / 100)
      : estimate.discount;
    const totalAfterDiscount = subtotal - discountAmount;
    const taxAmount = totalAfterDiscount * (estimate.tax / 100);
    const grandTotal = totalAfterDiscount + taxAmount;

    // Улучшенная секция итогов
    const totalsBoxY = finalY;
    const totalsBoxWidth = 90;
    const totalsBoxHeight = 45;
    
    // Тень для рамки итогов
    doc.setFillColor(235, 235, 235);
    doc.rect(pageWidth - totalsBoxWidth - 18, totalsBoxY + 2, totalsBoxWidth, totalsBoxHeight, 'F');
    
    // Основная рамка для итогов
    doc.setLineWidth(0.8);
    doc.setDrawColor(60, 60, 60);
    doc.rect(pageWidth - totalsBoxWidth - 20, totalsBoxY, totalsBoxWidth, totalsBoxHeight);
    
    // Заголовок секции итогов
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('РАСЧЕТ', pageWidth - totalsBoxWidth - 15, totalsBoxY + 8);

    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);

    let currentY = totalsBoxY + 18;
    const rightAlignX = pageWidth - 25;
    
    // Подытог
    doc.text('Подытог:', pageWidth - totalsBoxWidth - 15, currentY);
    doc.text(PdfService.formatCurrency(subtotal), rightAlignX, currentY, { align: 'right' });
    currentY += 7;

    // Скидка (если есть)
    if (discountAmount > 0) {
      doc.text(
        `Скидка (${estimate.discountType === 'percent' ? `${estimate.discount}%` : PdfService.formatCurrency(estimate.discount)}):`,
        pageWidth - totalsBoxWidth - 15,
        currentY
      );
      doc.text(`-${PdfService.formatCurrency(discountAmount)}`, rightAlignX, currentY, { align: 'right' });
      currentY += 7;
    }

    // Налог (если есть)
    if (taxAmount > 0) {
      doc.text(`НДС (${estimate.tax}%):`, pageWidth - totalsBoxWidth - 15, currentY);
      doc.text(`+${PdfService.formatCurrency(taxAmount)}`, rightAlignX, currentY, { align: 'right' });
      currentY += 7;
    }

    // Разделительная линия перед итогом
    doc.setLineWidth(0.3);
    doc.setDrawColor(100, 100, 100);
    doc.line(pageWidth - totalsBoxWidth - 15, currentY - 2, pageWidth - 25, currentY - 2);

    // Итоговая сумма (выделена)
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИТОГО:', pageWidth - totalsBoxWidth - 15, currentY + 5);
    doc.text(PdfService.formatCurrency(grandTotal), rightAlignX, currentY + 5, { align: 'right' });

    // Улучшенный профессиональный подвал
    const footerY = pageHeight - 60;
    
    // Разделительная линия перед подписью
    doc.setLineWidth(0.5);
    doc.setDrawColor(120, 120, 120);
    doc.line(20, footerY - 15, pageWidth - 20, footerY - 15);
    
    // Блок подписей с рамками
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    
    // Исполнитель слева
    const leftBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, leftBoxY, 80, 25);
    
    doc.text('ИСПОЛНИТЕЛЬ:', 25, leftBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 25, leftBoxY + 16);
    doc.text('(подпись)', 25, leftBoxY + 22);
    
    // Заказчик справа
    const rightBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(pageWidth - 100, rightBoxY, 80, 25);
    
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ЗАКАЗЧИК:', pageWidth - 95, rightBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 95, rightBoxY + 16);
    doc.text('(подпись)', pageWidth - 95, rightBoxY + 22);

    const fileName = `Смета_${estimate.number}_${PdfService.formatDate(estimate.date)}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }


  /**
   * Генерирует PDF для акта выполненных работ
   */
  static async generateActPDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile,
    totalAmount: number
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Профессиональная шапка документа
    doc.setFontSize(18);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    if (companyProfile.details) {
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      const detailsLines = companyProfile.details.split('\n');
      detailsLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          try {
            const wrappedLines = PdfService.wrapText(doc, trimmedLine, pageWidth - 40);
            wrappedLines.forEach(wrappedLine => {
              doc.text(wrappedLine, pageWidth / 2, yPosition, { align: 'center' });
              yPosition += 6;
            });
          } catch (error) {
            console.warn('Ошибка при переносе текста компании:', error);
            doc.text(trimmedLine, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
          }
        }
      });
      yPosition += 10;
    }

    // Разделительная линия
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Заголовок акта
    doc.setFontSize(16);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('АКТ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('о приемке выполненных работ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    const actNumber = `АКТ-${project.id.slice(-6).toUpperCase()}`;
    const currentDate = PdfService.formatDate(new Date().toISOString());

    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Акт № ${actNumber} от ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Информация о проекте в рамке
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИНФОРМАЦИЯ О ПРОЕКТЕ', 20, yPosition);
    yPosition += 12;

    // Рамка для информации о проекте
    const infoBoxY = yPosition;
    const infoBoxHeight = 35;
    const infoBoxWidth = pageWidth - 40;
    
    // Тень рамки
    doc.setFillColor(240, 240, 240);
    doc.rect(22, infoBoxY + 2, infoBoxWidth, infoBoxHeight, 'F');
    
    // Основная рамка
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.rect(20, infoBoxY, infoBoxWidth, infoBoxHeight);

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 25, yPosition + 8);
    doc.text(`Заказчик: ${project.client}`, 25, yPosition + 18);
    doc.text(`Адрес объекта: ${project.address}`, 25, yPosition + 28);

    yPosition += infoBoxHeight + 20;

    const completedStages = workStages.filter(stage => stage.status === 'completed');

    if (completedStages.length > 0) {
      const tableData = completedStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        PdfService.formatDate(stage.startDate),
        stage.endDate ? PdfService.formatDate(stage.endDate) : 'В процессе'
      ]);

      autoTable(doc, {
        head: [['№', 'Наименование этапа', 'Дата начала', 'Дата завершения']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 9,
          font: PdfService.FONT_NAME,
          fontStyle: 'normal',
          cellPadding: 5,
          lineWidth: 0.2,
          lineColor: [180, 180, 180],
          halign: 'left',
        },
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
          font: PdfService.FONT_NAME,
          halign: 'center',
          cellPadding: 6,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
          1: { cellWidth: 80, font: PdfService.FONT_NAME },
          2: { halign: 'center', cellWidth: 40, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 40, font: PdfService.FONT_NAME },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 20, right: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.3,
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;

      // Итоговая сумма в рамке
      const totalBoxY = finalY;
      const totalBoxWidth = 120;
      const totalBoxHeight = 25;
      
      // Тень для рамки итогов
      doc.setFillColor(235, 235, 235);
      doc.rect(pageWidth/2 - totalBoxWidth/2 + 2, totalBoxY + 2, totalBoxWidth, totalBoxHeight, 'F');
      
      // Основная рамка для итогов
      doc.setLineWidth(0.8);
      doc.setDrawColor(60, 60, 60);
      doc.rect(pageWidth/2 - totalBoxWidth/2, totalBoxY, totalBoxWidth, totalBoxHeight);
      
      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text(`Всего выполнено работ на сумму: ${PdfService.formatCurrency(totalAmount)}`, pageWidth / 2, totalBoxY + 15, { align: 'center' });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Выполненные этапы работ отсутствуют.', 20, yPosition);
    }

    // Улучшенный подвал акта
    const footerY = pageHeight - 60;
    
    // Разделительная линия перед подписью
    doc.setLineWidth(0.5);
    doc.setDrawColor(120, 120, 120);
    doc.line(20, footerY - 15, pageWidth - 20, footerY - 15);
    
    // Блок подписей с рамками
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    
    // Исполнитель слева
    const leftBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, leftBoxY, 80, 25);
    
    doc.text('ИСПОЛНИТЕЛЬ:', 25, leftBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 25, leftBoxY + 16);
    doc.text('(подпись)', 25, leftBoxY + 22);
    doc.text('М.П.', 25, leftBoxY + 28);
    
    // Заказчик справа
    const rightBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(pageWidth - 100, rightBoxY, 80, 25);
    
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ЗАКАЗЧИК:', pageWidth - 95, rightBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 95, rightBoxY + 16);
    doc.text('(подпись)', pageWidth - 95, rightBoxY + 22);

    const fileName = `Акт_${actNumber}_${currentDate}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }


  /**
   * Генерирует PDF для графика работ
   */
  static async generateWorkSchedulePDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile
  ): Promise<void> {
    const doc = await PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Профессиональная шапка документа
    doc.setFontSize(18);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    if (companyProfile.details) {
      doc.setFontSize(9);
      PdfService.ensureCyrillicSupport(doc);
      const detailsLines = companyProfile.details.split('\n');
      detailsLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          try {
            const wrappedLines = PdfService.wrapText(doc, trimmedLine, pageWidth - 40);
            wrappedLines.forEach(wrappedLine => {
              doc.text(wrappedLine, pageWidth / 2, yPosition, { align: 'center' });
              yPosition += 6;
            });
          } catch (error) {
            console.warn('Ошибка при переносе текста компании:', error);
            doc.text(trimmedLine, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
          }
        }
      });
      yPosition += 10;
    }

    // Разделительная линия
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 15;

    // Заголовок графика
    doc.setFontSize(16);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ГРАФИК ВЫПОЛНЕНИЯ РАБОТ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Информация о проекте в рамке
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИНФОРМАЦИЯ О ПРОЕКТЕ', 20, yPosition);
    yPosition += 12;

    // Рамка для информации о проекте
    const infoBoxY = yPosition;
    const infoBoxHeight = 35;
    const infoBoxWidth = pageWidth - 40;
    
    // Тень рамки
    doc.setFillColor(240, 240, 240);
    doc.rect(22, infoBoxY + 2, infoBoxWidth, infoBoxHeight, 'F');
    
    // Основная рамка
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.rect(20, infoBoxY, infoBoxWidth, infoBoxHeight);

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 25, yPosition + 8);
    doc.text(`Заказчик: ${project.client}`, 25, yPosition + 18);
    doc.text(`Адрес объекта: ${project.address}`, 25, yPosition + 28);

    yPosition += infoBoxHeight + 20;

    if (workStages.length > 0) {
      const tableData = workStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        PdfService.formatDate(stage.startDate),
        stage.endDate ? PdfService.formatDate(stage.endDate) : 'В процессе',
        stage.status === 'completed' ? 'Завершен'
          : stage.status === 'in_progress' ? 'В работе'
          : 'Планируется',
        `${Math.round(stage.progress ?? 0)}%`
      ]);

      autoTable(doc, {
        head: [['№', 'Наименование этапа', 'Дата начала', 'Дата завершения', 'Статус', 'Прогресс']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 8,
          font: PdfService.FONT_NAME,
          fontStyle: 'normal',
          cellPadding: 4,
          lineWidth: 0.2,
          lineColor: [180, 180, 180],
          halign: 'left',
        },
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          font: PdfService.FONT_NAME,
          halign: 'center',
          cellPadding: 5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12, font: PdfService.FONT_NAME },
          1: { cellWidth: 65, font: PdfService.FONT_NAME },
          2: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME },
          4: { halign: 'center', cellWidth: 25, font: PdfService.FONT_NAME },
          5: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 20, right: 20 },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.3,
      });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Этапы работ не добавлены.', 20, yPosition);
    }

    // Улучшенный подвал графика
    const footerY = pageHeight - 60;
    
    // Разделительная линия перед подписью
    doc.setLineWidth(0.5);
    doc.setDrawColor(120, 120, 120);
    doc.line(20, footerY - 15, pageWidth - 20, footerY - 15);
    
    // Блок подписей с рамками
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    
    // Ответственный слева
    const leftBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(20, leftBoxY, 80, 25);
    
    doc.text('ОТВЕТСТВЕННЫЙ:', 25, leftBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 25, leftBoxY + 16);
    doc.text('(подпись)', 25, leftBoxY + 22);
    
    // Заказчик справа
    const rightBoxY = footerY - 5;
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(pageWidth - 100, rightBoxY, 80, 25);
    
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ЗАКАЗЧИК:', pageWidth - 95, rightBoxY + 8);
    doc.setFontSize(9);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 95, rightBoxY + 16);
    doc.text('(подпись)', pageWidth - 95, rightBoxY + 22);

    const fileName = `График_работ_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${PdfService.formatDate(new Date().toISOString())}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }

}

export { PdfService };
export default PdfService;
