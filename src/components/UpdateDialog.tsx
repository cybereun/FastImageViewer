import { AlertCircle, CheckCircle2, Download, RefreshCw, X } from 'lucide-react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { UpdateDownloadProgress, UpdateInfo } from '../types';

type UpdateAction = 'idle' | 'downloading' | 'installing' | 'error';

interface UpdateDialogProps {
  language: Language;
  update: UpdateInfo;
  currentVersion: string;
  action: UpdateAction;
  progress: UpdateDownloadProgress | null;
  error: string | null;
  onUpdate: () => void;
  onClose: () => void;
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function UpdateDialog({
  language,
  update,
  currentVersion,
  action,
  progress,
  error,
  onUpdate,
  onClose,
}: UpdateDialogProps) {
  const isBusy = action === 'downloading' || action === 'installing';
  const progressTotalBytes = progress?.totalBytes || update.size || 0;
  const progressPercent = progress && progressTotalBytes > 0
    ? Math.min(100, Math.round((progress.receivedBytes / progressTotalBytes) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4" role="presentation">
      <section
        className="w-[560px] max-w-full rounded-xl border border-blue-500/40 bg-[#171717] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/15 p-2 text-blue-300">
              {action === 'error' ? <AlertCircle size={20} /> : action === 'installing' ? <RefreshCw size={20} className="animate-spin" /> : <Download size={20} />}
            </div>
            <div>
              <h2 id="update-dialog-title" className="text-lg font-semibold text-white">{t(language, 'updateAvailable')}</h2>
              <p className="mt-1 text-sm text-gray-400">{update.name}</p>
            </div>
          </div>
          {!isBusy && (
            <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" title={t(language, 'later')} aria-label={t(language, 'later')}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-3">
            <div className="text-xs text-gray-500">{t(language, 'currentVersion')}</div>
            <div className="mt-1 font-medium text-gray-200">{currentVersion}</div>
          </div>
          <div className="rounded-lg border border-blue-500/40 bg-blue-950/20 p-3">
            <div className="text-xs text-blue-300">{t(language, 'newVersion')}</div>
            <div className="mt-1 font-medium text-blue-100">{update.version}{update.size ? ` · ${formatBytes(update.size)}` : ''}</div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-gray-200">{t(language, 'releaseNotes')}</h3>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-700 bg-[#0e0e0e] p-3 text-xs leading-relaxed text-gray-300">
            {update.notes.trim() || t(language, 'updateNoNotes')}
          </div>
        </div>

        {action === 'downloading' && (
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/60 p-3" aria-live="polite">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>{t(language, 'downloadingUpdate')}</span>
              <span>{progress ? `${progressPercent}% · ${formatBytes(progress.receivedBytes)} / ${formatBytes(progressTotalBytes)}` : '0%'}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-700">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {action === 'installing' && (
          <div className="mt-4 rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200" aria-live="polite">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{t(language, 'installingUpdate')}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-950">
              <div className="h-full w-full animate-pulse rounded-full bg-emerald-400/70" />
            </div>
            <p className="mt-2 text-xs text-emerald-200/70">{t(language, 'updateRestartDetail')}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-800/70 bg-red-950/30 p-3 text-xs text-red-200" role="alert">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-gray-500">{t(language, 'updateAutoInstallNote')}</p>

        <div className="mt-5 flex justify-end gap-2">
          {!isBusy && (
            <button onClick={onClose} className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
              {t(language, 'later')}
            </button>
          )}
          <button
            onClick={onUpdate}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
          >
            {action === 'error' ? <RefreshCw size={15} /> : <Download size={15} />}
            {t(language, 'updateNow')}
          </button>
        </div>
      </section>
    </div>
  );
}
