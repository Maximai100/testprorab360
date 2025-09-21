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

  // Приватный статический метод для инициализации документа со шрифтом
  private static async initializeDoc(): Promise<jsPDF> {
    const doc = new jsPDF();
    await PdfService.ensureFontsLoaded();
    PdfService.addFontsToDoc(doc);
    PdfService.ensureCyrillicSupport(doc);
    return doc;
  }

  private static ensureCyrillicSupport(doc: jsPDF, style: 'normal' | 'bold' = 'normal'): void {
    // Ensure fonts added to this doc instance (idempotent)
    PdfService.addFontsToDoc(doc);
    doc.setFont(PdfService.FONT_NAME, style);
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

    // Шапка документа
    doc.setFontSize(16);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (companyProfile.details) {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text(companyProfile.details, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Заголовок сметы
    doc.setFontSize(14);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(`Смета № ${estimate.number}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Дата: ${PdfService.formatDate(estimate.date)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Информация о клиенте и объекте
    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('Информация о заказе:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Заказчик: ${estimate.clientInfo}`, 20, yPosition);
    yPosition += 8;

    if (project) {
      PdfService.ensureCyrillicSupport(doc);
      doc.text(`Объект: ${project.address}`, 20, yPosition);
      yPosition += 8;
    }

    yPosition += 10;

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
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
        font: PdfService.FONT_NAME,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
        1: { cellWidth: 60, font: PdfService.FONT_NAME },
        2: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        3: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        4: { halign: 'right', cellWidth: 25, font: PdfService.FONT_NAME },
        5: { halign: 'right', cellWidth: 25, font: PdfService.FONT_NAME },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountAmount = estimate.discountType === 'percent'
      ? subtotal * (estimate.discount / 100)
      : estimate.discount;
    const totalAfterDiscount = subtotal - discountAmount;
    const taxAmount = totalAfterDiscount * (estimate.tax / 100);
    const grandTotal = totalAfterDiscount + taxAmount;

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);

    let currentY = finalY;
    doc.text('Подытог:', pageWidth - 100, currentY);
    doc.text(PdfService.formatCurrency(subtotal), pageWidth - 20, currentY, { align: 'right' });
    currentY += 8;

    if (discountAmount > 0) {
      doc.text(
        `Скидка (${estimate.discountType === 'percent' ? `${estimate.discount}%` : PdfService.formatCurrency(estimate.discount)}):`,
        pageWidth - 100,
        currentY
      );
      doc.text(`-${PdfService.formatCurrency(discountAmount)}`, pageWidth - 20, currentY, { align: 'right' });
      currentY += 8;
    }

    if (taxAmount > 0) {
      doc.text(`Налог (${estimate.tax}%):`, pageWidth - 100, currentY);
      doc.text(`+${PdfService.formatCurrency(taxAmount)}`, pageWidth - 20, currentY, { align: 'right' });
      currentY += 8;
    }

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ИТОГО к оплате:', pageWidth - 100, currentY);
    doc.text(PdfService.formatCurrency(grandTotal), pageWidth - 20, currentY, { align: 'right' });

    const footerY = pageHeight - 40;
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('Исполнитель:', 20, footerY);
    doc.text('_________________', 20, footerY + 15);

    PdfService.ensureCyrillicSupport(doc);
    doc.text('Заказчик:', pageWidth - 100, footerY);
    doc.text('_________________', pageWidth - 100, footerY + 15);

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

    doc.setFontSize(16);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (companyProfile.details) {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text(companyProfile.details, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    doc.setFontSize(14);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('АКТ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('о приемке выполненных работ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    const actNumber = `АКТ-${project.id.slice(-6).toUpperCase()}`;
    const currentDate = PdfService.formatDate(new Date().toISOString());

    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Акт № ${actNumber} от ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('Информация о проекте:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Заказчик: ${project.client}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Адрес объекта: ${project.address}`, 20, yPosition);
    yPosition += 15;

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
          cellPadding: 3,
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
          2: { halign: 'center', cellWidth: 40, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 40, font: PdfService.FONT_NAME },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      PdfService.ensureCyrillicSupport(doc, 'bold');
      doc.text(`Всего выполнено работ на сумму: ${PdfService.formatCurrency(totalAmount)}`, pageWidth / 2, finalY, { align: 'center' });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Выполненные этапы работ отсутствуют.', 20, yPosition);
    }

    const footerY = pageHeight - 60;
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('Исполнитель:', 20, footerY);
    doc.text('_________________', 20, footerY + 15);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('М.П.', 20, footerY + 30);

    PdfService.ensureCyrillicSupport(doc);
    doc.text('Заказчик:', pageWidth - 100, footerY);
    doc.text('_________________', pageWidth - 100, footerY + 15);

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

    doc.setFontSize(16);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text(companyProfile.name, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (companyProfile.details) {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text(companyProfile.details, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    doc.setFontSize(14);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('ГРАФИК ВЫПОЛНЕНИЯ РАБОТ', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(12);
    PdfService.ensureCyrillicSupport(doc, 'bold');
    doc.text('Информация о проекте:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text(`Проект: ${project.name}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Заказчик: ${project.client}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Адрес объекта: ${project.address}`, 20, yPosition);
    yPosition += 15;

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
          fontSize: 9,
          font: PdfService.FONT_NAME,
          fontStyle: 'normal',
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
          font: PdfService.FONT_NAME,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15, font: PdfService.FONT_NAME },
          1: { cellWidth: 65, font: PdfService.FONT_NAME },
          2: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME },
          3: { halign: 'center', cellWidth: 30, font: PdfService.FONT_NAME },
          4: { halign: 'center', cellWidth: 25, font: PdfService.FONT_NAME },
          5: { halign: 'center', cellWidth: 20, font: PdfService.FONT_NAME },
        },
      });
    } else {
      doc.setFontSize(10);
      PdfService.ensureCyrillicSupport(doc);
      doc.text('Этапы работ не добавлены.', 20, yPosition);
    }

    const footerY = pageHeight - 40;
    doc.setFontSize(10);
    PdfService.ensureCyrillicSupport(doc);
    doc.text('Ответственный:', 20, footerY);
    doc.text('_________________', 20, footerY + 15);

    PdfService.ensureCyrillicSupport(doc);
    doc.text('Заказчик:', pageWidth - 100, footerY);
    doc.text('_________________', pageWidth - 100, footerY + 15);

    const fileName = `График_работ_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${PdfService.formatDate(new Date().toISOString())}.pdf`;
    doc.save(fileName);
    return Promise.resolve();
  }

}

export { PdfService };
export default PdfService;
