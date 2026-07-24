import { useMemo, useState } from 'react';

export function useColumnFilters<T>(items: T[], getters: Record<string, (item: T) => string[]>) {
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});

  function setColumnFilter(key: string, values: Set<string>) {
    setFilters(prev => ({ ...prev, [key]: values }));
  }

  function getUniqueValues(key: string): string[] {
    const getter = getters[key];
    const values = new Set<string>();
    items.forEach(item => getter(item).forEach(v => values.add(v)));
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  const filteredItems = useMemo(
    () => items.filter(item =>
      Object.entries(filters).every(([key, values]) => {
        if (!values || values.size === 0) return true;
        const getter = getters[key];
        if (!getter) return true;
        return getter(item).some(v => values.has(v));
      })
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, filters]
  );

  const activeFilterCount = Object.values(filters).filter(v => v.size > 0).length;

  function clearAllFilters() {
    setFilters({});
  }

  return { setColumnFilter, getUniqueValues, filteredItems, activeFilterCount, clearAllFilters, filters };
}
