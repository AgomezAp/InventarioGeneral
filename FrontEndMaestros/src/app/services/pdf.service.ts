import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ActaEntrega } from '../interfaces/inventario';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  // ──────────────────── Colores ────────────────────
  private readonly C_BLUE_HEADER = [15, 76, 129] as [number, number, number];
  private readonly C_BLUE_LIGHT = [214, 234, 248] as [number, number, number];
  private readonly C_RED_HEADER = [150, 30, 30] as [number, number, number];
  private readonly C_RED_LIGHT = [253, 237, 237] as [number, number, number];
  private readonly C_GRAY_ROW = [245, 245, 245] as [number, number, number];
  private readonly C_WHITE = [255, 255, 255] as [number, number, number];
  private readonly C_DARK = [30, 30, 30] as [number, number, number];
  private readonly C_MID = [100, 100, 100] as [number, number, number];
  private readonly C_BORDER = [180, 180, 180] as [number, number, number];

  // ════════════════════════════════════════════════
  //   ACTA DE ENTREGA
  // ════════════════════════════════════════════════
  generarActaEntrega(acta: ActaEntrega): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210;
    const ML = 15;
    const MR = PW - ML;
    const CW = MR - ML;
    let y = 0;

    // ── Cabecera ─────────────────────────────────
    doc.setFillColor(...this.C_BLUE_HEADER);
    doc.rect(0, 0, PW, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SISTEMA DE GESTIÓN DE INVENTARIO', ML, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS', ML, 18);

    // Número de acta (derecha)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(acta.numeroActa || '', MR, 11, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const fechaEmision = this.formatFecha(acta.fechaEntrega);
    doc.text(`Fecha: ${fechaEmision}`, MR, 18, { align: 'right' });

    // Badge de estado
    const estadoLabel = this.getEstadoLabel(acta.estado || '');
    const estadoColor = this.getEstadoColorEntrega(acta.estado || '');
    doc.setFillColor(...estadoColor);
    doc.roundedRect(MR - 38, 20, 38, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(estadoLabel.toUpperCase(), MR - 19, 25, { align: 'center' });

    y = 35;

    // ── Sección: Datos del Receptor ───────────────
    y = this.sectionHeader(doc, 'DATOS DEL RECEPTOR', ML, y, CW, this.C_BLUE_HEADER);

    const receptor: [string, string][] = [
      ['Nombre completo:', acta.nombreReceptor || '—'],
      ['Cargo:', acta.cargoReceptor || '—'],
      ['Área:', (acta as any).areaReceptor || '—'],
      ['Documento de identidad:', acta.cedulaReceptor || '—'],
      ['Correo electrónico:', acta.correoReceptor || '—'],
    ];

    if (acta.telefonoReceptor) {
      receptor.push(['Teléfono:', acta.telefonoReceptor]);
    }

    y = this.infoGrid(doc, receptor, ML, y, CW);

    // ── Sección: Equipos Entregados ───────────────
    y += 4;
    y = this.sectionHeader(doc, 'EQUIPOS ENTREGADOS', ML, y, CW, this.C_BLUE_HEADER);

    const filas =
      acta.detalles?.map((d, i) => {
        const dev = d.dispositivo;
        const nombre = dev
          ? dev.nombre || [dev.marca, dev.modelo].filter(Boolean).join(' ') || `ID #${dev.id}`
          : '—';
        return [
          String(i + 1),
          dev?.categoria || '—',
          nombre,
          dev?.serial || '—',
          dev?.imei || '—',
          d.condicionEntrega || '—',
        ];
      }) || [];

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: ML },
      head: [['#', 'Categoría', 'Descripción', 'Serial', 'IMEI', 'Condición']],
      body: filas,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: this.C_DARK,
        lineColor: this.C_BORDER,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: this.C_BLUE_HEADER,
        textColor: this.C_WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: this.C_GRAY_ROW },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ── Sección: Observaciones ────────────────────
    if (acta.observacionesEntrega) {
      if (y > 240) { doc.addPage(); y = 15; }
      y = this.sectionHeader(doc, 'OBSERVACIONES', ML, y, CW, this.C_BLUE_HEADER);
      doc.setFillColor(...this.C_BLUE_LIGHT);
      const obsLines = doc.splitTextToSize(acta.observacionesEntrega, CW - 6);
      const obsH = obsLines.length * 5 + 6;
      doc.rect(ML, y, CW, obsH, 'F');
      doc.setTextColor(...this.C_DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(obsLines, ML + 3, y + 5);
      y += obsH + 5;
    }

    // ── Sección: Firmas ───────────────────────────
    y = this.ensureSpace(doc, y, 50);
    y = this.sectionHeader(doc, 'FIRMAS', ML, y, CW, this.C_BLUE_HEADER);

    const W2 = (CW - 8) / 2;

    // Firma Receptor
    if (acta.firmaReceptor) {
      try {
        doc.addImage(acta.firmaReceptor, 'PNG', ML, y, W2, 22);
      } catch {}
    } else {
      doc.setDrawColor(...this.C_BORDER);
      doc.setFillColor(250, 250, 250);
      doc.rect(ML, y, W2, 22, 'FD');
      doc.setTextColor(...this.C_MID);
      doc.setFontSize(7.5);
      doc.text('Firma Receptor', ML + W2 / 2, y + 13, { align: 'center' });
    }

    doc.setDrawColor(...this.C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 24, ML + W2, y + 24);
    doc.setTextColor(...this.C_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(acta.nombreReceptor || '', ML + W2 / 2, y + 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...this.C_MID);
    doc.text(acta.cargoReceptor || '', ML + W2 / 2, y + 32, { align: 'center' });
    if (acta.fechaFirma) {
      doc.text(`Firmado: ${this.formatFecha(acta.fechaFirma)}`, ML + W2 / 2, y + 36, { align: 'center' });
    }

    // Firma Responsable (sistema)
    const X2 = ML + W2 + 8;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(...this.C_BORDER);
    doc.rect(X2, y, W2, 22, 'FD');
    doc.setTextColor(...this.C_MID);
    doc.setFontSize(7.5);
    doc.text('Firma Responsable', X2 + W2 / 2, y + 13, { align: 'center' });

    doc.setDrawColor(...this.C_BORDER);
    doc.line(X2, y + 24, X2 + W2, y + 24);
    doc.setTextColor(...this.C_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Departamento de Sistemas', X2 + W2 / 2, y + 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...this.C_MID);
    doc.text('Responsable del Inventario', X2 + W2 / 2, y + 32, { align: 'center' });

    // ── Pie de página ─────────────────────────────
    this.footer(doc, acta.numeroActa || '');

    doc.save(`${acta.numeroActa || 'acta-entrega'}.pdf`);
  }

  // ════════════════════════════════════════════════
  //   ACTA DE DEVOLUCIÓN
  // ════════════════════════════════════════════════
  generarActaDevolucion(acta: any): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210;
    const ML = 15;
    const MR = PW - ML;
    const CW = MR - ML;
    let y = 0;

    // ── Cabecera ─────────────────────────────────
    doc.setFillColor(...this.C_RED_HEADER);
    doc.rect(0, 0, PW, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('SISTEMA DE GESTIÓN DE INVENTARIO', ML, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('ACTA DE DEVOLUCIÓN DE EQUIPOS TECNOLÓGICOS', ML, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(acta.numeroActa || '', MR, 11, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const fechaEmision = this.formatFecha(acta.createdAt || acta.fechaDevolucion);
    doc.text(`Fecha: ${fechaEmision}`, MR, 18, { align: 'right' });

    // Badge de estado
    const estadoLabel = this.getEstadoDevLabel(acta.estado || '');
    const estadoColor = this.getEstadoColorDev(acta.estado || '');
    doc.setFillColor(...estadoColor);
    doc.roundedRect(MR - 38, 20, 38, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(estadoLabel.toUpperCase(), MR - 19, 25, { align: 'center' });

    y = 35;

    // ── Sección: Involucrados ─────────────────────
    y = this.sectionHeader(doc, 'PARTES INVOLUCRADAS', ML, y, CW, this.C_RED_HEADER);

    const W2 = (CW - 8) / 2;
    const yPart = y;

    // Quién devuelve
    this.personCard(doc, 'QUIEN DEVUELVE', [
      ['Nombre:', acta.nombreEntrega || '—'],
      ['Cargo:', acta.cargoEntrega || '—'],
      ['Correo:', acta.correoEntrega || '—'],
    ], ML, yPart, W2, this.C_RED_HEADER, this.C_RED_LIGHT);

    // Quién recibe
    this.personCard(doc, 'QUIEN RECIBE (SISTEMAS)', [
      ['Nombre:', acta.nombreReceptor || '—'],
      ['Cargo:', acta.cargoReceptor || '—'],
      ['Correo:', acta.correoReceptor || '—'],
    ], ML + W2 + 8, yPart, W2, this.C_RED_HEADER, this.C_RED_LIGHT);

    y = yPart + 36 + 5;

    // ── Sección: Dispositivos Devueltos ───────────
    y = this.sectionHeader(doc, 'DISPOSITIVOS DEVUELTOS', ML, y, CW, this.C_RED_HEADER);

    const filas = (acta.detalles || []).map((d: any, i: number) => {
      const dev = d.dispositivo;
      const nombre = dev
        ? dev.nombre || [dev.marca, dev.modelo].filter(Boolean).join(' ') || `ID #${dev.id}`
        : '—';
      return [
        String(i + 1),
        dev?.categoria || '—',
        nombre,
        dev?.serial || '—',
        d.estadoDevolucion || '—',
        d.condicionDevolucion || '—',
        d.observaciones || '',
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: ML },
      head: [['#', 'Categoría', 'Descripción', 'Serial', 'Estado', 'Condición', 'Observaciones']],
      body: filas,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: this.C_DARK,
        lineColor: this.C_BORDER,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: this.C_RED_HEADER,
        textColor: this.C_WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: this.C_GRAY_ROW },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 28 },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ── Sección: Observaciones ────────────────────
    if (acta.observaciones) {
      if (y > 240) { doc.addPage(); y = 15; }
      y = this.sectionHeader(doc, 'OBSERVACIONES', ML, y, CW, this.C_RED_HEADER);
      doc.setFillColor(...this.C_RED_LIGHT);
      const obsLines = doc.splitTextToSize(acta.observaciones, CW - 6);
      const obsH = obsLines.length * 5 + 6;
      doc.rect(ML, y, CW, obsH, 'F');
      doc.setTextColor(...this.C_DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(obsLines, ML + 3, y + 5);
      y += obsH + 5;
    }

    // ── Sección: Firmas ───────────────────────────
    y = this.ensureSpace(doc, y, 55);
    y = this.sectionHeader(doc, 'FIRMAS', ML, y, CW, this.C_RED_HEADER);

    // Firma quien devuelve
    if (acta.firmaEntrega) {
      try {
        doc.addImage(acta.firmaEntrega, 'PNG', ML, y, W2, 22);
      } catch {}
    } else {
      doc.setDrawColor(...this.C_BORDER);
      doc.setFillColor(250, 250, 250);
      doc.rect(ML, y, W2, 22, 'FD');
      doc.setTextColor(...this.C_MID);
      doc.setFontSize(7.5);
      doc.text(acta.estado === 'pendiente_firma' ? 'Firma Pendiente' : 'Firma Quien Devuelve', ML + W2 / 2, y + 13, { align: 'center' });
    }

    doc.setDrawColor(...this.C_BORDER);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 24, ML + W2, y + 24);
    doc.setTextColor(...this.C_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(acta.nombreEntrega || '', ML + W2 / 2, y + 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...this.C_MID);
    doc.text(acta.cargoEntrega || '', ML + W2 / 2, y + 32, { align: 'center' });
    doc.text('Quien Devuelve', ML + W2 / 2, y + 36, { align: 'center' });

    // Firma quien recibe
    const X2 = ML + W2 + 8;
    if (acta.firmaReceptor) {
      try {
        doc.addImage(acta.firmaReceptor, 'PNG', X2, y, W2, 22);
      } catch {}
    } else {
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(...this.C_BORDER);
      doc.rect(X2, y, W2, 22, 'FD');
      doc.setTextColor(...this.C_MID);
      doc.setFontSize(7.5);
      doc.text('Firma Quien Recibe', X2 + W2 / 2, y + 13, { align: 'center' });
    }

    doc.setDrawColor(...this.C_BORDER);
    doc.line(X2, y + 24, X2 + W2, y + 24);
    doc.setTextColor(...this.C_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(acta.nombreReceptor || '', X2 + W2 / 2, y + 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...this.C_MID);
    doc.text(acta.cargoReceptor || '', X2 + W2 / 2, y + 32, { align: 'center' });
    doc.text('Departamento de Sistemas', X2 + W2 / 2, y + 36, { align: 'center' });

    // ── Pie de página ─────────────────────────────
    this.footer(doc, acta.numeroActa || '');

    doc.save(`${acta.numeroActa || 'acta-devolucion'}.pdf`);
  }

  // ════════════════════════════════════════════════
  //   HELPERS
  // ════════════════════════════════════════════════

  private sectionHeader(
    doc: jsPDF,
    title: string,
    x: number,
    y: number,
    width: number,
    color: [number, number, number],
  ): number {
    doc.setFillColor(...color);
    doc.rect(x, y, width, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, x + 3, y + 5);
    return y + 9;
  }

  private infoGrid(
    doc: jsPDF,
    rows: [string, string][],
    x: number,
    y: number,
    width: number,
  ): number {
    const halfW = (width - 5) / 2;
    doc.setFillColor(245, 249, 253);
    const rowH = 7;
    const totalH = Math.ceil(rows.length / 2) * rowH + 4;
    doc.rect(x, y, width, totalH, 'F');
    doc.setDrawColor(...this.C_BORDER);
    doc.setLineWidth(0.2);
    doc.rect(x, y, width, totalH, 'D');

    let col = 0;
    let row = 0;
    for (const [label, value] of rows) {
      const cx = x + 3 + col * (halfW + 5);
      const cy = y + 5 + row * rowH;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...this.C_MID);
      doc.text(label, cx, cy);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.C_DARK);
      const maxW = halfW - 25;
      const val = doc.splitTextToSize(value, maxW)[0];
      doc.text(val, cx + 24, cy);

      col++;
      if (col === 2) { col = 0; row++; }
    }

    if (col !== 0) row++;
    return y + row * rowH + 4 + 3;
  }

  private personCard(
    doc: jsPDF,
    title: string,
    rows: [string, string][],
    x: number,
    y: number,
    width: number,
    headerColor: [number, number, number],
    bgColor: [number, number, number],
  ): void {
    const cardH = rows.length * 7 + 14;
    doc.setFillColor(...bgColor);
    doc.setDrawColor(...this.C_BORDER);
    doc.rect(x, y, width, cardH, 'FD');

    doc.setFillColor(...headerColor);
    doc.rect(x, y, width, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title, x + 3, y + 5.5);

    let ry = y + 12;
    for (const [label, value] of rows) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...this.C_MID);
      doc.text(label, x + 3, ry);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.C_DARK);
      const maxW = width - 26;
      const val = doc.splitTextToSize(value, maxW)[0];
      doc.text(val, x + 22, ry);
      ry += 7;
    }
  }

  private footer(doc: jsPDF, docNumber: string): void {
    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const PW = 210;
      const PH = 297;

      doc.setDrawColor(...this.C_BORDER);
      doc.setLineWidth(0.3);
      doc.line(15, PH - 12, PW - 15, PH - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...this.C_MID);
      doc.text(
        `Documento generado digitalmente • ${docNumber} • Página ${i} de ${totalPages}`,
        PW / 2,
        PH - 8,
        { align: 'center' },
      );
      doc.text(
        `Generado: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        PW - 15,
        PH - 8,
        { align: 'right' },
      );
    }
  }

  private ensureSpace(doc: jsPDF, y: number, needed: number): number {
    if (y + needed > 270) {
      doc.addPage();
      return 15;
    }
    return y;
  }

  private formatFecha(fecha: any): string {
    if (!fecha) return '—';
    try {
      return new Date(fecha).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(fecha);
    }
  }

  private getEstadoLabel(estado: string): string {
    const m: Record<string, string> = {
      pendiente_firma: 'Pendiente Firma',
      activa: 'Activa',
      devuelta_parcial: 'Devolución Parcial',
      devuelta_completa: 'Devuelta',
      vencida: 'Vencida',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada',
    };
    return m[estado] || estado;
  }

  private getEstadoColorEntrega(estado: string): [number, number, number] {
    const m: Record<string, [number, number, number]> = {
      pendiente_firma: [230, 126, 34],
      activa: [39, 174, 96],
      devuelta_parcial: [41, 128, 185],
      devuelta_completa: [39, 174, 96],
      vencida: [192, 57, 43],
      rechazada: [192, 57, 43],
      cancelada: [127, 140, 141],
    };
    return m[estado] || [100, 100, 100];
  }

  private getEstadoDevLabel(estado: string): string {
    const m: Record<string, string> = {
      pendiente_firma: 'Pendiente Firma',
      completada: 'Completada',
      rechazada: 'Rechazada',
    };
    return m[estado] || estado;
  }

  private getEstadoColorDev(estado: string): [number, number, number] {
    const m: Record<string, [number, number, number]> = {
      pendiente_firma: [230, 126, 34],
      completada: [39, 174, 96],
      rechazada: [192, 57, 43],
    };
    return m[estado] || [100, 100, 100];
  }
}
