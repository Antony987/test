import React from 'react';

/**
 * Lightweight, safe Markdown renderer for structured AI output
 */
export const MarkdownView: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-base font-bold text-indigo-300 mt-4 mb-1.5 flex items-center gap-1.5">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-lg font-bold text-white mt-4 mb-2">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-xl font-extrabold text-white mt-4 mb-2">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }
        if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
          const isChecked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
          const text = trimmed.replace(/- \[[ xX]\] /, '');
          return (
            <div key={idx} className="flex items-start gap-2 text-slate-200 pl-1 py-0.5">
              <span className={`inline-block w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center text-xs ${
                isChecked ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-slate-600 bg-slate-900/60'
              }`}>
                {isChecked ? '✓' : ''}
              </span>
              <span className={isChecked ? 'line-through text-slate-400' : ''}>
                {renderBold(text)}
              </span>
            </div>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={idx} className="list-disc list-inside text-slate-300 pl-2">
              {renderBold(trimmed.substring(2))}
            </li>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={idx} className="pl-2 font-medium text-slate-200">
              {renderBold(trimmed)}
            </div>
          );
        }
        if (trimmed === '') {
          return <div key={idx} className="h-1.5" />;
        }

        return (
          <p key={idx} className="text-slate-300">
            {renderBold(line)}
          </p>
        );
      })}
    </div>
  );
};

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
