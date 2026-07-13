import { put, del } from '@vercel/blob';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function uploadToBlob(
  buffer: Buffer,
  originalName: string,
  folder: string,
): Promise<{ url: string; pathname: string }> {
  const ext = path.extname(originalName).toLowerCase();
  const pathname = `${folder}/${uuidv4()}${ext}`;
  const blob = await put(pathname, buffer, { access: 'public', addRandomSuffix: false });
  return { url: blob.url, pathname };
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.error('Erro ao excluir arquivo do blob storage:', err);
  }
}
