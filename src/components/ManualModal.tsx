import React, { useState } from 'react';
import { BookOpen, X, Download, ChevronRight } from 'lucide-react';
import { MANUAL_SECTIONS, MANUAL_TITLE, MANUAL_SUBTITLE } from '../data/manualContent';

/** 간단한 텍스트 서식(줄바꿈 두 번=문단, •=목록, **텍스트**=굵게)을 JSX로 변환 */
function renderBody(body: string): React.ReactNode {
  const paragraphs = body.split('\n\n');
  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n');
    const isList = lines.every((l) => l.trim().startsWith('•') || l.trim() === '');
    const renderInline = (text: string, key: number) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g);
      return (
        <React.Fragment key={key}>
          {parts.map((part, i) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={i} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            )
          )}
        </React.Fragment>
      );
    };

    if (isList) {
      return (
        <ul key={pIdx} className="space-y-1.5 my-2">
          {lines
            .filter((l) => l.trim())
            .map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                <ChevronRight className="h-3.5 w-3.5 text-indigo-400 mt-1 shrink-0" />
                <span>{renderInline(l.replace(/^•\s*/, ''), i)}</span>
              </li>
            ))}
        </ul>
      );
    }
    return (
      <p key={pIdx} className="text-sm text-slate-700 leading-relaxed my-2 whitespace-pre-line">
        {renderInline(para, pIdx)}
      </p>
    );
  });
}

function buildDownloadHtml(): string {
  const sectionsHtml = MANUAL_SECTIONS.map((s) => {
    const bodyHtml = s.body
      .split('\n\n')
      .map((para) => {
        const lines = para.split('\n');
        const isList = lines.every((l) => l.trim().startsWith('•') || l.trim() === '');
        const inline = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        if (isList) {
          return `<ul>${lines
            .filter((l) => l.trim())
            .map((l) => `<li>${inline(l.replace(/^•\s*/, ''))}</li>`)
            .join('')}</ul>`;
        }
        return `<p>${inline(para).replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');
    return `<section><h2>${s.title}</h2>${bodyHtml}</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>${MANUAL_TITLE}</title>
<style>
  body { font-family: -apple-system, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; max-width: 820px; margin: 40px auto; padding: 0 24px; color: #1e293b; line-height: 1.7; }
  h1 { font-size: 22px; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 32px; }
  h2 { font-size: 16px; color: #4338ca; margin-top: 36px; border-left: 4px solid #4f46e5; padding-left: 10px; }
  p { font-size: 14px; margin: 10px 0; }
  ul { margin: 10px 0; padding-left: 20px; }
  li { font-size: 14px; margin: 6px 0; }
  strong { color: #0f172a; }
  @media print { body { margin: 0; padding: 20px; } }
</style>
</head>
<body>
<h1>${MANUAL_TITLE}</h1>
<div class="subtitle">${MANUAL_SUBTITLE}</div>
${sectionsHtml}
</body>
</html>`;
}

export const ManualModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState(MANUAL_SECTIONS[0].id);

  const handleDownload = () => {
    const html = buildDownloadHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '경북과학대_혁신지원사업_통합관리시스템_매뉴얼.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const current = MANUAL_SECTIONS.find((s) => s.id === activeSection) || MANUAL_SECTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{MANUAL_TITLE}</h2>
              <p className="text-[11px] text-slate-500">{MANUAL_SUBTITLE}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              title="매뉴얼을 HTML 파일로 다운로드 (브라우저에서 열어보거나 인쇄해서 PDF로 저장 가능)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          <nav className="w-52 shrink-0 border-r border-slate-100 overflow-y-auto py-3 bg-slate-50/60">
            {MANUAL_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`block w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${
                  activeSection === s.id
                    ? 'bg-white text-indigo-700 border-r-2 border-indigo-600'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <h3 className="text-base font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
              {current.title}
            </h3>
            {renderBody(current.body)}
          </div>
        </div>
      </div>
    </div>
  );
};
