import { X } from 'lucide-react';
import type { Preferences } from '../types';
import { t } from '../i18n';

interface SettingsModalProps {
  preferences: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
  onClose: () => void;
}

export function SettingsModal({ preferences, onChange, onClose }: SettingsModalProps) {
  const keyboardShortcuts = [
    { key: 'Shift', label: t(preferences.language, 'keyboardRangeSelect') },
    { key: 'Ctrl+A', label: t(preferences.language, 'keyboardSelectAll') },
    { key: 'F2', label: t(preferences.language, 'keyboardRename') },
    { key: 'Ctrl+C / X / V', label: t(preferences.language, 'keyboardClipboard') },
    { key: 'Enter', label: t(preferences.language, 'keyboardOpen') },
    { key: 'Delete', label: t(preferences.language, 'keyboardDelete') },
    { key: 'Esc', label: t(preferences.language, 'keyboardCancel') },
    { key: '← ↑ ↓ →', label: t(preferences.language, 'keyboardNavigate') },
  ];

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-[460px] max-w-full rounded-xl border border-gray-700 bg-[#1a1a1a] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold text-white">{t(preferences.language, 'settings')}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <label className="flex items-center justify-between gap-4 text-gray-300">
            Language
            <select
              value={preferences.language}
              onChange={(event) => onChange({ language: event.target.value as Preferences['language'] })}
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-4 text-gray-300">
            Theme
            <select
              value={preferences.theme}
              onChange={(event) => onChange({ theme: event.target.value as Preferences['theme'] })}
              className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>

          <label className="flex items-center justify-between gap-4 text-gray-300">
            Mouse wheel changes image
            <input
              type="checkbox"
              checked={preferences.wheelNavigation}
              onChange={(event) => onChange({ wheelNavigation: event.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
          </label>

          <label className="flex items-center justify-between gap-4 text-gray-300">
            Confirm before deleting
            <input
              type="checkbox"
              checked={preferences.confirmDelete}
              onChange={(event) => onChange({ confirmDelete: event.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
          </label>

          <div className="rounded-lg border border-gray-700 bg-gray-900 p-3" role="region" aria-labelledby="keyboard-shortcuts-title">
            <h3 id="keyboard-shortcuts-title" className="text-sm font-medium text-gray-200">
              {t(preferences.language, 'keyboardShortcuts')}
            </h3>
            <div className="mt-3 grid grid-cols-[max-content_1fr] items-center gap-x-3 gap-y-2 text-xs text-gray-400">
              {keyboardShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="contents">
                  <kbd className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 font-mono text-[11px] text-gray-200">
                    {shortcut.key}
                  </kbd>
                  <span>{shortcut.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-xs text-gray-400">
            Default folder is updated automatically when you open or select a folder.
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
