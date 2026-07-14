import sharp from 'sharp';

const WATERMARKABLE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Estampa linhas de texto num rodapé semi-transparente na foto e retorna o buffer resultante.
 * Formatos sem suporte (ex. heic) retornam o buffer original sem alteração.
 */
export async function applyWatermark(buffer: Buffer, ext: string, lines: string[]): Promise<Buffer> {
  if (!WATERMARKABLE_EXT.has(ext.toLowerCase())) return buffer;

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) return buffer;

  const fontSize = Math.max(14, Math.round(width * 0.022));
  const lineHeight = Math.round(fontSize * 1.4);
  const padding = Math.round(fontSize * 0.6);
  const bandHeight = padding * 2 + lineHeight * lines.length;
  const bandTop = Math.max(0, height - bandHeight);

  const textSvg = lines
    .map((line, i) => {
      const y = bandTop + padding + fontSize + i * lineHeight;
      return `<text x="${padding}" y="${y}" font-family="DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="600" fill="white">${escapeXml(line)}</text>`;
    })
    .join('');

  const svg = `<svg width="${width}" height="${height}"><rect x="0" y="${bandTop}" width="${width}" height="${bandHeight}" fill="black" fill-opacity="0.55"/>${textSvg}</svg>`;

  return image.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toBuffer();
}
