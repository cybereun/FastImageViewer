import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { ImageFile } from '../types';
import { cn } from '../utils/cn';

interface BatchRenameDialogProps {
  images: ImageFile[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (renames: Array<{ image: ImageFile; nextName: string }>) => Promise<void>;
}

export function BatchRenameDialog({ images, busy, onClose, onSubmit }: BatchRenameDialogProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');

  const preview = useMemo(() => images.map((image) => {
    const extension = image.name.match(/\.[^.]+$/)?.[0] ?? '';
    const baseName = extension ? image.name.slice(0, -extension.length) : image.name;
    const replaced = findText ? baseName.split(findText).join(replaceText) : baseName;
    return {
      image,
      nextName: `${prefix}${replaced}${suffix}${extension}`,
    };
  }), [findText, images, prefix, replaceText, suffix]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    preview.forEach(({ nextName }) => counts.set(nextName.toLocaleLowerCase(), (counts.get(nextName.toLocaleLowerCase()) ?? 0) + 1));
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  }, [preview]);

  const hasCollision = preview.some(({ nextName }) => !nextName.trim() || duplicateNames.has(nextName.toLocaleLowerCase()));

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section className="w-[560px] max-w-full rounded-xl border border-gray-700 bg-[#1f1f1f] p-4 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="batch-rename-title">
        <div className="flex items-center justify-between">
          <h2 id="batch-rename-title" className="text-sm font-semibold text-white">Batch Rename</h2>
          <button onClick={onClose} disabled={busy} className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close batch rename">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <label className="text-gray-400">Find
            <input value={findText} onChange={(event) => setFindText(event.target.value)} disabled={busy} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-white" />
          </label>
          <label className="text-gray-400">Replace with
            <input value={replaceText} onChange={(event) => setReplaceText(event.target.value)} disabled={busy} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-white" />
          </label>
          <label className="text-gray-400">Prefix
            <input value={prefix} onChange={(event) => setPrefix(event.target.value)} disabled={busy} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-white" />
          </label>
          <label className="text-gray-400">Suffix
            <input value={suffix} onChange={(event) => setSuffix(event.target.value)} disabled={busy} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-white" />
          </label>
        </div>

        <div className="mt-4 max-h-56 overflow-auto rounded border border-gray-700 bg-gray-900 p-2 text-xs">
          {preview.map(({ image, nextName }) => (
            <div key={image.id} className={cn('grid grid-cols-[1fr_auto_1fr] gap-2 py-1', duplicateNames.has(nextName.toLocaleLowerCase()) ? 'text-red-300' : 'text-gray-300')}>
              <span className="truncate">{image.name}</span>
              <span className="text-gray-600">→</span>
              <span className="truncate text-blue-200">{nextName}</span>
            </div>
          ))}
        </div>
        {hasCollision && <p className="mt-2 text-xs text-red-300">Preview contains duplicate or empty file names. Adjust the pattern before renaming.</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50">Cancel</button>
          <button onClick={() => void onSubmit(preview)} disabled={busy || preview.length === 0 || hasCollision} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:opacity-50">Rename {preview.length} files</button>
        </div>
      </section>
    </div>
  );
}
