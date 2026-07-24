import ExcelJS from 'exceljs';

const SHEET_PRODUCTS = 'Produtos';
const SHEET_PDVS = 'PDVs válidos';
const HEADERS = ['SKU', 'Marca', 'Código', 'PDVs', 'Status'] as const;

export interface ImportMessage {
  row: number;
  type: 'error' | 'warning';
  text: string;
}

export interface ParsedProductRow {
  rowNumber: number;
  name: string;
  brand: string;
  sku: string;
  active: boolean;
  pdvIds: string[];
}

export interface ParsedProductImport {
  rows: ParsedProductRow[];
  messages: ImportMessage[];
}

export async function buildProductImportTemplate(pdvs: { name: string; city: string }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const productsSheet = workbook.addWorksheet(SHEET_PRODUCTS);
  productsSheet.columns = [
    { header: 'SKU', key: 'name', width: 38 },
    { header: 'Marca', key: 'brand', width: 16 },
    { header: 'Código', key: 'sku', width: 16 },
    { header: 'PDVs', key: 'pdvs', width: 40 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  productsSheet.getRow(1).font = { bold: true };
  productsSheet.addRow({
    name: 'COXINHA DA ASA LEVO ALIMENTOS IQF 800G',
    brand: 'LEVO',
    sku: '',
    pdvs: pdvs[0]?.name ?? 'ADM - Pluma Agro',
    status: 'Ativo',
  }).font = { italic: true, color: { argb: 'FF888888' } };

  for (let rowNumber = 2; rowNumber <= 200; rowNumber++) {
    productsSheet.getCell(`E${rowNumber}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Ativo,Inativo"'],
    };
  }

  const pdvsSheet = workbook.addWorksheet(SHEET_PDVS);
  pdvsSheet.columns = [
    { header: 'Nome do PDV (copie exatamente para a coluna PDVs)', key: 'name', width: 55 },
    { header: 'Cidade', key: 'city', width: 20 },
  ];
  pdvsSheet.getRow(1).font = { bold: true };
  for (const pdv of pdvs) {
    pdvsSheet.addRow({ name: pdv.name, city: pdv.city });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in (value as any)) return String((value as any).text ?? '').trim();
  if (typeof value === 'object' && 'result' in (value as any)) return String((value as any).result ?? '').trim();
  return String(value).trim();
}

export async function parseProductImportWorkbook(
  buffer: Buffer,
  pdvs: { id: string; name: string }[]
): Promise<ParsedProductImport> {
  const workbook = new ExcelJS.Workbook();
  // Duplicate @types/node versions (root vs exceljs's fast-csv dep) produce structurally
  // incompatible Buffer types here even though it's the same runtime Buffer.
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.getWorksheet(SHEET_PRODUCTS) ?? workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], messages: [{ row: 0, type: 'error', text: 'Planilha vazia ou em formato inválido.' }] };
  }

  const headerRow = sheet.getRow(1);
  const columnIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeHeader(cell.value);
    if (normalized === 'sku') columnIndex.name = colNumber;
    else if (normalized === 'marca') columnIndex.brand = colNumber;
    else if (normalized === 'código' || normalized === 'codigo') columnIndex.sku = colNumber;
    else if (normalized === 'pdvs') columnIndex.pdvs = colNumber;
    else if (normalized === 'status') columnIndex.status = colNumber;
  });

  if (!columnIndex.name) {
    return {
      rows: [],
      messages: [{ row: 1, type: 'error', text: `Cabeçalho não reconhecido. Use o modelo com as colunas: ${HEADERS.join(', ')}.` }],
    };
  }

  const pdvByName = new Map(pdvs.map((pdv) => [pdv.name.trim().toLowerCase(), pdv]));

  const rows: ParsedProductRow[] = [];
  const messages: ImportMessage[] = [];

  const lastRow = sheet.rowCount;
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const name = columnIndex.name ? cellText(row.getCell(columnIndex.name).value) : '';
    const brand = columnIndex.brand ? cellText(row.getCell(columnIndex.brand).value) : '';
    const sku = columnIndex.sku ? cellText(row.getCell(columnIndex.sku).value) : '';
    const pdvsCell = columnIndex.pdvs ? cellText(row.getCell(columnIndex.pdvs).value) : '';
    const statusCell = columnIndex.status ? cellText(row.getCell(columnIndex.status).value) : '';

    const isEmptyRow = !name && !brand && !sku && !pdvsCell && !statusCell;
    if (isEmptyRow) continue;

    if (!name) {
      messages.push({ row: rowNumber, type: 'error', text: 'SKU (nome do produto) é obrigatório.' });
      continue;
    }

    let active = true;
    const statusNormalized = statusCell.trim().toLowerCase();
    if (statusNormalized === 'inativo') active = false;
    else if (statusNormalized && statusNormalized !== 'ativo') {
      messages.push({ row: rowNumber, type: 'warning', text: `Status "${statusCell}" não reconhecido, considerado Ativo.` });
    }

    const pdvIds: string[] = [];
    const pdvNames = pdvsCell.split(',').map((n) => n.trim()).filter(Boolean);
    for (const pdvName of pdvNames) {
      const match = pdvByName.get(pdvName.toLowerCase());
      if (match) pdvIds.push(match.id);
      else messages.push({ row: rowNumber, type: 'warning', text: `PDV "${pdvName}" não encontrado, ignorado.` });
    }

    rows.push({ rowNumber, name, brand, sku, active, pdvIds });
  }

  return { rows, messages };
}
