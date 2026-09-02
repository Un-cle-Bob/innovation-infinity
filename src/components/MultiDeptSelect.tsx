import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { parseDepartments } from '../utils/departments';

interface MultiDeptSelectProps {
  allDepts: { id: string; name: string }[];
  /** 콤마로 구분된 부서 문자열 (예: "입학취업처, 교무학생처") */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** 주요추진항목의 담당부서를 2개 이상 선택할 수 있는 체크박스 드롭다운 */
export const MultiDeptSelect: React.FC<MultiDeptSelectProps> = ({
  allDepts,
  value,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parseDepartments(value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (name: string) => {
    const next = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
    onChange(next.join(', '));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          className ||
          'flex items-center justify-between gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs bg-white min-w-[140px]'
        }
      >
        <span className="truncate text-left">
          {selected.length > 0 ? selected.join(', ') : '부서 선택'}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg max-h-56 overflow-y-auto"
        >
          <div className="px-1.5 py-1 text-[10px] font-bold text-slate-400">
            부서를 2개 이상 선택할 수 있어요
          </div>
          {allDepts.map((d) => (
            <label
              key={d.id}
              className="flex items-center gap-1.5 px-1.5 py-1.5 text-xs rounded hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(d.name)}
                onChange={() => toggle(d.name)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700">{d.name}</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-1 w-full rounded-md bg-indigo-50 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
};
