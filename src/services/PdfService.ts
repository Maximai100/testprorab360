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

  // Приватный статический метод для инициализации документа со шрифтом
  private static initializeDoc(): jsPDF {
    const doc = new jsPDF();

    // Используем встроенный шрифт jsPDF с поддержкой кириллицы
    // Times поддерживает кириллицу в jsPDF
    doc.setFont('times', 'normal');

    return doc;
  }

  private static ensureCyrillicSupport(doc: jsPDF): void {
    // Устанавливаем шрифт для поддержки кириллицы перед каждым текстом
    doc.setFont('times', 'normal');
  }

  /**
   * Генерирует PDF для сметы
   */
  static generateEstimatePDF(
    estimate: Estimate,
    project: Project | null,
    companyProfile: CompanyProfile
  ): void {
    const doc = PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Шапка документа
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    this.ensureCyrillicSupport(doc);
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (companyProfile.details) {
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      this.ensureCyrillicSupport(doc);
      doc.text(companyProfile.details, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Заголовок сметы
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    this.ensureCyrillicSupport(doc);
    doc.text(`Смета № ${estimate.number}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    this.ensureCyrillicSupport(doc);
    doc.text(`Дата: ${this.formatDate(estimate.date)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Информация о клиенте и объекте
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    this.ensureCyrillicSupport(doc);
    doc.text('Информация о заказе:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    this.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${estimate.clientInfo}`, 20, yPosition);
    yPosition += 8;

    if (project) {
      this.ensureCyrillicSupport(doc);
      doc.text(`Объект: ${project.address}`, 20, yPosition);
      yPosition += 8;
    }

    yPosition += 10;

    // Таблица позиций
    const tableData = estimate.items.map((item: Item, index: number) => [
      index + 1,
      item.name,
      item.quantity.toString(),
      item.unit,
      this.formatCurrency(item.price),
      this.formatCurrency(item.quantity * item.price)
    ]);

    autoTable(doc, {
      head: [['№', 'Наименование работ/материалов', 'Кол-во', 'Ед. изм.', 'Цена за ед.', 'Сумма']],
      body: tableData,
      startY: yPosition,
      styles: {
        fontSize: 9,
        font: 'times',
        fontStyle: 'normal',
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
        font: 'times',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, font: 'Roboto' },
        1: { cellWidth: 60, font: 'Roboto' },
        2: { halign: 'center', cellWidth: 20, font: 'Roboto' },
        3: { halign: 'center', cellWidth: 20, font: 'Roboto' },
        4: { halign: 'right', cellWidth: 25, font: 'Roboto' },
        5: { halign: 'right', cellWidth: 25, font: 'Roboto' },
      },
    });

    // Получаем позицию после таблицы
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Расчет итогов
    const subtotal = estimate.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const discountAmount = estimate.discountType === 'percent' 
      ? subtotal * (estimate.discount / 100) 
      : estimate.discount;
    const totalAfterDiscount = subtotal - discountAmount;
    const taxAmount = totalAfterDiscount * (estimate.tax / 100);
    const grandTotal = totalAfterDiscount + taxAmount;

    // Итоги
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    
    let currentY = finalY;
    this.ensureCyrillicSupport(doc);
    doc.text('Подытог:', pageWidth - 100, currentY);
    this.ensureCyrillicSupport(doc);
    doc.text(this.formatCurrency(subtotal), pageWidth - 20, currentY, { align: 'right' });
    currentY += 8;

    if (discountAmount > 0) {
      this.ensureCyrillicSupport(doc);
      doc.text(`Скидка (${estimate.discountType === 'percent' ? `${estimate.discount}%` : this.formatCurrency(estimate.discount)}):`, pageWidth - 100, currentY);
      this.ensureCyrillicSupport(doc);
      doc.text(`-${this.formatCurrency(discountAmount)}`, pageWidth - 20, currentY, { align: 'right' });
      currentY += 8;
    }

    if (taxAmount > 0) {
      this.ensureCyrillicSupport(doc);
      doc.text(`Налог (${estimate.tax}%):`, pageWidth - 100, currentY);
      this.ensureCyrillicSupport(doc);
      doc.text(`+${this.formatCurrency(taxAmount)}`, pageWidth - 20, currentY, { align: 'right' });
      currentY += 8;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    this.ensureCyrillicSupport(doc);
    doc.text('ИТОГО к оплате:', pageWidth - 100, currentY);
    this.ensureCyrillicSupport(doc);
    doc.text(this.formatCurrency(grandTotal), pageWidth - 20, currentY, { align: 'right' });

    // Подвал с подписями
    const footerY = pageHeight - 40;
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    
    this.ensureCyrillicSupport(doc);
    doc.text('Исполнитель:', 20, footerY);
    this.ensureCyrillicSupport(doc);
    doc.text('_________________', 20, footerY + 15);
    
    this.ensureCyrillicSupport(doc);
    doc.text('Заказчик:', pageWidth - 100, footerY);
    this.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 100, footerY + 15);

    // Сохраняем PDF
    const fileName = `Смета_${estimate.number}_${this.formatDate(estimate.date)}.pdf`;
    doc.save(fileName);
  }

  /**
   * Генерирует PDF для акта выполненных работ
   */
  static generateActPDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile,
    totalAmount: number
  ): void {
    const doc = PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Шапка документа
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    this.ensureCyrillicSupport(doc);
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (companyProfile.details) {
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      this.ensureCyrillicSupport(doc);
      doc.text(companyProfile.details, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Заголовок акта
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    this.ensureCyrillicSupport(doc);
    doc.text('АКТ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    this.ensureCyrillicSupport(doc);
    doc.text('о приемке выполненных работ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Номер акта и дата
    const actNumber = `АКТ-${project.id.slice(-6).toUpperCase()}`;
    const currentDate = this.formatDate(new Date().toISOString());
    
    this.ensureCyrillicSupport(doc);
    doc.text(`Акт № ${actNumber} от ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Информация о проекте
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    this.ensureCyrillicSupport(doc);
    doc.text('Информация о проекте:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    this.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 20, yPosition);
    yPosition += 8;
    this.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${project.client}`, 20, yPosition);
    yPosition += 8;
    this.ensureCyrillicSupport(doc);
    doc.text(`Адрес объекта: ${project.address}`, 20, yPosition);
    yPosition += 15;

    // Таблица выполненных этапов
    const completedStages = workStages.filter(stage => stage.status === 'completed');
    
    if (completedStages.length > 0) {
      const tableData = completedStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        this.formatDate(stage.startDate),
        stage.endDate ? this.formatDate(stage.endDate) : 'В процессе'
      ]);

      autoTable(doc, {
        head: [['№', 'Наименование этапа', 'Дата начала', 'Дата завершения']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 9,
          font: 'times',
          fontStyle: 'normal',
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
          font: 'times',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15, font: 'Roboto' },
          1: { cellWidth: 80, font: 'Roboto' },
          2: { halign: 'center', cellWidth: 40, font: 'Roboto' },
          3: { halign: 'center', cellWidth: 40, font: 'Roboto' },
        },
      });

      // Получаем позицию после таблицы
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      // Итоговая сумма
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      this.ensureCyrillicSupport(doc);
      doc.text(`Всего выполнено работ на сумму: ${this.formatCurrency(totalAmount)}`, pageWidth / 2, finalY, { align: 'center' });
    } else {
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      this.ensureCyrillicSupport(doc);
      doc.text('Выполненные этапы работ отсутствуют.', 20, yPosition);
    }

    // Подвал с подписями и печатью
    const footerY = pageHeight - 60;
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    
    this.ensureCyrillicSupport(doc);
    doc.text('Исполнитель:', 20, footerY);
    this.ensureCyrillicSupport(doc);
    doc.text('_________________', 20, footerY + 15);
    this.ensureCyrillicSupport(doc);
    doc.text('М.П.', 20, footerY + 30);
    
    this.ensureCyrillicSupport(doc);
    doc.text('Заказчик:', pageWidth - 100, footerY);
    this.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 100, footerY + 15);

    // Сохраняем PDF
    const fileName = `Акт_${actNumber}_${currentDate}.pdf`;
    doc.save(fileName);
  }

  /**
   * Генерирует PDF для графика работ
   */
  static generateWorkSchedulePDF(
    project: Project,
    workStages: WorkStage[],
    companyProfile: CompanyProfile
  ): void {
    const doc = PdfService.initializeDoc();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Шапка документа
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    PdfService.ensureCyrillicSupport(doc);
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (companyProfile.details) {
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      PdfService.ensureCyrillicSupport(doc);
      doc.text(companyProfile.details, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Заголовок графика работ
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    PdfService.ensureCyrillicSupport(doc);
    doc.text('ГРАФИК ВЫПОЛНЕНИЯ РАБОТ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Информация о проекте
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    PdfService.ensureCyrillicSupport(doc);
    doc.text('Информация о проекте:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 20, yPosition);
    yPosition += 8;
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${project.client}`, 20, yPosition);
    yPosition += 8;
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Адрес объекта: ${project.address}`, 20, yPosition);
    yPosition += 15;

    // Таблица этапов работ
    if (workStages.length > 0) {
      const tableData = workStages.map((stage: WorkStage, index: number) => [
        index + 1,
        stage.title,
        stage.description || '',
        PdfService.formatDate(stage.startDate),
        stage.endDate ? PdfService.formatDate(stage.endDate) : 'В процессе',
        stage.status === 'completed' ? 'Завершен' : 
        stage.status === 'in_progress' ? 'В работе' : 'Планируется'
      ]);

      autoTable(doc, {
        head: [['№', 'Наименование этапа', 'Описание', 'Дата начала', 'Дата завершения', 'Статус']],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 9,
          font: 'times',
          fontStyle: 'normal',
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
          font: 'times',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15, font: 'helvetica' },
          1: { cellWidth: 50, font: 'helvetica' },
          2: { cellWidth: 40, font: 'helvetica' },
          3: { halign: 'center', cellWidth: 30, font: 'helvetica' },
          4: { halign: 'center', cellWidth: 30, font: 'helvetica' },
          5: { halign: 'center', cellWidth: 25, font: 'helvetica' },
        },
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Этапы работ не добавлены.', 20, yPosition);
    }

    // Подвал с подписями
    const footerY = pageHeight - 40;
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    
    PdfService.ensureCyrillicSupport(doc);
    doc.text('Ответственный:', 20, footerY);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', 20, footerY + 15);
    
    PdfService.ensureCyrillicSupport(doc);
    doc.text('Заказчик:', pageWidth - 100, footerY);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('_________________', pageWidth - 100, footerY + 15);

    // Сохраняем PDF
    const fileName = `График_работ_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${PdfService.formatDate(new Date().toISOString())}.pdf`;
    doc.save(fileName);
  }
}

export { PdfService };
export default new PdfService();