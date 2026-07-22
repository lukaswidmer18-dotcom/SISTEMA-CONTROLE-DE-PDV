import sharp from 'sharp';

const WATERMARKABLE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const BRAND_GOLD = '#BC933F';
const BRAND_GREEN_BADGE = 'rgba(23, 65, 59, 0.68)';

/**
 * Estampa o selo "Grupo Pluma" no canto inferior direito da foto e retorna o buffer resultante.
 * Formatos sem suporte (ex. heic) retornam o buffer original sem alteração.
 */
export async function applyWatermark(buffer: Buffer, ext: string): Promise<Buffer> {
  if (!WATERMARKABLE_EXT.has(ext.toLowerCase())) return buffer;

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) return buffer;

  const plumaSize = Math.max(16, Math.round(width * 0.032));
  const grupoSize = Math.round(plumaSize * 0.32);
  const paddingX = Math.round(plumaSize * 0.55);
  const paddingY = Math.round(plumaSize * 0.4);
  const badgeWidth = Math.round(plumaSize * 3.6);
  const badgeHeight = grupoSize + plumaSize + paddingY * 2;
  const margin = Math.round(plumaSize * 0.6);
  const badgeX = width - badgeWidth - margin;
  const badgeY = height - badgeHeight - margin;
  const radius = Math.round(plumaSize * 0.18);

  const svg = `<svg width="${width}" height="${height}">
    <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="${radius}" fill="${BRAND_GREEN_BADGE}"/>
    <text x="${badgeX + paddingX}" y="${badgeY + paddingY + grupoSize}" font-family="Source Sans Pro, DejaVu Sans, sans-serif" font-size="${grupoSize}" font-weight="600" letter-spacing="${Math.max(1, Math.round(grupoSize * 0.28))}" fill="${BRAND_GOLD}">GRUPO</text>
    <text x="${badgeX + paddingX}" y="${badgeY + paddingY + grupoSize + plumaSize}" font-family="Source Sans Pro, DejaVu Sans, sans-serif" font-size="${plumaSize}" font-weight="900" fill="#FFFFFF">PLUMA</text>
  </svg>`;

  return image.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toBuffer();
}
