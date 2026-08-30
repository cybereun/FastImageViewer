import { CheckCircle2, LoaderCircle } from 'lucide-react';
import type { Language } from '../i18n';
import { t } from '../i18n';

interface StatusFooterProps {
  totalCount: number;
  loading: boolean;
  language: Language;
  appVersion: string;
  onVersionClick: () => void;
}

export function StatusFooter({
  totalCount,
  loading,
  language,
  appVersion,
  onVersionClick,
}: StatusFooterProps) {
  return (
    <footer
      className="flex h-7 min-h-7 shrink-0 items-center justify-between border-t border-gray-800 bg-[#252526] px-2 text-xs text-gray-400"
      role="contentinfo"
    >
      <span>{totalCount} {t(language, 'items')}</span>
      <div className="flex h-full items-center gap-3">
        <span className="flex items-center gap-1">
          {loading ? <LoaderCircle size={12} className="animate-spin" /> : <CheckCircle2 size={12} className="text-emerald-500" />}
          {loading ? t(language, 'scanning') : t(language, 'ready')}
        </span>
        <button
          type="button"
          onClick={onVersionClick}
          className="h-full border-l border-gray-700 pl-3 text-gray-400 transition-colors hover:text-white"
          title={t(language, 'about')}
          aria-label={`${t(language, 'about')} FastImage ${appVersion}`}
        >
          FastImage v{appVersion}
        </button>
      </div>
    </footer>
  );
}
