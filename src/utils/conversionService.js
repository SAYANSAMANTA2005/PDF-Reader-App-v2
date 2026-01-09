import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType } from 'docx';
import ExcelJS from 'exceljs';
// Note: if file-saver is needed later, install it, but for now we use standard blob download in the components.

/**
 * Professional PDF Conversion Service
 * Handles complex multi-format workflows client-side.
 */

// Initialize pdfjs worker
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

/**
 * PDF to high-quality images (PNG/JPG)
 */
export const pdfToImages = async (pdfDoc, onProgress) => {
    const images = [];
    const totalPages = pdfDoc.numPages;

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High res
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        images.push({ page: i, dataUrl });

        if (onProgress) onProgress(i, totalPages, (i / totalPages) * 100);
    }
    return images;
};

/**
 * Images to unified PDF
 */
export const imagesToPdf = async (images, onProgress) => {
    const pdfDoc = await PDFDocument.create();
    const total = images.length;

    for (let i = 0; i < total; i++) {
        const imgData = images[i];
        const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());

        let embeddedImg;
        if (imgData.includes('image/png')) {
            embeddedImg = await pdfDoc.embedPng(imgBytes);
        } else {
            embeddedImg = await pdfDoc.embedJpg(imgBytes);
        }

        const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
        page.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: embeddedImg.width,
            height: embeddedImg.height,
        });

        if (onProgress) onProgress(i + 1, total, ((i + 1) / total) * 100);
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Structured PDF to DOCX
 * Reconstructs document logic using extracted text blocks.
 */
export const pdfToDocx = async (textBlocks, metadata) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: textBlocks.map(block => {
                return new Paragraph({
                    children: [
                        new TextRun({
                            text: block.text,
                            bold: block.isHeader,
                            size: block.isHeader ? 32 : 24,
                        }),
                    ],
                    spacing: { after: 200 },
                    alignment: block.isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                });
            }),
        }],
    });

    const buffer = await Packer.toBlob(doc);
    return buffer;
};

/**
 * PDF to Excel (XLSX)
 * Reconstructs table data from text patterns.
 */
export const pdfToXlsx = async (tables) => {
    const workbook = new ExcelJS.Workbook();

    tables.forEach((table, idx) => {
        const sheet = workbook.addWorksheet(`Table ${idx + 1}`);
        table.rows.forEach(row => {
            sheet.addRow(row);
        });

        // Basic Professional Styling
        sheet.getRow(1).font = { bold: true };
        sheet.columns.forEach(column => {
            column.width = 20;
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
