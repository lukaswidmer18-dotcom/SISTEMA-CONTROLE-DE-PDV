const SKIP_IF_UNDER_BYTES = 400 * 1024;

/**
 * Redimensiona e recomprime a foto no aparelho antes do upload.
 * Fotos de câmera vêm em vários MB / resolução total; em rede de campo isso
 * é o gargalo do envio. Se o canvas falhar por qualquer motivo (formato não
 * suportado, browser antigo), cai de volta pro arquivo original.
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.75): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  if (file.size <= SKIP_IF_UNDER_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
