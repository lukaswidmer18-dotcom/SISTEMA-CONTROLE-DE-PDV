import { prisma } from '../lib/prisma';

export type FormType = 'VALIDADE' | 'RUPTURA' | 'PRECO';

export interface CollectExtraFieldsResult {
  extraFields: Record<string, string | number> | null;
  error?: string;
}

export async function collectExtraFields(formType: FormType, rawExtraFields: unknown): Promise<CollectExtraFieldsResult> {
  const customFields = await prisma.formFieldConfig.findMany({
    where: { formType, core: false, active: true },
  });
  if (customFields.length === 0) return { extraFields: null };

  let input: Record<string, unknown> = {};
  if (rawExtraFields && typeof rawExtraFields === 'object') {
    input = rawExtraFields as Record<string, unknown>;
  } else if (typeof rawExtraFields === 'string' && rawExtraFields.trim()) {
    // multipart/form-data (ex: Pesquisa de Preço, que também envia foto) manda tudo como string.
    try {
      const parsed = JSON.parse(rawExtraFields);
      if (parsed && typeof parsed === 'object') input = parsed;
    } catch {
      // ignora JSON inválido, trata como se não tivesse mandado nada
    }
  }
  const result: Record<string, string | number> = {};

  for (const field of customFields) {
    const raw = input[field.fieldKey];
    const isEmpty = raw === undefined || raw === null || raw === '';
    if (field.required && isEmpty) {
      return { extraFields: null, error: `Campo "${field.label}" é obrigatório.` };
    }
    if (isEmpty) continue;

    if (field.fieldType === 'NUMBER') {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return { extraFields: null, error: `Campo "${field.label}" deve ser um número.` };
      }
      result[field.fieldKey] = parsed;
    } else {
      result[field.fieldKey] = String(raw).trim();
    }
  }

  return { extraFields: Object.keys(result).length > 0 ? result : null };
}
