import { FormFieldConfig } from '../types';

export function extraFieldsLabelMap(fields: FormFieldConfig[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) map[f.fieldKey] = f.label;
  return map;
}

export function formatExtraFields(
  extraFields: Record<string, string | number> | null | undefined,
  labelMap: Record<string, string>
): { key: string; label: string; value: string }[] {
  if (!extraFields) return [];
  return Object.entries(extraFields).map(([key, value]) => ({
    key,
    label: labelMap[key] || key,
    value: String(value),
  }));
}
