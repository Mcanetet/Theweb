#!/usr/bin/env node
/**
 * Genera el PDF del manual de marca desde brand-kit.html
 * Uso: npm run brand:pdf
 */

const path = require('path');
const fs = require('fs');
const express = require('express');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets');
const OUT_FILE = path.join(OUT_DIR, 'TheWeb-Manual-de-Marca.pdf');

async function generate() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('Puppeteer no está instalado. Ejecuta: npm install');
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const app = express();
  app.use(express.static(ROOT));

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });

  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/brand-kit.html?pdf=1`;

  console.log('Generando PDF del manual de marca…');
  console.log('  Fuente:', url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
    await page.evaluateHandle('document.fonts.ready');
    await page.emulateMediaType('print');

    await page.pdf({
      path: OUT_FILE,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '14mm', right: '14mm', bottom: '18mm', left: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;font-size:7px;color:#737373;text-align:center;font-family:Inter,Arial,sans-serif;padding:0 14mm;">
          TheWeb. — Manual de marca · Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
    });

    const stats = fs.statSync(OUT_FILE);
    console.log('\n✓ PDF generado correctamente');
    console.log('  Archivo:', OUT_FILE);
    console.log('  Tamaño: ', (stats.size / 1024).toFixed(1), 'KB');
  } finally {
    await browser.close();
    server.close();
  }
}

generate().catch((err) => {
  console.error('Error al generar PDF:', err.message);
  process.exit(1);
});
