import { useState, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Upload,
  FolderPlus,
  HardDrive,
  Monitor,
} from 'lucide-react';
import type { FolderNode } from '../types';
import { cn } from '../utils/cn';
import { IMAGE_DRAG_MIME } from '../constants/drag';
import type { Language } from '../i18n';
import { t } from '../i18n';

interface FileExplorerProps {
  folders: FolderNode[];
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  onToggleFolder?: (node: FolderNode) => void;
  onImageDropToFolder?: (payload: {
    imagePaths: string[];
    targetFolderPath: string;
    move: boolean;
  }) => Promise<void> | void;
  onOpenDirectory?: () => void;
  onOpenFiles?: () => void;
  onLoadFiles: (files: FileList | File[]) => void;
  totalCount: number;
  loading: boolean;
  language?: Language;
}

function FolderItem({
  node,
  depth,
  selectedFolder,
  onSelectFolder,
  onToggleFolder,
  onImageDropToFolder,
}: {
  node: FolderNode;
  depth: number;
  selectedFolder: string | null;
  onSelectFolder: (id: string) => void;
  onToggleFolder?: (node: FolderNode) => void;
  onImageDropToFolder?: (payload: {
    imagePaths: string[];
    targetFolderPath: string;
    move: boolean;
  }) => Promise<void> | void;
}) {
  const isSelected = selectedFolder === node.id;
  const canToggle = node.children.length > 0 || !node.isLoaded;
  const [dropActive, setDropActive] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canToggle && onToggleFolder) {
      onToggleFolder(node);
    }
  };

  const hasImagePayload = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes(IMAGE_DRAG_MIME);

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasImagePayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropActive(true);
    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
  };

  const handleImageDrop = async (e: React.DragEvent) => {
    if (!hasImagePayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);

    const rawPaths = e.dataTransfer.getData(IMAGE_DRAG_MIME);
    if (!rawPaths || !onImageDropToFolder) return;
    let imagePaths: string[];
    try {
      const parsed = JSON.parse(rawPaths);
      imagePaths = Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [rawPaths];
    } catch {
      imagePaths = [rawPaths];
    }
    if (imagePaths.length === 0) return;

    await onImageDropToFolder({
      imagePaths,
      targetFolderPath: node.path,
      move: !e.ctrlKey,
    });
  };

  return (
    <div>
      <div
        className={cn(
          'group flex cursor-pointer select-none items-center gap-1.5 rounded-sm px-1 py-1 text-left text-sm transition-colors',
          isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800',
          dropActive && 'bg-blue-500/25 ring-1 ring-blue-400'
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => onSelectFolder(node.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleImageDrop}
        title={dropActive ? 'Drop image here (Ctrl = copy, default = move)' : undefined}
      >
        <button
          onClick={handleToggle}
          className={cn(
            'rounded p-0.5',
            canToggle ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-700'
          )}
          aria-label={node.isExpanded ? 'Collapse folder' : 'Expand folder'}
        >
          {canToggle ? (
            node.isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="inline-block w-[14px]" />
          )}
        </button>

        {node.isExpanded ? (
          <FolderOpen size={16} className={isSelected ? 'text-yellow-300' : 'text-yellow-500'} />
        ) : (
          <Folder size={16} className={isSelected ? 'text-yellow-300' : 'text-yellow-500'} />
        )}

        <span className="flex-1 truncate">{node.name}</span>
      </div>

      {node.isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              onToggleFolder={onToggleFolder}
              onImageDropToFolder={onImageDropToFolder}
            />
          ))}
          {!node.isLoaded && (
            <div style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }} className="py-1 text-xs text-gray-500">
              Loading...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  folders,
  selectedFolder,
  onSelectFolder,
  onToggleFolder,
  onImageDropToFolder,
  onOpenDirectory,
  onOpenFiles,
  onLoadFiles,
  totalCount,
  loading,
  language = 'en',
}: FileExplorerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (Array.from(e.dataTransfer.types).includes(IMAGE_DRAG_MIME)) {
      return;
    }
    if (!e.dataTransfer.items) return;

    const files: File[] = [];
    for (let i = 0; i < e.dataTransfer.items.length; i += 1) {
      const item = e.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) onLoadFiles(files);
  };

  return (
    <div
      className={cn(
        'flex h-full flex-col select-none border-r border-gray-800 bg-[#1e1e1e] transition-colors',
        dragOver && 'bg-gray-800'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (Array.from(e.dataTransfer.types).includes(IMAGE_DRAG_MIME)) {
          setDragOver(false);
          return;
        }
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2 border-b border-gray-800 p-3">
        <div className="flex items-center gap-2 text-gray-400">
          <Monitor size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">{t(language, 'storage')}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenDirectory}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          >
            <FolderPlus size={14} />
            {t(language, 'openFolder')}
          </button>
          <button
            className="flex items-center justify-center gap-2 rounded bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-600"
            onClick={onOpenFiles ?? (() => fileInputRef.current?.click())}
            title={t(language, 'openFiles')}
          >
            <Upload size={14} />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) onLoadFiles(e.target.files);
        }}
      />

      <div className="border-b border-gray-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t(language, 'thisPc')}
      </div>

      <div className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto py-2">
        {loading && totalCount === 0 && (
          <div className="animate-pulse px-4 py-2 text-xs text-gray-500">{t(language, 'scanning')}</div>
        )}

        {folders.length === 0 && !loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-gray-500">
            <HardDrive size={24} className="opacity-50" />
            <p className="text-xs">{t(language, 'noFolders')}</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {folders.map((node) => (
              <FolderItem
                key={node.id}
                node={node}
                depth={0}
                selectedFolder={selectedFolder}
                onSelectFolder={(id) => onSelectFolder(id)}
                onToggleFolder={onToggleFolder}
                onImageDropToFolder={onImageDropToFolder}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
