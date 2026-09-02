import React from 'react';

const FULL_EXAMPLE = '혁신-2026-0001';

interface DocNumberHintInputProps {
  value: string;
  onChange: (value: string) => void;
  /** 테두리/배경/둥근모서리 등 "박스" 스타일. 내부 입력창과 힌트 레이어는 이 안에서 정확히 겹쳐짐 */
  wrapperClassName: string;
  autoFocus?: boolean;
}

/**
 * 사용자가 입력한 값이 예시("혁신-2026-0001")의 앞부분과 일치하는 동안,
 * 그 뒤에 이어질 나머지 글자를 회색으로 겹쳐서 보여줘 문서번호 형식을 유추할 수 있게 해준다.
 * 실제 입력값에는 영향이 없는 순수 시각 효과이며, 사용자가 예시와 다른 값을 입력하면 힌트는 사라진다.
 */
export const DocNumberHintInput: React.FC<DocNumberHintInputProps> = ({
  value,
  onChange,
  wrapperClassName,
  autoFocus,
}) => {
  const ghostSuffix = FULL_EXAMPLE.startsWith(value) && value.length > 0 ? FULL_EXAMPLE.slice(value.length) : '';

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 혁신-2026-0001"
        className="relative z-10 w-full bg-transparent px-3 py-2 text-xs font-mono font-bold text-indigo-900 focus:outline-hidden"
      />
      {ghostSuffix && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center px-3 py-2 text-xs font-mono font-bold">
          <span className="invisible whitespace-pre">{value}</span>
          <span className="text-slate-400">{ghostSuffix}</span>
        </div>
      )}
    </div>
  );
};
