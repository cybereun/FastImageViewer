import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Grid3X3, ArrowUpDown, Search, Image as ImageIcon } from 'lucide-react';
import type { ImageFile } from '../types';
import { cn } from '../utils/cn';
import { IMAGE_DRAG_MIME } from '../constants/drag';

interface ThumbnailGridProps {
  images: ImageFile[];
  currentFolderPath: string | null;
  onImageClick: (index: number) => void;
  onCopyImage: (sourcePath: string, targetFolderPath: string) => Promise<void>;
  onMoveImage: (sourcePath: string, targetFolderPath: string) => Promise<void>;
  onRenameImage: (sourcePath: string, nextName: string) => Promise<void>;
  onDeleteImage: (sourcePath: string) => Promise<void>;
}

type SortMode = 'name' | 'size' | 'date';
type ViewSize = 'small' | 'medium' | 'large';

interface ContextMenuState {
  x: number;
  y: number;
  image: ImageFile;
}

interface RenameDialogState {
  image: ImageFile;
  value: string;
  error: string | null;
}

interface DeleteDialogState {
  images: ImageFile[];
}

interface ClipboardState {
  mode: 'copy' | 'cut';
  items: Array<{ path: string; name: string }>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function ThumbnailItem({
  image,
  index,
  active,
  selected,
  dimmedForCut,
  disabled,
  viewSize,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
}: {
  image: ImageFile;
  index: number;
  active: boolean;
  selected: boolean;
  dimmedForCut: boolean;
  disabled: boolean;
  viewSize: ViewSize;
  onClick: (e: React.MouseEvent, image: ImageFile, index: number) => void;
  onDoubleClick: (index: number) => void;
  onContextMenu: (e: React.MouseEvent, image: ImageFile) => void;
  onDragStart: (e: React.DragEvent, image: ImageFile) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const sizeClasses = {
    small: 'h-28',
    medium: 'h-44',
    large: 'h-64',
  };

  return (
    <button
      disabled={disabled}
      draggable={!disabled}
      onClick={(e) => onClick(e, image, index)}
      onDoubleClick={() => onDoubleClick(index)}
      onContextMenu={(e) => onContextMenu(e, image)}
      onDragStart={(e) => onDragStart(e, image)}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-blue-500 focus:outline-none',
        selected && 'border-blue-500 ring-2 ring-blue-500/70',
        active && 'ring-2 ring-yellow-400/80',
        dimmedForCut && 'opacity-50',
        disabled && 'cursor-wait opacity-70'
      )}
      title="Click select, Ctrl+Click multi-select, Double-click open. Keyboard: F2/Ctrl+C/X/V/Arrows/Enter/Delete/Esc"
    >
      <div className={cn('relative w-full overflow-hidden bg-gray-900', sizeClasses[viewSize])}>
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <ImageIcon size={32} />
          </div>
        ) : (
          <img
            src={image.url}
            alt={image.name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-transform duration-200 group-hover:scale-105',
              !loaded && 'opacity-0'
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-full p-2 transition-transform group-hover:translate-y-0">
          <p className="text-xs text-gray-300">{formatSize(image.size)}</p>
        </div>
      </div>
      <div className="w-full px-2 py-1.5">
        <p className="truncate text-left text-xs text-gray-300">{image.name}</p>
      </div>
    </button>
  );
}

export function ThumbnailGrid({
  images,
  currentFolderPath,
  onImageClick,
  onCopyImage,
  onMoveImage,
  onRenameImage,
  onDeleteImage,
}: ThumbnailGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [viewSize, setViewSize] = useState<ViewSize>('medium');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameDialog, setRenameDialog] = useState<RenameDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gridFocused, setGridFocused] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    let result = [...images];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((img) => img.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'date':
          return b.lastModified - a.lastModified;
        default:
          return 0;
      }
    });
    return result;
  }, [images, searchQuery, sortMode]);

  const filteredIdSet = useMemo(() => new Set(filtered.map((img) => img.id)), [filtered]);
  const selectedImages = useMemo(
    () => filtered.filter((img) => selectedIds.has(img.id)),
    [filtered, selectedIds]
  );
  const activeImage = activeIndex !== null && activeIndex >= 0 ? filtered[activeIndex] ?? null : null;

  const showStatus = useCallback((message: string) => {
    setStatusMessage(message);
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => filteredIdSet.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [filteredIdSet]);

  useEffect(() => {
    if (filtered.length === 0) {
      setActiveIndex(null);
      return;
    }
    setActiveIndex((prev) => {
      if (prev !== null && prev >= 0 && prev < filtered.length) return prev;
      const selectedIndex = filtered.findIndex((img) => selectedIds.has(img.id));
      return selectedIndex >= 0 ? selectedIndex : 0;
    });
  }, [filtered, selectedIds]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeOnEsc);
    window.addEventListener('blur', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeOnEsc);
      window.removeEventListener('blur', closeMenu);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      if (renameDialog) setRenameDialog(null);
      if (deleteDialog) setDeleteDialog(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [busy, deleteDialog, renameDialog]);

  const getGridColumnCount = useCallback(() => {
    const node = gridRef.current;
    if (!node) return 1;
    const style = window.getComputedStyle(node);
    const columns = style.gridTemplateColumns.split(' ').filter(Boolean);
    return Math.max(1, columns.length);
  }, []);

  const getActionImages = useCallback(
    (anchor?: ImageFile | null) => {
      if (anchor && selectedIds.has(anchor.id) && selectedImages.length > 0) {
        return selectedImages;
      }
      if (anchor) return [anchor];
      if (selectedImages.length > 0) return selectedImages;
      if (activeImage) return [activeImage];
      return [];
    },
    [activeImage, selectedIds, selectedImages]
  );

  const runBatchOperation = useCallback(
    async (
      targets: ImageFile[],
      operation: (img: ImageFile) => Promise<void>,
      successMessage: string
    ) => {
      if (targets.length === 0) {
        showStatus('No image selected.');
        return;
      }

      setBusy(true);
      const failures: Array<{ img: ImageFile; reason: unknown }> = [];
      try {
        for (const img of targets) {
          try {
            await operation(img);
          } catch (error) {
            failures.push({ img, reason: error });
          }
        }
      } finally {
        setBusy(false);
      }

      if (failures.length > 0) {
        const first = failures[0];
        const message =
          first.reason instanceof Error ? first.reason.message : 'Unknown file operation error.';
        showStatus(`Completed with ${failures.length} failure(s).`);
        alert(`Some operations failed.\nFirst failure: ${first.img.name}\n${message}`);
        return;
      }
      showStatus(successMessage);
    },
    [showStatus]
  );

  const chooseTargetFolder = useCallback(async () => {
    const picked = await window.electron.chooseDirectory();
    return picked?.path ?? null;
  }, []);

  const openImageByIndex = useCallback(
    (filteredIndex: number) => {
      const img = filtered[filteredIndex];
      if (!img) return;
      setSelectedIds(new Set([img.id]));
      setActiveIndex(filteredIndex);
      const originalIndex = images.findIndex((i) => i.id === img.id);
      if (originalIndex >= 0) onImageClick(originalIndex);
    },
    [filtered, images, onImageClick]
  );

  const handleSelectClick = useCallback((e: React.MouseEvent, image: ImageFile, index: number) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    setActiveIndex(index);
    setSelectedIds((prev) => {
      if (!multiSelect) {
        return new Set([image.id]);
      }

      const next = new Set(prev);
      if (next.has(image.id)) {
        next.delete(image.id);
      } else {
        next.add(image.id);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, image: ImageFile) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData(IMAGE_DRAG_MIME, image.path);
    e.dataTransfer.setData('text/plain', image.path);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, image: ImageFile) => {
    e.preventDefault();
    setSelectedIds((prev) => (prev.has(image.id) ? prev : new Set([image.id])));
    setContextMenu({ x: e.clientX, y: e.clientY, image });
  }, []);

  const openRenameDialog = useCallback(
    (target: ImageFile | null) => {
      if (!target) {
        showStatus('No image selected.');
        return;
      }
      setRenameDialog({
        image: target,
        value: target.name,
        error: null,
      });
    },
    [showStatus]
  );

  const handleCopyToFolder = useCallback(async () => {
    if (!contextMenu) return;
    const targets = getActionImages(contextMenu.image);
    const targetFolderPath = await chooseTargetFolder();
    if (!targetFolderPath) return;
    setContextMenu(null);
    await runBatchOperation(
      targets,
      (img) => onCopyImage(img.path, targetFolderPath),
      `${targets.length} image(s) copied.`
    );
  }, [chooseTargetFolder, contextMenu, getActionImages, onCopyImage, runBatchOperation]);

  const handleMoveToFolder = useCallback(async () => {
    if (!contextMenu) return;
    const targets = getActionImages(contextMenu.image);
    const targetFolderPath = await chooseTargetFolder();
    if (!targetFolderPath) return;
    setContextMenu(null);
    await runBatchOperation(
      targets,
      (img) => onMoveImage(img.path, targetFolderPath),
      `${targets.length} image(s) moved.`
    );
  }, [chooseTargetFolder, contextMenu, getActionImages, onMoveImage, runBatchOperation]);

  const handleRenameFromMenu = useCallback(() => {
    if (!contextMenu) return;
    const targets = getActionImages(contextMenu.image);
    setContextMenu(null);
    if (targets.length !== 1) {
      showStatus('Rename is available for one image at a time.');
      return;
    }
    openRenameDialog(targets[0]);
  }, [contextMenu, getActionImages, openRenameDialog, showStatus]);

  const handleDeleteFromMenu = useCallback(() => {
    if (!contextMenu) return;
    const targets = getActionImages(contextMenu.image);
    setContextMenu(null);
    if (targets.length === 0) {
      showStatus('No image selected.');
      return;
    }
    setDeleteDialog({ images: targets });
  }, [contextMenu, getActionImages, showStatus]);

  const submitRename = useCallback(async () => {
    if (!renameDialog) return;
    const trimmed = renameDialog.value.trim();
    if (!trimmed) {
      setRenameDialog((prev) => (prev ? { ...prev, error: 'File name cannot be empty.' } : prev));
      return;
    }

    setBusy(true);
    try {
      await onRenameImage(renameDialog.image.path, trimmed);
      setRenameDialog(null);
      showStatus('File renamed.');
    } catch (error) {
      setRenameDialog((prev) =>
        prev
          ? {
              ...prev,
              error: error instanceof Error ? error.message : 'Rename failed.',
            }
          : prev
      );
    } finally {
      setBusy(false);
    }
  }, [onRenameImage, renameDialog, showStatus]);

  const submitDelete = useCallback(async () => {
    if (!deleteDialog) return;
    const targets = deleteDialog.images;
    setDeleteDialog(null);
    await runBatchOperation(
      targets,
      (img) => onDeleteImage(img.path),
      `${targets.length} image(s) moved to Recycle Bin.`
    );
    setSelectedIds(new Set());
  }, [deleteDialog, onDeleteImage, runBatchOperation]);

  const moveActive = useCallback(
    (delta: number, keepSelection: boolean) => {
      if (filtered.length === 0) return;
      const start = activeIndex ?? Math.max(0, filtered.findIndex((img) => selectedIds.has(img.id)));
      const safeStart = start < 0 ? 0 : start;
      const nextIndex = Math.max(0, Math.min(filtered.length - 1, safeStart + delta));
      const nextImage = filtered[nextIndex];
      setActiveIndex(nextIndex);
      if (!keepSelection && nextImage) {
        setSelectedIds(new Set([nextImage.id]));
      }
    },
    [activeIndex, filtered, selectedIds]
  );

  const copyOrCutSelection = useCallback(
    (mode: 'copy' | 'cut') => {
      const targets = getActionImages();
      if (targets.length === 0) {
        showStatus('No image selected.');
        return;
      }
      setClipboard({
        mode,
        items: targets.map((img) => ({ path: img.path, name: img.name })),
      });
      showStatus(`${targets.length} image(s) ${mode === 'copy' ? 'copied' : 'cut'} to clipboard.`);
    },
    [getActionImages, showStatus]
  );

  const pasteClipboard = useCallback(async () => {
    if (!clipboard || clipboard.items.length === 0) {
      showStatus('Clipboard is empty.');
      return;
    }
    if (!currentFolderPath) {
      showStatus('No target folder selected.');
      return;
    }

    const targets = clipboard.items.map((item) => ({
      id: item.path,
      name: item.name,
      path: item.path,
      url: '',
      size: 0,
      type: '',
      lastModified: 0,
    })) as ImageFile[];

    const mode = clipboard.mode;
    await runBatchOperation(
      targets,
      (img) =>
        mode === 'copy'
          ? onCopyImage(img.path, currentFolderPath)
          : onMoveImage(img.path, currentFolderPath),
      `${targets.length} image(s) ${mode === 'copy' ? 'pasted' : 'moved'}.`
    );

    if (mode === 'cut') {
      setClipboard(null);
      setSelectedIds(new Set());
    }
  }, [clipboard, currentFolderPath, onCopyImage, onMoveImage, runBatchOperation, showStatus]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (busy) return;
      if (isEditableElement(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key;
      const lower = key.toLowerCase();

      if (ctrl && lower === 'c') {
        e.preventDefault();
        copyOrCutSelection('copy');
        return;
      }
      if (ctrl && lower === 'x') {
        e.preventDefault();
        copyOrCutSelection('cut');
        return;
      }
      if (ctrl && lower === 'v') {
        e.preventDefault();
        void pasteClipboard();
        return;
      }

      if (key === 'F2') {
        e.preventDefault();
        const targets = getActionImages();
        if (targets.length !== 1) {
          showStatus('Rename is available for one image at a time.');
          return;
        }
        openRenameDialog(targets[0]);
        return;
      }

      if (key === 'Delete') {
        e.preventDefault();
        const targets = getActionImages();
        if (targets.length === 0) {
          showStatus('No image selected.');
          return;
        }
        setDeleteDialog({ images: targets });
        return;
      }

      if (key === 'Enter') {
        e.preventDefault();
        if (activeIndex !== null) {
          openImageByIndex(activeIndex);
        } else if (filtered.length > 0) {
          openImageByIndex(0);
        }
        return;
      }

      if (key === 'Escape') {
        e.preventDefault();
        setContextMenu(null);
        setRenameDialog(null);
        setDeleteDialog(null);
        setSelectedIds(new Set());
        setActiveIndex(null);
        showStatus('Selection cleared.');
        return;
      }

      if (key === 'ArrowRight') {
        e.preventDefault();
        moveActive(1, ctrl);
        return;
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        moveActive(-1, ctrl);
        return;
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        moveActive(getGridColumnCount(), ctrl);
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        moveActive(-getGridColumnCount(), ctrl);
      }
    },
    [
      activeIndex,
      busy,
      copyOrCutSelection,
      filtered.length,
      getActionImages,
      getGridColumnCount,
      moveActive,
      openImageByIndex,
      openRenameDialog,
      pasteClipboard,
      showStatus,
    ]
  );

  const gridCols = {
    small: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
    medium: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  const menuPosition = useMemo(() => {
    if (!contextMenu) return null;
    const menuWidth = 220;
    const menuHeight = 180;
    const maxX = Math.max(8, window.innerWidth - menuWidth - 8);
    const maxY = Math.max(8, window.innerHeight - menuHeight - 8);
    return {
      left: Math.min(contextMenu.x, maxX),
      top: Math.min(contextMenu.y, maxY),
    };
  }, [contextMenu]);

  const cutIdSet = useMemo(() => {
    if (!clipboard || clipboard.mode !== 'cut') return new Set<string>();
    return new Set(clipboard.items.map((item) => item.path));
  }, [clipboard]);

  return (
    <div className="flex h-full flex-col bg-gray-950" onKeyDown={handleGridKeyDown}>
      <div className="flex items-center gap-3 border-b border-gray-700 bg-gray-900 px-4 py-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-gray-800 py-1.5 pl-8 pr-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 p-0.5">
          {(['small', 'medium', 'large'] as ViewSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setViewSize(size)}
              className={cn(
                'rounded px-2 py-1 text-xs transition-colors',
                viewSize === size ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const modes: SortMode[] = ['name', 'size', 'date'];
              const idx = modes.indexOf(sortMode);
              setSortMode(modes[(idx + 1) % modes.length]);
            }}
            className="flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700"
          >
            <ArrowUpDown size={12} />
            {sortMode === 'name' ? 'Name' : sortMode === 'size' ? 'Size' : 'Date'}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Grid3X3 size={14} />
          {selectedIds.size > 0
            ? `${selectedIds.size} selected / ${filtered.length} items`
            : `${filtered.length} items`}
        </div>
      </div>

      <div className="border-b border-gray-800 bg-gray-900/60 px-4 py-1 text-xs text-gray-400">
        {clipboard
          ? `Clipboard: ${clipboard.items.length} image(s) ${clipboard.mode === 'copy' ? 'copied' : 'cut'}`
          : 'Keyboard: F2 Rename | Ctrl+C Copy | Ctrl+X Cut | Ctrl+V Paste | Enter Open | Delete | Esc'}
      </div>

      {statusMessage && (
        <div className="border-b border-blue-900/50 bg-blue-950/40 px-4 py-1.5 text-xs text-blue-200">
          {statusMessage}
        </div>
      )}

      {filtered.length > 0 ? (
        <div
          ref={gridRef}
          tabIndex={0}
          onFocus={() => setGridFocused(true)}
          onBlur={() => setGridFocused(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedIds(new Set());
              setActiveIndex(null);
            }
          }}
          className={cn(
            'flex-1 content-start overflow-y-auto p-3 auto-rows-min grid gap-2 outline-none',
            gridCols[viewSize],
            gridFocused && 'ring-inset ring-2 ring-blue-500/40'
          )}
        >
          {filtered.map((image, index) => (
            <ThumbnailItem
              key={image.id}
              image={image}
              index={index}
              active={activeIndex === index}
              selected={selectedIds.has(image.id)}
              dimmedForCut={cutIdSet.has(image.id)}
              disabled={busy}
              viewSize={viewSize}
              onClick={handleSelectClick}
              onDoubleClick={openImageByIndex}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      ) : images.length > 0 ? (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <Search size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No search results.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-gray-500">
          <div className="text-center">
            <ImageIcon size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-400">No images in this folder</p>
            <p className="mt-2 text-sm text-gray-500">Open a folder to browse images.</p>
          </div>
        </div>
      )}

      {contextMenu && menuPosition && (
        <div
          className="fixed z-[80] min-w-[220px] overflow-hidden rounded-md border border-gray-700 bg-[#1f1f1f] shadow-2xl"
          style={{ left: menuPosition.left, top: menuPosition.top }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-700 px-3 py-2 text-xs text-gray-400">
            {contextMenu.image.name}
          </div>
          <button
            onClick={() => void handleCopyToFolder()}
            disabled={busy}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
          >
            Copy To Folder...
          </button>
          <button
            onClick={() => void handleMoveToFolder()}
            disabled={busy}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
          >
            Move To Folder...
          </button>
          <button
            onClick={handleRenameFromMenu}
            disabled={busy}
            className="w-full px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
          >
            Rename...
          </button>
          <button
            onClick={handleDeleteFromMenu}
            disabled={busy}
            className="w-full px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-900/30 disabled:cursor-wait disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      )}

      {renameDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
          <div
            className="w-[420px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-700 bg-[#1f1f1f] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-medium text-white">Rename File</h4>
            <p className="mt-1 truncate text-xs text-gray-400">{renameDialog.image.name}</p>
            <input
              autoFocus
              value={renameDialog.value}
              disabled={busy}
              onChange={(e) =>
                setRenameDialog((prev) =>
                  prev ? { ...prev, value: e.target.value, error: null } : prev
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitRename();
                }
              }}
              className="mt-3 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
            {renameDialog.error && <p className="mt-2 text-xs text-red-300">{renameDialog.error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRenameDialog(null)}
                disabled={busy}
                className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitRename()}
                disabled={busy}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
          <div
            className="w-[460px] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-700 bg-[#1f1f1f] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy && !isEditableElement(e.target)) {
                e.preventDefault();
                void submitDelete();
              }
            }}
          >
            <h4 className="text-sm font-medium text-white">Delete Image{deleteDialog.images.length > 1 ? 's' : ''}</h4>
            <p className="mt-2 text-sm text-gray-300">
              {deleteDialog.images.length} image{deleteDialog.images.length > 1 ? 's' : ''} will be
              moved to Recycle Bin.
            </p>
            <div className="mt-2 max-h-28 overflow-auto rounded border border-gray-700 bg-gray-900 p-2 text-xs text-gray-400">
              {deleteDialog.images.map((img) => (
                <div key={img.id} className="truncate">
                  {img.name}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteDialog(null)}
                disabled={busy}
                className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitDelete()}
                disabled={busy}
                autoFocus
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
