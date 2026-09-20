const fs = require('fs');
const path = require('path');
const { analyzeData } = require('./dataScienceSkill');

const OUT = path.join(__dirname, '..', 'reports');

function generatePDFReport(reportTitle, stats, outputPath) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(outputPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.pipe(stream);
    doc.fillColor('#111111').fontSize(20).text('Pixel Software Design', { continued: false });
    doc.fontSize(9).fillColor('#666666').text('Gabès, Tunisie — Matricule Fiscal : 1969711pam000');
    doc.moveDown();
    doc.fontSize(16).fillColor('#000000').text(reportTitle);
    doc.moveDown();
    doc.fontSize(12).fillColor('#333333');
    doc.text(`Effectif : ${stats.count}`);
    doc.text(`Somme : ${stats.sum}`);
    doc.text(`Moyenne : ${stats.mean}`);
    doc.text(`Médiane : ${stats.median}`);
    doc.text(`Min : ${stats.min}`);
    doc.text(`Max : ${stats.max}`);
    if (stats.stdDev !== undefined) doc.text(`Écart-type : ${stats.stdDev}`);
    doc.end();
  });
}

async function generateWordReport(reportTitle, stats, outputPath) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Pixel Software Design — Rapport Data Science', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Gabès, Tunisie — Matricule Fiscal : 1969711pam000', style: 'Normal' }),
        new Paragraph({ text: reportTitle, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun(`Effectif : ${stats.count} | Somme : ${stats.sum} | Moyenne : ${stats.mean} | Médiane : ${stats.median} | Min : ${stats.min} | Max : ${stats.max}`)] })
      ]
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

async function execute(params) {
  const title = params && params.title || 'Rapport Analytique';
  const dataset = params && params.dataset || [10, 25, 30, 45, 60];
  const format = params && params.format || 'pdf';
  const stats = analyzeData(dataset);
  if (stats.error) return { skill: 'exportSkill', status: 'error', message: stats.error };

  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const base = `Rapport_Pixel_${Date.now()}`;

  if (format === 'word' || format === 'docx') {
    const filePath = path.join(OUT, `${base}.docx`);
    await generateWordReport(title, stats, filePath);
    return { skill: 'exportSkill', status: 'success', format: 'docx', filePath, url: `/reports/${base}.docx`, statistics: stats };
  }
  const filePath = path.join(OUT, `${base}.pdf`);
  await generatePDFReport(title, stats, filePath);
  return { skill: 'exportSkill', status: 'success', format: 'pdf', filePath, url: `/reports/${base}.pdf`, statistics: stats };
}

module.exports = { execute, generatePDFReport, generateWordReport };