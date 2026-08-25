import ExcelJS from 'exceljs';

const SHEET_PDVS = 'PDVs';
const HEADERS = ['Clifor', 'Cidade Clifor', 'Endereço Clifor', 'UF Clifor', 'Status'] as const;
const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export interface ImportMessage {
  row: number;
  type: 'error' | 'warning';
  text: string;
}

export interface ParsedPdvRow {
  rowNumber: number;
  name: string;
  address: string;
  city: string;
  state: string;
  channel: string;
  network: string;
  active: boolean;
}

export interface ParsedPdvImport {
  rows: ParsedPdvRow[];
  messages: ImportMessage[];
}

export async function buildPdvImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet(SHEET_PDVS);
  sheet.columns = [
    { header: 'Clifor', key: 'name', width: 32 },
    { header: 'Cidade Clifor', key: 'city', width: 22 },
    { header: 'Endereço Clifor', key: 'address', width: 40 },
    { header: 'UF Clifor', key: 'state', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    name: 'SUPERMERCADO EXEMPLO LJ1',
    city: 'CASCAVEL',
    address: 'AV BRASIL 1000',
    state: 'PR',
    status: 'Ativo',
  }).font = { italic: true, color: { argb: 'FF888888' } };

  for (let rowNumber = 2; rowNumber <= 500; rowNumber++) {
    sheet.getCell(`E${rowNumber}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Ativo,Inativo"'],
    };
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

export async function parsePdvImportWorkbook(buffer: Buffer): Promise<ParsedPdvImport> {
  const workbook = new ExcelJS.Workbook();
  // Duplicate @types/node versions (root vs exceljs's fast-csv dep) produce structurally
  // incompatible Buffer types here even though it's the same runtime Buffer.
  await workbook.xlsx.load(buffer as any);

  const sheet = workbook.getWorksheet(SHEET_PDVS) ?? workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], messages: [{ row: 0, type: 'error', text: 'Planilha vazia ou em formato inválido.' }] };
  }

  const headerRow = sheet.getRow(1);
  const columnIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeHeader(cell.value);
    if (normalized === 'clifor' || normalized === 'nome pdv' || normalized === 'nome') columnIndex.name = colNumber;
    else if (normalized === 'canal e atacado' || normalized === 'canal') columnIndex.channel = colNumber;
    else if (normalized === 'pdv_red' || normalized === 'pdv red' || normalized === 'rede') columnIndex.network = colNumber;
    else if (normalized === 'cidade clifor' || normalized === 'cidade pdv' || normalized === 'cidade') columnIndex.city = colNumber;
    else if (
      normalized === 'endereço clifor' || normalized === 'endereco clifor' ||
      normalized === 'endereço pdv' || normalized === 'endereco pdv' ||
      normalized === 'endereço' || normalized === 'endereco'
    ) columnIndex.address = colNumber;
    else if (normalized === 'uf clifor' || normalized === 'pdv uf' || normalized === 'uf' || normalized === 'estado') columnIndex.state = colNumber;
    else if (normalized === 'status') columnIndex.status = colNumber;
  });

  if (!columnIndex.name) {
    return {
      rows: [],
      messages: [{ row: 1, type: 'error', text: `Cabeçalho não reconhecido. Use uma planilha com as colunas: ${HEADERS.join(', ')}.` }],
    };
  }

  const rows: ParsedPdvRow[] = [];
  const messages: ImportMessage[] = [];

  const lastRow = sheet.rowCount;
  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const name = columnIndex.name ? cellText(row.getCell(columnIndex.name).value) : '';
    const channel = columnIndex.channel ? cellText(row.getCell(columnIndex.channel).value) : '';
    const network = columnIndex.network ? cellText(row.getCell(columnIndex.network).value) : '';
    const city = columnIndex.city ? cellText(row.getCell(columnIndex.city).value) : '';
    const address = columnIndex.address ? cellText(row.getCell(columnIndex.address).value) : '';
    const stateRaw = columnIndex.state ? cellText(row.getCell(columnIndex.state).value) : '';
    const statusCell = columnIndex.status ? cellText(row.getCell(columnIndex.status).value) : '';

    const isEmptyRow = !name && !channel && !network && !city && !address && !stateRaw && !statusCell;
    if (isEmptyRow) continue;

    if (!name) {
      messages.push({ row: rowNumber, type: 'error', text: 'Clifor é obrigatório.' });
      continue;
    }

    const state = stateRaw.trim().toUpperCase();
    if (state && !VALID_UFS.has(state)) {
      messages.push({ row: rowNumber, type: 'warning', text: `UF "${stateRaw}" não reconhecida, salva do jeito que veio.` });
    }

    let active = true;
    const statusNormalized = statusCell.trim().toLowerCase();
    if (statusNormalized === 'inativo') active = false;
    else if (statusNormalized && statusNormalized !== 'ativo') {
      messages.push({ row: rowNumber, type: 'warning', text: `Status "${statusCell}" não reconhecido, considerado Ativo.` });
    }

    rows.push({ rowNumber, name, address, city, state, channel, network, active });
  }

  return { rows, messages };
}
