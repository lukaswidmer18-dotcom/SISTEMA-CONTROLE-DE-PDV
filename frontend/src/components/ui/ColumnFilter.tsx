import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Search } from 'lucide-react';

interface ColumnFilterProps {
  label: string;
  values: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export default function ColumnFilter({ label, values, selected, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isActive = selected.size > 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleScrollOrResize(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 240) });
    }
    setSearch('');
    setOpen(o => !o);
  }

  function toggleValue(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  const filteredValues = values.filter(v => v.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={toggleOpen}
        className={`inline-flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 shrink-0 ${isActive ? 'text-pluma-700' : 'text-gray-400'}`}
      >
        <Filter size={12} fill={isActive ? 'currentColor' : 'none'} />
      </button>
      {open && position && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: position.top, left: position.left }}
          className="z-50 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-normal normal-case"
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-pluma-500"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto overscroll-contain py-1">
            {filteredValues.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 italic">Nada encontrado.</p>
            ) : (
              filteredValues.map(value => (
                <label key={value} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 text-pluma-800 rounded border-gray-300"
                    checked={selected.has(value)}
                    onChange={() => toggleValue(value)}
                  />
                  <span className="text-gray-700 truncate" title={value || '(vazio)'}>{value || '(vazio)'}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex items-center justify-between p-2 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={() => onChange(new Set())} className="text-xs font-medium text-gray-500 hover:text-gray-700">
              Limpar
            </button>
            <span className="text-[10px] text-gray-400 truncate">{label}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
