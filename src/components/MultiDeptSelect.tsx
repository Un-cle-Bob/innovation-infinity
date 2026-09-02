import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { parseDepartments } from '../utils/departments';

interface MultiDeptSelectProps {
  allDepts: { id: string; name: string }[];
  /** 콤마로 구분된 부서 문자열 (예: "입학취업처, 교무학생처") */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * 주요추진항목의 담당부서를 2개 이상 선택할 수 있는 체크박스 드롭다운.
 * 드롭다운 목록은 React Portal로 document.body에 직접 렌더링되어, 표나 카드처럼
 * overflow가 잘려있는 부모 컨테이너 안에 있어도 잘리지 않고 온전히 보인다.
 */
export const MultiDeptSelect: React.FC<MultiDeptSelectProps> = ({
  allDepts,
  value,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 208,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const selected = parseDepartments(value);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target as Node) &&
        popRef.current &&
        !popRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popWidth = 208;
      const left = Math.min(rect.left, window.innerWidth - popWidth - 8);
      setPos({ top: rect.bottom + 4, left: Math.max(8, left), width: Math.max(rect.width, popWidth) });
    }
    setOpen((o) => !o);
  };

  const toggle = (name: string) => {
    const next = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
    onChange(next.join(', '));
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
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
      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 208 }}
            className="z-[1000] rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl max-h-56 overflow-y-auto"
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
          </div>,
          document.body
        )}
    </>
  );
};
